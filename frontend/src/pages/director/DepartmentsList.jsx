import React, { useCallback, useEffect, useState } from 'react';
import { BarChart2, Plus, X, Search, Info, UserCircle2, Edit2 } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import '../../styles/pages.css';

const DepartmentCard = ({ department, onEdit }) => (
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
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => onEdit(department)}>
        <Edit2 size={13} /> Edit
      </button>
    </div>
  </div>
);

const DepartmentsList = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const limit = 15;

  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name: '', code: '', adminName: '', adminEmail: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState('');

  const [showEdit, setShowEdit] = useState(false);
  const [editDeptId, setEditDeptId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', isActive: true, adminName: '', adminEmail: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

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

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!form.name.trim()) { setAddError('Department name is required.'); return; }
    if (form.adminEmail.trim() && !form.adminName.trim()) { setAddError('Enter the department admin\'s name too.'); return; }
    if (form.adminName.trim() && !form.adminEmail.trim()) { setAddError('Enter the department admin\'s email too.'); return; }

    const departmentCode = (form.code.trim() || form.name.trim().slice(0, 4)).toUpperCase();

    setAddLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: departmentCode,
      };
      if (form.adminEmail.trim() && form.adminName.trim()) {
        payload.adminData = {
          name: form.adminName.trim(),
          email: form.adminEmail.trim().toLowerCase(),
        };
      }
      await api.post('/api/departments', payload);
      setShowAdd(false);
      setForm({ name: '', code: '', adminName: '', adminEmail: '' });
      fetch();
    } catch (err) {
      setAddError(getErrorMessage(err));
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (dept) => {
    setEditDeptId(dept._id);
    setEditForm({
      name: dept.name || '',
      isActive: dept.isActive !== false,
      adminName: dept.departmentAdminRef?.name || '',
      adminEmail: dept.departmentAdminRef?.email || '',
    });
    setEditError('');
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    if (!editForm.name.trim()) { setEditError('Department name is required.'); return; }

    setEditLoading(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        isActive: editForm.isActive,
      };
      // Only send adminData if the admin email was actually changed/added — re-provisioning
      // with the same email would otherwise try to create a duplicate account.
      const currentAdmin = items.find((d) => d._id === editDeptId)?.departmentAdminRef;
      if (editForm.adminEmail.trim() && editForm.adminName.trim() && editForm.adminEmail.trim().toLowerCase() !== currentAdmin?.email) {
        payload.adminData = {
          name: editForm.adminName.trim(),
          email: editForm.adminEmail.trim().toLowerCase(),
        };
      }
      await api.patch(`/api/departments/${editDeptId}`, payload);
      setShowEdit(false);
      fetch();
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
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
            <div className="empty-sub">{search || statusFilter ? 'Try a different search or filter.' : 'Add your first department to get started.'}</div>
          </div>
        ) : (
          <>
            {/* Desktop / tablet — dense table */}
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
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d, i) => (
                    <tr key={d._id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{(page - 1) * limit + i + 1}</td>
                      <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{d.name}</td>
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
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(d)} title="Edit Department">
                          <Edit2 size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile — card layout */}
            <div className="org-card-grid show-mobile-only">
              {items.map((d) => <DepartmentCard key={d._id} department={d} onEdit={handleOpenEdit} />)}
            </div>
          </>
        )}

        {total > limit && (
          <div className="pagination">
            <span className="pagination-info">{Math.min((page-1)*limit+1,total)}–{Math.min(page*limit,total)} of {total}</span>
            <button className="pagination-btn" onClick={() => setPage((p) => p-1)} disabled={page===1}>Previous</button>
            <button className="pagination-btn" onClick={() => setPage((p) => p+1)} disabled={page>=totalPages}>Next</button>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Department</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                {addError && <div className="alert alert-error" style={{ marginBottom:16 }}>{addError}</div>}
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label required">Department Name</label>
                      <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Human Resources" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Code</label>
                      <input className="form-input" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} placeholder="Auto-generated if left blank" />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                      Department Admin Account (Optional)
                    </p>
                    <div className="form-grid">
                      <div className="form-field">
                        <label className="form-label">Admin Name</label>
                        <input className="form-input" value={form.adminName} onChange={(e) => setForm({...form, adminName: e.target.value})} placeholder="Department admin full name" />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Admin Email</label>
                        <input className="form-input" type="email" value={form.adminEmail} onChange={(e) => setForm({...form, adminEmail: e.target.value})} placeholder="email@example.com" />
                      </div>
                    </div>
                    {form.adminEmail.trim() && (
                      <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 'var(--radius-md)', padding: 10, display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                        <Info size={15} color="var(--color-info)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          System will auto-generate a temporary password and dispatch credentials to the provided email.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)} disabled={addLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? <><span className="spinner spinner-sm" /> Saving…</> : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Department</h2>
              <button className="modal-close" onClick={() => setShowEdit(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                {editError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{editError}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-field">
                    <label className="form-label required">Department Name</label>
                    <input className="form-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editForm.isActive ? 'true' : 'false'} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                      Department Admin Account
                    </p>
                    <div className="form-grid">
                      <div className="form-field">
                        <label className="form-label">Admin Name</label>
                        <input className="form-input" value={editForm.adminName} onChange={(e) => setEditForm({ ...editForm, adminName: e.target.value })} placeholder="Department admin full name" />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Admin Email</label>
                        <input className="form-input" type="email" value={editForm.adminEmail} onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })} placeholder="email@example.com" />
                      </div>
                    </div>
                    <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 'var(--radius-md)', padding: 10, display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                      <Info size={15} color="var(--color-info)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        Changing the email provisions a new admin account and sends credentials to it.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEdit(false)} disabled={editLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? <><span className="spinner spinner-sm" /> Saving…</> : 'Save Changes'}
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
