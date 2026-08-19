import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, FileText, ArrowRight, Users } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass, formatCurrency } from '../../utils/helpers';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const DirectorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ assessments: [], notesheets: [] });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [aRes, nsRes, usersRes] = await Promise.all([
        api.get('/api/assessments?status=submitted&limit=5'),
        api.get('/api/notesheets?status=submitted&limit=5'),
        api.get('/api/users?limit=1'),
      ]);
      const aData = aRes.data.data;
      const nsData = nsRes.data.data;
      setData({
        assessments: Array.isArray(aData) ? aData : (aData?.assessments || []),
        notesheets: Array.isArray(nsData) ? nsData : (nsData?.notesheets || []),
      });
      setStats({
        assessments: aRes.data.meta?.total || aRes.data.total || 0,
        notesheets: nsRes.data.meta?.total || nsRes.data.total || 0,
        users: usersRes.data.meta?.total || usersRes.data.total || 0,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['assessment', 'notesheet', 'memo', 'purchaseOrder'].includes(payload?.entity)) load();
  });

  if (loading) return <div className="page-loader"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Director</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="stats-grid">
        {[
          { label: 'Pending Assessments', value: stats.assessments || 0, icon: FileCheck, cls: 'stat-icon-blue' },
          { label: 'Pending Notesheets',  value: stats.notesheets  || 0, icon: FileText,  cls: 'stat-icon-purple' },
          { label: 'Total Users',         value: stats.users       || 0, icon: Users,     cls: 'stat-icon-gray' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-row">
              <div className={`stat-icon ${cls}`}><Icon size={18} /></div>
              <div>
                <p className="stat-card-label">{label}</p>
                <p className="stat-card-value">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="content-grid">
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><FileCheck size={16} /> Assessments Pending Review</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/director/assessments')}>View all <ArrowRight size={14} /></button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Ref</th><th>Est. Cost</th><th>Status</th></tr></thead>
              <tbody>
                {data.assessments.length === 0 ? (
                  <tr><td colSpan={3}><div className="empty-state" style={{ padding: 24 }}><h3>None pending</h3></div></td></tr>
                ) : data.assessments.map((a) => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{a.referenceNumber || a._id?.slice(-8)}</td>
                    <td>{formatCurrency(a.estimatedCost)}</td>
                    <td><span className={`badge ${getStatusClass(a.status)}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><FileText size={16} /> Notesheets Pending Action</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/director/notesheets')}>View all <ArrowRight size={14} /></button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Ref</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {data.notesheets.length === 0 ? (
                  <tr><td colSpan={3}><div className="empty-state" style={{ padding: 24 }}><h3>None pending</h3></div></td></tr>
                ) : data.notesheets.map((n) => (
                  <tr key={n._id}>
                    <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{n.referenceNumber || n._id?.slice(-8)}</td>
                    <td><span className={`badge ${getStatusClass(n.status)}`}>{n.status}</span></td>
                    <td>{formatDate(n.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorDashboard;
