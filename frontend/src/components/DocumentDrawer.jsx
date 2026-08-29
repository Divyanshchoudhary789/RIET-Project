import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  Calendar,
  User,
  Building,
  Landmark,
  Tag,
  CheckCircle2,
  XCircle,
  DollarSign,
  Award,
  Package,
  Download,
  AlertCircle,
  Clock,
  Layers,
  FileCheck,
  FileSpreadsheet
} from 'lucide-react';
import api from '../utils/api';
import Timeline from './Timeline';
import ApprovalJourney from './ApprovalJourney';
import { formatDate, formatCurrency, getStatusClass, getPriorityClass } from '../utils/helpers';
import useModalA11y from '../hooks/useModalA11y';

// Maps a docType label to the endpoint that returns the FULL approval journey
// (Requirement → Work Proposal → Assessment → Notesheet → Memo → Purchase Order)
// for that document, so every role sees the complete picture ahead of/behind
// their own step — not just the current document's own local timeline.
const chainEndpointFor = (docType, docId) => {
  const t = (docType || '').toLowerCase();
  if (t.includes('requirement')) return `/api/requirements/${docId}/chain`;
  if (t.includes('propos')) return `/api/work-proposals/${docId}/chain`;
  if (t.includes('assessment')) return `/api/assessments/${docId}/chain`;
  if (t.includes('notesheet')) return `/api/notesheets/${docId}/chain`;
  if (t.includes('memo')) return `/api/memos/${docId}/chain`;
  if (t.includes('purchase') || t.includes('po')) return `/api/purchase-orders/${docId}/chain`;
  return null;
};

