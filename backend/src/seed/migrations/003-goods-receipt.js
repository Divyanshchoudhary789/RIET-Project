/**
 * 003 — Purchase Order stock-entry status.
 *
 * Under the old flow, marking a PO "received" auto-incremented campus stock.
 * Those closed POs are considered done: `stockEntryStatus = 'completed'`.
 * Everything else defaults to 'not_required' (the schema default) until a fresh
 * goods-receipt sets it to 'pending'.
 *
 * Idempotent.
 */
module.exports.up = async (conn) => {
  const pos = conn.collection('purchaseorders');

  const res = await pos.updateMany(
    { status: { $in: ['closed', 'received'] }, stockEntryStatus: { $in: [null, 'not_required'] } },
    { $set: { stockEntryStatus: 'completed' } }
  );

  // Drop the obsolete stockUpdateRef field.
  await pos.updateMany({ stockUpdateRef: { $exists: true } }, { $unset: { stockUpdateRef: '' } });

  console.log(`\n   closed POs marked stock-complete: ${res.modifiedCount}`);
};
