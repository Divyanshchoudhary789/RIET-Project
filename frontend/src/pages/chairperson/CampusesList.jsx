import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Search, MapPin, UserCircle2 } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import '../../styles/pages.css';

const CampusCard = ({ campus }) => (
  <div className="org-card">
    <div className="org-card-header">
      <span className="org-card-icon" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}><Building2 size={18} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="org-card-title" title={campus.name}>{campus.name}</div>
        <span className="badge badge-submitted" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{campus.code}</span>
      </div>
      <span className={`badge ${campus.isActive ? 'badge-approved' : 'badge-rejected'}`}>{campus.isActive ? 'Active' : 'Inactive'}</span>
    </div>
    <div className="org-card-body">
      {campus.location && (
        <div className="org-card-row">
          <MapPin size={13} />
          <span>{campus.location}</span>
        </div>
      )}
      <div className="org-card-row">
        <UserCircle2 size={13} />
        {campus.centerHeadRef?.name ? (
          <span>{campus.centerHeadRef.name} <span style={{ color: 'var(--color-text-muted)' }}>({campus.centerHeadRef.email})</span></span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>No Center Head assigned</span>
        )}
      </div>
    </div>
  </div>
);

const CampusesList = () => {
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
      const r = await api.get(`/api/campuses?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.campuses || []));
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
          <h1 className="page-title">Campuses</h1>
          <p className="page-subtitle">All campuses across the organization</p>
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
              placeholder="Search campuses…"
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
            <div className="empty-icon"><Building2 size={24} /></div>
            <div className="empty-title">No campuses found</div>
            <div className="empty-sub">{search || statusFilter ? 'Try a different search or filter.' : 'Campuses will appear here once added by the Director.'}</div>
          </div>
        ) : (
          <>
            {/* Desktop / tablet — dense table, matches the Director console */}
            <div className="table-wrap hide-mobile">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Campus Name</th>
                    <th>Code</th>
                    <th>Location</th>
                    <th>Center Head</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c, i) => (
                    <tr key={c._id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{(page - 1) * limit + i + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</td>
                      <td>
                        <span className="badge badge-submitted" style={{ fontFamily: 'var(--font-mono)' }}>{c.code || '—'}</span>
                      </td>
                      <td>
                        {c.location ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                            <span>{c.location}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {c.centerHeadRef ? (
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.centerHeadRef.name}</div>
                            {c.centerHeadRef.email && (
                              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.centerHeadRef.email}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Not assigned</span>
                        )}
                      </td>
                      <td><span className={`badge ${c.isActive ? 'badge-approved' : 'badge-rejected'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile — card layout, easier to scan on a narrow screen than a dense table */}
            <div className="org-card-grid show-mobile-only">
              {items.map((c) => <CampusCard key={c._id} campus={c} />)}
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

export default CampusesList;
