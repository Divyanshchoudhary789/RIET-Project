import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, Package, CheckCircle2, ArrowRight, Eye, Building2, BarChart2 } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import useSocketEvent from '../../hooks/useSocketEvent';
import DocumentDrawer from '../../components/DocumentDrawer';
import RejectModal from '../../components/RejectModal';
import ActionNoteModal from '../../components/ActionNoteModal';
import '../../styles/pages.css';

const ChairpersonDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pendingMemos: 0, approvedMemos: 0, rejectedMemos: 0, totalUsers: 0, totalStockItems: 0, totalCampuses: 0, totalDepartments: 0 });
  const [pendingMemosList, setPendingMemosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [rejectingMemoId, setRejectingMemoId] = useState(null);
  const [approvingMemoId, setApprovingMemoId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [memosRes, usersRes, stockRes, campusesRes, deptRes] = await Promise.all([
        api.get('/api/memos?limit=100'),
        api.get('/api/users?limit=1'),
        api.get('/api/stock?limit=1'),
        api.get('/api/campuses?limit=1'),
        api.get('/api/departments?limit=1'),
      ]);
      const memos = Array.isArray(memosRes.data.data) ? memosRes.data.data : memosRes.data.data?.memos || [];
      const pending  = memos.filter((m) => m.status === 'submitted' || m.status === 'under_review');
      const approved = memos.filter((m) => m.status === 'approved');
      const rejected = memos.filter((m) => m.status === 'rejected');
      setStats({
        pendingMemos: pending.length,
        approvedMemos: approved.length,
        rejectedMemos: rejected.length,
        totalUsers: usersRes.data?.meta?.total || usersRes.data?.total || 0,
        totalStockItems: stockRes.data?.meta?.total || stockRes.data?.total || 0,
        totalCampuses: campusesRes.data?.meta?.total || campusesRes.data?.total || 0,
        totalDepartments: deptRes.data?.meta?.total || deptRes.data?.total || 0,
      });
      setPendingMemosList(pending);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['memo', 'purchaseOrder'].includes(payload?.entity)) fetchDashboardData();
  });

  const handleApproveMemo = async (note) => {
    if (!approvingMemoId) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/memos/${approvingMemoId}/decide`, { action: 'approve', note: note || undefined });
      setApprovingMemoId(null);
      setSelectedMemo(null);
      fetchDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectMemoConfirm = async (note) => {
    if (!rejectingMemoId) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/memos/${rejectingMemoId}/decide`, { action: 'reject', note });
      setRejectingMemoId(null);
      setSelectedMemo(null);
      fetchDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <p className="page-eyebrow">Executive Console</p>
          <h1 className="page-title">Chairperson Overview</h1>
        </div>
      </div>

      {error && <div className="page-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card" onClick={() => navigate('/chairperson/memos')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(234,179,8,0.15)', color: '#d97706' }}><Briefcase size={22} /></div>
          <div className="stat-info"><span className="stat-label">Pending Memos</span><span className="stat-value">{stats.pendingMemos}</span></div>
        </div>
        <div className="stat-card" onClick={() => navigate('/chairperson/memos')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.15)', color: '#16a34a' }}><CheckCircle2 size={22} /></div>
          <div className="stat-info"><span className="stat-label">Approved Memos</span><span className="stat-value">{stats.approvedMemos}</span></div>
        </div>
        <div className="stat-card" onClick={() => navigate('/chairperson/users')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.15)', color: '#2563eb' }}><Users size={22} /></div>
          <div className="stat-info"><span className="stat-label">Total Users</span><span className="stat-value">{stats.totalUsers}</span></div>
        </div>
        <div className="stat-card" onClick={() => navigate('/chairperson/stock')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}><Package size={22} /></div>
          <div className="stat-info"><span className="stat-label">Total Stock Items</span><span className="stat-value">{stats.totalStockItems}</span></div>
        </div>
        <div className="stat-card" onClick={() => navigate('/chairperson/campuses')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.15)', color: '#2563eb' }}><Building2 size={22} /></div>
          <div className="stat-info"><span className="stat-label">Campuses</span><span className="stat-value">{stats.totalCampuses}</span></div>
        </div>
        <div className="stat-card" onClick={() => navigate('/chairperson/departments')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}><BarChart2 size={22} /></div>
          <div className="stat-info"><span className="stat-label">Departments</span><span className="stat-value">{stats.totalDepartments}</span></div>
        </div>
      </div>

      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
            Memos Awaiting Your Approval ({pendingMemosList.length})
          </h2>
          <button className="btn btn-ghost" onClick={() => navigate('/chairperson/memos')}>
            View All Memos <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Reference</th><th>Summary</th><th>Recommended Vendor</th><th>Submitted Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
              ) : pendingMemosList.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state" style={{ padding: 48 }}>
                    <CheckCircle2 size={24} color="var(--color-success)" style={{ marginBottom: 8 }} />
                    <h3>No pending memos for review</h3>
                    <p>All submitted memos have been processed.</p>
                  </div>
                </td></tr>
              ) : pendingMemosList.map((m) => (
                <tr key={m._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.referenceNumber || m._id?.slice(-8)}</td>
                  <td>{m.summary ? (m.summary.length > 50 ? m.summary.slice(0, 50) + '...' : m.summary) : '—'}</td>
                  <td>{m.recommendedVendor || '—'}</td>
                  <td>{formatDate(m.createdAt)}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn action-view" onClick={() => setSelectedMemo(m)}><Eye size={13} /> View</button>
                      <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} disabled={actionLoading} onClick={() => setApprovingMemoId(m._id)}>Approve</button>
                      <button className="btn btn-danger"  style={{ padding: '4px 10px', fontSize: 12 }} disabled={actionLoading} onClick={() => setRejectingMemoId(m._id)}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
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
            selectedMemo.status === 'submitted' || selectedMemo.status === 'under_review' ? (
              <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'flex-end' }}>
                <button className="btn btn-danger"  onClick={() => setRejectingMemoId(selectedMemo._id)} disabled={actionLoading}>Reject Memo</button>
                <button className="btn btn-primary" onClick={() => setApprovingMemoId(selectedMemo._id)} disabled={actionLoading}>
                  {actionLoading ? <span className="spinner spinner-sm" /> : null} Approve Memo
                </button>
              </div>
            ) : null
          }
        />
      )}

      {rejectingMemoId && (
        <RejectModal title="Reject Memo" loading={actionLoading} onConfirm={handleRejectMemoConfirm} onClose={() => setRejectingMemoId(null)} />
      )}

      {approvingMemoId && (
        <ActionNoteModal
          title="Approve Memo"
          description="This memo will be approved and sent to Accounts to issue the Purchase Order. You can add an optional note."
          confirmLabel="Approve Memo"
          placeholder="Optional approval note…"
          loading={actionLoading}
          onConfirm={handleApproveMemo}
          onClose={() => setApprovingMemoId(null)}
        />
      )}
    </div>
  );
};

export default ChairpersonDashboard;
