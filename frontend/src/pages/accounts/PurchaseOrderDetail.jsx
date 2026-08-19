import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, FileText, Upload, PackageCheck, Printer,
  CheckCircle2, DollarSign, Building, Award, Package, Clock,
} from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, formatCurrency, getStatusClass } from '../../utils/helpers';
import Timeline from '../../components/Timeline';
import '../../styles/pages.css';

const Field = ({ label, value, mono }) => (
  <div className="drawer-field">
    <span className="drawer-field-label">{label}</span>
    <span className="drawer-field-value" style={mono ? { fontFamily: 'var(--font-mono)', fontSize: 13 } : {}}>{value || '—'}</span>
  </div>
);

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [piFile, setPiFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [goodsNote, setGoodsNote] = useState('');
  const [showGoodsModal, setShowGoodsModal] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [receivingError, setReceivingError] = useState('');

  const fetchPO = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get(`/api/purchase-orders/${id}`);
      setPo(r.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPO(); }, [fetchPO]);

  const handleUploadPI = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!piFile) { setUploadError('Please select a Performa Invoice file (PDF/Image).'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('piFile', piFile);
      await api.patch(`/api/purchase-orders/${id}/upload-pi`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPiFile(null);
      await fetchPO();
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleGoodsReceived = async (e) => {
    e.preventDefault();
    setReceivingError('');
    setReceiving(true);
    try {
      await api.patch(`/api/purchase-orders/${id}/goods-received`, { note: goodsNote.trim() });
      setShowGoodsModal(false);
      await fetchPO();
    } catch (err) {
      setReceivingError(getErrorMessage(err));
    } finally {
      setReceiving(false);
    }
  };

  if (loading) {
    return <div className="page-loader"><span className="spinner" /></div>;
  }

  if (error || !po) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="page-error">{error || 'Purchase Order not found.'}</div>
      </div>
    );
  }

  const isClosed = ['closed', 'received', 'Closed', 'Received'].includes(po.status);

  // Deep-populated chain data
  const memo = po.memoRef && typeof po.memoRef === 'object' ? po.memoRef : null;
  const notesheet = memo?.notesheetRef && typeof memo.notesheetRef === 'object' ? memo.notesheetRef : null;
  const assessment = notesheet?.assessmentRef && typeof notesheet.assessmentRef === 'object' ? notesheet.assessmentRef : null;
  const proposal = assessment?.workProposalRef && typeof assessment.workProposalRef === 'object' ? assessment.workProposalRef : null;
  const requirements = Array.isArray(proposal?.requirementRefs) ? proposal.requirementRefs : [];
  const quotations = notesheet?.quotations || [];
  const allItems = requirements.flatMap((r) => r.items || []);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            <ArrowLeft size={16} /> Back to PO List
          </button>
          <h1 className="page-title">
            PO #{po.poNumber || po._id}
          </h1>
          <p className="page-eyebrow">Accounts — Purchase Order Detail</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          {!isClosed && (
            <button className="btn btn-primary" onClick={() => setShowGoodsModal(true)}>
              <PackageCheck size={16} /> Mark Goods Received
            </button>
          )}
        </div>
      </div>

      {/* Key stats row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-row">
            <div className="stat-icon stat-icon-blue"><DollarSign size={18} /></div>
            <div className="stat-info">
              <span className="stat-label">Total Amount</span>
              <span className="stat-value" style={{ fontSize: 20, color: 'var(--color-accent)' }}>{formatCurrency(po.totalAmount)}</span>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-row">
            <div className="stat-icon stat-icon-purple"><Award size={18} /></div>
            <div className="stat-info">
              <span className="stat-label">Vendor</span>
              <span className="stat-value" style={{ fontSize: 14, fontWeight: 600 }}>{po.vendorName}</span>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-row">
            <div className="stat-icon stat-icon-green"><CheckCircle2 size={18} /></div>
            <div className="stat-info">
              <span className="stat-label">Status</span>
              <span className={`badge ${getStatusClass(po.status)}`} style={{ marginTop: 4 }}>{po.status}</span>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-row">
            <div className="stat-icon stat-icon-gray"><Clock size={18} /></div>
            <div className="stat-info">
              <span className="stat-label">Issued Date</span>
              <span className="stat-value" style={{ fontSize: 13 }}>{formatDate(po.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* PO Summary card */}
        <div className="section-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--color-accent)" /> PO Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="PO Number" value={po.poNumber} mono />
            <Field label="Vendor Name" value={po.vendorName} />
            <Field label="Total Amount" value={formatCurrency(po.totalAmount)} />
            <Field label="Issued By" value={po.createdBy?.name} />
            <Field label="Issued Date" value={formatDate(po.createdAt)} />
            {po.receivedAt && <Field label="Received Date" value={formatDate(po.receivedAt)} />}
            {po.receivedBy?.name && <Field label="Received By" value={po.receivedBy.name} />}
          </div>

          {/* Performa Invoice */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 20 }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 12 }}>Performa Invoice (PI)</h3>
            {po.piAttachmentUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-success-bg)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success-border)' }}>
                <FileText size={18} color="var(--color-success)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: '#166534' }}>PI Uploaded</div>
                  <a href={po.piAttachmentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'underline' }}>
                    View Document
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUploadPI}>
                {uploadError && <div className="page-error" style={{ marginBottom: 12, fontSize: 13 }}>{uploadError}</div>}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="form-input"
                    onChange={(e) => setPiFile(e.target.files[0])}
                    style={{ flex: 1, minWidth: 180, padding: '6px 10px', fontSize: 13 }}
                  />
                  <button type="submit" className="btn btn-ghost" disabled={uploading} style={{ whiteSpace: 'nowrap' }}>
                    {uploading ? <span className="spinner spinner-sm" /> : <Upload size={14} />}
                    Upload PI
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Audit Timeline */}
        <div className="section-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--color-accent)" /> Audit Trail
          </h2>
          {po.timeline?.length > 0 ? (
            <Timeline entries={po.timeline} />
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No timeline entries.</div>
          )}
        </div>
      </div>

      {/* Linked Memo Summary */}
      {memo && (
        <div className="section-card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--color-accent)" /> Linked Executive Memo
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: memo.summary ? 16 : 0 }}>
            <Field label="Memo Reference" value={memo.referenceNumber || memo._id?.slice(-8)} mono />
            <Field label="Recommended Vendor" value={memo.recommendedVendor} />
            <Field label="Memo Status" value={memo.status} />
            {assessment?.estimatedCost !== undefined && (
              <Field label="Estimated Cost" value={formatCurrency(assessment.estimatedCost)} />
            )}
          </div>
          {memo.summary && (
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Executive Summary</span>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.6 }}>{memo.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Vendor Quotations */}
      {quotations.length > 0 && (
        <div className="section-card" style={{ marginBottom: 20 }}>
          <div className="section-card-header">
            <span className="section-card-title"><Award size={15} /> Vendor Quotations ({quotations.length})</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Validity</th>
                  <th>Item Breakdown</th>
                  <th>Document</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q, i) => {
                  const isSelected = memo?.recommendedVendor && q.vendorName?.toLowerCase().includes(memo.recommendedVendor.toLowerCase());
                  return (
                    <tr key={q._id || i} style={{ background: isSelected ? 'rgba(37,99,235,0.05)' : undefined }}>
                      <td style={{ fontWeight: isSelected ? 700 : 500 }}>
                        {q.vendorName}
                        {isSelected && <span className="badge badge-approved" style={{ marginLeft: 6, fontSize: 10 }}>Recommended</span>}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{formatCurrency(q.amount)}</td>
                      <td>{formatDate(q.validity)}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{q.itemBreakdown || '—'}</td>
                      <td>
                        {q.attachmentUrl ? (
                          <a href={q.attachmentUrl} target="_blank" rel="noreferrer" className="action-btn action-view" style={{ textDecoration: 'none' }}>
                            View
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Procurement Items */}
      {allItems.length > 0 && (
        <div className="section-card" style={{ marginBottom: 20 }}>
          <div className="section-card-header">
            <span className="section-card-title"><Package size={15} /> Procurement Items ({allItems.length})</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Item Name</th><th>Qty</th><th>Unit</th><th>Description</th></tr>
              </thead>
              <tbody>
                {allItems.map((item, i) => (
                  <tr key={item._id || i}>
                    <td style={{ color: 'var(--color-text-muted)', width: 40 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</td>
                    <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                    <td>{item.unit || '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{item.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assessment / Feasibility */}
      {assessment && (assessment.feasibilityNotes || assessment.technicalRemarks) && (
        <div className="section-card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} color="var(--color-accent)" /> Technical Assessment
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {assessment.feasibilityNotes && (
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Feasibility Notes</span>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{assessment.feasibilityNotes}</p>
              </div>
            )}
            {assessment.technicalRemarks && (
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Technical Remarks</span>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{assessment.technicalRemarks}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goods Received Modal */}
      {showGoodsModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Confirm Goods Received</span>
              <button className="modal-close" onClick={() => setShowGoodsModal(false)}><ArrowLeft size={18} /></button>
            </div>
            <form onSubmit={handleGoodsReceived}>
              <div className="modal-body" style={{ padding: 24 }}>
                {receivingError && <div className="page-error" style={{ marginBottom: 16 }}>{receivingError}</div>}
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                  <div>
                    <strong>Stock Auto-Update:</strong> Marking this PO as received will automatically increment campus stock for all linked requirement items.
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Receipt Remarks / Inspection Note</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Delivery reference, inspection note, condition of goods…"
                    value={goodsNote}
                    onChange={(e) => setGoodsNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 24px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowGoodsModal(false)} disabled={receiving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={receiving}>
                  {receiving ? <span className="spinner spinner-sm" /> : <PackageCheck size={15} />}
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderDetail;
