import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, FileCheck, CheckCircle2, PackageCheck, ArrowRight, Eye } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, formatCurrency, getStatusClass } from '../../utils/helpers';
import useSocketEvent from '../../hooks/useSocketEvent';
import DocumentDrawer from '../../components/DocumentDrawer';
import '../../styles/pages.css';

const AccountsDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ approvedMemos: 0, totalPOs: 0, issuedPOs: 0, receivedPOs: 0 });
  const [approvedMemos, setApprovedMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMemo, setSelectedMemo] = useState(null);

  const fetchAccountsData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [memosRes, poRes] = await Promise.all([
        api.get('/api/memos?status=approved&limit=100'),
        api.get('/api/purchase-orders?limit=100'),
      ]);
      const memos = Array.isArray(memosRes.data.data) ? memosRes.data.data : (memosRes.data.data?.memos || []);
      const pos   = Array.isArray(poRes.data.data)   ? poRes.data.data   : (poRes.data.data?.purchaseOrders || []);

      const issued   = pos.filter((p) => p.status === 'issued' || p.status === 'pi_uploaded');
      const received = pos.filter((p) => p.status === 'closed' || p.status === 'received');

      setStats({ approvedMemos: memos.length, totalPOs: pos.length, issuedPOs: issued.length, receivedPOs: received.length });
      setApprovedMemos(memos);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccountsData(); }, [fetchAccountsData]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['memo', 'purchaseOrder'].includes(payload?.entity)) fetchAccountsData();
  });

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <p className="page-eyebrow">Accounts Section</p>
          <h1 className="page-title">Procurement &amp; PO Dashboard</h1>
        </div>
      </div>

      {error && <div className="page-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card" onClick={() => navigate('/accounts/memos')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.15)', color: '#2563eb' }}><FileCheck size={22} /></div>
          <div className="stat-info"><span className="stat-label">Approved Memos</span><span className="stat-value">{stats.approvedMemos}</span></div>
        </div>
        <div className="stat-card" onClick={() => navigate('/accounts/purchase-orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}><ShoppingCart size={22} /></div>
          <div className="stat-info"><span className="stat-label">Total POs</span><span className="stat-value">{stats.totalPOs}</span></div>
        </div>
        <div className="stat-card" onClick={() => navigate('/accounts/purchase-orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(234,179,8,0.15)', color: '#d97706' }}><ShoppingCart size={22} /></div>
          <div className="stat-info"><span className="stat-label">Issued POs</span><span className="stat-value">{stats.issuedPOs}</span></div>
        </div>
        <div className="stat-card" onClick={() => navigate('/accounts/purchase-orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.15)', color: '#16a34a' }}><PackageCheck size={22} /></div>
          <div className="stat-info"><span className="stat-label">Goods Received</span><span className="stat-value">{stats.receivedPOs}</span></div>
        </div>
      </div>

      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
            Chairperson-Approved Memos ({approvedMemos.length})
          </h2>
          <button className="btn btn-ghost" onClick={() => navigate('/accounts/memos')}>View All <ArrowRight size={14} /></button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Memo Ref</th><th>Summary</th><th>Recommended Vendor</th><th>Approved Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
              ) : approvedMemos.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state" style={{ padding: 48 }}>
                    <CheckCircle2 size={24} color="var(--color-success)" style={{ marginBottom: 8 }} />
                    <h3>No pending approved memos</h3>
                    <p>All approved memos have Purchase Orders generated.</p>
                  </div>
                </td></tr>
              ) : approvedMemos.map((m) => (
                <tr key={m._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.referenceNumber || m._id?.slice(-8)}</td>
                  <td>{m.summary ? (m.summary.length > 50 ? m.summary.slice(0, 50) + '...' : m.summary) : '—'}</td>
                  <td>{m.recommendedVendor || '—'}</td>
                  <td>{formatDate(m.updatedAt || m.createdAt)}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn action-view" onClick={() => setSelectedMemo(m)}><Eye size={13} /> View</button>
                      {m.purchaseOrderRef ? (
                        <span
                          className="badge badge-approved"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/accounts/purchase-orders/${m.purchaseOrderRef._id || m.purchaseOrderRef}`)}
                        >
                          PO Generated
                        </span>
                      ) : (
                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => navigate('/accounts/memos')}>Generate PO</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMemo && <DocumentDrawer doc={selectedMemo} docType="Memo" onClose={() => setSelectedMemo(null)} />}
    </div>
  );
};

export default AccountsDashboard;
