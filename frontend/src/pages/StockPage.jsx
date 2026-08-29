import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Package, Search, Edit2, X, Check, Building2, PackageCheck } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getErrorMessage } from '../utils/helpers';
import useSocketEvent from '../hooks/useSocketEvent';
import '../styles/pages.css';

const CAN_CREATE = ['director', 'chairperson', 'accounts', 'center_head', 'department_admin'];
const CAN_UPDATE = ['director', 'chairperson', 'accounts', 'center_head', 'department_admin'];
// Org-wide roles — see ALL stock (head office + every campus + every department)
// with a full owner-type / owner filter, and can add stock anywhere.
const ORG_WIDE_ROLES = ['director', 'chairperson', 'accounts'];
// Roles that see multiple campuses' stock (campus stock only), filtered by campus.
const CAMPUS_SCOPED_MULTI = ['cluster_manager', 'department_admin'];

const OWNER_TYPE_LABELS = { headOffice: 'Head Office', campus: 'Campus', department: 'Department' };

const defaultForm = {
  itemName: '', category: '', unit: '', quantityAvailable: 0,
  ownerType: 'campus', ownerRef: '', relatedDepartmentRef: '',
};

const StockTable = ({ items, canUpdate, editRow, setEditRow, startEdit, cancelEdit, saveEdit, editSaving, ownerLabel = 'Owner' }) => (
  <div className="table-wrap">
    <table className="table">
      <thead>
        <tr>
          <th>Item Name</th>
          <th>Category</th>
          <th>Unit</th>
          <th>Available</th>
          <th>Reserved</th>
          <th>{ownerLabel}</th>
          <th>Last Updated</th>
          {canUpdate && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((it) => {
          const isLow = it.reorderThreshold > 0 && it.quantityAvailable <= it.reorderThreshold;
          const editing = editRow?._id === it._id;
          return (
            <tr key={it._id} className={`stock-row${isLow ? ' stock-low' : ''}`}>
              <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {it.itemName}
                {isLow && <span className="badge badge-rejected" style={{ marginLeft: 8, fontSize: 10 }}>Low Stock</span>}
              </td>
              <td>
                {editing
                  ? <input className="form-input" style={{ width: 120, padding: '4px 8px', fontSize: 13 }} value={editRow.category} onChange={(e) => setEditRow((p) => ({ ...p, category: e.target.value }))} />
                  : it.category}
              </td>
              <td style={{ color: 'var(--color-text-muted)' }}>
                {editing
                  ? <input className="form-input" style={{ width: 70, padding: '4px 8px', fontSize: 13 }} value={editRow.unit} onChange={(e) => setEditRow((p) => ({ ...p, unit: e.target.value }))} />
                  : it.unit}
              </td>
              <td>
                {editing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="number" min={0} className="form-input" value={editRow.quantityAvailable}
                      onChange={(e) => setEditRow((p) => ({ ...p, quantityAvailable: e.target.value }))}
                      style={{ width: 80, padding: '4px 8px', fontSize: 13 }} autoFocus />
                    <button className="action-btn action-approve" onClick={() => saveEdit(it._id)} disabled={editSaving} title="Save">
                      {editSaving ? <span className="spinner spinner-sm" /> : <Check size={13} />}
                    </button>
                    <button className="action-btn action-view" onClick={cancelEdit} title="Cancel"><X size={13} /></button>
                  </div>
                ) : (
                  <span style={{ fontWeight: 700, color: isLow ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{it.quantityAvailable}</span>
                )}
              </td>
              <td>{it.quantityReserved ?? 0}</td>
              <td>{it.ownerRef?.name || OWNER_TYPE_LABELS[it.ownerType] || '—'}</td>
              <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(it.updatedAt)}</td>
              {canUpdate && (
                <td>
                  {!editing && (
                    <button className="action-btn action-view" onClick={() => startEdit(it)}>
                      <Edit2 size={13} /> Edit
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

// ── Pending receipts (Center Head only) ──────────────────────────────────────

const ReceiptModal = ({ receipt, onClose, onDone }) => {
  const [rows, setRows] = useState(
    (receipt.items || []).map((it) => ({
      _key: crypto.randomUUID(),
      sourceItemId: it.sourceItemId || undefined,
      name: it.name || '', quantity: it.quantity ?? 0, unit: it.unit || 'units',
      price: it.price ?? 0, category: it.category || receipt.departmentRef?.name || 'Received',
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const upd = (key, field, val) => setRows((p) => p.map((r) => (r._key === key ? { ...r, [field]: val } : r)));

  const submit = async () => {
    for (const r of rows) {
      if (!r.name.trim()) { setError('Every row needs an item name.'); return; }
      if (Number(r.quantity) < 0 || isNaN(Number(r.quantity))) { setError('Quantity must be 0 or more.'); return; }
    }
    setSaving(true);
    try {
      await api.post(`/api/stock/receipts/${receipt._id}/fulfil`, {
        entries: rows.map((r) => ({
          sourceItemId: r.sourceItemId || undefined,
          name: r.name.trim(), quantity: Number(r.quantity),
          unit: r.unit.trim() || 'units', price: Number(r.price) || 0,
          category: r.category.trim() || 'Received',
        })),
      });
      onDone();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add Received Goods to Stock — {receipt.purchaseOrderRef?.poNumber}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ padding: 20, maxHeight: '60vh', overflowY: 'auto' }}>
          {error && <div className="page-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="item-row-header" style={{ gridTemplateColumns: '1.4fr 70px 80px 90px 1fr' }}>
            <span className="item-header-label">Item</span>
            <span className="item-header-label">Qty</span>
            <span className="item-header-label">Unit</span>
            <span className="item-header-label">Unit Price</span>
            <span className="item-header-label">Category</span>
          </div>
          {rows.map((r) => (
            <div key={r._key} className="item-row" style={{ gridTemplateColumns: '1.4fr 70px 80px 90px 1fr' }}>
              <input className="form-input" value={r.name} onChange={(e) => upd(r._key, 'name', e.target.value)} />
              <input className="form-input" type="number" min={0} value={r.quantity} onChange={(e) => upd(r._key, 'quantity', e.target.value)} />
              <input className="form-input" value={r.unit} onChange={(e) => upd(r._key, 'unit', e.target.value)} />
              <input className="form-input" type="number" min={0} step="0.01" value={r.price} onChange={(e) => upd(r._key, 'price', e.target.value)} />
              <input className="form-input" value={r.category} onChange={(e) => upd(r._key, 'category', e.target.value)} />
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : <PackageCheck size={14} />} Add to Stock
          </button>
        </div>
      </div>
    </div>
  );
};

const StockPage = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isOrgWide = ORG_WIDE_ROLES.includes(role);
  const isCampusScopedMulti = CAMPUS_SCOPED_MULTI.includes(role);
  const isGrouped = isOrgWide || isCampusScopedMulti;
  const isCenterHead = role === 'center_head';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [campusFilter, setCampusFilter] = useState(''); // cluster manager / department admin
  const [ownerTypeFilter, setOwnerTypeFilter] = useState(''); // org-wide
  const [ownerRefFilter, setOwnerRefFilter] = useState(''); // org-wide

  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [receipts, setReceipts] = useState([]);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [editRow, setEditRow] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: 500 };
    if (search) params.search = search;
    if (isOrgWide) {
      if (ownerTypeFilter) params.ownerType = ownerTypeFilter;
      if (ownerRefFilter) params.ownerRef = ownerRefFilter;
    } else if (isCampusScopedMulti && campusFilter) {
      params.ownerRef = campusFilter;
    }
    api.get('/api/stock', { params })
      .then((r) => setItems(r.data.data || []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [search, isOrgWide, isCampusScopedMulti, ownerTypeFilter, ownerRefFilter, campusFilter]);

  const loadReceipts = useCallback(() => {
    if (!isCenterHead) return;
    api.get('/api/stock/pending-receipts')
      .then((r) => setReceipts(r.data.data || []))
      .catch(() => {});
  }, [isCenterHead]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadReceipts(); }, [loadReceipts]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['stockReceipt', 'purchaseOrder'].includes(payload?.entity)) { load(); loadReceipts(); }
  });

  useEffect(() => {
    if (!isGrouped && !CAN_CREATE.includes(role)) return;
    Promise.all([
      api.get('/api/campuses?limit=100'),
      api.get('/api/departments?limit=100'),
    ]).then(([cr, dr]) => {
      const cd = cr.data.data;
      setCampuses(Array.isArray(cd) ? cd : (cd?.campuses || []));
      const dd = dr.data.data;
      setDepartments(Array.isArray(dd) ? dd : (dd?.departments || []));
    }).catch(() => {});
  }, [isGrouped, role]);

  // Org-wide: group Head Office → each Campus → each Department.
  // Campus-scoped multi: group by campus.
  const groups = useMemo(() => {
    if (!isGrouped) return null;
    const ho = { key: 'headOffice', label: 'Head Office', rank: 0, items: [] };
    const campusMap = new Map();
    const deptMap = new Map();
    items.forEach((it) => {
      if (it.ownerType === 'headOffice') { ho.items.push(it); return; }
      const bucket = it.ownerType === 'department' ? deptMap : campusMap;
      const key = it.ownerRef?._id || `unknown-${it.ownerType}`;
      if (!bucket.has(key)) {
        bucket.set(key, {
          key,
          label: it.ownerRef?.name || (it.ownerType === 'department' ? 'Unassigned Department' : 'Unassigned Campus'),
          rank: it.ownerType === 'department' ? 2 : 1,
          items: [],
        });
      }
      bucket.get(key).items.push(it);
    });
    const campusGroups = [...campusMap.values()].sort((a, b) => a.label.localeCompare(b.label));
    const deptGroups = [...deptMap.values()].sort((a, b) => a.label.localeCompare(b.label));
    const all = [];
    if (ho.items.length) all.push(ho);
    all.push(...campusGroups, ...deptGroups);
    return all;
  }, [items, isGrouped]);

  const activeFilter = isOrgWide ? (ownerTypeFilter || ownerRefFilter) : campusFilter;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.itemName.trim() || !form.category.trim() || !form.unit.trim()) {
      setFormError('Item name, category and unit are required.');
      return;
    }
    const needsCampus = isCenterHead || role === 'department_admin' || form.ownerType === 'campus' || form.ownerType === 'department';
    if (needsCampus && !isCenterHead && !form.ownerRef) {
      setFormError('Please select a campus / department.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        itemName: form.itemName.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        quantityAvailable: Number(form.quantityAvailable) || 0,
        ownerType: isCenterHead || role === 'department_admin' ? 'campus' : form.ownerType,
      };
      if (payload.ownerType === 'campus' || payload.ownerType === 'department') {
        if (!isCenterHead) payload.ownerRef = form.ownerRef;
      }
      if (form.relatedDepartmentRef) payload.relatedDepartmentRef = form.relatedDepartmentRef;
      await api.post('/api/stock', payload);
      setShowForm(false);
      setForm(defaultForm);
      load();
    } catch (e2) {
      setFormError(getErrorMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => setEditRow({ _id: item._id, quantityAvailable: String(item.quantityAvailable), category: item.category, unit: item.unit });
  const cancelEdit = () => setEditRow(null);
  const saveEdit = async (itemId) => {
    const qty = Number(editRow.quantityAvailable);
    if (isNaN(qty) || qty < 0) return;
    setEditSaving(true);
    try {
      await api.patch(`/api/stock/${itemId}`, {
        quantityAvailable: qty,
        category: editRow.category?.trim() || undefined,
        unit: editRow.unit?.trim() || undefined,
      });
      setEditRow(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setEditSaving(false);
    }
  };

  const subtitle =
    role === 'center_head' ? 'Current stock levels for your campus'
      : role === 'department_admin' ? "Stock held at each campus in your department's category"
        : role === 'cluster_manager' ? 'Stock levels across all campuses'
          : 'Stock across Head Office, campuses and departments';

  const tableProps = { canUpdate: CAN_UPDATE.includes(role), editRow, setEditRow, startEdit, cancelEdit, saveEdit, editSaving, ownerLabel: isOrgWide ? 'Owner' : 'Campus' };

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">Inventory</span>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {CAN_CREATE.includes(role) && (
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormError(''); setForm({ ...defaultForm, relatedDepartmentRef: role === 'department_admin' ? (user?.scopeRef || '') : '' }); }}>
            <Plus size={16} /> Add Stock Item
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Pending receipts */}
      {isCenterHead && receipts.length > 0 && (
        <div className="section-card" style={{ marginBottom: 20 }}>
          <div className="section-card-header">
            <span className="section-card-title"><PackageCheck size={16} /> Pending Stock Receipts ({receipts.length})</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>PO Number</th><th>Vendor</th><th>Items</th><th>Received</th><th>Action</th></tr></thead>
              <tbody>
                {receipts.map((rc) => (
                  <tr key={rc._id}>
                    <td style={{ fontWeight: 600 }}>{rc.purchaseOrderRef?.poNumber || '—'}</td>
                    <td>{rc.purchaseOrderRef?.vendorName || '—'}</td>
                    <td>{rc.items?.length || 0} item(s)</td>
                    <td>{formatDate(rc.createdAt)}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => setActiveReceipt(rc)}>
                        <Plus size={13} /> Add to Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add modal */}
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
                    <input className="form-input" value={form.category} placeholder="e.g. Electronics" onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label required">Unit</label>
                    <input className="form-input" value={form.unit} placeholder="pcs / kg / set" onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Initial Quantity</label>
                    <input className="form-input" type="number" min={0} value={form.quantityAvailable} onChange={(e) => setForm((p) => ({ ...p, quantityAvailable: e.target.value }))} />
                  </div>

                  {ORG_WIDE_ROLES.includes(role) && (
                    <div className="form-field">
                      <label className="form-label required">Assign To</label>
                      <select className="form-select" value={form.ownerType} onChange={(e) => setForm((p) => ({ ...p, ownerType: e.target.value, ownerRef: '' }))}>
                        <option value="headOffice">Head Office</option>
                        <option value="campus">Campus</option>
                        <option value="department">Department</option>
                      </select>
                    </div>
                  )}

                  {(role === 'department_admin' || (ORG_WIDE_ROLES.includes(role) && form.ownerType === 'campus')) && (
                    <div className="form-field">
                      <label className="form-label required">Campus</label>
                      <select className="form-select" value={form.ownerRef} onChange={(e) => setForm((p) => ({ ...p, ownerRef: e.target.value }))}>
                        <option value="">Select campus…</option>
                        {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  {ORG_WIDE_ROLES.includes(role) && form.ownerType === 'department' && (
                    <div className="form-field">
                      <label className="form-label required">Department</label>
                      <select className="form-select" value={form.ownerRef} onChange={(e) => setForm((p) => ({ ...p, ownerRef: e.target.value }))}>
                        <option value="">Select department…</option>
                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}

                  {(ORG_WIDE_ROLES.includes(role) && form.ownerType === 'campus') && (
                    <div className="form-field">
                      <label className="form-label">Related Department (category)</label>
                      <select className="form-select" value={form.relatedDepartmentRef} onChange={(e) => setForm((p) => ({ ...p, relatedDepartmentRef: e.target.value }))}>
                        <option value="">None</option>
                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {isCenterHead && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>This item will be added to your campus stock.</p>
                )}
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
        <div className="table-panel-header"><span className="table-panel-title">Stock Items</span></div>
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input className="form-input" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isCampusScopedMulti && (
            <select className="filter-select" value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)}>
              <option value="">All Campuses</option>
              {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          )}
          {isOrgWide && (
            <>
              <select
                className="filter-select"
                value={ownerTypeFilter}
                onChange={(e) => { setOwnerTypeFilter(e.target.value); setOwnerRefFilter(''); }}
              >
                <option value="">All Locations</option>
                <option value="headOffice">Head Office</option>
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
                  {(ownerTypeFilter === 'campus' ? campuses : departments).map((o) => (
                    <option key={o._id} value={o._id}>{o.name}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Package size={24} /></div>
            <div className="empty-title">No stock items found</div>
            <div className="empty-sub">{search || activeFilter ? 'Try a different search or filter.' : 'Stock items appear here once goods are received and entered.'}</div>
          </div>
        ) : !isGrouped ? (
          <StockTable items={items} {...tableProps} />
        ) : ownerRefFilter || campusFilter ? (
          <StockTable items={items} {...tableProps} />
        ) : (
          <div className="stock-groups" style={{ padding: 'var(--space-4) 0' }}>
            {groups.map((group) => (
              <div key={group.key} className="table-panel" style={{ margin: '0 var(--space-4)' }}>
                <div className="stock-group-header">
                  <span className="stock-group-heading"><Building2 size={16} color="var(--color-accent)" /> {group.label}</span>
                  <span className="stock-group-count">{group.items.length} item{group.items.length === 1 ? '' : 's'}</span>
                </div>
                <StockTable items={group.items} {...tableProps} />
              </div>
            ))}
          </div>
        )}
      </div>

      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
          onDone={() => { setActiveReceipt(null); load(); loadReceipts(); }}
        />
      )}
    </div>
  );
};

export default StockPage;
