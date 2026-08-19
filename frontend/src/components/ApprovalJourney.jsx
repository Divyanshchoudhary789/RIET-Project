import React from 'react';
import {
  FileText,
  ClipboardList,
  Receipt,
  ScrollText,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  IndianRupee,
  ShoppingCart,
} from 'lucide-react';
import { formatDate, formatDateTime, formatCurrency, getStatusClass } from '../utils/helpers';

/**
 * ApprovalJourney — renders the full approval chain as a clean vertical stepper.
 *
 * Flow (top → bottom):
 *   1. Requirement submitted  (Center Head)
 *   2. Work Proposal created  (Cluster Manager)
 *   3. Department Assessment  (Dept Admin)
 *   4. PO Notesheet           (PO Office)
 *   5. Memo → Chairperson     (Director → Chairperson)
 *   6. Purchase Order         (Accounts) — if exists via memo
 *
 * Each step card shows: icon, label, status badge, actor, date, key info.
 * Steps that are "not yet reached" are shown as faded/pending.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  submitted:    '#2563eb',
  revised:      '#d97706',
  forwarded:    '#7c3aed',
  under_review: '#0891b2',
  approved:     '#16a34a',
  closed:       '#0f766e',
  rejected:     '#dc2626',
  pending:      '#94a3b8',
};

const statusColor = (s) => STATUS_COLOR[s] || '#94a3b8';

// Icon for each stage
const STAGE_ICONS = {
  requirement: Send,
  workProposal: FileText,
  assessment: ClipboardList,
  notesheet: Receipt,
  memo: ScrollText,
  purchaseOrder: ShoppingCart,
};

// ─── sub-components ───────────────────────────────────────────────────────────

const StepDot = ({ stage, status, pending }) => {
  const Icon = STAGE_ICONS[stage] || Clock;
  const color = pending ? '#cbd5e1' : statusColor(status);
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      border: `2px solid ${color}`,
      background: pending ? '#f8fafc' : `${color}15`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, zIndex: 1, position: 'relative',
    }}>
      <Icon size={17} color={color} />
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <span
    className={`badge ${getStatusClass(status)}`}
    style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}
  >
    {status}
  </span>
);

// Thin vertical connector between steps
const Connector = ({ last }) => (
  !last ? (
    <div style={{
      width: 2, height: 20, background: '#e2e8f0',
      marginLeft: 19, flexShrink: 0,
    }} />
  ) : null
);

// ─── Step card ────────────────────────────────────────────────────────────────

const Step = ({ stage, label, status, pending, actor, date, children, last }) => (
  <div>
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <StepDot stage={stage} status={status} pending={pending} />

      <div style={{
        flex: 1,
        border: `1px solid ${pending ? '#e2e8f0' : `${statusColor(status)}30`}`,
        borderRadius: 10,
        padding: '12px 14px',
        background: pending ? '#f8fafc' : '#fff',
        marginBottom: 0,
        opacity: pending ? 0.55 : 1,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: pending ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          }}>
            {label}
          </span>
          {!pending && <StatusBadge status={status} />}
          {pending && (
            <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Pending</span>
          )}
        </div>

        {/* Actor + date */}
        {!pending && (actor || date) && (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: children ? 10 : 0 }}>
            {actor && <span>{actor}</span>}
            {actor && date && <span> · </span>}
            {date && <span>{formatDate(date)}</span>}
          </div>
        )}

        {/* Extra content */}
        {!pending && children}
      </div>
    </div>
    <Connector last={last} />
  </div>
);

// ─── Rejection banner ─────────────────────────────────────────────────────────

const RejectionNote = ({ by, note }) => (
  <div style={{
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 6, padding: '8px 12px', marginTop: 6,
  }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginBottom: 2 }}>
      ✗ Rejected{by ? ` by ${by}` : ''}
    </div>
    {note && (
      <div style={{ fontSize: 11, color: '#991b1b', fontStyle: 'italic' }}>"{note}"</div>
    )}
  </div>
);

