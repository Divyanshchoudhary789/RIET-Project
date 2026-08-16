import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, FileText, Clock, CheckCircle2, XCircle, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatDate, getErrorMessage, getStatusClass } from '../../utils/helpers';
import '../../styles/pages.css';

const CenterHeadDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/requirements/dashboard-stats')
      .then((r) => setStats(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">Center Head</span>
          <h1 className="page-title">Welcome, {user?.name}</h1>
          <p className="page-subtitle">Manage requirements for your campus</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/center-head/new-requirement')}>
          <FilePlus2 size={17} /> New Requirement
        </button>
      </div>

      {loading ? (
        <div className="page-loader"><span className="spinner" /></div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label"><span>Total</span><FileText size={16} /></div>
              <div className="stat-value">{stats?.total ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><span>Submitted</span><Clock size={16} /></div>
              <div className="stat-value accent">{stats?.submitted ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><span>Rejected</span><XCircle size={16} /></div>
              <div className="stat-value danger">{stats?.rejected ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><span>Closed</span><CheckCircle2 size={16} /></div>
              <div className="stat-value success">{stats?.closed ?? 0}</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Recent Requirements</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/center-head/requirements')}>View all</button>
            </div>
            {!stats?.recent?.length ? (
              <div className="empty">
                <div className="empty-icon"><Package size={24} /></div>
                <div className="empty-title">No requirements yet</div>
                <div className="empty-sub">Create your first requirement to get started</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Justification</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {stats.recent.map((r) => (
                      <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate('/center-head/requirements')}>
                        <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.justification || '—'}</td>
                        <td><span className={`badge badge-${r.priority}`}>{r.priority}</span></td>
                        <td><span className={`badge ${getStatusClass(r.status)}`}>{r.status}</span></td>
                        <td>{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Quick Actions</span>
            </div>
            <div className="panel-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/center-head/new-requirement')}>
                <FilePlus2 size={16} /> New Requirement
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/center-head/requirements')}>
                <FileText size={16} /> All Requirements
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/center-head/stock')}>
                <Package size={16} /> View Stock
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CenterHeadDashboard;
