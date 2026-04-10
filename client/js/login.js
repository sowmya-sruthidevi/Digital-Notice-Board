const API = window.location.origin;

function showAlert(msg, type = 'error') {
  const el = document.getElementById('alert');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// Redirect if already logged in
if (localStorage.getItem('token')) {
  window.location.href = 'admin.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
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
    window.location.href = 'admin.html';
  } catch (err) {
    showAlert('Connection error. Is the server running?');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});
