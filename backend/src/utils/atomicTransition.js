/**
 * Atomically transitions a document's status, guarding against concurrent
 * duplicate actions (e.g. two reviewers clicking Approve/Reject on the same
 * document at the same time — a classic TOCTOU race with findById + save()).
 *
 * Returns the updated document, or null if no document matched both the id
 * AND the allowed current-status filter (either it doesn't exist, or it was
 * already transitioned by a concurrent request).
 */
const applyAtomicTransition = async (Model, id, allowedStatuses, update, populateOptions) => {
  let query = Model.findOneAndUpdate(
    { _id: id, status: { $in: allowedStatuses } },
    update,
    { new: true, runValidators: true }
  );
  if (populateOptions) {
    const options = Array.isArray(populateOptions) ? populateOptions : [populateOptions];
    options.forEach((opt) => { query = query.populate(opt); });
  }
  return query;
};

/**
 * Throws a standardized error when an atomic transition returns null,
 * distinguishing "not found" (404) from "already processed by someone else" (409).
 */
const throwTransitionConflict = async (Model, id, notFoundMessage, conflictMessage) => {
  const exists = await Model.exists({ _id: id });
  const error = new Error(exists ? conflictMessage : notFoundMessage);
  error.statusCode = exists ? 409 : 404;
  throw error;
};

module.exports = { applyAtomicTransition, throwTransitionConflict };
