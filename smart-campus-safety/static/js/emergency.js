/**
 * Smart Campus Safety - Emergency Screen JavaScript (Step 2)
 * Handles Geolocation, URL query pre-selection, validation,
 * API dispatch to POST /api/alerts, and confirmation screen display.
 */

let currentLatitude = null;
let currentLongitude = null;

// Universal Toast helper
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

// 1. Preselect Emergency Type from URL Query Parameters
function preselectTypeFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get('type');
    const selectElem = document.getElementById('emergency-type-select');

    if (!requestedType || !selectElem) return;

    const lower = requestedType.toLowerCase();
    for (let i = 0; i < selectElem.options.length; i++) {
        const optVal = selectElem.options[i].value.toLowerCase();
        if (optVal === lower || optVal.includes(lower)) {
            selectElem.selectedIndex = i;
            break;
        }
    }
}

// 2. Browser Geolocation API
function acquireGeolocation() {
    const statusText = document.getElementById('geo-status-text');
    const latDisplay = document.getElementById('val-lat');
    const lngDisplay = document.getElementById('val-lng');
    const mapsWrapper = document.getElementById('maps-link-wrapper');
    const mapsLink = document.getElementById('google-maps-link');
    const manualLocationGroup = document.getElementById('manual-location-group');

    if (!navigator.geolocation) {
        if (statusText) statusText.textContent = 'Geolocation is not supported by your browser.';
        if (manualLocationGroup) manualLocationGroup.classList.remove('hidden');
        return;
    }

    if (statusText) statusText.textContent = 'Acquiring GPS location...';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            currentLatitude = pos.coords.latitude;
            currentLongitude = pos.coords.longitude;

            if (latDisplay) latDisplay.textContent = currentLatitude.toFixed(6);
            if (lngDisplay) lngDisplay.textContent = currentLongitude.toFixed(6);
            if (statusText) statusText.textContent = '📍 GPS Location locked successfully.';

            // Clickable Open in Google Maps using exact URL: https://www.google.com/maps?q=LATITUDE,LONGITUDE
            if (mapsLink && mapsWrapper) {
                mapsLink.href = `https://www.google.com/maps?q=${currentLatitude},${currentLongitude}`;
                mapsWrapper.classList.remove('hidden');
            }

            if (manualLocationGroup) {
                manualLocationGroup.classList.add('hidden');
            }
        },
        (error) => {
            console.warn('Geolocation failed or denied:', error.message);
            currentLatitude = null;
            currentLongitude = null;

            if (latDisplay) latDisplay.textContent = 'Unavailable';
            if (lngDisplay) lngDisplay.textContent = 'Unavailable';
            if (statusText) statusText.textContent = 'Location permission denied or unavailable.';
            
            // Show fallback manual location field
            if (manualLocationGroup) {
                manualLocationGroup.classList.remove('hidden');
            }
            if (mapsWrapper) {
                mapsWrapper.classList.add('hidden');
            }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

// 3. Submit Emergency Alert
async function submitAlert(e) {
    e.preventDefault();

    const typeSelect = document.getElementById('emergency-type-select');
    const messageInput = document.getElementById('emergency-message');
    const manualLocationInput = document.getElementById('manual-location-input');
    const submitBtn = document.getElementById('btn-submit-alert');

    const selectedType = typeSelect.value.trim();
    let messageText = messageInput.value.trim();
    const manualLoc = manualLocationInput ? manualLocationInput.value.trim() : '';

    // If manual location was specified, append to message
    if (manualLoc) {
        messageText = messageText ? `[Location: ${manualLoc}] ${messageText}` : `[Location: ${manualLoc}]`;
    }

    // Validation 1: Emergency Type required
    if (!selectedType) {
        showToast('Please select an Emergency Type.', 'error');
        typeSelect.focus();
        return;
    }

    // Validation 2: Message length check
    if (messageText.length > 500) {
        showToast('Description is too long (maximum 500 characters).', 'error');
        return;
    }

    // Validation 3: Coordinates validation if available
    let latPayload = null;
    let lngPayload = null;
    if (currentLatitude !== null && !isNaN(currentLatitude)) {
        latPayload = Number(currentLatitude);
    }
    if (currentLongitude !== null && !isNaN(currentLongitude)) {
        lngPayload = Number(currentLongitude);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'TRANSMITTING SOS BEACON...';

    const payload = {
        type: selectedType,
        message: messageText,
        lat: latPayload,
        lng: lngPayload
    };

    try {
        const response = await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.status === 401) {
            showToast('Session expired. Please log in again.', 'error');
            setTimeout(() => window.location.href = '/', 1000);
            return;
        }

        const data = await response.json();

        if (response.ok && data.success) {
            const alertData = data.data;
            showConfirmation(alertData);
        } else {
            showToast(data.message || 'Failed to dispatch alert.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '🚨 SEND ALERT';
        }
    } catch (err) {
        console.error('Alert transmission error:', err);
        showToast('Network error while dispatching emergency beacon.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '🚨 SEND ALERT';
    }
}

// 4. Show Confirmation Screen
function showConfirmation(alertData) {
    const formContainer = document.getElementById('form-container');
    const confirmationContainer = document.getElementById('confirmation-container');

    const confirmId = document.getElementById('confirm-id');
    const confirmType = document.getElementById('confirm-type');
    const confirmPriority = document.getElementById('confirm-priority');
    const confirmResponse = document.getElementById('confirm-response');
    const confirmStatus = document.getElementById('confirm-status');

    if (confirmId) confirmId.textContent = `#${alertData.id}`;
    if (confirmType) confirmType.textContent = alertData.emergency_type;
    
    if (confirmPriority) {
        const p = (alertData.priority || 'MEDIUM').toUpperCase();
        confirmPriority.textContent = p;
        confirmPriority.className = `badge ${p === 'HIGH' ? 'badge-high' : p === 'LOW' ? 'badge-low' : 'badge-medium'}`;
    }

    if (confirmResponse) {
        confirmResponse.textContent = alertData.recommended_response || 'Standard dispatch response';
    }

    if (confirmStatus) {
        confirmStatus.textContent = alertData.status || 'Pending';
    }

    // Swap views
    if (formContainer) formContainer.classList.add('hidden');
    if (confirmationContainer) confirmationContainer.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Lifecycle Init
document.addEventListener('DOMContentLoaded', () => {
    preselectTypeFromQuery();
    acquireGeolocation();
});
