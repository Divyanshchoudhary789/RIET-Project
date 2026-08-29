import React from 'react';
import {
  Send,
  FileText,
  ClipboardList,
  Receipt,
  ScrollText,
  ShoppingCart,
  PackageCheck,
  IndianRupee,
  Clock,
  Hourglass,
  XCircle,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';
import { formatDate, formatCurrency, getStatusClass } from '../utils/helpers';

/**
 * ApprovalJourney — full vertical stepper for the procurement approval chain.
 *
 * Flow (top → bottom):
 *   1. Requirement Submitted   — Center Head
 *   2. Work Proposal Created   — Cluster Manager
 *   3. Department Assessment   — Dept Admin
 *   4. PO Notesheet            — PO Office
 *   5. Director's Memo         — Director → Chairperson
 *   6. Purchase Order Issued   — Accounts
 *   7. Goods Received          — Accounts (final step, stock updated)
 */

// ─── Status colour map ────────────────────────────────────────────────────────

const STATUS_COLOR = {
  submitted:    '#2563eb',
  revised:      '#d97706',
  forwarded:    '#7c3aed',
  under_review: '#0891b2',
  approved:     '#16a34a',
  issued:       '#0891b2',
  pi_uploaded:  '#7c3aed',
  received:     '#16a34a',
  closed:       '#0f766e',
  rejected:     '#dc2626',
  pending:      '#94a3b8',
};

const statusColor = (s) => STATUS_COLOR[(s || '').toLowerCase()] || '#94a3b8';

// ─── Stage → icon map ─────────────────────────────────────────────────────────

const STAGE_ICONS = {
  requirement:   Send,
  workProposal:  FileText,
  assessment:    ClipboardList,
  notesheet:     Receipt,
  memo:          ScrollText,
  purchaseOrder: ShoppingCart,
  goodsReceived: PackageCheck,
};

// ─── Dot ─────────────────────────────────────────────────────────────────────
// Width is fixed at DOT_SIZE so the connector can perfectly centre-align.

const DOT_SIZE = 40;

const StepDot = ({ stage, status, pending, isLast, isComplete }) => {
  const Icon = STAGE_ICONS[stage] || Clock;
  const color = pending ? '#cbd5e1' : statusColor(status);
  const bg    = pending ? '#f1f5f9' : isComplete ? `${color}20` : `${color}15`;

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flexShrink: 0,
      width: DOT_SIZE,
    }}>
      {/* Circle */}
      <div style={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        flexShrink: 0,
        boxShadow: pending ? 'none' : `0 0 0 3px ${color}18`,
        transition: 'box-shadow 0.2s',
      }}>
        <Icon size={16} color={color} strokeWidth={2} />
      </div>

      {/* Vertical connector line — drawn below the dot, not separately */}
      {!isLast && (
        <div style={{
          width: 2,
          flexGrow: 1,
          minHeight: 20,
          background: pending ? '#e2e8f0' : `${color}50`,
          marginTop: 0,
        }} />
      )}
    </div>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => (
  <span
    className={`badge ${getStatusClass(status)}`}
    style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}
  >
    {status}
  </span>
);

// ─── Inline banners ───────────────────────────────────────────────────────────

const RejectionNote = ({ by, note }) => (
  <div style={{
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 6, padding: '8px 12px', marginTop: 8,
  }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
      <XCircle size={12} /> Rejected{by ? ` by ${by}` : ''}
    </div>
    {note && <div style={{ fontSize: 11, color: '#991b1b', fontStyle: 'italic' }}>"{note}"</div>}
  </div>
);

const ApprovalNote = ({ by, date }) => (
  <div style={{
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 6, padding: '8px 12px', marginTop: 8,
    fontSize: 11, fontWeight: 600, color: '#16a34a',
    display: 'flex', alignItems: 'center', gap: 4,
  }}>
    <CheckCircle2 size={12} /> Approved by {by}{date ? ` · ${formatDate(date)}` : ''}
  </div>
);

const AwaitingNote = ({ text }) => (
  <div style={{
    fontSize: 11, color: '#0891b2', fontStyle: 'italic', marginTop: 6,
    display: 'flex', alignItems: 'center', gap: 4,
  }}>
    <Hourglass size={11} /> {text}
  </div>
);

// ─── Step card ────────────────────────────────────────────────────────────────

const Step = ({ stage, label, status, pending, actor, date, children, isLast, isComplete }) => {
  const color = pending ? '#e2e8f0' : `${statusColor(status)}30`;

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'stretch',
      /* ensure the dot column stretches to fill card height so the line runs all the way down */
    }}>
      {/* Left column: dot + line */}
      <StepDot
        stage={stage}
        status={status}
        pending={pending}
        isLast={isLast}
        isComplete={isComplete}
      />

      {/* Right column: card */}
      <div style={{
        flex: 1,
        minWidth: 0,
        border: `1px solid ${color}`,
        borderRadius: 10,
        padding: '11px 14px',
        background: pending ? '#f8fafc' : '#fff',
        opacity: pending ? 0.6 : 1,
        marginBottom: isLast ? 0 : 12,
        /* card bottom margin creates the visual "gap" between cards; the line fills this gap */
      }}>
        {/* Title row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          flexWrap: 'wrap', marginBottom: 3,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: pending ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            lineHeight: 1.3,
          }}>
            {label}
          </span>
          {!pending
            ? <StatusBadge status={status} />
            : <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Pending</span>
          }
        </div>

        {/* Actor · date */}
        {!pending && (actor || date) && (
          <div style={{
            fontSize: 11, color: 'var(--color-text-muted)',
            marginBottom: children ? 8 : 0,
            lineHeight: 1.5,
          }}>
            {actor && <span>{actor}</span>}
            {actor && date && <span> · </span>}
            {date && <span>{formatDate(date)}</span>}
          </div>
        )}

        {/* Step-specific content */}
        {!pending && children}
      </div>
    </div>
  );
};

