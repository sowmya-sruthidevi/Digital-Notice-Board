const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const os = require('os');
const Notice = require('../models/Notice');
const HistoryLog = require('../models/HistoryLog');
const auth = require('../middleware/auth');

const router = express.Router();

function normalizeWebsiteLink(linkValue) {
  const rawLink = String(linkValue || '').trim();
  if (!rawLink) return '';

  const normalized = /^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`;
  const parsed = new URL(normalized);
  return parsed.toString();
}

function isPreferredLanIPv4(ip) {
  return ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

// --- Multer configuration ---
const UPLOAD_BASE = path.join(__dirname, '..', '..', 'uploads');

// Ensure upload directories exist
['images', 'videos', 'audio'].forEach((dir) => {
  const dirPath = path.join(UPLOAD_BASE, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'images';
    if (ALLOWED_TYPES.video.includes(file.mimetype)) folder = 'videos';
    else if (ALLOWED_TYPES.audio.includes(file.mimetype)) folder = 'audio';
    cb(null, path.join(UPLOAD_BASE, folder));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allAllowed = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.video, ...ALLOWED_TYPES.audio];
  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    // Default 200MB to support common classroom/event videos.
    fileSize: (parseInt(process.env.MAX_UPLOAD_MB, 10) || 200) * 1024 * 1024,
  },
});

// --- Routes ---

// POST /notice — Create a notice (protected)
router.post('/notice', auth, upload.single('file'), async (req, res) => {
  try {
    const { type, content, duration, linkUrl, textLayout, imageScale } = req.body;

    if (!type) return res.status(400).json({ error: 'Notice type is required.' });

    let noticeContent = content;
    let noticeLinkUrl = '';
    let noticeTextLayout = 'single';
    let noticeImageScale = 100;

    // For media types, use uploaded file path
    if (['image', 'video', 'audio'].includes(type)) {
      if (!req.file) {
        return res.status(400).json({ error: `File upload required for type "${type}".` });
      }
      // Build relative URL path
      const folder = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'audio';
      noticeContent = `/uploads/${folder}/${req.file.filename}`;

      if (type === 'image') {
        const parsedScale = parseInt(imageScale, 10);
        if (Number.isFinite(parsedScale)) {
          noticeImageScale = Math.min(100, Math.max(20, parsedScale));
        }
      }
    } else if (type === 'text') {
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Text content is required.' });
      }
      if (linkUrl && String(linkUrl).trim()) {
        try {
          noticeLinkUrl = normalizeWebsiteLink(linkUrl);
        } catch {
          return res.status(400).json({ error: 'Website link must be a valid URL.' });
        }
      }

      if (textLayout === 'multi') {
        noticeTextLayout = 'multi';
      }
    }

    const notice = await Notice.create({
      type,
      content: noticeContent,
      linkUrl: noticeLinkUrl,
      textLayout: noticeTextLayout,
      imageScale: noticeImageScale,
      duration: parseInt(duration) || 10,
      createdBy: req.user.id,
    });

    const summary = type === 'text'
      ? `Added text notice: ${String(noticeContent).slice(0, 60)}`
      : `Added ${type} notice`;

    await HistoryLog.create({
      action: 'added',
      noticeType: type,
      summary,
      performedBy: req.user.id,
    });

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('notice:added', notice);

    res.status(201).json({ message: 'Notice created!', notice });
  } catch (err) {
    console.error('Create notice error:', err);
    res.status(500).json({ error: 'Failed to create notice.' });
  }
});

// PUT /notice/:id — Update notice (protected)
router.put('/notice/:id', auth, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ error: 'Notice not found.' });

    const { content, duration, linkUrl, textLayout, imageScale } = req.body;

    if (notice.type === 'text') {
      const nextContent = String(content || '').trim();
      if (!nextContent) {
        return res.status(400).json({ error: 'Text content is required.' });
      }
      notice.content = nextContent;

      if (String(linkUrl || '').trim()) {
        try {
          notice.linkUrl = normalizeWebsiteLink(linkUrl);
        } catch {
          return res.status(400).json({ error: 'Website link must be a valid URL.' });
        }
      } else {
        notice.linkUrl = '';
      }

      notice.textLayout = textLayout === 'multi' ? 'multi' : 'single';
    }

    if (notice.type === 'image' && imageScale !== undefined) {
      const parsedScale = parseInt(imageScale, 10);
      if (!Number.isFinite(parsedScale)) {
        return res.status(400).json({ error: 'Image display size must be a valid number.' });
      }
      notice.imageScale = Math.min(100, Math.max(20, parsedScale));
    }

    if (duration !== undefined) {
      const parsedDuration = parseInt(duration, 10);
      if (!Number.isFinite(parsedDuration) || parsedDuration < 1) {
        return res.status(400).json({ error: 'Duration must be at least 1 second.' });
      }
      notice.duration = parsedDuration;
    }

    await notice.save();

    await HistoryLog.create({
      action: 'edited',
      noticeType: notice.type,
      summary: notice.type === 'text'
        ? `Edited text notice: ${String(notice.content).slice(0, 60)}`
        : `Edited ${notice.type} notice duration`,
      performedBy: req.user.id,
    });

    const io = req.app.get('io');
    io.emit('notice:updated', notice);

    res.json({ message: 'Notice updated.', notice });
  } catch (err) {
    console.error('Update notice error:', err);
    res.status(500).json({ error: 'Failed to update notice.' });
  }
});

// GET /notices — Get all notices (public)
router.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 }).populate('createdBy', 'name email');
    res.json(notices);
  } catch (err) {
    console.error('Fetch notices error:', err);
    res.status(500).json({ error: 'Failed to fetch notices.' });
  }
});

// DELETE /notice/:id — Delete a notice (protected)
router.delete('/notice/:id', auth, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ error: 'Notice not found.' });

    // Delete associated file if it's a media type
    if (['image', 'video', 'audio'].includes(notice.type) && notice.content) {
      const relativeContentPath = String(notice.content).replace(/^\/+/, '');
      const filePath = path.join(__dirname, '..', '..', relativeContentPath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const summary = notice.type === 'text'
      ? `Removed text notice: ${String(notice.content).slice(0, 60)}`
      : `Removed ${notice.type} notice`;

    await HistoryLog.create({
      action: 'removed',
      noticeType: notice.type,
      summary,
      performedBy: req.user.id,
    });

    await Notice.findByIdAndDelete(req.params.id);

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('notice:deleted', { id: req.params.id });

    res.json({ message: 'Notice deleted.' });
  } catch (err) {
    console.error('Delete notice error:', err);
    res.status(500).json({ error: 'Failed to delete notice.' });
  }
});

// GET /qr — Generate QR code for display page
router.get('/qr', async (req, res) => {
  try {
    const qrText = typeof req.query.text === 'string' ? req.query.text.trim() : '';

    if (qrText) {
      const qrDataURL = await QRCode.toDataURL(qrText, {
        width: 400,
        margin: 2,
        color: { dark: '#12233d', light: '#f8fbff' },
      });

      return res.json({ qr: qrDataURL, url: qrText, mode: 'text' });
    }

    // Get local IP
    const interfaces = os.networkInterfaces();
    let localIP = 'localhost';
    let fallbackIP = null;

    for (const name of Object.keys(interfaces)) {
      // Skip virtual/tunnel adapters that are usually unreachable from phones.
      if (/vEthernet|VMware|VirtualBox|Loopback|Teredo|Hyper-V|WSL/i.test(name)) {
        continue;
      }

      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          fallbackIP = fallbackIP || iface.address;
          if (isPreferredLanIPv4(iface.address)) {
            localIP = iface.address;
            break;
          }
        }
      }

      if (localIP !== 'localhost') break;
    }

    if (localIP === 'localhost' && fallbackIP) localIP = fallbackIP;

    const port = process.env.PORT || 3000;
    const displayURL = `http://${localIP}:${port}/display.html`;

    const qrDataURL = await QRCode.toDataURL(displayURL, {
      width: 400,
      margin: 2,
      color: { dark: '#667eea', light: '#0a0a0f' },
    });

    res.json({ qr: qrDataURL, url: displayURL, mode: 'display-url' });
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code.' });
  }
});

module.exports = router;

// Return upload errors as JSON so the client can show accurate messages.
router.use((err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = parseInt(process.env.MAX_UPLOAD_MB, 10) || 200;
      return res.status(400).json({ error: `File is too large. Maximum allowed size is ${maxMb}MB.` });
    }
    return res.status(400).json({ error: err.message || 'Upload failed.' });
  }

  if (err.message && err.message.includes('not allowed')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Notice route error:', err);
  return res.status(500).json({ error: 'Unexpected server error.' });
});
