const API = ['http:', 'https:'].includes(window.location.protocol)
  ? window.location.origin
  : 'http://localhost:3000';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Auth guard
if (!token) window.location.href = 'index.html';

// Display user name
document.getElementById('userName').textContent = `👋 ${user.name || 'Admin'}`;

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// ── Socket.IO ──
const socket = io(API);

socket.on('notice:added', (notice) => {
  loadNotices();
});

socket.on('notice:deleted', () => {
  loadNotices();
});

socket.on('notice:updated', () => {
  loadNotices();
});

// ── Notice Type Toggle ──
const typeSelect = document.getElementById('noticeType');
const textGroup = document.getElementById('textGroup');
const fileGroup = document.getElementById('fileGroup');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const qrSource = document.getElementById('qrSource');
const qrCustomGroup = document.getElementById('qrCustomGroup');
const qrCustomText = document.getElementById('qrCustomText');
const textContent = document.getElementById('textContent');
const textLayoutGroup = document.getElementById('textLayoutGroup');
const textLayout = document.getElementById('textLayout');
const linkGroup = document.getElementById('linkGroup');
const linkUrl = document.getElementById('linkUrl');
const imageSizeGroup = document.getElementById('imageSizeGroup');
const imageSize = document.getElementById('imageSize');

const FILE_ACCEPTS = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  video: 'video/mp4,video/webm,video/ogg',
  audio: 'audio/mpeg,audio/wav,audio/ogg',
};

typeSelect.addEventListener('change', () => {
  const type = typeSelect.value;
  if (type === 'text') {
    textGroup.classList.remove('hidden');
    textLayoutGroup.classList.remove('hidden');
    linkGroup.classList.remove('hidden');
    imageSizeGroup.classList.add('hidden');
    fileGroup.classList.add('hidden');
  } else {
    textGroup.classList.add('hidden');
    textLayoutGroup.classList.add('hidden');
    linkGroup.classList.add('hidden');
    imageSizeGroup.classList.toggle('hidden', type !== 'image');
    fileGroup.classList.remove('hidden');
    fileInput.accept = FILE_ACCEPTS[type] || '';
    fileName.classList.add('hidden');
    fileInput.value = '';
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    fileName.textContent = fileInput.files[0].name;
    fileName.classList.remove('hidden');
  }
});

qrSource.addEventListener('change', () => {
  const isCustom = qrSource.value === 'custom-text';
  qrCustomGroup.classList.toggle('hidden', !isCustom);
  loadQR();
});

textContent.addEventListener('input', () => {
  if (qrSource.value === 'notice-text') {
    loadQR();
  }
});

linkUrl.addEventListener('input', () => {
  if (qrSource.value === 'notice-text') {
    loadQR();
  }
});

qrCustomText.addEventListener('input', () => {
  if (qrSource.value === 'custom-text') {
    loadQR();
  }
});

