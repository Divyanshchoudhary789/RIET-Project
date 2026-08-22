import React, { useCallback, useEffect, useState } from 'react';
import { BarChart2, Search, UserCircle2 } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import '../../styles/pages.css';

const DepartmentCard = ({ department }) => (
  <div className="org-card">
    <div className="org-card-header">
      <span className="org-card-icon" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}><BarChart2 size={18} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="org-card-title" title={department.name}>{department.name}</div>
        <span className="badge badge-submitted" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{department.code}</span>
      </div>
      <span className={`badge ${department.isActive ? 'badge-approved' : 'badge-rejected'}`}>{department.isActive ? 'Active' : 'Inactive'}</span>
    </div>
    <div className="org-card-body">
      <div className="org-card-row">
        <UserCircle2 size={13} />
        {department.departmentAdminRef?.name ? (
          <span>{department.departmentAdminRef.name} <span style={{ color: 'var(--color-text-muted)' }}>({department.departmentAdminRef.email})</span></span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>No Department Admin assigned</span>
        )}
      </div>
    </div>
  </div>
);

const DepartmentsList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 24;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      if (statusFilter) p.set('isActive', statusFilter);
      const r = await api.get(`/api/departments?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.departments || []));
      setTotal(r.data.meta?.total || r.data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Chairperson Console</p>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">All departments across the organization</p>
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
              placeholder="Search departments…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="empty" style={{ padding: 48 }}>
            <div className="empty-icon"><BarChart2 size={24} /></div>
            <div className="empty-title">No departments found</div>
            <div className="empty-sub">{search || statusFilter ? 'Try a different search or filter.' : 'Departments will appear here once added by the Director.'}</div>
          </div>
        ) : (
          <>
            {/* Desktop / tablet — dense table, matches the Director console */}
            <div className="table-wrap hide-mobile">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Department</th>
                    <th>Code</th>
                    <th>Department Admin</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d, i) => (
                    <tr key={d._id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{(page - 1) * limit + i + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{d.name}</td>
                      <td>
                        <span className="badge badge-submitted" style={{ fontFamily: 'var(--font-mono)' }}>{d.code || '—'}</span>
                      </td>
                      <td>
                        {d.departmentAdminRef ? (
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{d.departmentAdminRef.name}</div>
                            {d.departmentAdminRef.email && (
                              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{d.departmentAdminRef.email}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Not assigned</span>
                        )}
                      </td>
                      <td><span className={`badge ${d.isActive ? 'badge-approved' : 'badge-rejected'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile — card layout, easier to scan on a narrow screen than a dense table */}
            <div className="org-card-grid show-mobile-only">
              {items.map((d) => <DepartmentCard key={d._id} department={d} />)}
            </div>
          </>
        )}

        {total > limit && (
          <div className="pagination">
            <span className="pagination-info">{Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}</span>
            <button className="pagination-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Previous</button>
            <button className="pagination-btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentsList;
