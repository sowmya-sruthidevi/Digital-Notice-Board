const API = ['http:', 'https:'].includes(window.location.protocol)
  ? window.location.origin
  : 'http://localhost:3000';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
  window.location.href = 'index.html';
}

document.getElementById('historyUserName').textContent = `👋 ${user.name || 'Admin'}`;

function logoutHistory() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

async function loadHistory() {
  const container = document.getElementById('historyList');

  try {
    const res = await fetch(`${API}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const logs = await res.json();
    if (!res.ok) {
      throw new Error(logs.error || 'Failed to load history.');
    }

    if (!logs.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>No history yet.</p>
        </div>`;
      return;
    }

    container.innerHTML = logs.map((log) => {
      const who = log.performedBy?.name || log.performedBy?.email || 'Unknown user';
      const when = new Date(log.createdAt).toLocaleString();
      return `
        <div class="history-item">
          <div class="history-row">
            <div>
              <div class="history-line">${escapeHtml(log.summary)}</div>
              <div class="duration-info">${escapeHtml(who)} • ${when}</div>
            </div>
            <button class="btn btn-danger" onclick="deleteHistoryItem('${log._id}')">Delete</button>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>${escapeHtml(err.message || 'Failed to load history.')}</p>
      </div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

async function deleteHistoryItem(id) {
  if (!confirm('Delete this history item?')) return;

  try {
    const res = await fetch(`${API}/history/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete history item.');
    }

    loadHistory();
  } catch (err) {
    alert(err.message || 'Failed to delete history item.');
  }
}

async function clearHistory() {
  if (!confirm('Delete all history items?')) return;

  try {
    const res = await fetch(`${API}/history`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to clear history.');
    }

    loadHistory();
  } catch (err) {
    alert(err.message || 'Failed to clear history.');
  }
}

loadHistory();

window.logoutHistory = logoutHistory;
window.deleteHistoryItem = deleteHistoryItem;
window.clearHistory = clearHistory;
