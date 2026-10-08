/**
 * Smart Campus Safety - Admin Incident Command Center (Step 3)
 * Real-time Dispatch Dashboard, 3s Live Polling, Audio/Visual Alerts,
 * Status Updates (Responding / Resolved), Dynamic Filtering, and RBAC Guards.
 */

let allAlerts = [];
let seenAlertIds = new Set();
let isInitialLoad = true;
let audioEnabled = true;
let newlyArrivedAlertIds = new Set();

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '🚨';
    
    toast.innerHTML = `
        <span>${icon} ${escapeHtml(message)}</span>
        <button type="button" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1rem;" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 320);
    }, 4000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================================
// AUDIO CHIME (Web Audio API Synthesizer)
// =============================================================================
function toggleAudioNotifications() {
    audioEnabled = !audioEnabled;
    const btn = document.getElementById('btn-toggle-sound');
    if (btn) {
        btn.textContent = audioEnabled ? '🔊 Sound On' : '🔇 Sound Off';
        btn.className = audioEnabled ? 'btn btn-secondary btn-sm' : 'btn btn-sm';
    }
    showToast(audioEnabled ? 'Audible emergency chimes enabled.' : 'Audible alerts muted.', 'info');
}

function playEmergencyAlertSound() {
    if (!audioEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // Tone 1 - Urgent Alert Pulse (880 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        // Tone 2 - High Emergency Alarm (1318.5 Hz - E6)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.5, now + 0.18);
        gain2.gain.setValueAtTime(0.35, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.7);
    } catch (e) {
        console.warn('Audio chime playback restricted by browser policy:', e);
    }
}

// =============================================================================
// VISUAL FLASH ANIMATION
// =============================================================================
function triggerDashboardVisualFlash() {
    const overlay = document.getElementById('admin-flash-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    // Force DOM reflow to re-trigger CSS keyframe
    void overlay.offsetWidth;
    overlay.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 1100);
}

// =============================================================================
// LOGOUT
// =============================================================================
async function handleAdminLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } finally {
        showToast('Logged out of Security Command.', 'info');
        setTimeout(() => {
            window.location.href = '/';
        }, 300);
    }
}

// =============================================================================
// DATA FETCHING & 3-SECOND POLLING
// =============================================================================
async function fetchAdminAlerts(isManualTrigger = false) {
    const indicator = document.getElementById('poll-indicator');
    if (indicator) {
        indicator.textContent = '● Syncing...';
    }

    try {
        const response = await fetch('/api/alerts');

        // Security check: if student or unauthorized, redirect
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        if (response.status === 403) {
            window.location.href = '/student';
            return;
        }

        const res = await response.json();

        if (response.ok && res.success) {
            const rawAlerts = res.data || [];

            // Detect new alerts
            let brandNewAlertsCount = 0;
            let newestIncomingAlert = null;
            newlyArrivedAlertIds.clear();

            rawAlerts.forEach(alert => {
                if (!seenAlertIds.has(alert.id)) {
                    if (!isInitialLoad) {
                        brandNewAlertsCount++;
                        newlyArrivedAlertIds.add(alert.id);
                        if (!newestIncomingAlert) {
                            newestIncomingAlert = alert;
                        }
                    }
                    seenAlertIds.add(alert.id);
                }
            });

            isInitialLoad = false;
            allAlerts = rawAlerts;

            // Trigger Visual Flash, Audio Chime, and Toast on new arrival
            if (brandNewAlertsCount > 0 && newestIncomingAlert) {
                triggerDashboardVisualFlash();
                playEmergencyAlertSound();
                showToast(
                    `🚨 NEW EMERGENCY ALERT: ${newestIncomingAlert.emergency_type} from ${newestIncomingAlert.reporter_name || 'Student'}`,
                    'error'
                );
            }

            // Update Counters (PART 1)
            updateCounters(allAlerts);

            // Filter & Render (PART 2 & PART 4)
            applyFilters();

            if (indicator) {
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                indicator.textContent = `● Active (${now})`;
            }

            if (isManualTrigger) {
                showToast('Emergency feed refreshed.', 'success');
            }
        } else {
            if (indicator) indicator.textContent = '⚠ Sync Error';
        }
    } catch (err) {
        console.error('Error fetching admin alerts stream:', err);
        if (indicator) indicator.textContent = '⚠ Network Error';
    }
}

// =============================================================================
// PART 1: UPDATE COUNTERS
// =============================================================================
function updateCounters(alerts) {
    let pendingCount = 0;
    let respondingCount = 0;
    let resolvedCount = 0;

    alerts.forEach(a => {
        const s = (a.status || 'Pending').toLowerCase();
        if (s === 'pending') pendingCount++;
        else if (s === 'responding') respondingCount++;
        else if (s === 'resolved') resolvedCount++;
    });

    const cntPending = document.getElementById('cnt-pending');
    const cntResponding = document.getElementById('cnt-responding');
    const cntResolved = document.getElementById('cnt-resolved');

    if (cntPending) cntPending.textContent = pendingCount;
    if (cntResponding) cntResponding.textContent = respondingCount;
    if (cntResolved) cntResolved.textContent = resolvedCount;
}

// =============================================================================
// PART 2: SORTING LOGIC
// 1. HIGH priority first
// 2. MEDIUM
// 3. LOW
// 4. Newest alert first within same priority
// =============================================================================
function sortAlerts(list) {
    const priorityRank = {
        'HIGH': 1,
        'CRITICAL': 1,
        'MEDIUM': 2,
        'LOW': 3
    };

    return [...list].sort((a, b) => {
        const rankA = priorityRank[(a.priority || '').toUpperCase()] || 99;
        const rankB = priorityRank[(b.priority || '').toUpperCase()] || 99;

        if (rankA !== rankB) {
            return rankA - rankB;
        }

        // Newest alert first within same priority
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        if (timeA !== timeB) {
            return timeB - timeA;
        }

        return (b.id || 0) - (a.id || 0);
    });
}

// =============================================================================
// PART 4: CLIENT-SIDE FILTERING WITHOUT PAGE RELOAD
// =============================================================================
function applyFilters() {
    const statusFilter = document.getElementById('filter-status-select')?.value || 'ALL';
    const typeFilter = document.getElementById('filter-type-select')?.value || 'ALL';

    let filtered = allAlerts;

    // Filter by Status
    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(a => (a.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    // Filter by Type
    if (typeFilter !== 'ALL') {
        filtered = filtered.filter(a => {
            const t = (a.emergency_type || '').toLowerCase();
            return t.includes(typeFilter.toLowerCase());
        });
    }

    // Sort according to Part 2 specifications
    const sorted = sortAlerts(filtered);

    renderAlertCards(sorted);
}

// =============================================================================
// PART 2: RENDER ALERT CARDS
// =============================================================================
function getEmergencyIcon(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('med')) return '🚑';
    if (t.includes('sec')) return '🛡️';
    if (t.includes('fire')) return '🔥';
    return '⚠️';
}

function getPriorityBadgeHtml(priority) {
    const p = (priority || 'MEDIUM').toUpperCase();
    if (p === 'HIGH' || p === 'CRITICAL') {
        return `<span class="badge-ai-priority badge-ai-high">🔴 HIGH</span>`;
    } else if (p === 'MEDIUM') {
        return `<span class="badge-ai-priority badge-ai-medium">🟠 MEDIUM</span>`;
    }
    return `<span class="badge-ai-priority badge-ai-low">🟢 LOW</span>`;
}

function getStatusBadgeHtml(status) {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'pending') {
        return `<span class="badge-admin-status badge-status-pending-admin">🔴 Pending</span>`;
    } else if (s === 'responding') {
        return `<span class="badge-admin-status badge-status-responding-admin">🟡 Responding</span>`;
    }
    return `<span class="badge-admin-status badge-status-resolved-admin">🟢 Resolved</span>`;
}

function renderAlertCards(alertsList) {
    const container = document.getElementById('admin-cards-container');
    if (!container) return;

    if (alertsList.length === 0) {
        container.innerHTML = `
            <div class="card text-center text-muted" style="grid-column: 1 / -1; padding: 3rem 1rem;">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">✅</div>
                <h3 style="font-size: 1.15rem; color: var(--color-dark-blue); font-weight: 800;">No Emergencies In This Queue</h3>
                <p style="font-size: 0.875rem; margin-top: 0.35rem;">All campus incidents matching the current filter are accounted for.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = alertsList.map(alert => {
        const icon = getEmergencyIcon(alert.emergency_type);
        const isFreshArrival = newlyArrivedAlertIds.has(alert.id);
        const flashClass = isFreshArrival ? 'new-alert-flash' : '';

        // Priority card class
        const priorityStr = (alert.priority || 'MEDIUM').toUpperCase();
        const priorityCardClass = (priorityStr === 'HIGH' || priorityStr === 'CRITICAL')
            ? 'priority-high'
            : priorityStr === 'LOW'
            ? 'priority-low'
            : 'priority-medium';

        // Coordinates & Map link
        let locationHtml = '';
        if (alert.latitude && alert.longitude) {
            const mapsUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
            locationHtml = `
                <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="location-link-btn" title="Open GPS Coordinates in Google Maps">
                    📍 View Location (${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)})
                </a>
            `;
        } else {
            locationHtml = `<span class="text-muted" style="font-size: 0.775rem;">📍 Location: Campus Landmark / Quad</span>`;
        }

        // Action Buttons: [RESPOND] and [RESOLVED]
        // If already Responding, RESPOND is disabled
        // If already Resolved, both are disabled
        const isPending = (alert.status || 'Pending') === 'Pending';
        const isResponding = alert.status === 'Responding';
        const isResolved = alert.status === 'Resolved';

        const respondBtnDisabled = !isPending ? 'disabled' : '';
        const resolvedBtnDisabled = isResolved ? 'disabled' : '';

        return `
            <article class="admin-alert-card ${priorityCardClass} ${flashClass}" id="card-alert-${alert.id}">
                <!-- Top Header: Student info & Type -->
                <div class="card-top-header">
                    <div class="reporter-identity">
                        <span class="student-name">${escapeHtml(alert.reporter_name || 'Campus Student')}</span>
                        <span class="student-id-tag">ID: ${escapeHtml(alert.student_id || 'STU-UNKNOWN')} &bull; #${alert.id}</span>
                    </div>
                    <div class="alert-type-pill">
                        <span>${icon}</span>
                        <span>${escapeHtml(alert.emergency_type)}</span>
                    </div>
                </div>

                <!-- AI Priority & Status Badges -->
                <div class="card-badges-row">
                    ${getPriorityBadgeHtml(alert.priority)}
                    ${getStatusBadgeHtml(alert.status)}
                </div>

                <!-- Message Description -->
                <div class="card-message-box">
                    ${escapeHtml(alert.message || 'No additional incident description provided.')}
                </div>

                <!-- Recommended Response -->
                <div class="card-response-box">
                    <strong>Recommended Action:</strong> ${escapeHtml(alert.recommended_response || 'Standard dispatch response')}
                </div>

                <!-- Meta Row: Location & Timestamp -->
                <div class="card-meta-row">
                    <div>${locationHtml}</div>
                    <div class="timestamp-text">🕒 ${escapeHtml(alert.created_at || 'Just now')}</div>
                </div>

                <!-- Action Buttons: [RESPOND] & [RESOLVED] -->
                <div class="card-actions-row">
                    <button
                        type="button"
                        class="btn-respond"
                        onclick="updateAlertStatus(${alert.id}, 'Responding')"
                        ${respondBtnDisabled}
                    >
                        ${isResponding ? '✓ Responding...' : '🚨 RESPOND'}
                    </button>
                    <button
                        type="button"
                        class="btn-resolved"
                        onclick="updateAlertStatus(${alert.id}, 'Resolved')"
                        ${resolvedBtnDisabled}
                    >
                        ${isResolved ? '✓ RESOLVED' : '✅ RESOLVED'}
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

// =============================================================================
// PART 3: STATUS UPDATE VIA PATCH /api/alerts/<id>/status
// =============================================================================
async function updateAlertStatus(alertId, newStatus) {
    const card = document.getElementById(`card-alert-${alertId}`);
    if (card) {
        card.style.opacity = '0.7';
    }

    try {
        const response = await fetch(`/api/alerts/${alertId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        // Security check: if student attempts this, response will be 403
        if (response.status === 403) {
            showToast('Access denied: Student accounts cannot update alert status.', 'error');
            return;
        }

        const res = await response.json();

        if (response.ok && res.success) {
            showToast(`Alert #${alertId} updated to "${newStatus}".`, 'success');
            // Re-fetch and refresh alert card
            await fetchAdminAlerts(false);
        } else {
            showToast(res.message || 'Failed to update alert status.', 'error');
            if (card) card.style.opacity = '1';
        }
    } catch (err) {
        console.error('Error changing alert status:', err);
        showToast('Network error updating status.', 'error');
        if (card) card.style.opacity = '1';
    }
}

// =============================================================================
// INITIALIZATION & 3-SECOND LIVE POLLING LOOP
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch
    fetchAdminAlerts(false);

    // Live polling every 3 seconds (PART 5)
    setInterval(() => {
        fetchAdminAlerts(false);
    }, 3000);
});
