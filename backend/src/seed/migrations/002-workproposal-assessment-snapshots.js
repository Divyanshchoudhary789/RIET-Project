/**
 * 002 — Work Proposal & Assessment line-item snapshots + per-department fan-out.
 *
 *  - WorkProposal: build `items` from the linked requirements, tagging every row
 *    with the (legacy single) department; set `campusRefs`; migrate the single
 *    `assessmentRef` into `assessmentRefs`.
 *  - Assessment: copy the proposal's items into its own snapshot.
 *  - Detect any pre-existing duplicate (proposal, department) assessments so the
 *    new unique index can be created safely.
 *
 * Idempotent.
 */
module.exports.up = async (conn) => {
  const proposals = conn.collection('workproposals');
  const requirements = conn.collection('requirements');
  const assessments = conn.collection('assessments');

  let wpCount = 0;
  const cursor = proposals.find({ items: { $exists: false } });
  while (await cursor.hasNext()) {
    const wp = await cursor.next();
    const reqs = await requirements
      .find({ _id: { $in: wp.requirementRefs || [] } })
      .toArray();

    const deptId = (wp.departmentRefs && wp.departmentRefs[0]) || null;
    const items = [];
    const campusSet = new Set();
    for (const r of reqs) {
      if (r.campusRef) campusSet.add(r.campusRef.toString());
      for (const it of r.items || []) {
        items.push({
          sourceRequirementRef: r._id,
          sourceItemId: it._id || null,
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          price: it.price || 0,
          description: it.description || '',
          departmentRef: deptId,
        });
      }
    }

    const campusRefs = reqs
      .map((r) => r.campusRef)
      .filter((c, i, arr) => c && arr.findIndex((x) => x && x.toString() === c.toString()) === i);

    await proposals.updateOne(
      { _id: wp._id },
      {
        $set: {
          items,
          campusRefs,
          assessmentRefs: wp.assessmentRef ? [wp.assessmentRef] : (wp.assessmentRefs || []),
        },
      }
    );
    wpCount += 1;
  }

  // Assessment snapshots
  let aCount = 0;
  const aCursor = assessments.find({ items: { $exists: false } });
  while (await aCursor.hasNext()) {
    const a = await aCursor.next();
    const wp = a.workProposalRef ? await proposals.findOne({ _id: a.workProposalRef }) : null;
    const items = (wp?.items || [])
      .filter((i) => !a.departmentRef || !i.departmentRef || i.departmentRef.toString() === a.departmentRef.toString())
      .map((i) => ({
        sourceRequirementRef: i.sourceRequirementRef || null,
        sourceItemId: i.sourceItemId || null,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        price: i.price || 0,
        description: i.description || '',
      }));
    await assessments.updateOne(
      { _id: a._id },
      { $set: { items, itemsEdited: false } }
    );
    aCount += 1;
  }

  // Duplicate (proposal, department) check
  const dupes = await assessments
    .aggregate([
      { $match: { workProposalRef: { $ne: null }, departmentRef: { $ne: null } } },
      { $group: { _id: { wp: '$workProposalRef', dept: '$departmentRef' }, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();
  if (dupes.length) {
    console.warn(
      `\n   ⚠ ${dupes.length} duplicate (proposal, department) assessment group(s) found — ` +
        'resolve these before the unique index will build:'
    );
    dupes.forEach((d) => console.warn(`     proposal ${d._id.wp} / dept ${d._id.dept} → ${d.n} rows`));
  }

  console.log(`\n   proposals: ${wpCount} | assessments: ${aCount} | dupe groups: ${dupes.length}`);
};
