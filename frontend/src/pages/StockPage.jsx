import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Package, Search, Edit2, X, Check, Building2, Landmark, Briefcase } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getErrorMessage } from '../utils/helpers';
import '../styles/pages.css';

// Only these roles can manually create stock items
const CAN_CREATE = ['director', 'chairperson', 'accounts'];
// Only these roles can manually update stock quantities
const CAN_UPDATE = ['director', 'chairperson', 'accounts'];
// Roles that see stock across every campus/department at once — for these,
// stock is grouped by owner (Head Office / each Campus / each Department)
// instead of one flat list.
const ORG_WIDE_ROLES = ['cluster_manager', 'director', 'chairperson', 'accounts'];

const defaultForm = { itemName: '', category: '', unit: '', quantityAvailable: 0, ownerType: 'headOffice', ownerRef: '' };

const OWNER_TYPE_LABELS = {
  headOffice: 'Head Office',
  campus: 'Campus',
  department: 'Department',
};

const StockTable = ({ items, canUpdate, editingId, editQty, setEditQty, startEdit, cancelEdit, saveEdit, editSaving, showOwnerColumn }) => (
  <div className="table-wrap">
    <table className="table">
      <thead>
        <tr>
          <th>Item Name</th>
          <th>Category</th>
          <th>Unit</th>
          <th>Available</th>
          <th>Reserved</th>
          {showOwnerColumn && <th>Owner</th>}
          <th>Last Updated</th>
          {canUpdate && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((it) => {
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
              {showOwnerColumn && <td>{it.ownerRef?.name || OWNER_TYPE_LABELS[it.ownerType] || it.ownerType}</td>}
              <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(it.updatedAt)}</td>
              {canUpdate && (
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
);

const StockPage = () => {
  const { user } = useAuth();
  const isOrgWide = ORG_WIDE_ROLES.includes(user?.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Owner-type / owner filters — org-wide roles only
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('');
  const [ownerRefFilter, setOwnerRefFilter] = useState('');

  // Campuses & departments — for the owner filter (org-wide roles) and the Add Stock form
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
    api.get('/api/stock', { params: { limit: 500 } })
      .then((r) => setItems(r.data.data || []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load campuses/departments — needed for the owner filter (org-wide roles) and
  // for assigning a new stock item's owner (CAN_CREATE roles)
  useEffect(() => {
    if (!isOrgWide) return;
    Promise.all([
      api.get('/api/campuses?limit=100'),
      api.get('/api/departments?limit=100'),
    ]).then(([cr, dr]) => {
      const cd = cr.data.data;
      setCampuses(Array.isArray(cd) ? cd : (cd?.campuses || []));
      const dd = dr.data.data;
      setDepartments(Array.isArray(dd) ? dd : (dd?.departments || []));
    }).catch(() => {});
  }, [isOrgWide]);

  const filtered = items.filter((it) => {
    if (search && !(it.itemName?.toLowerCase().includes(search.toLowerCase()) || it.category?.toLowerCase().includes(search.toLowerCase()))) {
      return false;
    }
    if (ownerTypeFilter && it.ownerType !== ownerTypeFilter) return false;
    if (ownerRefFilter && it.ownerRef?._id !== ownerRefFilter) return false;
    return true;
  });

  // Group filtered stock by owner: Head Office first, then each Campus, then each
  // Department (alphabetically) — gives every org-wide role a clear campus-wise /
  // head-office view instead of one undifferentiated table.
  const groups = useMemo(() => {
    if (!isOrgWide) return null;

    const headOffice = { key: 'headOffice', label: 'Head Office', icon: Landmark, items: [] };
    const campusMap = new Map();
    const deptMap = new Map();

    filtered.forEach((it) => {
      if (it.ownerType === 'headOffice') {
        headOffice.items.push(it);
      } else if (it.ownerType === 'campus') {
        const key = it.ownerRef?._id || 'unknown-campus';
        if (!campusMap.has(key)) campusMap.set(key, { key, label: it.ownerRef?.name || 'Unassigned Campus', icon: Building2, items: [] });
        campusMap.get(key).items.push(it);
      } else if (it.ownerType === 'department') {
        const key = it.ownerRef?._id || 'unknown-department';
        if (!deptMap.has(key)) deptMap.set(key, { key, label: it.ownerRef?.name || 'Unassigned Department', icon: Briefcase, items: [] });
        deptMap.get(key).items.push(it);
      }
    });

    const campusGroups = [...campusMap.values()].sort((a, b) => a.label.localeCompare(b.label));
    const deptGroups = [...deptMap.values()].sort((a, b) => a.label.localeCompare(b.label));

    const all = [];
    if (headOffice.items.length > 0 || !ownerTypeFilter) all.push(headOffice);
    all.push(...campusGroups);
    all.push(...deptGroups);
    return all.filter((g) => g.items.length > 0);
  }, [filtered, isOrgWide, ownerTypeFilter]);

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

  const ownerRefOptions = ownerTypeFilter === 'campus' ? campuses : ownerTypeFilter === 'department' ? departments : [];

  const tableProps = {
    canUpdate: CAN_UPDATE.includes(user?.role),
    editingId, editQty, setEditQty, startEdit, cancelEdit, saveEdit, editSaving,
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">Inventory</span>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">
            {user?.role === 'center_head' && 'Current stock levels for your campus'}
            {user?.role === 'department_admin' && 'Current stock levels for your department'}
            {isOrgWide && 'Stock levels across Head Office, campuses, and departments'}
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
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Stock Item</span>
              <button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close"><X size={18} /></button>
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
        </div>
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input className="form-input" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isOrgWide && (
            <>
              <select
                className="filter-select"
                value={ownerTypeFilter}
                onChange={(e) => { setOwnerTypeFilter(e.target.value); setOwnerRefFilter(''); }}
              >
                <option value="">All Locations</option>
                <option value="headOffice">Head Office Only</option>
                <option value="campus">By Campus</option>
                <option value="department">By Department</option>
              </select>
              {(ownerTypeFilter === 'campus' || ownerTypeFilter === 'department') && (
                <select
                  className="filter-select"
                  value={ownerRefFilter}
                  onChange={(e) => setOwnerRefFilter(e.target.value)}
                >
                  <option value="">All {ownerTypeFilter === 'campus' ? 'Campuses' : 'Departments'}</option>
                  {ownerRefOptions.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                </select>
              )}
            </>
          )}
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Package size={24} /></div>
            <div className="empty-title">No stock items found</div>
            <div className="empty-sub">{search || ownerTypeFilter ? 'Try a different search or filter.' : 'Stock items will appear here after goods are received.'}</div>
          </div>
        ) : !isOrgWide ? (
          <StockTable items={filtered} showOwnerColumn={false} {...tableProps} />
        ) : ownerRefFilter ? (
          // A specific campus/department is selected — a single flat table is clearer than one lone group
          <StockTable items={filtered} showOwnerColumn={false} {...tableProps} />
        ) : (
          <div className="stock-groups" style={{ padding: 'var(--space-4) 0' }}>
            {groups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.key} className="table-panel" style={{ margin: '0 var(--space-4)' }}>
                  <div className="stock-group-header">
                    <span className="stock-group-heading"><Icon size={16} color="var(--color-accent)" /> {group.label}</span>
                    <span className="stock-group-count">{group.items.length} item{group.items.length === 1 ? '' : 's'}</span>
                  </div>
                  <StockTable items={group.items} showOwnerColumn={false} {...tableProps} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPage;
