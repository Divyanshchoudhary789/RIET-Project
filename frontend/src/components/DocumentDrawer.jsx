import React from 'react';
import { X } from 'lucide-react';
import Timeline from './Timeline';
import { formatDate, formatCurrency, getStatusClass, getPriorityClass } from '../utils/helpers';

const DocumentDrawer = ({ doc, docType, onClose, footer }) => {
  if (!doc) return null;

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
            <td>{item.name}</td>
            <td>{item.quantity}</td>
            <td>{item.unit}</td>
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
          <span className="drawer-title">{docType} Details</span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="drawer-body">
          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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

          {/* Common fields */}
          {doc.justification && (
            <div>
              <div className="drawer-section-title">Justification</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{doc.justification}</p>
            </div>
          )}

          {doc.summary && (
            <div>
              <div className="drawer-section-title">Summary</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{doc.summary}</p>
            </div>
          )}

          {doc.feasibilityNotes && (
            <div>
              <div className="drawer-section-title">Feasibility Notes</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{doc.feasibilityNotes}</p>
            </div>
          )}

          {doc.estimatedCost !== undefined && (
            <div>
              <div className="drawer-section-title">Estimated Cost</div>
              <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-accent)' }}>{formatCurrency(doc.estimatedCost)}</p>
            </div>
          )}

          {/* Items */}
          {doc.items && doc.items.length > 0 && (
            <div>
              <div className="drawer-section-title">Items</div>
              {renderItems(doc.items)}
            </div>
          )}

          {/* Quotations */}
          {doc.quotations && doc.quotations.length > 0 && (
            <div>
              <div className="drawer-section-title">Quotations</div>
              {doc.quotations.map((q, i) => (
                <div key={q._id || i} className="quotation-card">
                  <div className="quotation-vendor">Vendor: {q.vendorName}</div>
                  <div className="quotation-amount">{formatCurrency(q.amount)}</div>
                  <div className="quotation-meta">Valid until: {formatDate(q.validity)}</div>
                  {q.itemBreakdown && <div className="quotation-meta" style={{ marginTop: 4 }}>{q.itemBreakdown}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Rejection note */}
          {doc.decisionNote && (
            <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <div className="drawer-section-title" style={{ color: 'var(--color-warning)', marginBottom: 4 }}>Decision Note</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: '#92400e', fontStyle: 'italic' }}>{doc.decisionNote}</p>
            </div>
          )}

          {/* Meta */}
          <div className="meta-grid">
            {doc.createdBy?.name && (
              <div className="drawer-field">
                <span className="drawer-field-label">Created By</span>
                <span className="drawer-field-value">{doc.createdBy.name}</span>
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
                <span className="drawer-field-value">{formatCurrency(doc.totalAmount)}</span>
              </div>
            )}
            {doc.createdAt && (
              <div className="drawer-field">
                <span className="drawer-field-label">Created</span>
                <span className="drawer-field-value">{formatDate(doc.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Timeline */}
          {doc.timeline && doc.timeline.length > 0 && (
            <div>
              <div className="drawer-section-title">Timeline</div>
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
