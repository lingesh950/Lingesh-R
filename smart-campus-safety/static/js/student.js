/**
 * Smart Campus Safety - Student Portal JavaScript (Step 2)
 * Handles Previous Alerts fetching, rendering, and session actions.
 */

// Toast notification helper
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `
        <span>${icon} ${escapeHtml(message)}</span>
        <button type="button" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1rem;" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 320);
    }, 3800);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format emergency icon by type
function getEmergencyIcon(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('med')) return '🚑';
    if (t.includes('sec')) return '🛡️';
    if (t.includes('fire')) return '🔥';
    return '⚠️';
}

// Fetch user's previous alerts from GET /api/alerts/mine
async function fetchPreviousAlerts() {
    const container = document.getElementById('alerts-container');
    if (!container) return;

    try {
        const response = await fetch('/api/alerts/mine');
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }

        const data = await response.json();

        if (response.ok && data.success) {
            const alerts = data.data || [];
            renderAlertsList(alerts);
        } else {
            container.innerHTML = `
                <div class="text-center text-red" style="padding: 1.5rem 0;">
                    Unable to load previous alerts: ${escapeHtml(data.message || 'Server error')}
                </div>
            `;
        }
    } catch (err) {
        container.innerHTML = `
            <div class="text-center text-muted" style="padding: 1.5rem 0;">
                Network error loading alert history.
            </div>
        `;
    }
}

// Render alert cards
function renderAlertsList(alerts) {
    const container = document.getElementById('alerts-container');
    if (!container) return;

    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted" style="padding: 2rem 0;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🛡️</div>
                <strong>No previous emergency alerts recorded.</strong>
                <p style="font-size: 0.85rem; margin-top: 0.25rem;">Stay safe! Your emergency reports will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = alerts.map(alert => {
        const priority = (alert.priority || 'MEDIUM').toUpperCase();
        const priorityClass = priority === 'HIGH' ? 'priority-high' : priority === 'LOW' ? 'priority-low' : 'priority-medium';
        const badgePriorityClass = priority === 'HIGH' ? 'badge-high' : priority === 'LOW' ? 'badge-low' : 'badge-medium';

        const status = alert.status || 'Pending';
        const statusClass = status === 'Resolved' ? 'badge-status-resolved' : status === 'Responding' ? 'badge-status-responding' : 'badge-status';

        const timeStr = alert.created_at || 'Just now';
        const icon = getEmergencyIcon(alert.emergency_type);

        return `
            <div class="alert-item ${priorityClass}">
                <div class="alert-item-top">
                    <div class="alert-type-badge">
                        <span>${icon}</span>
                        <span>${escapeHtml(alert.emergency_type)}</span>
                        <span style="font-size: 0.75rem; color: #64748b; font-weight: normal;">#${alert.id}</span>
                    </div>
                    <div class="alert-badges">
                        <span class="badge ${badgePriorityClass}">${priority}</span>
                        <span class="badge ${statusClass}">${escapeHtml(status)}</span>
                    </div>
                </div>

                ${alert.message ? `<div class="alert-details">${escapeHtml(alert.message)}</div>` : ''}

                <div class="alert-response-hint">
                    <strong>Recommended Action:</strong> ${escapeHtml(alert.recommended_response || 'Standard dispatch response')}
                </div>

                <div class="alert-time">
                    🕒 Reported: ${escapeHtml(timeStr)}
                </div>
            </div>
        `;
    }).join('');
}

// Handle Student Logout
async function logoutStudent() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } finally {
        showToast('Logged out successfully.', 'info');
        setTimeout(() => {
            window.location.href = '/';
        }, 300);
    }
}

// Initialize on page load and poll every 10s
document.addEventListener('DOMContentLoaded', () => {
    fetchPreviousAlerts();
    setInterval(fetchPreviousAlerts, 10000);
});
