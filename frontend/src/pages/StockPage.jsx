import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Package, Search, Edit2, X, Check } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getErrorMessage, formatCurrency } from '../utils/helpers';
import '../styles/pages.css';

// Only these roles can manually create stock items
const CAN_CREATE = ['director', 'chairperson', 'accounts'];
// Only these roles can manually update stock quantities
const CAN_UPDATE = ['director', 'chairperson', 'accounts'];

const defaultForm = { itemName: '', category: '', unit: '', quantityAvailable: 0, ownerType: 'headOffice', ownerRef: '' };

const StockPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Campuses & departments for ownerRef selection (org-wide roles only)
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Add modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/stock')
      .then((r) => setItems(r.data.data || []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load campuses/depts for org-wide roles so they can assign ownerRef
  useEffect(() => {
    if (!CAN_CREATE.includes(user?.role)) return;
    Promise.all([
      api.get('/api/campuses?limit=100'),
      api.get('/api/departments?limit=100'),
    ]).then(([cr, dr]) => {
      const cd = cr.data.data;
      setCampuses(Array.isArray(cd) ? cd : (cd?.campuses || []));
      const dd = dr.data.data;
      setDepartments(Array.isArray(dd) ? dd : (dd?.departments || []));
    }).catch(() => {});
  }, [user?.role]);

  const filtered = items.filter((it) =>
    !search || it.itemName?.toLowerCase().includes(search.toLowerCase()) || it.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.itemName.trim() || !form.category.trim() || !form.unit.trim()) {
      setFormError('Item name, category and unit are required.');
      return;
    }
    if ((form.ownerType === 'campus' || form.ownerType === 'department') && !form.ownerRef) {
      setFormError(`Please select a ${form.ownerType === 'campus' ? 'campus' : 'department'}.`);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('/api/stock', {
        itemName: form.itemName.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        quantityAvailable: Number(form.quantityAvailable) || 0,
        ownerType: form.ownerType,
        ownerRef: (form.ownerType === 'campus' || form.ownerType === 'department') ? form.ownerRef : undefined,
      });
      setShowForm(false);
      setForm(defaultForm);
      load();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditQty(String(item.quantityAvailable));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQty('');
  };

  const saveEdit = async (itemId) => {
    const qty = Number(editQty);
    if (isNaN(qty) || qty < 0) return;
    setEditSaving(true);
    try {
      await api.patch(`/api/stock/${itemId}`, { quantityAvailable: qty });
      setEditingId(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setEditSaving(false);
    }
  };

  const ownerTypeOptions = () => {
    const opts = [{ value: 'headOffice', label: 'Head Office' }];
    if (campuses.length) opts.push({ value: 'campus', label: 'Campus' });
    if (departments.length) opts.push({ value: 'department', label: 'Department' });
    return opts;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">Inventory</span>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">Current stock levels
            {user?.role === 'center_head' && ' for your campus'}
            {user?.role === 'department_admin' && ' for your department'}
          </p>
        </div>
        {CAN_CREATE.includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormError(''); setForm(defaultForm); }}>
            <Plus size={16} /> Add Stock Item
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Add Stock Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <span className="modal-title">Add Stock Item</span>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {formError && <div className="alert alert-error">{formError}</div>}
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label required">Item Name</label>
                    <input className="form-input" value={form.itemName} placeholder="e.g. Laptop, Chair" onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label required">Category</label>
                    <input className="form-input" value={form.category} placeholder="e.g. Electronics, Furniture" onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label required">Unit</label>
                    <input className="form-input" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} placeholder="pcs / kg / set" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Initial Quantity</label>
                    <input className="form-input" type="number" min={0} value={form.quantityAvailable}
                      onChange={(e) => setForm((p) => ({ ...p, quantityAvailable: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label required">Assign To</label>
                    <select className="form-select" value={form.ownerType} onChange={(e) => setForm((p) => ({ ...p, ownerType: e.target.value, ownerRef: '' }))}>
                      {ownerTypeOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {form.ownerType === 'campus' && (
                    <div className="form-field">
                      <label className="form-label required">Campus</label>
                      <select className="form-select" value={form.ownerRef} onChange={(e) => setForm((p) => ({ ...p, ownerRef: e.target.value }))}>
                        <option value="">Select campus…</option>
                        {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  {form.ownerType === 'department' && (
                    <div className="form-field">
                      <label className="form-label required">Department</label>
                      <select className="form-select" value={form.ownerRef} onChange={(e) => setForm((p) => ({ ...p, ownerRef: e.target.value }))}>
                        <option value="">Select department…</option>
                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner spinner-sm" /> Saving…</> : <><Plus size={14} /> Add Item</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-panel">
        <div className="table-panel-header">
          <span className="table-panel-title">Stock Items</span>
          <div className="search-input-wrap" style={{ maxWidth: 260 }}>
            <Search size={14} className="search-icon" />
            <input className="form-input" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Package size={24} /></div>
            <div className="empty-title">No stock items found</div>
            <div className="empty-sub">{search ? 'Try a different search term.' : 'Stock items will appear here after goods are received.'}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Owner</th>
                  <th>Last Updated</th>
                  {CAN_UPDATE.includes(user?.role) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => {
                  const isLow = it.reorderThreshold > 0 && it.quantityAvailable <= it.reorderThreshold;
                  return (
                    <tr key={it._id} className={`stock-row${isLow ? ' stock-low' : ''}`}>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {it.itemName}
                        {isLow && (
                          <span className="badge badge-rejected" style={{ marginLeft: 8, fontSize: 10 }}>Low Stock</span>
                        )}
                      </td>
                      <td>{it.category}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{it.unit}</td>
                      <td>
                        {editingId === it._id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number"
                              min={0}
                              className="form-input"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              style={{ width: 80, padding: '4px 8px', fontSize: 13 }}
                              autoFocus
                            />
                            <button className="action-btn action-approve" onClick={() => saveEdit(it._id)} disabled={editSaving} title="Save">
                              {editSaving ? <span className="spinner spinner-sm" /> : <Check size={13} />}
                            </button>
                            <button className="action-btn action-view" onClick={cancelEdit} title="Cancel"><X size={13} /></button>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 700, color: isLow ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                            {it.quantityAvailable}
                          </span>
                        )}
                      </td>
                      <td>{it.quantityReserved ?? 0}</td>
                      <td>{it.ownerRef?.name || it.ownerType}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(it.updatedAt)}</td>
                      {CAN_UPDATE.includes(user?.role) && (
                        <td>
                          {editingId !== it._id && (
                            <button className="action-btn action-view" onClick={() => startEdit(it)}>
                              <Edit2 size={13} /> Edit Qty
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPage;