// ─── Step builders ────────────────────────────────────────────────────────────

const buildHeadSteps = (workProposal, submittedEntry) => [
  // ── 1. Requirement Submitted ──────────────────────────────────────────
  {
    key: 'requirement',
    stage: 'requirement',
    label: 'Requirement Submitted',
    status: 'submitted',
    pending: false,
    actor: submittedEntry
      ? `${submittedEntry.actorRole}${submittedEntry.actor?.name ? ` · ${submittedEntry.actor.name}` : ''}`
      : 'Center Head',
    date: submittedEntry?.timestamp,
    content: null,
  },
  // ── 2. Work Proposal ──────────────────────────────────────────────────
  {
    key: 'workProposal',
    stage: 'workProposal',
    label: 'Work Proposal Created',
    status: workProposal?.status || 'pending',
    pending: !workProposal,
    actor: workProposal?.createdBy?.name
      ? `Cluster Manager · ${workProposal.createdBy.name}`
      : workProposal ? 'Cluster Manager' : null,
    date: workProposal?.createdAt,
    content: workProposal?.title ? (
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
        {workProposal.title}
      </div>
    ) : null,
  },
];

const buildBranchSteps = ({ assessment, notesheet, memo, purchaseOrder }) => {
  const goodsReceived = purchaseOrder
    && (purchaseOrder.status === 'closed' || purchaseOrder.status === 'received');

  return [
    // ── 3. Department Assessment ──────────────────────────────────────────
    {
      key: 'assessment',
      stage: 'assessment',
      label: 'Department Assessment',
      status: assessment?.status || 'pending',
      pending: !assessment,
      actor: assessment
        ? `${assessment.departmentRef?.name
            ? `${assessment.departmentRef.name} Dept`
            : 'Department Admin'}${assessment.createdBy?.name
            ? ` · ${assessment.createdBy.name}`
            : ''}`
        : null,
      date: assessment?.createdAt,
      content: assessment ? (
        <div>
          {assessment.estimatedCost !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <IndianRupee size={12} color="var(--color-accent)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
                {formatCurrency(assessment.estimatedCost)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>estimated</span>
            </div>
          )}
          {assessment.recommendedAction && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              "{assessment.recommendedAction}"
            </div>
          )}
          {assessment.status === 'rejected' && (
            <RejectionNote
              by={assessment.timeline?.find(e => e.action === 'Rejected')?.actor?.name}
              note={assessment.timeline?.find(e => e.action === 'Rejected')?.note}
            />
          )}
        </div>
      ) : null,
    },

    // ── 4. PO Notesheet ───────────────────────────────────────────────────
    {
      key: 'notesheet',
      stage: 'notesheet',
      label: 'PO Notesheet — Vendor Quotations',
      status: notesheet?.status || 'pending',
      pending: !notesheet,
      actor: notesheet?.createdBy?.name
        ? `PO Office · ${notesheet.createdBy.name}`
        : notesheet ? 'PO Office' : null,
      date: notesheet?.createdAt,
      content: notesheet?.quotations?.length > 0 ? (
        <div>
          {notesheet.quotations.map((q, i) => (
            <div key={q._id || i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12, paddingBottom: 4, marginBottom: 4,
              borderBottom: i < notesheet.quotations.length - 1
                ? '1px solid #f1f5f9'
                : 'none',
            }}>
              <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {q.vendorName}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                {formatCurrency(q.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : null,
    },

    // ── 5. Director's Memo ────────────────────────────────────────────────
    {
      key: 'memo',
      stage: 'memo',
      label: "Director's Memo — Chairperson Review",
      status: memo?.status || 'pending',
      pending: !memo,
      actor: memo?.createdBy?.name
        ? `Director · ${memo.createdBy.name}`
        : memo ? 'Director' : null,
      date: memo?.createdAt,
      content: memo ? (
        <div>
          {memo.recommendedVendor && (
            <div style={{ fontSize: 12, marginBottom: 6 }}>
              Recommended vendor:{' '}
              <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                {memo.recommendedVendor}
              </span>
            </div>
          )}
          {memo.status === 'approved' && memo.decidedBy?.name && (
            <ApprovalNote by={memo.decidedBy.name} date={memo.decidedAt} />
          )}
          {memo.status === 'rejected' && (
            <RejectionNote by={memo.decidedBy?.name} note={memo.decisionNote} />
          )}
          {memo.status === 'submitted' && (
            <AwaitingNote text="Awaiting Chairperson decision…" />
          )}
        </div>
      ) : null,
    },

    // ── 6. Purchase Order Issued ──────────────────────────────────────────
    {
      key: 'purchaseOrder',
      stage: 'purchaseOrder',
      label: 'Purchase Order Issued',
      status: purchaseOrder?.status || 'pending',
      pending: !purchaseOrder,
      actor: purchaseOrder?.createdBy?.name
        ? `Accounts · ${purchaseOrder.createdBy.name}`
        : purchaseOrder ? 'Accounts' : null,
      date: purchaseOrder?.createdAt,
      content: purchaseOrder ? (
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 1 }}>
                PO Number
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {purchaseOrder.poNumber}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 1 }}>
                Vendor
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)' }}>
                {purchaseOrder.vendorName}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 1 }}>
                Amount
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: 'var(--color-accent)',
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                <IndianRupee size={12} />
                {formatCurrency(purchaseOrder.totalAmount).replace('₹', '')}
              </div>
            </div>
          </div>
          {purchaseOrder.piAttachmentUrl && (
            <a
              href={purchaseOrder.piAttachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: 8, fontSize: 11,
                color: '#16a34a', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                textDecoration: 'underline', cursor: 'pointer',
              }}
            >
              <Paperclip size={12} /> View Performa Invoice
            </a>
          )}
          {(purchaseOrder.status === 'issued' || purchaseOrder.status === 'pi_uploaded') && (
            <AwaitingNote text="Awaiting goods delivery & receipt confirmation…" />
          )}
        </div>
      ) : null,
    },

    // ── 7. Goods Received — Stock Entry ──────────────────────────────────
    {
      key: 'goodsReceived',
      stage: 'goodsReceived',
      label: 'Goods Received',
      status: goodsReceived ? 'received' : 'pending',
      pending: !goodsReceived,
      isComplete: goodsReceived,
      actor: goodsReceived && purchaseOrder.receivedBy?.name
        ? `Accounts · ${purchaseOrder.receivedBy.name}`
        : goodsReceived ? 'Accounts' : null,
      date: purchaseOrder?.receivedAt,
      content: goodsReceived ? (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 6, padding: '8px 12px', marginTop: 2,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: '#16a34a',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <PackageCheck size={14} color="#16a34a" />
            {purchaseOrder.stockEntryStatus === 'completed'
              ? 'Goods received & entered into campus stock'
              : 'Goods received — awaiting campus stock entry'}
          </div>
          {purchaseOrder.timeline?.find(e =>
            (e.action || '').toLowerCase().includes('received')
          )?.note && (
            <div style={{
              fontSize: 11, color: '#166534', marginTop: 4, fontStyle: 'italic',
            }}>
              "{purchaseOrder.timeline.find(e =>
                (e.action || '').toLowerCase().includes('received')
              ).note}"
            </div>
          )}
        </div>
      ) : null,
    },
  ];
};

