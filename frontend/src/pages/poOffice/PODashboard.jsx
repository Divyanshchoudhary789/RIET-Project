import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, FileText, ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass } from '../../utils/helpers';
import '../../styles/pages.css';

const PODashboard = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState({ assessments: [], notesheets: [] });
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, nsRes] = await Promise.all([
          api.get('/api/assessments?status=forwarded&limit=5'),
          api.get('/api/notesheets?limit=5&sort=-createdAt'),
        ]);
        const aData = aRes.data.data;
        const nsData = nsRes.data.data;
        setData({
          assessments: Array.isArray(aData) ? aData : (aData?.assessments || []),
          notesheets: Array.isArray(nsData) ? nsData : (nsData?.notesheets || []),
        });
        setStats({
          assessments: aRes.data.total || 0,
          notesheets: nsRes.data.total || 0,
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
          <p className="page-eyebrow">PO Office</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-row">
            <div className="stat-icon stat-icon-blue"><FileCheck size={18} /></div>
            <div>
              <p className="stat-card-label">Forwarded Assessments</p>
              <p className="stat-card-value">{stats.assessments || 0}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-row">
            <div className="stat-icon stat-icon-purple"><FileText size={18} /></div>
            <div>
              <p className="stat-card-label">My Notesheets</p>
              <p className="stat-card-value">{stats.notesheets || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><FileCheck size={16} /> Forwarded Assessments</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/po-office/assessments')}>View all <ArrowRight size={14} /></button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Ref</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {data.assessments.length === 0 ? (
                  <tr><td colSpan={3}><div className="empty-state" style={{ padding:24 }}><h3>None forwarded</h3></div></td></tr>
                ) : data.assessments.map((a) => (
                  <tr key={a._id}>
                    <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{a.referenceNumber || a._id?.slice(-8)}</td>
                    <td><span className={`badge ${getStatusClass(a.status)}`}>{a.status}</span></td>
                    <td>{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><FileText size={16} /> Recent Notesheets</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/po-office/notesheets')}>View all <ArrowRight size={14} /></button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Ref</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {data.notesheets.length === 0 ? (
                  <tr><td colSpan={3}><div className="empty-state" style={{ padding:24 }}><h3>None yet</h3></div></td></tr>
                ) : data.notesheets.map((n) => (
                  <tr key={n._id}>
                    <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{n.referenceNumber || n._id?.slice(-8)}</td>
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

export default PODashboard;
