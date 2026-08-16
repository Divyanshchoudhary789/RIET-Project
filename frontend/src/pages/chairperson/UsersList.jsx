import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, X, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getRoleLabel } from '../../utils/helpers';
import '../../styles/pages.css';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Create Director modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdSuccess, setCreatedSuccess] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ limit: 100 });
      if (search) p.set('search', search);
      if (roleFilter) p.set('role', roleFilter);
      const r = await api.get(`/api/users?${p}`);
      const d = r.data.data;
      setUsers(Array.isArray(d) ? d : (d?.users || []));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateDirector = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreatedSuccess(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setCreateError('Name and email are required.');
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: 'director',
      };
      const r = await api.post('/api/users', payload);
      setCreatedSuccess(r.data.data);
      setFormData({ name: '', email: '' });
      fetchUsers();
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Chairperson Console</p>
          <h1 className="page-title">User Directory</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreateModal(true); setCreatedSuccess(null); setCreateError(''); }}>
          <UserPlus size={16} /> Create Director Account
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
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="director">Director</option>
            <option value="center_head">Center Head</option>
            <option value="cluster_manager">Cluster Manager</option>
            <option value="department_admin">Department Admin</option>
            <option value="po_office">PO Office</option>
            <option value="accounts">Accounts</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ padding: 48 }}>
                      <h3>No users found</h3>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge badge-submitted" style={{ textTransform: 'capitalize' }}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td>{u.scopeRef?.name || u.scopeRef?.code || 'Global / Organization'}</td>
                    <td>
                      <span className={`badge ${u.isActive !== false ? 'badge-approved' : 'badge-rejected'}`}>
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Create Director */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Provision New Director Account</span>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>

            {createdSuccess ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <CheckCircle2 size={40} color="var(--color-success)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 8 }}>Director Account Provisioned!</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                  Temporary credentials have been generated and dispatched to <strong>{createdSuccess.user?.email || createdSuccess.email}</strong>.
                </p>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(false)}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleCreateDirector}>
                <div className="modal-body" style={{ padding: 24 }}>
                  {createError && <div className="page-error" style={{ marginBottom: 16 }}>{createError}</div>}

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Director Full Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Dr. Rajesh Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Email Address <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="director@riet.edu.in"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>

                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    System auto-generates a strong temporary password and emails it to the user. User will be forced to set a new password on first login.
                  </p>
                </div>

                <div className="modal-footer" style={{ padding: '16px 24px' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)} disabled={createLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createLoading}>
                    {createLoading ? <span className="spinner spinner-sm" /> : <UserPlus size={15} />}
                    Provision Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
