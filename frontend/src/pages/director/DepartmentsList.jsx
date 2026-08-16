import React, { useCallback, useEffect, useState } from 'react';
import { BarChart2, Plus, X, Search } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import '../../styles/pages.css';

const DepartmentsList = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const limit = 15;

  const [campuses, setCampuses] = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name: '', campus: '', code: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      const r = await api.get(`/api/departments?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.departments || []));
      setTotal(r.data.total || d?.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    api.get('/api/campuses?limit=100').then((r) => {
      const d = r.data.data;
      setCampuses(Array.isArray(d) ? d : (d?.campuses || []));
    }).catch(() => {});
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!form.name.trim()) { setAddError('Department name is required.'); return; }
    setAddLoading(true);
    try {
      await api.post('/api/departments', {
        name: form.name.trim(),
        campus: form.campus || undefined,
        code: form.code.trim() || undefined,
      });
      setShowAdd(false);
      setForm({ name: '', campus: '', code: '' });
      fetch();
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
          <p className="page-eyebrow">Director</p>
          <h1 className="page-title">Departments</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setAddError(''); }}>
          <Plus size={16} /> Add Department
        </button>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input type="text" className="form-input" placeholder="Search departments…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Department</th>
                <th>Code</th>
                <th>Campus</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:40 }}><span className="spinner" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state" style={{ padding:48 }}>
                    <div className="empty-state-icon"><BarChart2 size={22} /></div>
                    <h3>No departments yet</h3>
                  </div>
                </td></tr>
              ) : items.map((d, i) => (
                <tr key={d._id}>
                  <td style={{ color:'var(--color-text-muted)' }}>{(page-1)*limit+i+1}</td>
                  <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{d.name}</td>
                  <td>{d.code || '—'}</td>
                  <td>{d.campus?.name || '—'}</td>
                  <td>{formatDate(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="pagination">
            <span className="pagination-info">{Math.min((page-1)*limit+1,total)}–{Math.min(page*limit,total)} of {total}</span>
            <button className="pagination-btn" onClick={() => setPage((p) => p-1)} disabled={page===1}>Previous</button>
            <button className="pagination-btn" onClick={() => setPage((p) => p+1)} disabled={page>=totalPages}>Next</button>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add Department</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                {addError && <div className="alert alert-error" style={{ marginBottom:16 }}>{addError}</div>}
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div className="form-field">
                    <label className="form-label required">Department Name</label>
                    <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Computer Science" />
                  </div>
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label">Code</label>
                      <input className="form-input" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} placeholder="e.g. CS" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Campus</label>
                      <select className="form-select" value={form.campus} onChange={(e) => setForm({...form, campus: e.target.value})}>
                        <option value="">Select campus…</option>
                        {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? <><span className="spinner spinner-sm" /> Saving…</> : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsList;
