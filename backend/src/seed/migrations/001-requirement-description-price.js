/**
 * 001 — Requirement: rename `justification` → `description`, add `items[].price`.
 * Idempotent.
 */
module.exports.up = async (conn) => {
  const requirements = conn.collection('requirements');

  // justification -> description (only rows still carrying the old field)
  const renameRes = await requirements.updateMany(
    { justification: { $exists: true } },
    [
      { $set: { description: { $ifNull: ['$description', '$justification'] } } },
      { $unset: 'justification' },
    ]
  );

  // Backfill a price on any item missing one.
  const priceRes = await requirements.updateMany(
    { 'items.price': { $exists: false } },
    { $set: { 'items.$[it].price': 0 } },
    { arrayFilters: [{ 'it.price': { $exists: false } }] }
  );

  console.log(
    `\n   justification→description: ${renameRes.modifiedCount} | items price backfill: ${priceRes.modifiedCount}`
  );
};
