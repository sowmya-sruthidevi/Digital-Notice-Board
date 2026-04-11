const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['text', 'image', 'video', 'audio'],
  },
  content: {
    type: String,
    required: true, // text content or file URL path
  },
  linkUrl: {
    type: String,
    default: '',
  },
  textLayout: {
    type: String,
    enum: ['single', 'multi'],
    default: 'single',
  },
  imageScale: {
    type: Number,
    default: 100,
    min: 20,
    max: 100,
  },
  imageFitMode: {
    type: String,
    enum: ['auto', 'custom'],
    default: 'auto',
  },
  imageWidth: {
    type: Number,
    default: 100,
    min: 20,
    max: 100,
  },
  imageHeight: {
    type: Number,
    default: 100,
    min: 20,
    max: 100,
  },
  duration: {
    type: Number,
    required: true,
    default: 10, // seconds
    min: 1,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
