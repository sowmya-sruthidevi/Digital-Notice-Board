const API = ['http:', 'https:'].includes(window.location.protocol)
  ? window.location.origin
  : 'http://localhost:3000';
const socket = io(API);
const container = document.getElementById('displayContainer');
const connStatus = document.getElementById('connStatus');
const noticeQrPanel = document.getElementById('noticeQrPanel');
const noticeQrImage = document.getElementById('noticeQrImage');
const noticeQrLabel = document.getElementById('noticeQrLabel');
const soundGate = document.getElementById('soundGate');
const enableSoundBtn = document.getElementById('enableSoundBtn');

let notices = [];
let currentIndex = 0;
let playTimer = null;
let soundUnlocked = false;

enableSoundBtn.addEventListener('click', tryEnableSound);
document.addEventListener('pointerdown', tryEnableSound, { once: false });
document.addEventListener('keydown', tryEnableSound, { once: false });

function tryEnableSound() {
  if (soundUnlocked) return;

  soundUnlocked = true;
  soundGate.classList.add('hidden');

  // Do not await here; keep media play inside the same user gesture tick.
  unlockMediaAudio().catch(() => {});

  const activeVideo = container.querySelector('.display-slide.active video');
  if (activeVideo) {
    activeVideo.muted = false;
    activeVideo.volume = 1;
    activeVideo.play().catch(() => {});
  }

  const activeAudio = container.querySelector('.display-slide.active audio');
  if (activeAudio) {
    activeAudio.muted = false;
    activeAudio.volume = 1;
    activeAudio.play().catch(() => {});
  }
}

// ── Socket Events ──
socket.on('connect', () => {
  connStatus.className = 'connection-status status-connected';
  connStatus.textContent = '● Connected';
  loadNotices();
});

socket.on('disconnect', () => {
  connStatus.className = 'connection-status status-disconnected';
  connStatus.textContent = '● Offline — playing cached';
  // Fall back to cached content
  const cached = localStorage.getItem('cachedNotices');
  if (cached) {
    notices = JSON.parse(cached);
    if (notices.length) startPlayback();
  }
});

socket.on('notice:added', () => loadNotices());
socket.on('notice:deleted', () => loadNotices());

// ── Load Notices ──
async function loadNotices() {
  try {
    const res = await fetch(`${API}/notices`);
    notices = await res.json();

    // Cache for offline
    localStorage.setItem('cachedNotices', JSON.stringify(notices));

    currentIndex = 0;
    startPlayback();
  } catch (err) {
    console.error('Failed to load notices:', err);
    // Try cached
    const cached = localStorage.getItem('cachedNotices');
    if (cached) {
      notices = JSON.parse(cached);
      startPlayback();
    }
  }
}

// ── Playback Engine ──
function startPlayback() {
  clearTimeout(playTimer);

  if (!notices.length) {
    hideNoticeQr();
    container.innerHTML = `
      <div class="display-slide active">
        <div class="text-notice">Waiting for notices...</div>
      </div>`;
    return;
  }

  showNotice(currentIndex);
}

function showNotice(index) {
  clearTimeout(playTimer);
  if (!notices.length) return;

  const notice = notices[index];
  const slide = createSlide(notice);

  // Fade transition
  const existing = container.querySelector('.display-slide.active');
  container.appendChild(slide);

  if (notice.type === 'text' && notice.textLayout === 'multi') {
    hideNoticeQr();
  } else {
    renderNoticeQr(notice);
  }

  requestAnimationFrame(() => {
    if (existing) existing.classList.remove('active');
    slide.classList.add('active');

    // Remove old slide after transition
    if (existing) {
      setTimeout(() => {
        // Pause any media in old slide
        const vid = existing.querySelector('video');
        const aud = existing.querySelector('audio');
        if (vid) { vid.pause(); vid.src = ''; }
        if (aud) { aud.pause(); aud.src = ''; }
        existing.remove();
      }, 900);
    }
  });

  // Determine when to advance
  const duration = (notice.duration || 10) * 1000;

  if (notice.type === 'video') {
    const video = slide.querySelector('video');
    if (video) {
      // Try to play with audio first, then fallback to muted autoplay if blocked.
      ensureMediaPlayback(video, true);

      // Strict rotation: always advance only by configured notice duration.
      playTimer = setTimeout(advance, duration);
      video.onerror = () => {
        // On media failure, switch early to keep rotation healthy.
        advance();
      };
    } else {
      playTimer = setTimeout(advance, duration);
    }
  } else if (notice.type === 'audio') {
    const audio = slide.querySelector('audio');
    if (audio) {
      ensureMediaPlayback(audio, true);

      // Strict rotation: always advance only by configured notice duration.
      playTimer = setTimeout(advance, duration);
      audio.onerror = () => {
        // On media failure, switch early to keep rotation healthy.
        advance();
      };
    } else {
      playTimer = setTimeout(advance, duration);
    }
  } else {
    // Text or image — use duration
    playTimer = setTimeout(advance, duration);
  }
}

