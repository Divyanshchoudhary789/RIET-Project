import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, X, Search } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import '../../styles/pages.css';

const CampusesList = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const limit = 15;

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: '', location: '', centerHeadEmail: '', centerHeadName: '', centerHeadPassword: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      const r = await api.get(`/api/campuses?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.campuses || []));
      setTotal(r.data.total || d?.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!form.name.trim()) { setAddError('Campus name is required.'); return; }
    setAddLoading(true);
    try {
      const payload = { name: form.name.trim(), location: form.location.trim() || undefined };
      if (form.centerHeadEmail) {
        payload.centerHead = {
          email: form.centerHeadEmail.trim().toLowerCase(),
          name: form.centerHeadName.trim(),
          password: form.centerHeadPassword,
        };
      }
      await api.post('/api/campuses', payload);
      setShowAdd(false);
      setForm({ name: '', location: '', centerHeadEmail: '', centerHeadName: '', centerHeadPassword: '' });
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
          <h1 className="page-title">Campuses</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setAddError(''); }}>
          <Plus size={16} /> Add Campus
        </button>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input type="text" className="form-input" placeholder="Search campuses…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Campus Name</th>
                <th>Location</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign:'center', padding:40 }}><span className="spinner" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state" style={{ padding:48 }}>
                    <div className="empty-state-icon"><Building2 size={22} /></div>
                    <h3>No campuses yet</h3>
                  </div>
                </td></tr>
              ) : items.map((c, i) => (
                <tr key={c._id}>
                  <td style={{ color:'var(--color-text-muted)' }}>{(page-1)*limit+i+1}</td>
                  <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{c.name}</td>
                  <td>{c.location || '—'}</td>
                  <td>{formatDate(c.createdAt)}</td>
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
              <h2 className="modal-title">Add Campus</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                {addError && <div className="alert alert-error" style={{ marginBottom:16 }}>{addError}</div>}
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div className="form-field">
                    <label className="form-label required">Campus Name</label>
                    <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Main Campus" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Location</label>
                    <input className="form-input" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="City / address" />
                  </div>
                  <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:8 }}>Center Head (optional)</p>
                  <div className="form-field">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={form.centerHeadName} onChange={(e) => setForm({...form, centerHeadName: e.target.value})} placeholder="Center head full name" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.centerHeadEmail} onChange={(e) => setForm({...form, centerHeadEmail: e.target.value})} placeholder="email@example.com" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Temporary Password</label>
                    <input className="form-input" type="password" value={form.centerHeadPassword} onChange={(e) => setForm({...form, centerHeadPassword: e.target.value})} placeholder="Temporary password" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? <><span className="spinner spinner-sm" /> Saving…</> : 'Add Campus'}
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
