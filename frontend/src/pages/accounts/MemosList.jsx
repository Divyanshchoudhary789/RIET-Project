import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, ShoppingCart, X, Send } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import DocumentDrawer from '../../components/DocumentDrawer';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const MemosList = () => {
  const navigate = useNavigate();
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [selectedMemo, setSelectedMemo] = useState(null);

  // Generate PO modal
  const [poTargetMemo, setPoTargetMemo] = useState(null);
  const [poForm, setPoForm] = useState({ vendorName: '', totalAmount: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchApprovedMemos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ status: 'approved', limit: 100 });
      if (search) p.set('search', search);
      const r = await api.get(`/api/memos?${p}`);
      const d = r.data.data;
      setMemos(Array.isArray(d) ? d : (d?.memos || []));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchApprovedMemos();
  }, [fetchApprovedMemos]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['memo', 'purchaseOrder'].includes(payload?.entity)) fetchApprovedMemos();
  });

  const openPoModal = (memo) => {
    setPoTargetMemo(memo);
    setPoForm({
      vendorName: memo.recommendedVendor || '',
      totalAmount: '',
    });
    setCreateError('');
  };

  const handleGeneratePO = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!poForm.vendorName.trim()) {
      setCreateError('Vendor name is required.');
      return;
    }

    if (!poForm.totalAmount || Number(poForm.totalAmount) < 0) {
      setCreateError('Valid total amount is required.');
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        memoRef: poTargetMemo._id,
        vendorName: poForm.vendorName.trim(),
        totalAmount: Number(poForm.totalAmount),
      };

      const res = await api.post('/api/purchase-orders', payload);
      setPoTargetMemo(null);
      navigate(`/accounts/purchase-orders/${res.data.data?._id || ''}`);
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Accounts Console</p>
          <h1 className="page-title">Approved Memos Queue</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search approved memos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Summary</th>
                <th>Recommended Vendor</th>
                <th>Approval Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td>
                </tr>
              ) : memos.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state" style={{ padding: 48 }}>
                      <h3>No Approved Memos Awaiting Action</h3>
                      <p>All approved memos have Purchase Orders generated.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                memos.map((m) => (
                  <tr key={m._id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {m.referenceNumber || m._id?.slice(-8)}
                    </td>
                    <td>{m.summary ? (m.summary.length > 60 ? m.summary.slice(0, 60) + '...' : m.summary) : '—'}</td>
                    <td>{m.recommendedVendor || '—'}</td>
                    <td>{formatDate(m.updatedAt || m.createdAt)}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="action-btn action-view" onClick={() => setSelectedMemo(m)}>
                          <Eye size={13} /> View
                        </button>
                        {m.purchaseOrderRef ? (
                          <span
                            className="badge badge-approved"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/accounts/purchase-orders/${m.purchaseOrderRef._id || m.purchaseOrderRef}`)}
                          >
                            PO Generated
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => openPoModal(m)}
                          >
                            <ShoppingCart size={13} /> Issue PO
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMemo && (
        <DocumentDrawer
          doc={selectedMemo}
          docType="Memo"
          onClose={() => setSelectedMemo(null)}
          footer={
            selectedMemo.purchaseOrderRef ? (
              <button
                className="btn btn-primary"
                onClick={() => { const id = selectedMemo.purchaseOrderRef._id || selectedMemo.purchaseOrderRef; setSelectedMemo(null); navigate(`/accounts/purchase-orders/${id}`); }}
              >
                View Purchase Order
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => { setSelectedMemo(null); openPoModal(selectedMemo); }}>
                Issue Purchase Order
              </button>
            )
          }
        />
      )}

      {/* Generate PO Modal */}
      {poTargetMemo && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Generate Purchase Order (PO)</span>
              <button className="modal-close" onClick={() => setPoTargetMemo(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleGeneratePO}>
              <div className="modal-body" style={{ padding: 24 }}>
                {createError && <div className="page-error" style={{ marginBottom: 16 }}>{createError}</div>}

                <div style={{ marginBottom: 16, background: 'var(--color-surface-2)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Target Memo</div>
                  <div style={{ fontWeight: 600 }}>{poTargetMemo.referenceNumber || poTargetMemo._id}</div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Vendor Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Official Vendor / Company Name"
                    value={poForm.vendorName}
                    onChange={(e) => setPoForm((p) => ({ ...p, vendorName: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Total Amount (₹) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Enter total PO amount"
                    value={poForm.totalAmount}
                    onChange={(e) => setPoForm((p) => ({ ...p, totalAmount: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setPoTargetMemo(null)} disabled={createLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? <span className="spinner spinner-sm" /> : <Send size={15} />}
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemosList;