const DocumentDrawer = ({ doc, docType = 'Document', onClose, footer }) => {
  const [fullDoc, setFullDoc] = useState(doc);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [chain, setChain] = useState(null);

  useModalA11y(onClose);

  // Auto-fetch deep populated memo details if viewing a memo
  useEffect(() => {
    setFullDoc(doc);
    setFetchError('');
    setChain(null);

    const isMemo =
      docType.toLowerCase().includes('memo') ||
      doc?.summary !== undefined ||
      doc?.recommendedVendor !== undefined ||
      doc?.notesheetRef !== undefined;

    if (isMemo && doc?._id) {
      setLoading(true);
      api
        .get(`/api/memos/${doc._id}`)
        .then((res) => {
          if (res.data?.data) {
            setFullDoc(res.data.data);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch detailed memo:', err);
          // Keep existing doc object if single fetch fails
        })
        .finally(() => {
          setLoading(false);
        });
    }

    // Fetch the full approval-chain journey for the audit timeline section.
    // Falls back to the document's own local timeline if this fails.
    const endpoint = doc?._id ? chainEndpointFor(docType, doc._id) : null;
    if (endpoint) {
      api.get(endpoint)
        .then((res) => setChain(res.data?.data || null))
        .catch(() => setChain(null));
    }
  }, [doc, docType]);

  if (!doc) return null;

  const activeDoc = fullDoc || doc;

  const isMemo =
    docType.toLowerCase().includes('memo') ||
    activeDoc.summary !== undefined ||
    activeDoc.recommendedVendor !== undefined ||
    activeDoc.notesheetRef !== undefined;

  const titleText = docType.toLowerCase().includes('detail')
    ? docType
    : `${docType.charAt(0).toUpperCase() + docType.slice(1)} Details`;

  // Deep resolution for Memos
  const notesheet = activeDoc.notesheetRef && typeof activeDoc.notesheetRef === 'object' ? activeDoc.notesheetRef : null;
  const assessment = notesheet?.assessmentRef && typeof notesheet.assessmentRef === 'object' ? notesheet.assessmentRef : null;
  const proposal = assessment?.workProposalRef && typeof assessment.workProposalRef === 'object' ? assessment.workProposalRef : null;
  const requirementRefs = Array.isArray(proposal?.requirementRefs) ? proposal.requirementRefs : [];

  // Quotations
  const quotations = (notesheet && Array.isArray(notesheet.quotations) && notesheet.quotations.length > 0)
    ? notesheet.quotations
    : (Array.isArray(activeDoc.quotations) ? activeDoc.quotations : []);

  // Items — prefer the document's own (edited) snapshot; fall back to the
  // originating requirements for deep-populated memos.
  let items = [];
  if (Array.isArray(activeDoc.items) && activeDoc.items.length > 0) {
    items = activeDoc.items;
  } else if (requirementRefs.length > 0) {
    items = requirementRefs.flatMap((r) => r.items || []);
  }
  const itemsTotal = items.reduce((a, it) => a + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);

  // Recommended Vendor
  const recommendedVendor = activeDoc.recommendedVendor || notesheet?.recommendedVendor || '';

  // Financials
  const estimatedCost = assessment?.estimatedCost !== undefined ? assessment.estimatedCost : activeDoc.estimatedCost;

  // Feasibility & Technical
  const feasibilityNotes = assessment?.feasibilityNotes || activeDoc.feasibilityNotes;
  const technicalRemarks = assessment?.technicalRemarks || activeDoc.technicalRemarks;
  const recommendedAction = assessment?.recommendedAction || activeDoc.recommendedAction;
  const notesheetRemarks = notesheet?.remarks;

  // Department & Campus
  const departmentName = assessment?.departmentRef?.name || proposal?.departmentRefs?.[0]?.name
    || activeDoc.departmentRef?.name
    || (Array.isArray(activeDoc.departmentRefs) ? activeDoc.departmentRefs.map((d) => d.name).filter(Boolean).join(', ') : '');
  const campusName = requirementRefs[0]?.campusRef?.name || activeDoc.campusRef?.name
    || (Array.isArray(activeDoc.campusRefs) ? activeDoc.campusRefs.map((c) => c.name).filter(Boolean).join(', ') : '');

  // Proposal title & justification
  const proposalTitle = proposal?.title || activeDoc.title;
  const proposalDescription = proposal?.description || activeDoc.description;
  const isRequirementDoc = docType.toLowerCase().includes('requirement');
  const justificationText =
    requirementRefs[0]?.description || requirementRefs[0]?.justification ||
    (isRequirementDoc ? (activeDoc.description || activeDoc.justification) : activeDoc.justification);

  // Attachments
  const attachments = requirementRefs.flatMap((r) => r.attachments || []).concat(activeDoc.attachments || []);

  // Author
  const authorName = activeDoc.createdBy?.name || activeDoc.submittedBy?.name || activeDoc.assessedBy?.name || '—';
  const authorRole = activeDoc.createdBy?.role ? activeDoc.createdBy.role.toUpperCase() : '';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ width: 680, maxWidth: '100vw' }}>
        <div className="drawer-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, paddingRight: 12 }}>
            <span className="drawer-title" style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, wordBreak: 'break-word' }}>
              <FileCheck size={20} color="var(--color-accent)" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleText}</span>
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2, wordBreak: 'break-all' }}>
              Ref: {activeDoc.referenceNumber || activeDoc.poNumber || activeDoc._id}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" style={{ flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body" style={{ padding: 24, overflowX: 'hidden' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
              <span className="spinner spinner-sm" />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-info)' }}>Loading complete document details...</span>
            </div>
          )}

          {/* Badges bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {activeDoc.status && (
              <span className={`badge ${getStatusClass(activeDoc.status)}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                {activeDoc.status.toUpperCase()}
              </span>
            )}
            {activeDoc.priority && (
              <span className={`badge ${getPriorityClass(activeDoc.priority)}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                {activeDoc.priority.toUpperCase()} PRIORITY
              </span>
            )}
            {activeDoc.revisionNumber && activeDoc.revisionNumber > 1 && (
              <span className="badge badge-revised" style={{ fontSize: 12, padding: '4px 10px' }}>
                REVISION #{activeDoc.revisionNumber}
              </span>
            )}
          </div>

          {/* Key Metrics Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            {estimatedCost !== undefined && (
              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 14, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span>Estimated Cost</span>
                  <DollarSign size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent)', marginTop: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {formatCurrency(estimatedCost)}
                </div>
              </div>
            )}

            {recommendedVendor && (
              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 14, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span>Recommended Vendor</span>
                  <Award size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', marginTop: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }} title={recommendedVendor}>
                  {recommendedVendor}
                </div>
              </div>
            )}

            {(campusName || departmentName) && (
              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 14, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span>Campus / Dept</span>
                  <Building size={16} color="var(--color-info)" style={{ flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {campusName || 'Main Campus'} {departmentName ? `• ${departmentName}` : ''}
                </div>
              </div>
            )}

            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 14, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span>Submitted By</span>
                <User size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <div>{authorName}</div>
                {authorRole ? <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, marginTop: 2 }}>({authorRole})</div> : null}
              </div>
            </div>
          </div>

          {/* Rejection / Decision Banner */}
          {activeDoc.decisionNote && (
            <div style={{ background: activeDoc.status === 'rejected' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)', border: `1px solid ${activeDoc.status === 'rejected' ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`, borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 20, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: activeDoc.status === 'rejected' ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                {activeDoc.status === 'rejected' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                Executive Decision Note ({activeDoc.status?.toUpperCase()})
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: activeDoc.status === 'rejected' ? '#991b1b' : '#166534', margin: 0, lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                "{activeDoc.decisionNote}"
              </p>
              {activeDoc.decidedBy?.name && (
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, wordBreak: 'break-word' }}>
                  Decided by {activeDoc.decidedBy.name} on {formatDate(activeDoc.decidedAt || activeDoc.updatedAt)}
                </div>
              )}
            </div>
          )}

          {/* Summary / Notesheet Remarks */}
          {activeDoc.summary && (
            <div style={{ marginBottom: 20 }}>
              <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-primary)', fontWeight: 600 }}>
                <FileText size={15} color="var(--color-accent)" /> Executive Summary
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {activeDoc.summary}
              </div>
            </div>
          )}

          {notesheetRemarks && (
            <div style={{ marginBottom: 20 }}>
              <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-primary)', fontWeight: 600 }}>
                <Layers size={15} color="var(--color-accent)" /> PO Office Notesheet Remarks
              </div>
              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {notesheetRemarks}
              </div>
            </div>
          )}

          {/* Vendor Quotations Comparison Table */}
          {quotations.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 8 }}>
                <Award size={16} color="var(--color-accent)" /> Vendor Quotations Comparison ({quotations.length})
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', maxWidth: '100%' }}>
                <table className="table" style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                  <thead style={{ background: 'var(--color-surface-2)' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Vendor Name</th>
                      <th style={{ padding: '10px 14px' }}>Quotation Amount</th>
                      <th style={{ padding: '10px 14px' }}>Validity Date</th>
                      <th style={{ padding: '10px 14px' }}>Item Breakdown / Scope</th>
                      <th style={{ padding: '10px 14px' }}>Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map((q, i) => {
                      const isRecommended = recommendedVendor && q.vendorName && (
                        q.vendorName.trim().toLowerCase() === recommendedVendor.trim().toLowerCase() ||
                        recommendedVendor.trim().toLowerCase().includes(q.vendorName.trim().toLowerCase())
                      );
                      return (
                        <tr
                          key={q._id || i}
                          style={{
                            background: isRecommended ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: isRecommended ? 700 : 500, wordBreak: 'break-word' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {q.vendorName}
                              {isRecommended && (
                                <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 6px' }}>
                                  Recommended
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>
                            {formatCurrency(q.amount)}
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>{formatDate(q.validity)}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)', wordBreak: 'break-word' }}>{q.itemBreakdown || '—'}</td>
                          <td style={{ padding: '12px 14px' }}>
                            {q.attachmentUrl ? (
                              <a
                                href={q.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-btn action-view"
                                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                              >
                                <Download size={12} /> View File
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Procurement Items Table */}
          {items.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 8 }}>
                <Package size={16} color="var(--color-accent)" /> Items & Quantities ({items.length})
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', maxWidth: '100%' }}>
                <table className="table" style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                  <thead style={{ background: 'var(--color-surface-2)' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', width: 40 }}>#</th>
                      <th style={{ padding: '10px 14px' }}>Item Name</th>
                      <th style={{ padding: '10px 14px' }}>Qty</th>
                      <th style={{ padding: '10px 14px' }}>Unit</th>
                      <th style={{ padding: '10px 14px' }}>Unit Price</th>
                      <th style={{ padding: '10px 14px' }}>Line Total</th>
                      <th style={{ padding: '10px 14px' }}>Description / Specifications</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item._id || i}>
                        <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>{i + 1}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>{item.name}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ padding: '10px 14px' }}>{item.unit || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{item.price != null ? formatCurrency(item.price) : '—'}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-accent)' }}>
                          {formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0))}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', wordBreak: 'break-word' }}>{item.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  {itemsTotal > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={5} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)' }}>Estimated Total</td>
                        <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-accent)' }}>{formatCurrency(itemsTotal)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Feasibility & Technical Assessment */}
          {(feasibilityNotes || technicalRemarks || recommendedAction) && (
            <div style={{ marginBottom: 24, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 12 }}>
                <CheckCircle2 size={16} color="var(--color-accent)" /> Technical & Feasibility Assessment
              </div>
              {feasibilityNotes && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Feasibility Notes:</span>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', margin: '2px 0 0 0', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {feasibilityNotes}
                  </p>
                </div>
              )}
              {technicalRemarks && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Technical Remarks:</span>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', margin: '2px 0 0 0', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {technicalRemarks}
                  </p>
                </div>
              )}
              {recommendedAction && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Recommended Action:</span>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', margin: '2px 0 0 0', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {recommendedAction}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Proposal & Description */}
          {(proposalTitle || justificationText) && (
            <div style={{ marginBottom: 24, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 8 }}>
                <FileSpreadsheet size={16} color="var(--color-accent)" /> Proposal &amp; Description
              </div>
              {proposalTitle && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>{proposalTitle}</span>
                  {proposalDescription && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '2px 0 0 0', wordBreak: 'break-word' }}>{proposalDescription}</p>}
                </div>
              )}
              {justificationText && (
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Requirement Description:</span>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '2px 0 0 0', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {justificationText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Audit Timeline — this document's own history (submitted/rejected/revised,
              with notes), so the viewer can see exactly what happened to their own work */}
          {activeDoc.timeline && activeDoc.timeline.length > 0 && (
            <div style={{ marginBottom: chain ? 24 : 0 }}>
              <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 12 }}>
                <Clock size={16} color="var(--color-accent)" /> Audit Timeline
              </div>
              <Timeline entries={activeDoc.timeline} />
            </div>
          )}

          {/* Approval Journey — the complete end-to-end chain across every stage,
              so the viewer can see the full picture beyond just their own step */}
          {chain && (
            <div>
              <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 12 }}>
                <Clock size={16} color="var(--color-accent)" /> Approval Journey
              </div>
              <ApprovalJourney chain={chain} requirementTimeline={chain.requirement?.timeline || []} />
            </div>
          )}
        </div>

        {footer && <div className="drawer-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>{footer}</div>}
      </div>
    </>
  );
};

export default DocumentDrawer;
