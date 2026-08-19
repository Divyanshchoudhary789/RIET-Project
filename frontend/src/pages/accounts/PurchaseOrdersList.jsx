import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Eye, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, formatCurrency, getStatusClass } from '../../utils/helpers';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const PurchaseOrdersList = () => {
  const navigate = useNavigate();

  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      const r = await api.get(`/api/purchase-orders?${p}`);
      const d = r.data.data;
      setPos(Array.isArray(d) ? d : (d?.orders || d?.purchaseOrders || []));
      setTotal(r.data.meta?.total || r.data.total || d?.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // Re-fetch when any PO is created, updated, or goods are received
  useSocketEvent('dashboard:refresh', (payload) => {
    if (payload?.entity === 'purchaseOrder') fetchPurchaseOrders();
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Accounts Section</p>
          <h1 className="page-title">Purchase Orders & Performa Invoices</h1>
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
              placeholder="Search PO by number or vendor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="issued">Issued</option>
            <option value="pi_uploaded">PI Uploaded</option>
            <option value="closed">Goods Received / Closed</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Vendor Name</th>
                <th>Total Amount</th>
                <th>PI Uploaded?</th>
                <th>Status</th>
                <th>Issued Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td>
                </tr>
              ) : pos.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: 48 }}>
                      <div className="empty-state-icon"><ShoppingCart size={22} /></div>
                      <h3>No Purchase Orders Found</h3>
                      <p>Issued POs will be listed here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pos.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                      {p.poNumber || p._id?.slice(-8)}
                    </td>
                    <td>{p.vendorName}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                      {formatCurrency(p.totalAmount)}
                    </td>
                    <td>
                      {p.piAttachmentUrl ? (
                        <span className="badge badge-approved" style={{ fontSize: 11 }}>
                          <FileText size={11} style={{ marginRight: 4 }} /> PI Uploaded
                        </span>
                      ) : (
                        <span className="badge badge-revised" style={{ fontSize: 11 }}>Pending PI</span>
                      )}
                    </td>
                    <td><span className={`badge ${getStatusClass(p.status)}`}>{p.status}</span></td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <button
                        className="action-btn action-view"
                        onClick={() => navigate(`/accounts/purchase-orders/${p._id}`)}
                      >
                        <Eye size={13} /> Manage PO
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="pagination">
            <span className="pagination-info">
              {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
            </span>
            <button className="pagination-btn" onClick={() => setPage((pg) => pg - 1)} disabled={page === 1}>
              Previous
            </button>
            <button className="pagination-btn" onClick={() => setPage((pg) => pg + 1)} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrdersList;