const ApprovalNote = ({ by, date }) => (
  <div style={{
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 6, padding: '8px 12px', marginTop: 6,
    fontSize: 11, fontWeight: 600, color: '#16a34a',
  }}>
    ✓ Approved by {by}{date ? ` · ${formatDate(date)}` : ''}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const ApprovalJourney = ({ chain, requirementTimeline = [] }) => {
  // chain can be null if requirement is still only submitted (not yet forwarded)
  const { workProposal = null, assessment = null, notesheet = null, memo = null } = chain || {};

  // Extract requirement's own submission event
  const submittedEntry = requirementTimeline.find(e => e.action === 'Submitted');

  const steps = [
    // ── Step 1: Requirement submitted ──────────────────────────────────────
    {
      key: 'requirement',
      label: 'Requirement Submitted',
      stage: 'requirement',
      status: 'submitted',
      pending: false,
      actor: submittedEntry
        ? `${submittedEntry.actorRole}${submittedEntry.actor?.name ? ` · ${submittedEntry.actor.name}` : ''}`
        : null,
      date: submittedEntry?.timestamp,
      content: null,
    },

    // ── Step 2: Work Proposal ───────────────────────────────────────────────
    {
      key: 'workProposal',
      label: 'Work Proposal Created',
      stage: 'workProposal',
      status: workProposal?.status || 'pending',
      pending: !workProposal,
      actor: workProposal?.createdBy?.name
        ? `Cluster Manager · ${workProposal.createdBy.name}`
        : workProposal ? 'Cluster Manager' : null,
      date: workProposal?.createdAt,
      content: workProposal ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {workProposal.title}
        </div>
      ) : null,
    },

    // ── Step 3: Department Assessment ──────────────────────────────────────
    {
      key: 'assessment',
      label: 'Department Assessment',
      stage: 'assessment',
      status: assessment?.status || 'pending',
      pending: !assessment,
      actor: assessment
        ? `${assessment.departmentRef?.name ? `${assessment.departmentRef.name} Dept` : 'Department Admin'}${assessment.createdBy?.name ? ` · ${assessment.createdBy.name}` : ''}`
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

    // ── Step 4: PO Notesheet ────────────────────────────────────────────────
    {
      key: 'notesheet',
      label: 'PO Notesheet — Vendor Quotations',
      stage: 'notesheet',
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
              fontSize: 12, marginBottom: 3,
              paddingBottom: 3,
              borderBottom: i < notesheet.quotations.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{q.vendorName}</span>
              <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{formatCurrency(q.amount)}</span>
            </div>
          ))}
        </div>
      ) : null,
    },

    // ── Step 5: Director's Memo → Chairperson ──────────────────────────────
    {
      key: 'memo',
      label: "Director's Memo — Chairperson Review",
      stage: 'memo',
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
              <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{memo.recommendedVendor}</span>
            </div>
          )}
          {memo.status === 'approved' && memo.decidedBy?.name && (
            <ApprovalNote by={memo.decidedBy.name} date={memo.decidedAt} />
          )}
          {memo.status === 'rejected' && (
            <RejectionNote
              by={memo.decidedBy?.name}
              note={memo.decisionNote}
            />
          )}
          {memo.status === 'submitted' && (
            <div style={{
              fontSize: 11, color: '#0891b2', fontStyle: 'italic',
              marginTop: 4,
            }}>
              ⏳ Awaiting Chairperson decision…
            </div>
          )}
        </div>
      ) : null,
    },
  ];

  return (
    <div style={{ paddingTop: 4 }}>
      {steps.map((step, idx) => (
        <Step
          key={step.key}
          stage={step.stage}
          label={step.label}
          status={step.status}
          pending={step.pending}
          actor={step.actor}
          date={step.date}
          last={idx === steps.length - 1}
        >
          {step.content}
        </Step>
      ))}
    </div>
  );
};

export default ApprovalJourney;
