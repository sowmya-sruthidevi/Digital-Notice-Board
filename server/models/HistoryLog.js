const mongoose = require('mongoose');

const historyLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['added', 'removed', 'edited'],
    required: true,
  },
  noticeType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio'],
    required: true,
  },
  summary: {
    type: String,
    required: true,
    trim: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('HistoryLog', historyLogSchema);