// ─── Main component ───────────────────────────────────────────────────────────

const renderSteps = (steps, keyPrefix = '') =>
  steps.map((step, idx) => (
    <Step
      key={`${keyPrefix}${step.key}`}
      stage={step.stage}
      label={step.label}
      status={step.status}
      pending={step.pending}
      actor={step.actor}
      date={step.date}
      isLast={idx === steps.length - 1}
      isComplete={!!step.isComplete}
    >
      {step.content}
    </Step>
  ));

const ApprovalJourney = ({ chain, requirementTimeline = [] }) => {
  const { workProposal = null } = chain || {};
  const submittedEntry = requirementTimeline.find(e => e.action === 'Submitted');

  // Prefer the fan-out branches; fall back to the legacy single-branch fields.
  const branches = Array.isArray(chain?.branches) && chain.branches.length > 0
    ? chain.branches
    : [{
        department: chain?.assessment?.departmentRef || null,
        assessment: chain?.assessment || null,
        notesheet: chain?.notesheet || null,
        memo: chain?.memo || null,
        purchaseOrder: chain?.purchaseOrder || null,
      }];

  const headSteps = buildHeadSteps(workProposal, submittedEntry);

  if (branches.length <= 1) {
    const allSteps = [...headSteps, ...buildBranchSteps(branches[0])];
    return <div style={{ paddingTop: 4 }}>{renderSteps(allSteps)}</div>;
  }

  return (
    <div style={{ paddingTop: 4 }}>
      {renderSteps(headSteps)}
      {branches.map((branch, i) => (
        <div key={branch.assessment?._id || i} style={{ marginTop: 8 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)',
            padding: '6px 0 8px', marginTop: 8,
            borderTop: '1px dashed var(--color-border)',
          }}>
            {branch.department?.name ? `${branch.department.name} Department` : `Department Branch ${i + 1}`}
          </div>
          {renderSteps(buildBranchSteps(branch), `b${i}-`)}
        </div>
      ))}
    </div>
  );
};

export default ApprovalJourney;
