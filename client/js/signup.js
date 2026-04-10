const API = ['http:', 'https:'].includes(window.location.protocol)
  ? window.location.origin
  : 'http://localhost:3000';

function showAlert(msg, type = 'error') {
  const el = document.getElementById('alert');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

if (localStorage.getItem('token')) {
  window.location.href = 'admin.html';
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const res = await fetch(`${API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || 'Signup failed');
      return;
    }

    // Do not auto-login after signup; user should sign in explicitly.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showAlert('Account created! Please sign in.', 'success');
    setTimeout(() => { window.location.href = 'admin-login.html'; }, 1000);
  } catch (err) {
    showAlert('Connection error. Is the server running?');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});
