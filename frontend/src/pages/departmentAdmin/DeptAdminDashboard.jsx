import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, FileCheck, ArrowRight, Clock } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass } from '../../utils/helpers';
import '../../styles/pages.css';

const DeptAdminDashboard = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [stats, setStats]         = useState({ proposals: 0, assessments: 0 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [propRes, assessRes] = await Promise.all([
          api.get('/api/work-proposals?limit=5&sort=-createdAt'),
          api.get('/api/assessments?limit=1'),
        ]);
        const props = propRes.data.data;
        const arr = Array.isArray(props) ? props : (props?.proposals || []);
        setProposals(arr.slice(0, 5));
        setStats({
          proposals: propRes.data.total || arr.length,
          assessments: assessRes.data.total || 0,
        });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="page-loader"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Department Admin</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-row">
            <div className="stat-icon stat-icon-purple"><ClipboardList size={18} /></div>
            <div>
              <p className="stat-card-label">Work Proposals</p>
              <p className="stat-card-value">{stats.proposals}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-row">
            <div className="stat-icon stat-icon-blue"><FileCheck size={18} /></div>
            <div>
              <p className="stat-card-label">Assessments</p>
              <p className="stat-card-value">{stats.assessments}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title"><Clock size={16} /> Recent Work Proposals</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/department-admin/proposals')}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state" style={{ padding:32 }}>
                    <h3>No proposals yet</h3>
                  </div>
                </td></tr>
              ) : proposals.map((p) => (
                <tr key={p._id}>
                  <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{p.referenceNumber || p._id?.slice(-8)}</td>
                  <td>{p.title || '—'}</td>
                  <td><span className={`badge ${getStatusClass(p.status)}`}>{p.status}</span></td>
                  <td>{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeptAdminDashboard;
