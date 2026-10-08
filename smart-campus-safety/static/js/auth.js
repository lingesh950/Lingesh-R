/**
 * Smart Campus Safety - Authentication (Step 2)
 * Vanilla JavaScript for Login, Registration, and Toast notifications.
 */

// Universal Toast Notification Handler
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
        <button type="button" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1rem;opacity:0.8;" onclick="this.parentElement.remove()">✕</button>
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

// Tab Switching
function setAuthMode(mode) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTab = document.getElementById('tab-btn-login');
    const registerTab = document.getElementById('tab-btn-register');

    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
    }
}

// Quick Demo Fill
function quickFillLogin(studentId, password) {
    setAuthMode('login');
    document.getElementById('login-student-id').value = studentId;
    document.getElementById('login-password').value = password;
    showToast(`Loaded credentials for ${studentId}`, 'info');
}

// Handle Login Submission
async function handleLogin(e) {
    e.preventDefault();

    const studentIdInput = document.getElementById('login-student-id');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-login');

    const student_id = studentIdInput.value.trim();
    const password = passwordInput.value.trim();

    if (!student_id || !password) {
        showToast('Please enter both Student ID and Password.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast(data.message || 'Login successful!', 'success');
            setTimeout(() => {
                if (data.data && data.data.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/student';
                }
            }, 600);
        } else {
            showToast(data.message || 'Invalid credentials.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'LOGIN';
        }
    } catch (err) {
        showToast('Network error connecting to safety server.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'LOGIN';
    }
}

// Handle Registration Submission
async function handleRegister(e) {
    e.preventDefault();

    const studentIdInput = document.getElementById('reg-student-id');
    const nameInput = document.getElementById('reg-name');
    const passwordInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm-password');
    const submitBtn = document.getElementById('btn-register');

    const student_id = studentIdInput.value.trim();
    const name = nameInput.value.trim();
    const password = passwordInput.value.trim();
    const confirm_password = confirmInput.value.trim();

    // Validations
    if (!student_id) {
        showToast('Student ID is required.', 'error');
        return;
    }

    if (!name) {
        showToast('Full name is required.', 'error');
        return;
    }

    if (!password) {
        showToast('Password is required.', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }

    if (password !== confirm_password) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id,
                name,
                password,
                confirm_password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Account registered successfully! Please log in.', 'success');
            setAuthMode('login');
            document.getElementById('login-student-id').value = student_id;
            document.getElementById('login-password').value = password;
        } else {
            showToast(data.message || 'Registration failed.', 'error');
        }
    } catch (err) {
        showToast('Network error during registration.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'REGISTER';
    }
}

// Auto-redirect if already logged in
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const result = await res.json();
            if (result.success && result.data) {
                if (result.data.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/student';
                }
            }
        }
    } catch (_) {}
});
