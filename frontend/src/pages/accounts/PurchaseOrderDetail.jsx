import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Upload, PackageCheck, Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, formatCurrency, getStatusClass } from '../../utils/helpers';
import Timeline from '../../components/Timeline';
import '../../styles/pages.css';

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // PI Upload state
  const [piFile, setPiFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Goods received state
  const [goodsNote, setGoodsNote] = useState('');
  const [showGoodsModal, setShowGoodsModal] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [receivingError, setReceivingError] = useState('');

  const fetchPO = async () => {
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
  };

  useEffect(() => {
    fetchPO();
  }, [id]);

  const handleUploadPI = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!piFile) {
      setUploadError('Please select a Performa Invoice file (PDF/Image).');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('piFile', piFile);

      await api.patch(`/api/purchase-orders/${id}/upload-pi`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPiFile(null);
      await fetchPO();
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmGoodsReceived = async (e) => {
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <span className="spinner" />
      </div>
    );
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

  const isClosedOrReceived = po.status === 'closed' || po.status === 'Closed' || po.status === 'received' || po.status === 'Received';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header bar */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
            <ArrowLeft size={16} /> Back to PO List
          </button>
          <h1 className="page-title">
            PO #{po.poNumber || po._id}
          </h1>
          <p className="page-eyebrow">Accounts Section - Purchase Order Detail</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={handlePrint}>
            <Printer size={16} /> Print PO
          </button>
          {!isClosedOrReceived && (
            <button className="btn btn-primary" onClick={() => setShowGoodsModal(true)}>
              <PackageCheck size={16} /> Mark Goods Received
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Main Details */}
        <div className="section-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>PO Summary</h2>
            <span className={`badge ${getStatusClass(po.status)}`}>{po.status}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <span className="drawer-field-label">Vendor Name</span>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)' }}>
                {po.vendorName}
              </div>
            </div>

            <div>
              <span className="drawer-field-label">Total Amount</span>
              <div style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: 'var(--font-size-lg)' }}>
                {formatCurrency(po.totalAmount)}
              </div>
            </div>

            <div>
              <span className="drawer-field-label">Issued Date</span>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>{formatDate(po.createdAt)}</div>
            </div>

            <div>
              <span className="drawer-field-label">Created By</span>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>{po.createdBy?.name || 'Accounts Office'}</div>
            </div>
          </div>

          {/* Performa Invoice Section */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 8 }}>Performa Invoice (PI)</h3>
            {po.piAttachmentUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-success-bg)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success-border)' }}>
                <FileText size={20} color="var(--color-success)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: '#166534' }}>PI Uploaded</div>
                  <a href={po.piAttachmentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', textDecoration: 'underline' }}>
                    View Uploaded Document
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUploadPI}>
                {uploadError && <div className="page-error" style={{ marginBottom: 12 }}>{uploadError}</div>}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="form-input"
                    onChange={(e) => setPiFile(e.target.files[0])}
                    style={{ flex: 1, padding: 6 }}
                  />
                  <button type="submit" className="btn btn-ghost" disabled={uploading}>
                    {uploading ? <span className="spinner spinner-sm" /> : <Upload size={14} />} Upload PI
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Audit Timeline */}
        <div className="section-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 16 }}>Audit Timeline</h2>
          {po.timeline && po.timeline.length > 0 ? (
            <Timeline entries={po.timeline} />
          ) : (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No timeline entries.</div>
          )}
        </div>
      </div>

      {/* Goods Received Modal */}
      {showGoodsModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">Confirm Goods Received</span>
              <button className="modal-close" onClick={() => setShowGoodsModal(false)}><ArrowLeft size={18} /></button>
            </div>

            <form onSubmit={handleConfirmGoodsReceived}>
              <div className="modal-body" style={{ padding: 24 }}>
                {receivingError && <div className="page-error" style={{ marginBottom: 16 }}>{receivingError}</div>}

                <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-info)', fontWeight: 600 }}>Stock Auto-Increment Alert</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    Marking this PO as Received will automatically update and increment the stock quantity at the destination campus/department!
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Receipt Remarks / Inspection Note</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Enter goods verification remarks or delivery reference..."
                    value={goodsNote}
                    onChange={(e) => setGoodsNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowGoodsModal(false)} disabled={receiving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={receiving}>
                  {receiving ? <span className="spinner spinner-sm" /> : <PackageCheck size={15} />}
                  Confirm Goods Receipt & Update Stock
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