// ── Create Notice ──
document.getElementById('noticeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('createBtn');
  const alertEl = document.getElementById('createAlert');
  const type = typeSelect.value;
  const duration = document.getElementById('duration').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    let res;

    if (type === 'text') {
      const content = document.getElementById('textContent').value.trim();
      const websiteLink = linkUrl.value.trim();
      const selectedTextLayout = textLayout.value === 'multi' ? 'multi' : 'single';
      if (!content) {
        showCreateAlert('Please enter text content.', 'error');
        return;
      }
      res = await fetch(`${API}/notice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          content,
          duration,
          linkUrl: websiteLink,
          textLayout: selectedTextLayout,
        }),
      });
    } else {
      if (!fileInput.files.length) {
        showCreateAlert('Please select a file.', 'error');
        return;
      }
      const formData = new FormData();
      formData.append('type', type);
      formData.append('duration', duration);
      formData.append('file', fileInput.files[0]);
      if (type === 'image') {
        formData.append('imageScale', imageSize.value || '100');
      }

      res = await fetch(`${API}/notice`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
    }

    const data = await readResponseData(res);
    if (!res.ok) {
      showCreateAlert(data.error || 'Failed to create notice.', 'error');
      return;
    }

    showCreateAlert('Notice created! ✨', 'success');
    document.getElementById('noticeForm').reset();
    fileName.classList.add('hidden');
    textGroup.classList.remove('hidden');
    textLayoutGroup.classList.remove('hidden');
    linkGroup.classList.remove('hidden');
    imageSizeGroup.classList.add('hidden');
    fileGroup.classList.add('hidden');
    loadNotices();
  } catch (err) {
    showCreateAlert(err.message || 'Connection error.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Notice';
  }
});

async function readResponseData(res) {
  const raw = await res.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { error: raw.slice(0, 220) };
  }
}

function showCreateAlert(msg, type) {
  const el = document.getElementById('createAlert');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ── Load Notices ──
async function loadNotices() {
  try {
    const res = await fetch(`${API}/notices`);
    const notices = await res.json();
    renderNotices(notices);
  } catch (err) {
    console.error('Failed to load notices:', err);
  }
}

function renderNotices(notices) {
  const container = document.getElementById('noticeList');

  if (!notices.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No notices yet. Create your first one!</p>
      </div>`;
    return;
  }

  container.innerHTML = notices.map((n) => {
    const typeEmoji = { text: '📝', image: '🖼️', video: '🎬', audio: '🎵' };
    const preview = n.type === 'text'
      ? n.content.substring(0, 50) + (n.content.length > 50 ? '...' : '')
      : n.content.split('/').pop();

    return `
      <div class="notice-item">
        <div class="notice-meta">
          <span class="type-badge type-${n.type}">${typeEmoji[n.type] || ''} ${n.type}</span>
          <div class="content-preview">${preview}</div>
          ${n.type === 'text' ? `<div class="duration-info">🧩 ${n.textLayout || 'single'} text mode</div>` : ''}
          ${n.type === 'image' ? `<div class="duration-info">🖼 ${n.imageScale || 100}% size</div>` : ''}
          ${n.type === 'text' && n.linkUrl ? `<div class="duration-info">🔗 Link is attached (QR only)</div>` : ''}
          <div class="duration-info">⏱ ${n.duration}s • ${new Date(n.createdAt).toLocaleString()}</div>
        </div>
        <div class="notice-actions">
          <button class="btn btn-ghost" onclick="editNotice('${n._id}')">Edit</button>
          <button class="btn btn-danger" onclick="deleteNotice('${n._id}')">Delete</button>
        </div>
      </div>`;
  }).join('');
}

async function editNotice(id) {
  const notice = await fetchNoticeById(id);
  if (!notice) return;

  let nextDuration = prompt('Duration in seconds:', String(notice.duration || 10));
  if (nextDuration === null) return;

  if (notice.type === 'text') {
    const nextContent = prompt('Edit text notice:', notice.content || '');
    if (nextContent === null) return;

    const nextLayout = prompt('Text mode (single or multi):', notice.textLayout || 'single');
    if (nextLayout === null) return;

    const nextLink = prompt('Website link for QR (optional):', notice.linkUrl || '');
    if (nextLink === null) return;

    await updateNotice(id, {
      content: nextContent.trim(),
      duration: nextDuration,
      textLayout: nextLayout.trim().toLowerCase() === 'multi' ? 'multi' : 'single',
      linkUrl: nextLink.trim(),
    });
    return;
  }

  if (notice.type === 'image') {
    const nextScale = prompt('Image display size % (20-100):', String(notice.imageScale || 100));
    if (nextScale === null) return;

    await updateNotice(id, {
      duration: nextDuration,
      imageScale: nextScale,
    });
    return;
  }

  await updateNotice(id, { duration: nextDuration });
}

async function fetchNoticeById(id) {
  try {
    const res = await fetch(`${API}/notices`);
    const list = await res.json();
    return list.find((n) => n._id === id);
  } catch {
    showCreateAlert('Failed to load notice details.', 'error');
    return null;
  }
}

async function updateNotice(id, payload) {
  try {
    const res = await fetch(`${API}/notice/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      showCreateAlert(data.error || 'Failed to update notice.', 'error');
      return;
    }

    showCreateAlert('Notice updated.', 'success');
    loadNotices();
  } catch {
    showCreateAlert('Failed to update notice.', 'error');
  }
}

async function deleteNotice(id) {
  if (!confirm('Delete this notice?')) return;
  try {
    await fetch(`${API}/notice/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    loadNotices();
  } catch (err) {
    alert('Failed to delete.');
  }
}

// ── Load QR Code ──
async function loadQR() {
  try {
    const mode = qrSource.value;
    let qrText = '';
    const qrImg = document.getElementById('qrImage');
    const qrUrl = document.getElementById('qrUrl');

    if (mode === 'notice-text') {
      qrText = linkUrl.value.trim();
      if (!qrText) {
        qrImg.style.display = 'none';
        qrUrl.textContent = 'Add a website link in the notice form to generate a related QR code.';
        return;
      }
    } else if (mode === 'custom-text') {
      qrText = qrCustomText.value.trim();
      if (!qrText) qrText = 'Paste a website link or type custom text here.';
    }

    const endpoint = qrText ? `${API}/qr?text=${encodeURIComponent(qrText)}` : `${API}/qr`;
    const res = await fetch(endpoint);
    const data = await res.json();
    qrImg.src = data.qr;
    qrImg.style.display = 'block';
    qrUrl.textContent = data.url;
  } catch (err) {
    console.error('QR load error:', err);
  }
}

// ── Init ──
loadNotices();
loadQR();
