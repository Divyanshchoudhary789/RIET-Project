import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

/**
 * Editable line-item table shared by the work-proposal and assessment editors.
 *
 * props:
 *  - items:        array of { _key, name, quantity, unit, price, description, departmentRef?, _sourceLabel? }
 *  - onChange:     (nextItems) => void
 *  - departments:  optional [{ _id, name }] — when provided, each row shows a department <select>
 *  - allowAdd:     show the "Add blank row" button (default true)
 *  - readOnlyMeta: when true, name/unit are read-only (source item), only qty/price/dept editable
 */
const makeBlank = () => ({
  _key: crypto.randomUUID(), name: '', quantity: 1, unit: '', price: '', description: '', departmentRef: '',
});

const lineTotal = (it) => (Number(it.quantity) || 0) * (Number(it.price) || 0);

const LineItemsEditor = ({ items, onChange, departments = null, allowAdd = true, title = 'Line Items' }) => {
  const showDept = Array.isArray(departments);

  const update = (key, field, val) =>
    onChange(items.map((it) => (it._key === key ? { ...it, [field]: val } : it)));

  const remove = (key) => onChange(items.filter((it) => it._key !== key));
  const add = () => onChange([...items, makeBlank()]);

  const grandTotal = items.reduce((a, it) => a + lineTotal(it), 0);

  const cols = showDept
    ? '1.4fr 60px 80px 100px 100px 1fr 34px'
    : '1.6fr 60px 80px 100px 100px 34px';

  return (
    <div>
      <div className="form-card-title" style={{ justifyContent: 'space-between' }}>
        <span>{title} ({items.length})</span>
        {allowAdd && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
            <Plus size={15} /> Add Row
          </button>
        )}
      </div>

      <div className="item-row-header" style={{ gridTemplateColumns: cols }}>
        <span className="item-header-label">Item Name</span>
        <span className="item-header-label">Qty</span>
        <span className="item-header-label">Unit</span>
        <span className="item-header-label">Unit Price</span>
        <span className="item-header-label">Line Total</span>
        {showDept && <span className="item-header-label">Department</span>}
        <span />
      </div>

      <div className="items-list">
        {items.map((it) => (
          <div key={it._key}>
            <div className="item-row" style={{ gridTemplateColumns: cols }}>
              <input className="form-input" value={it.name} placeholder="Item name"
                onChange={(e) => update(it._key, 'name', e.target.value)} />
              <input className="form-input" type="number" min={1} value={it.quantity}
                onChange={(e) => update(it._key, 'quantity', e.target.value)} />
              <input className="form-input" value={it.unit} placeholder="pcs"
                onChange={(e) => update(it._key, 'unit', e.target.value)} />
              <input className="form-input" type="number" min={0} step="0.01" value={it.price} placeholder="0"
                onChange={(e) => update(it._key, 'price', e.target.value)} />
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
                {formatCurrency(lineTotal(it))}
              </span>
              {showDept && (
                <select className="form-select" value={it.departmentRef || ''}
                  onChange={(e) => update(it._key, 'departmentRef', e.target.value)}>
                  <option value="">Select…</option>
                  {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              )}
              <button type="button" className="del-item-btn" onClick={() => remove(it._key)}
                disabled={items.length === 1}>
                <Trash2 size={15} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '2px 0 8px' }}>
              <input className="form-input" style={{ fontSize: 12, padding: '4px 8px' }}
                value={it.description} placeholder="Description / specification (optional)"
                onChange={(e) => update(it._key, 'description', e.target.value)} />
              {it._sourceLabel && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  from {it._sourceLabel}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '12px 4px 0', borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Estimated Total</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent)' }}>{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
};

export default LineItemsEditor;