function advance() {
  clearTimeout(playTimer);
  currentIndex = getNextNoticeIndex(currentIndex);
  showNotice(currentIndex);
}

function getNextNoticeIndex(index) {
  if (!notices.length) return 0;

  const current = notices[index];
  const isMultiText = current && current.type === 'text' && current.textLayout === 'multi';

  if (!isMultiText) {
    return (index + 1) % notices.length;
  }

  let next = (index + 1) % notices.length;
  while (next !== index) {
    const notice = notices[next];
    if (!(notice && notice.type === 'text' && notice.textLayout === 'multi')) {
      return next;
    }
    next = (next + 1) % notices.length;
  }

  return index;
}

function createSlide(notice) {
  const slide = document.createElement('div');
  slide.className = 'display-slide';

  if (notice.type === 'text' && notice.textLayout === 'multi') {
    slide.innerHTML = renderMultiTextNoticesHtml();
    queueMicrotask(() => loadMultiRowQrs(slide));
    return slide;
  }

  switch (notice.type) {
    case 'text':
      slide.innerHTML = `<div class="text-notice">${escapeHtml(getDisplayText(notice))}</div>`;
      break;

    case 'image':
      const isAutoFit = String(notice.imageFitMode || 'auto').toLowerCase() !== 'custom';
      const imageWidth = isAutoFit ? 100 : clampPercent(notice.imageWidth || notice.imageScale || 100);
      const imageHeight = isAutoFit ? 100 : clampPercent(notice.imageHeight || notice.imageScale || 100);
      slide.classList.add('image-fill-slide');
      slide.innerHTML = `<img class="image-fill ${isAutoFit ? 'auto-fit' : 'custom-fit'}" style="--img-w:${imageWidth}vw; --img-h:${imageHeight}vh;" src="${notice.content}" alt="Notice" onerror="this.parentElement.innerHTML='<div class=\\'text-notice\\'>Image unavailable</div>'" />`;
      break;

    case 'video':
      slide.innerHTML = `<video src="${notice.content}" autoplay playsinline onerror="this.parentElement.innerHTML='<div class=\\'text-notice\\'>Video unavailable</div>'"></video>`;
      break;

    case 'audio':
      slide.innerHTML = `
        <div class="audio-visual">
          <div class="audio-icon">🎵</div>
          <p>Now Playing</p>
          <audio src="${notice.content}" autoplay onerror="this.closest('.display-slide').querySelector('.audio-icon').textContent='❌'"></audio>
        </div>`;
      break;

    default:
      slide.innerHTML = `<div class="text-notice">${escapeHtml(notice.content || 'Unknown notice')}</div>`;
  }

  return slide;
}

