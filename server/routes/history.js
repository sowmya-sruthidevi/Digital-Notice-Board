const express = require('express');
const HistoryLog = require('../models/HistoryLog');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /history - latest changes (protected)
router.get('/history', auth, async (req, res) => {
  try {
    const logs = await HistoryLog.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('performedBy', 'name email');

    res.json(logs);
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// DELETE /history/:id - remove one history entry (protected)
router.delete('/history/:id', auth, async (req, res) => {
  try {
    const removed = await HistoryLog.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'History item not found.' });
    res.json({ message: 'History item deleted.' });
  } catch (err) {
    console.error('History delete error:', err);
    res.status(500).json({ error: 'Failed to delete history item.' });
  }
});

// DELETE /history - remove all history entries (protected)
router.delete('/history', auth, async (req, res) => {
  try {
    await HistoryLog.deleteMany({});
    res.json({ message: 'All history deleted.' });
  } catch (err) {
    console.error('History clear error:', err);
    res.status(500).json({ error: 'Failed to clear history.' });
  }
});

module.exports = router;
