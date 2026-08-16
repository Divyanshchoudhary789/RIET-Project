import React from 'react';
import { X, FileText, Calendar, User, Building, Landmark, Tag } from 'lucide-react';
import Timeline from './Timeline';
import { formatDate, formatCurrency, getStatusClass, getPriorityClass } from '../utils/helpers';

const DocumentDrawer = ({ doc, docType = 'Document', onClose, footer }) => {
  if (!doc) return null;

  const titleText = docType.toLowerCase().includes('detail')
    ? docType
    : `${docType.charAt(0).toUpperCase() + docType.slice(1)} Details`;

  const renderItems = (items) => (
    <table className="table" style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Unit</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={item._id || i}>
            <td style={{ fontWeight: 500 }}>{item.name}</td>
            <td>{item.quantity}</td>
            <td>{item.unit || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="drawer-title">{titleText}</span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              Ref: {doc.referenceNumber || doc.poNumber || doc._id}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Status & Priority Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {doc.status && (
              <span className={`badge ${getStatusClass(doc.status)}`}>{doc.status}</span>
            )}
            {doc.priority && (
              <span className={`badge ${getPriorityClass(doc.priority)}`}>{doc.priority}</span>
            )}
            {doc.revisionNumber && doc.revisionNumber > 1 && (
              <span className="badge badge-revised">Revision {doc.revisionNumber}</span>
            )}
          </div>

          {/* Title / Description */}
          {doc.title && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Title</div>
              <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {doc.title}
              </p>
            </div>
          )}

          {doc.description && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Description</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {doc.description}
              </p>
            </div>
          )}

          {/* Justification & Summary */}
          {doc.justification && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Justification</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {doc.justification}
              </p>
            </div>
          )}

          {doc.summary && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Summary</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {doc.summary}
              </p>
            </div>
          )}

          {/* Feasibility & Technical Remarks */}
          {doc.feasibilityNotes && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Feasibility Notes</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {doc.feasibilityNotes}
              </p>
            </div>
          )}

          {doc.technicalRemarks && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Technical Remarks</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {doc.technicalRemarks}
              </p>
            </div>
          )}

          {doc.recommendedAction && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Recommended Action</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {doc.recommendedAction}
              </p>
            </div>
          )}

          {doc.recommendedVendor && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Recommended Vendor</div>
              <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-accent)' }}>
                {doc.recommendedVendor}
              </p>
            </div>
          )}

          {/* Costs */}
          {doc.estimatedCost !== undefined && (
            <div style={{ marginBottom: 16, background: 'var(--color-surface-2)', padding: 12, borderRadius: 'var(--radius-md)' }}>
              <div className="drawer-section-title" style={{ marginBottom: 2 }}>Estimated Cost</div>
              <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-accent)', margin: 0 }}>
                {formatCurrency(doc.estimatedCost)}
              </p>
            </div>
          )}

          {/* Items */}
          {doc.items && doc.items.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Items ({doc.items.length})</div>
              {renderItems(doc.items)}
            </div>
          )}

          {/* Quotations */}
          {doc.quotations && doc.quotations.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="drawer-section-title">Vendor Quotations ({doc.quotations.length})</div>
              {doc.quotations.map((q, i) => (
                <div key={q._id || i} className="quotation-card" style={{ marginBottom: 10 }}>
                  <div className="quotation-vendor">Vendor #{i + 1}: {q.vendorName}</div>
                  <div className="quotation-amount">{formatCurrency(q.amount)}</div>
                  <div className="quotation-meta">Valid until: {formatDate(q.validity)}</div>
                  {q.itemBreakdown && <div className="quotation-meta" style={{ marginTop: 4 }}>{q.itemBreakdown}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Rejection Decision Note */}
          {doc.decisionNote && (
            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
              <div className="drawer-section-title" style={{ color: 'var(--color-danger)', marginBottom: 4 }}>Decision / Rejection Note</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: '#991b1b', fontStyle: 'italic', margin: 0 }}>"{doc.decisionNote}"</p>
            </div>
          )}

          {/* Meta Grid */}
          <div className="meta-grid" style={{ marginBottom: 20 }}>
            {(doc.createdBy?.name || doc.submittedBy?.name || doc.assessedBy?.name) && (
              <div className="drawer-field">
                <span className="drawer-field-label">Author</span>
                <span className="drawer-field-value">
                  {doc.createdBy?.name || doc.submittedBy?.name || doc.assessedBy?.name}
                </span>
              </div>
            )}
            {doc.campusRef?.name && (
              <div className="drawer-field">
                <span className="drawer-field-label">Campus</span>
                <span className="drawer-field-value">{doc.campusRef.name}</span>
              </div>
            )}
            {doc.departmentRef?.name && (
              <div className="drawer-field">
                <span className="drawer-field-label">Department</span>
                <span className="drawer-field-value">{doc.departmentRef.name}</span>
              </div>
            )}
            {doc.poNumber && (
              <div className="drawer-field">
                <span className="drawer-field-label">PO Number</span>
                <span className="drawer-field-value" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{doc.poNumber}</span>
              </div>
            )}
            {doc.totalAmount !== undefined && (
              <div className="drawer-field">
                <span className="drawer-field-label">Total Amount</span>
                <span className="drawer-field-value" style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                  {formatCurrency(doc.totalAmount)}
                </span>
              </div>
            )}
            {doc.createdAt && (
              <div className="drawer-field">
                <span className="drawer-field-label">Created Date</span>
                <span className="drawer-field-value">{formatDate(doc.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Timeline */}
          {doc.timeline && doc.timeline.length > 0 && (
            <div>
              <div className="drawer-section-title">Audit Timeline</div>
              <Timeline entries={doc.timeline} />
            </div>
          )}
        </div>

        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </>
  );
};

export default DocumentDrawer;
