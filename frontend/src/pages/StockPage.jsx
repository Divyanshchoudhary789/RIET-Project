import React, { useEffect, useState } from 'react';
import { Plus, Package } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getErrorMessage } from '../utils/helpers';
import '../styles/pages.css';

const CAN_CREATE = ['director', 'chairperson', 'accounts'];

const StockPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ itemName: '', category: '', unit: '', quantityAvailable: 0, ownerType: 'headOffice' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/api/stock')
      .then((r) => setItems(r.data.data || []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((it) =>
    !search || it.itemName?.toLowerCase().includes(search.toLowerCase()) || it.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.itemName.trim() || !form.category.trim() || !form.unit.trim()) { setFormError('All fields are required.'); return; }
    setSaving(true); setFormError('');
    try {
      await api.post('/api/stock', {
        itemName: form.itemName.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        quantityAvailable: Number(form.quantityAvailable),
        ownerType: form.ownerType,
      });
      setShowForm(false);
      setForm({ itemName: '', category: '', unit: '', quantityAvailable: 0, ownerType: 'headOffice' });
      load();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">Inventory</span>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">Current stock levels for your scope</p>
        </div>
        {CAN_CREATE.includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Stock Item
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Add Stock Item</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {formError && <div className="alert alert-error">{formError}</div>}
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label required">Item Name</label>
                    <input className="form-input" value={form.itemName} onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label required">Category</label>
                    <input className="form-input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label required">Unit</label>
                    <input className="form-input" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} placeholder="pcs / kg / set" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Quantity</label>
                    <input className="form-input" type="number" min={0} value={form.quantityAvailable}
                      onChange={(e) => setForm((p) => ({ ...p, quantityAvailable: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Owner Type</label>
                    <select className="form-select" value={form.ownerType} onChange={(e) => setForm((p) => ({ ...p, ownerType: e.target.value }))}>
                      <option value="headOffice">Head Office</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner spinner-sm" /> : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-panel">
        <div className="table-panel-header">
          <span className="table-panel-title">Stock Items</span>
          <input className="search-input" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Package size={24} /></div>
            <div className="empty-title">No stock items found</div>
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
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it._id} className={`stock-row${it.quantityAvailable <= it.reorderThreshold ? ' stock-low' : ''}`}>
                    <td style={{ fontWeight: 500 }}>{it.itemName}</td>
                    <td>{it.category}</td>
                    <td>{it.unit}</td>
                    <td>{it.quantityAvailable}</td>
                    <td>{it.quantityReserved}</td>
                    <td>{it.ownerRef?.name || it.ownerType}</td>
                    <td>{formatDate(it.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPage;
