const mongoose = require('mongoose');
const { TIMELINE_ACTIONS } = require('../../config/constants');

/**
 * Reusable embedded sub-document schema for tracking document lifecycle events.
 * This is not a standalone model — it is embedded into every workflow document.
 */
const timelineEntrySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(TIMELINE_ACTIONS),
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

module.exports = timelineEntrySchema;