function renderMultiTextNoticesHtml() {
  const textNotices = notices.filter((n) => n.type === 'text' && n.textLayout === 'multi').slice(0, 3);

  if (!textNotices.length) {
    return `<div class="text-notice">Waiting for notices...</div>`;
  }

  const items = textNotices.map((n, index) => {
    const multiColorClass = `multi-band-${(index % 4) + 1}`;
    const { headline, subline } = splitNoticeContent(n.content);
    const qrText = String(n.linkUrl || '').trim();

    return `
      <article class="multi-text-row ${multiColorClass}">
        <div class="multi-text-left">
          <div class="multi-date-badge">NOTICE ${String(index + 1).padStart(2, '0')}</div>
        </div>
        <div class="multi-text-mid">
          <div class="multi-text-headline">${escapeHtml(headline)}</div>
          ${subline ? `<div class="multi-text-subline">${escapeHtml(subline)}</div>` : ''}
        </div>
        <div class="multi-text-right">
          ${qrText ? `<div class="multi-qr-slot" data-qr-text="${escapeHtml(qrText)}">
              <div class="multi-qr-caption">SCAN</div>
              <img class="multi-qr-image hidden" alt="Related QR code" />
            </div>` : ''}
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="multi-text-board">
      <div class="multi-fixed-title">NOTICES</div>
      <div class="multi-text-stack">${items}</div>
    </section>`;
}

function splitNoticeContent(content) {
  const text = String(content || '').trim();
  if (!text) return { headline: 'Notice', subline: '' };

  const newlineParts = text.split(/\r?\n+/).map((part) => part.trim()).filter(Boolean);
  if (newlineParts.length >= 2) {
    return {
      headline: newlineParts[0],
      subline: newlineParts.slice(1).join(' '),
    };
  }

  const colonParts = text.split(':');
  if (colonParts.length >= 2) {
    return {
      headline: colonParts[0].trim(),
      subline: colonParts.slice(1).join(':').trim(),
    };
  }

  return {
    headline: text,
    subline: '',
  };
}

async function loadMultiRowQrs(slide) {
  const slots = Array.from(slide.querySelectorAll('.multi-qr-slot[data-qr-text]'));
  await Promise.all(slots.map(async (slot) => {
    const qrText = slot.getAttribute('data-qr-text');
    if (!qrText) return;

    try {
      const res = await fetch(`${API}/qr?text=${encodeURIComponent(qrText)}`);
      const data = await res.json();
      const img = slot.querySelector('.multi-qr-image');
      if (img) {
        img.src = data.qr;
        img.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Failed to load row QR:', err);
      slot.innerHTML = '<div class="multi-no-qr">QR FAIL</div>';
    }
  }));
}

function getDisplayText(notice) {
  const hasLink = isWebsiteUrl(String(notice.linkUrl || '').trim());
  const content = String(notice.content || '').trim();
  const contentIsUrl = isWebsiteUrl(content);

  if (hasLink && contentIsUrl) {
    return 'Scan the QR code for details';
  }

  return content || 'Notice';
}

function ensureMediaPlayback(mediaEl, withAudio) {
  const allowSound = withAudio && soundUnlocked;
  mediaEl.volume = 1;
  mediaEl.muted = !allowSound;

  mediaEl.play().catch(() => {
    // Fallback: browsers usually allow muted autoplay.
    mediaEl.muted = true;
    mediaEl.play().catch(() => {
      // Keep silent failure here; safety timer will advance slide.
    });
  });
}

async function unlockMediaAudio() {
  try {
    const probe = new Audio();
    probe.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAA';
    probe.volume = 0;
    await probe.play();
    probe.pause();
  } catch {
    // Ignore: we still keep trying normal media playback below.
  }
}

async function renderNoticeQr(notice) {
  try {
    const qrText = getQrTextForNotice(notice);
    if (!qrText) {
      hideNoticeQr();
      return;
    }

    const res = await fetch(`${API}/qr?text=${encodeURIComponent(qrText)}`);
    const data = await res.json();

    noticeQrImage.src = data.qr;
    noticeQrLabel.textContent = isWebsiteUrl(qrText)
      ? 'Scan to open the website'
      : 'Scan to read this notice';
    noticeQrPanel.classList.remove('hidden');
  } catch (err) {
    console.error('Failed to render notice QR:', err);
    hideNoticeQr();
  }
}

function getQrTextForNotice(notice) {
  if (!notice || notice.type !== 'text') return '';

  const link = String(notice.linkUrl || '').trim();
  if (isWebsiteUrl(link)) return link;

  return '';
}

function isWebsiteUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 100;
  return Math.min(100, Math.max(20, n));
}

function hideNoticeQr() {
  noticeQrPanel.classList.add('hidden');
  noticeQrImage.removeAttribute('src');
  noticeQrLabel.textContent = '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Initial Load ──
loadNotices();
