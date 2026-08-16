import React, { useCallback, useEffect, useState } from 'react';
import { Users, Plus, X, Search, UserX, CheckCircle2, Info } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getRoleLabel } from '../../utils/helpers';
import '../../styles/pages.css';

// Director can only create non-executive operational roles
const DIRECTOR_CREATABLE_ROLES = [
  { value: 'center_head', label: 'Center Head' },
  { value: 'cluster_manager', label: 'Cluster Manager' },
  { value: 'department_admin', label: 'Department Admin' },
  { value: 'po_office', label: 'PO Office' },
  { value: 'accounts', label: 'Accounts' },
];

const UsersList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Add User modal state
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'center_head',
    campusId: '',
    departmentId: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [createdUserSuccess, setCreatedUserSuccess] = useState(null);

  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    Promise.all([
      api.get('/api/campuses?limit=100'),
      api.get('/api/departments?limit=100'),
    ])
      .then(([cr, dr]) => {
        const cd = cr.data.data;
        const campusList = Array.isArray(cd) ? cd : (cd?.campuses || []);
        setCampuses(campusList);

        const dd = dr.data.data;
        const deptList = Array.isArray(dd) ? dd : (dd?.departments || []);
        setDepartments(deptList);
      })
      .catch(() => {});
  }, []);

  const openAddModal = () => {
    setShowAdd(true);
    setAddError('');
    setCreatedUserSuccess(null);
    setForm({
      name: '',
      email: '',
      role: 'center_head',
      campusId: campuses[0]?._id || '',
      departmentId: departments[0]?._id || '',
    });
  };

  const handleRoleChange = (newRole) => {
    setForm((prev) => ({
      ...prev,
      role: newRole,
      campusId: newRole === 'center_head' ? (prev.campusId || campuses[0]?._id || '') : '',
      departmentId: newRole === 'department_admin' ? (prev.departmentId || departments[0]?._id || '') : '',
    }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    setCreatedUserSuccess(null);

    if (!form.name.trim() || !form.email.trim()) {
      setAddError('Full name and email address are required.');
      return;
    }

    if (form.role === 'center_head' && !form.campusId) {
      setAddError('Please select a campus for the Center Head account.');
      return;
    }

    if (form.role === 'department_admin' && !form.departmentId) {
      setAddError('Please select a department for the Department Admin account.');
      return;
    }

    setAddLoading(true);
    try {
      let scopeRef = null;
      if (form.role === 'center_head') scopeRef = form.campusId;
      if (form.role === 'department_admin') scopeRef = form.departmentId;

      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        scopeRef,
      };

      const res = await api.post('/api/users', payload);
      setCreatedUserSuccess(res.data.data);
      fetchUsers();
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
      fetchUsers();
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
          <p className="page-eyebrow">Director Console</p>
          <h1 className="page-title">User Management</h1>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add User
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
              placeholder="Search users by name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            {DIRECTOR_CREATABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Assigned Scope</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
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
                        <Users size={22} />
                      </div>
                      <h3>No users found</h3>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((u) => (
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
                    <td>
                      <span className="badge badge-under_review">{getRoleLabel(u.role)}</span>
                    </td>
                    <td>{u.scopeRef?.name || u.scopeRef?.code || 'Global'}</td>
                    <td>
                      {u.isActive !== false ? (
                        <span className="badge badge-approved">Active</span>
                      ) : (
                        <span className="badge badge-rejected">Inactive</span>
                      )}
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      {u.isActive !== false && (
                        <button
                          className="action-btn action-reject"
                          onClick={() => setDeactivateTarget(u)}
                        >
                          <UserX size={13} /> Deactivate
                        </button>
                      )}
                    </td>
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

      {/* Dynamic Add User Modal */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Create User Account</span>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                <X size={18} />
              </button>
            </div>

            {createdUserSuccess ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <CheckCircle2 size={40} color="var(--color-success)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 8 }}>
                  User Account Created!
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                  Temporary access credentials have been sent to <strong>{createdUserSuccess.email}</strong>.
                </p>
                <button className="btn btn-primary" onClick={() => setShowAdd(false)}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdd}>
                <div className="modal-body" style={{ padding: 24 }}>
                  {addError && <div className="page-error" style={{ marginBottom: 16 }}>{addError}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">
                        Full Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Ramesh Kumar"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Email Address <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="user@riet.edu.in"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">
                      Role <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={form.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      required
                    >
                      {DIRECTOR_CREATABLE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Conditionally render Campus for Center Head */}
                  {form.role === 'center_head' && (
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">
                        Assigned Campus <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      {campuses.length === 0 ? (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>
                          No active campuses found. Please create a campus first.
                        </div>
                      ) : (
                        <select
                          className="form-input"
                          value={form.campusId}
                          onChange={(e) => setForm({ ...form, campusId: e.target.value })}
                          required
                        >
                          {campuses.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Conditionally render Department for Department Admin */}
                  {form.role === 'department_admin' && (
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">
                        Assigned Department <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      {departments.length === 0 ? (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>
                          No active departments found. Please create a department first.
                        </div>
                      ) : (
                        <select
                          className="form-input"
                          value={form.departmentId}
                          onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                          required
                        >
                          {departments.map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      background: 'var(--color-info-bg)',
                      border: '1px solid var(--color-info-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 12,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Info size={16} color="var(--color-info)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      System will auto-generate a temporary password and send credentials to the user's email. Password change is enforced on first login.
                    </span>
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
                    Create Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Deactivate confirmation modal */}
      {deactivateTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">Deactivate User</span>
              <button className="modal-close" onClick={() => setDeactivateTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
                Are you sure you want to deactivate account for <strong>{deactivateTarget.name}</strong> ({deactivateTarget.email})?
              </p>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px' }}>
              <button className="btn btn-ghost" onClick={() => setDeactivateTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeactivate} disabled={deactivateLoading}>
                {deactivateLoading ? <span className="spinner spinner-sm" /> : null}
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
