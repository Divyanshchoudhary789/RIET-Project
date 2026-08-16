const Counter = require('./counter.model');

/**
 * Generates a unique, atomic, sequential PO number in the format: RIET-PO-YYYY-NNNNN
 * Uses a MongoDB counter document with $inc to prevent race conditions under concurrent requests.
 */
const generatePoNumber = async () => {
  const year = new Date().getFullYear();
  const counterId = `po_${year}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `RIET-PO-${year}-${String(counter.seq).padStart(5, '0')}`;
};

module.exports = { generatePoNumber };
