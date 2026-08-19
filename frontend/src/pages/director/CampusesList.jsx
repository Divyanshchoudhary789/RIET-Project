import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, X, Search, Info } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import '../../styles/pages.css';

const CampusesList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    location: '',
    centerHeadName: '',
    centerHeadEmail: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchCampuses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      const r = await api.get(`/api/campuses?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.campuses || []));
      setTotal(r.data.meta?.total || r.data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCampuses();
  }, [fetchCampuses]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!form.name.trim()) {
      setAddError('Campus name is required.');
      return;
    }

    const campusCode = (form.code.trim() || form.name.trim().slice(0, 4)).toUpperCase();

    setAddLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: campusCode,
        location: form.location.trim() || undefined,
      };

      if (form.centerHeadEmail.trim() && form.centerHeadName.trim()) {
        payload.centerHeadData = {
          name: form.centerHeadName.trim(),
          email: form.centerHeadEmail.trim().toLowerCase(),
        };
      }

      await api.post('/api/campuses', payload);
      setShowAdd(false);
      setForm({ name: '', code: '', location: '', centerHeadName: '', centerHeadEmail: '' });
      fetchCampuses();
    } catch (err) {
      setAddError(getErrorMessage(err));
    } finally {
      setAddLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Director Console</p>
          <h1 className="page-title">Campus Directory</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowAdd(true);
            setAddError('');
          }}
        >
          <Plus size={16} /> Add Campus
        </button>
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Campus Name</th>
                <th>Code</th>
                <th>Location</th>
                <th>Center Head</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                    <span className="spinner" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ padding: 48 }}>
                      <div className="empty-state-icon">
                        <Building2 size={22} />
                      </div>
                      <h3>No campuses found</h3>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((c, i) => (
                  <tr key={c._id}>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {c.name}
                    </td>
                    <td>
                      <span className="badge badge-submitted" style={{ fontFamily: 'var(--font-mono)' }}>
                        {c.code || '—'}
                      </span>
                    </td>
                    <td>{c.location || '—'}</td>
                    <td>{c.centerHeadRef?.name || '—'}</td>
                    <td>{formatDate(c.createdAt)}</td>
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
            <button
              className="pagination-btn"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              className="pagination-btn"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Add New Campus</span>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body" style={{ padding: 24 }}>
                {addError && <div className="page-error" style={{ marginBottom: 16 }}>{addError}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">
                      Campus Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. SGS Bharatpur"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Campus Code</label>
                    <input
                      className="form-input"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. SGS"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Location / Address</label>
                  <input
                    className="form-input"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="City / Address"
                  />
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 16,
                    marginTop: 16,
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 12,
                    }}
                  >
                    Center Head Account (Optional)
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Center Head Name</label>
                      <input
                        className="form-input"
                        value={form.centerHeadName}
                        onChange={(e) => setForm({ ...form, centerHeadName: e.target.value })}
                        placeholder="Center head full name"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Center Head Email</label>
                      <input
                        className="form-input"
                        type="email"
                        value={form.centerHeadEmail}
                        onChange={(e) => setForm({ ...form, centerHeadEmail: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

                  {form.centerHeadEmail.trim() && (
                    <div
                      style={{
                        background: 'var(--color-info-bg)',
                        border: '1px solid var(--color-info-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 10,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Info size={15} color="var(--color-info)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        System will auto-generate a temporary password and dispatch credentials to the provided email.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAdd(false)}
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? <span className="spinner spinner-sm" /> : <Plus size={15} />}
                  Add Campus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusesList;
