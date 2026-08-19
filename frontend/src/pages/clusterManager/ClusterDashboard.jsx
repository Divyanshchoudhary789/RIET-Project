import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, Eye, XCircle, CheckSquare } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getErrorMessage, getStatusClass, getPriorityClass } from '../../utils/helpers';
import useSocketEvent from '../../hooks/useSocketEvent';
import RejectModal from '../../components/RejectModal';
import DocumentDrawer from '../../components/DocumentDrawer';
import '../../styles/pages.css';

const ClusterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, forwarded: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, statsRes] = await Promise.all([
        api.get('/api/requirements?status=submitted&limit=10'),
        api.get('/api/requirements/dashboard-stats'),
      ]);
      setRequirements(reqRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Re-fetch on any requirement or workProposal change
  useSocketEvent('dashboard:refresh', (payload) => {
    if (['requirement', 'workProposal'].includes(payload?.entity)) load();
  });

  const handleReject = async (note) => {
    setRejecting(true);
    try {
      await api.patch(`/api/requirements/${rejectTarget._id}/reject`, { note });
      setRejectTarget(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">Cluster Manager</span>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Requirements awaiting your review</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/cluster-manager/proposals/new')}>
          <FilePlus2 size={16} /> New Work Proposal
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {!loading && (
        <div className="stats-row">
          <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{stats.total ?? 0}</div></div>
          <div className="stat-card"><div className="stat-label">Submitted</div><div className="stat-value accent">{stats.submitted ?? 0}</div></div>
          <div className="stat-card"><div className="stat-label">Forwarded</div><div className="stat-value success">{stats.forwarded ?? 0}</div></div>
          <div className="stat-card"><div className="stat-label">Rejected</div><div className="stat-value danger">{stats.rejected ?? 0}</div></div>
        </div>
      )}

      <div className="table-panel">
        <div className="table-panel-header">
          <span className="table-panel-title">Pending Review</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cluster-manager/requirements')}>View all</button>
        </div>
        {loading ? <div className="page-loader"><span className="spinner" /></div> : requirements.length === 0 ? (
          <div className="empty"><div className="empty-title">No pending requirements</div></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Justification</th><th>Campus</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {requirements.map((r) => (
                  <tr key={r._id}>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.justification}</td>
                    <td>{r.campusRef?.name || '—'}</td>
                    <td><span className={`badge ${getPriorityClass(r.priority)}`}>{r.priority}</span></td>
                    <td><span className={`badge ${getStatusClass(r.status)}`}>{r.status}</span></td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(r)}><Eye size={14} /></button>
                        <button className="action-reject btn-sm" onClick={() => setRejectTarget(r)}><XCircle size={13} /> Reject</button>
                        <button className="action-forward btn-sm" onClick={() => navigate('/cluster-manager/proposals/new', { state: { requirementIds: [r._id] } })}>
                          <CheckSquare size={13} /> Propose
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DocumentDrawer doc={selected} docType="Requirement" onClose={() => setSelected(null)} />}
      {rejectTarget && (
        <RejectModal title="Reject Requirement" onConfirm={handleReject} onClose={() => setRejectTarget(null)} loading={rejecting} />
      )}
    </div>
  );
};

export default ClusterDashboard;
