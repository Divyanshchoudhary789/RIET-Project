const Joi = require('joi');

/**
 * Shared schema for workflow "forward" / "approve" actions that let the actor
 * attach an optional free-text note (persisted as the timeline entry note).
 * Rejection has been removed from every stage except the Chairperson memo
 * decision, so this replaces the old mandatory `rejectSchema` on those routes.
 */
const actionNoteSchema = Joi.object({
  note: Joi.string().trim().max(1000).optional().allow('').messages({
    'string.max': 'Note must not exceed 1000 characters.',
  }),
});

module.exports = { actionNoteSchema };
