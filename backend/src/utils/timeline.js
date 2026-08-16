const { TIMELINE_ACTIONS, ROLE_LABELS } = require('../config/constants');

/**
 * Builds a timeline entry object from an actor (User document) and action details.
 * This is the single source of truth for creating timeline entries across all modules.
 *
 * @param {object} actor - The User document performing the action
 * @param {string} action - One of TIMELINE_ACTIONS values
 * @param {string} [note] - Optional note (mandatory for rejections, enforced at controller level)
 * @returns {object} Timeline entry ready to be pushed into a document's timeline array
 */
const buildTimelineEntry = (actor, action, note = '') => {
  if (!Object.values(TIMELINE_ACTIONS).includes(action)) {
    throw new Error(`Invalid timeline action: ${action}`);
  }

  return {
    actor: actor._id,
    actorRole: ROLE_LABELS[actor.role] || actor.role,
    action,
    note: note.trim(),
    timestamp: new Date(),
  };
};

module.exports = { buildTimelineEntry };
