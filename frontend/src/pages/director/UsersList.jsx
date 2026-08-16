import React, { useCallback, useEffect, useState } from 'react';
import { Users, Plus, X, Search, UserX } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getRoleLabel, ROLE_LABELS } from '../../utils/helpers';
import '../../styles/pages.css';

const ALL_ROLES = Object.keys(ROLE_LABELS);

const UsersList = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const limit = 15;

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: '', email: '', role: 'center_head', password: '', campus: '', department: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState('');

  const [campuses, setCampuses]       = useState([]);
  const [departments, setDepartments] = useState([]);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      if (roleFilter) p.set('role', roleFilter);
      const r = await api.get(`/api/users?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.users || []));
      setTotal(r.data.total || d?.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    Promise.all([
      api.get('/api/campuses?limit=100'),
      api.get('/api/departments?limit=100'),
    ]).then(([cr, dr]) => {
      const cd = cr.data.data; setCampuses(Array.isArray(cd) ? cd : (cd?.campuses || []));
      const dd = dr.data.data; setDepartments(Array.isArray(dd) ? dd : (dd?.departments || []));
    }).catch(() => {});
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setAddError('Name, email and password are required.');
      return;
    }
    setAddLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        password: form.password,
      };
      if (form.campus) payload.campus = form.campus;
      if (form.department) payload.department = form.department;
      await api.post('/api/users', payload);
      setShowAdd(false);
      setForm({ name: '', email: '', role: 'center_head', password: '', campus: '', department: '' });
      fetch();
    } catch (err) {
      setAddError(getErrorMessage(err));
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await api.patch(`/api/users/${deactivateTarget._id}`, { isActive: false });
      setDeactivateTarget(null);
      fetch();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeactivateLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Director</p>
          <h1 className="page-title">Users</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setAddError(''); }}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input type="text" className="form-input" placeholder="Search users…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="filter-select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Campus</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40 }}><span className="spinner" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state" style={{ padding:48 }}>
                    <div className="empty-state-icon"><Users size={22} /></div>
                    <h3>No users found</h3>
                  </div>
                </td></tr>
              ) : items.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{u.name?.[0]?.toUpperCase()}</div>
                      <div className="user-cell-info">
                        <span className="user-cell-name">{u.name}</span>
                        <span className="user-cell-sub">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-under_review">{getRoleLabel(u.role)}</span></td>
                  <td>{u.campus?.name || '—'}</td>
                  <td>
                    {u.isActive !== false
                      ? <span className="badge badge-active">Active</span>
                      : <span className="badge badge-inactive">Inactive</span>
                    }
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    {u.isActive !== false && (
                      <button className="action-btn action-reject" onClick={() => setDeactivateTarget(u)}>
                        <UserX size={13} /> Deactivate
                      </button>
                    )}
                  </td>
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

      {/* Add User modal */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add User</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                {addError && <div className="alert alert-error" style={{ marginBottom:16 }}>{addError}</div>}
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label required">Full Name</label>
                      <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Full name" />
                    </div>
                    <div className="form-field">
                      <label className="form-label required">Email</label>
                      <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="email@example.com" />
                    </div>
                    <div className="form-field">
                      <label className="form-label required">Role</label>
                      <select className="form-select" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                        {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-label required">Temp Password</label>
                      <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Temporary password" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Campus</label>
                      <select className="form-select" value={form.campus} onChange={(e) => setForm({...form, campus: e.target.value})}>
                        <option value="">None</option>
                        {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Department</label>
                      <select className="form-select" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})}>
                        <option value="">None</option>
                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? <><span className="spinner spinner-sm" /> Saving…</> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate confirm */}
      {deactivateTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <h2 className="modal-title">Deactivate User</h2>
              <button className="modal-close" onClick={() => setDeactivateTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color:'var(--color-text-secondary)', fontSize:14 }}>
                Are you sure you want to deactivate <strong>{deactivateTarget.name}</strong>? They will no longer be able to log in.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeactivateTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeactivate} disabled={deactivateLoading}>
                {deactivateLoading ? <><span className="spinner spinner-sm" /> Deactivating…</> : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
