import React from 'react';
import { X } from 'lucide-react';
import Timeline from './Timeline';
import { formatDate, formatCurrency, getStatusClass } from '../utils/helpers';

/**
 * Slide-over drawer for showing full document detail with Timeline.
 * Props:
 *   open        {boolean}
 *   onClose     {() => void}
 *   title       {string}
 *   document    {object}   — the raw document object from API
 *   docType     {string}   — 'requirement' | 'proposal' | 'assessment' | 'notesheet' | 'memo' | 'purchase_order'
 *   extraActions {ReactNode} — optional action buttons in header
 */
const DocumentDetail = ({ open, onClose, title, document: doc, docType, extraActions }) => {
  if (!open || !doc) return null;

  const renderRequirement = () => (
    <>
      <div>
        <p className="detail-section-title">Basic Info</p>
        <div className="detail-grid">
          <div className="detail-field">
            <label>Reference</label>
            <span>{doc.referenceNumber || doc._id}</span>
          </div>
          <div className="detail-field">
            <label>Status</label>
            <span className={`badge ${getStatusClass(doc.status)}`}>{doc.status}</span>
          </div>
          <div className="detail-field">
            <label>Priority</label>
            <span className={`badge badge-${doc.priority?.toLowerCase()}`}>{doc.priority}</span>
          </div>
          <div className="detail-field">
            <label>Submitted by</label>
            <span>{doc.submittedBy?.name || '—'}</span>
          </div>
          <div className="detail-field">
            <label>Campus</label>
            <span>{doc.campus?.name || '—'}</span>
          </div>
          <div className="detail-field">
            <label>Date</label>
            <span>{formatDate(doc.createdAt)}</span>
          </div>
        </div>
      </div>

      {doc.justification && (
        <div>
          <p className="detail-section-title">Justification</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{doc.justification}</p>
        </div>
      )}

      {doc.items?.length > 0 && (
        <div>
          <p className="detail-section-title">Items ({doc.items.length})</p>
          <table className="detail-items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, i) => (
                <tr key={item._id || i}>
                  <td>{i + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderProposal = () => (
    <>
      <div>
        <p className="detail-section-title">Proposal Info</p>
        <div className="detail-grid">
          <div className="detail-field">
            <label>Reference</label>
            <span>{doc.referenceNumber || doc._id}</span>
          </div>
          <div className="detail-field">
            <label>Status</label>
            <span className={`badge ${getStatusClass(doc.status)}`}>{doc.status}</span>
          </div>
          <div className="detail-field">
            <label>Created by</label>
            <span>{doc.createdBy?.name || '—'}</span>
          </div>
          <div className="detail-field">
            <label>Date</label>
            <span>{formatDate(doc.createdAt)}</span>
          </div>
        </div>
      </div>
      {doc.title && (
        <div>
          <p className="detail-section-title">Title</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{doc.title}</p>
        </div>
      )}
      {doc.description && (
        <div>
          <p className="detail-section-title">Description</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{doc.description}</p>
        </div>
      )}
    </>
  );

  const renderAssessment = () => (
    <>
      <div>
        <p className="detail-section-title">Assessment Info</p>
        <div className="detail-grid">
          <div className="detail-field">
            <label>Reference</label>
            <span>{doc.referenceNumber || doc._id}</span>
          </div>
          <div className="detail-field">
            <label>Status</label>
            <span className={`badge ${getStatusClass(doc.status)}`}>{doc.status}</span>
          </div>
          <div className="detail-field">
            <label>Estimated Cost</label>
            <span>{formatCurrency(doc.estimatedCost)}</span>
          </div>
          <div className="detail-field">
            <label>Recommended Action</label>
            <span>{doc.recommendedAction || '—'}</span>
          </div>
          <div className="detail-field">
            <label>Assessed by</label>
            <span>{doc.assessedBy?.name || '—'}</span>
          </div>
          <div className="detail-field">
            <label>Date</label>
            <span>{formatDate(doc.createdAt)}</span>
          </div>
        </div>
      </div>
      {doc.feasibilityNotes && (
        <div>
          <p className="detail-section-title">Feasibility Notes</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{doc.feasibilityNotes}</p>
        </div>
      )}
      {doc.technicalRemarks && (
        <div>
          <p className="detail-section-title">Technical Remarks</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{doc.technicalRemarks}</p>
        </div>
      )}
    </>
  );

  const renderNotesheet = () => (
    <>
      <div>
        <p className="detail-section-title">Notesheet Info</p>
        <div className="detail-grid">
          <div className="detail-field">
            <label>Reference</label>
            <span>{doc.referenceNumber || doc._id}</span>
          </div>
          <div className="detail-field">
            <label>Status</label>
            <span className={`badge ${getStatusClass(doc.status)}`}>{doc.status}</span>
          </div>
          <div className="detail-field">
            <label>Prepared by</label>
            <span>{doc.preparedBy?.name || '—'}</span>
          </div>
          <div className="detail-field">
            <label>Date</label>
            <span>{formatDate(doc.createdAt)}</span>
          </div>
        </div>
      </div>
      {doc.remarks && (
        <div>
          <p className="detail-section-title">Remarks</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{doc.remarks}</p>
        </div>
      )}
      {doc.quotations?.length > 0 && (
        <div>
          <p className="detail-section-title">Quotations ({doc.quotations.length})</p>
          {doc.quotations.map((q, i) => (
            <div key={i} className="quotation-card">
              <p className="quotation-card-title">Quotation {i + 1} — {q.vendorName}</p>
              <div className="quotation-meta">
                <span><label>Amount</label>{formatCurrency(q.amount)}</span>
                <span><label>Validity</label>{q.validity || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderMemo = () => (
    <>
      <div>
        <p className="detail-section-title">Memo Info</p>
        <div className="detail-grid">
          <div className="detail-field">
            <label>Reference</label>
            <span>{doc.referenceNumber || doc._id}</span>
          </div>
          <div className="detail-field">
            <label>Status</label>
            <span className={`badge ${getStatusClass(doc.status)}`}>{doc.status}</span>
          </div>
          <div className="detail-field">
            <label>Recommended Vendor</label>
            <span>{doc.recommendedVendor || '—'}</span>
          </div>
          <div className="detail-field">
            <label>Created by</label>
            <span>{doc.createdBy?.name || '—'}</span>
          </div>
          <div className="detail-field">
            <label>Date</label>
            <span>{formatDate(doc.createdAt)}</span>
          </div>
        </div>
      </div>
      {doc.summary && (
        <div>
          <p className="detail-section-title">Summary</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{doc.summary}</p>
        </div>
      )}
    </>
  );

  const renderPO = () => (
    <>
      <div>
        <p className="detail-section-title">Purchase Order</p>
        <div className="detail-grid">
          <div className="detail-field">
            <label>PO Number</label>
            <span>{doc.poNumber || doc._id}</span>
          </div>
          <div className="detail-field">
            <label>Status</label>
            <span className={`badge ${getStatusClass(doc.status)}`}>{doc.status}</span>
          </div>
          <div className="detail-field">
            <label>Vendor</label>
            <span>{doc.vendorName || '—'}</span>
          </div>
          <div className="detail-field">
            <label>Total Amount</label>
            <span>{formatCurrency(doc.totalAmount)}</span>
          </div>
          <div className="detail-field">
            <label>Date</label>
            <span>{formatDate(doc.createdAt)}</span>
          </div>
        </div>
      </div>
    </>
  );

  const renderContent = () => {
    switch (docType) {
      case 'requirement':    return renderRequirement();
      case 'proposal':       return renderProposal();
      case 'assessment':     return renderAssessment();
      case 'notesheet':      return renderNotesheet();
      case 'memo':           return renderMemo();
      case 'purchase_order': return renderPO();
      default:               return <pre style={{ fontSize: 12 }}>{JSON.stringify(doc, null, 2)}</pre>;
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-header">
          <h2 className="drawer-title">{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {extraActions}
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {renderContent()}

          {/* Timeline */}
          {doc.timeline?.length > 0 && (
            <div>
              <p className="detail-section-title">Timeline</p>
              <Timeline entries={doc.timeline} />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default DocumentDetail;
