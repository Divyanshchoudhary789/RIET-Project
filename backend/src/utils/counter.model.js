const mongoose = require('mongoose');

/**
 * Atomic counter collection for generating sequential document numbers.
 * Each document represents a named counter (e.g. "po_2026").
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
