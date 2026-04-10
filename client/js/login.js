const API = ['http:', 'https:'].includes(window.location.protocol)
  ? window.location.origin
  : 'http://localhost:3000';

const signInBtn = document.getElementById('heroSignInBtn');
const signUpBtn = document.getElementById('heroSignUpBtn');
const signOutBtn = document.getElementById('heroSignOutBtn');
const loginCard = document.getElementById('loginCard');
const loginForm = document.getElementById('loginForm');
const onAdminLoginPage = window.location.pathname.endsWith('/admin-login.html') || window.location.pathname.endsWith('admin-login.html');

function showAlert(msg, type = 'error') {
  const el = document.getElementById('alert');
  if (!el) {
    return;
  }

  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function updateAuthButtons() {
  const hasToken = Boolean(localStorage.getItem('token'));

  if (signInBtn) {
    signInBtn.textContent = hasToken ? 'Go to Dashboard' : 'Sign In';
  }

  if (signUpBtn) {
    signUpBtn.disabled = hasToken;
    signUpBtn.title = hasToken ? 'Already signed in' : 'Create a new account';
  }

  if (signOutBtn) {
    signOutBtn.disabled = !hasToken;
    signOutBtn.title = hasToken ? 'Sign out from current session' : 'No active session';
  }
}

if (signInBtn) {
  signInBtn.addEventListener('click', () => {
    if (localStorage.getItem('token')) {
      window.location.href = 'admin.html';
      return;
    }

    window.location.href = 'admin-login.html';
  });
}

if (signUpBtn) {
  signUpBtn.addEventListener('click', () => {
    if (localStorage.getItem('token')) {
      window.location.href = 'admin.html';
      return;
    }

    window.location.href = 'signup.html';
  });
}

if (signOutBtn) {
  signOutBtn.addEventListener('click', () => {
    if (!localStorage.getItem('token')) {
      showAlert('No active session to sign out.', 'error');
      return;
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthButtons();
    showAlert('Signed out successfully.', 'success');
  });
}

if (loginForm) {
  if (onAdminLoginPage && localStorage.getItem('token')) {
    window.location.href = 'admin.html';
  }

  loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || 'Login failed');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    updateAuthButtons();
    window.location.href = 'admin.html';
  } catch (err) {
    showAlert('Connection error. Is the server running?');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
  });
}

updateAuthButtons();
