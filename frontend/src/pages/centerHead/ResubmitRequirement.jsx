import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Send } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatCurrency } from '../../utils/helpers';
import '../../styles/pages.css';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const makeItem = () => ({ _key: crypto.randomUUID(), name: '', quantity: 1, unit: '', price: '', description: '' });
const lineTotal = (it) => (Number(it.quantity) || 0) * (Number(it.price) || 0);

const ResubmitRequirement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([makeItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/requirements/${id}`)
      .then((r) => {
        const req = r.data.data;
        setTitle(req.title || '');
        setPriority(req.priority || 'medium');
        setDescription(req.description || req.justification || '');
        setItems(
          req.items?.map((it) => ({
            _key: crypto.randomUUID(),
            name: it.name || '',
            quantity: it.quantity ?? 1,
            unit: it.unit || '',
            price: it.price ?? '',
            description: it.description || '',
          })) || [makeItem()]
        );
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const updateItem = (key, field, val) =>
    setItems((p) => p.map((it) => it._key === key ? { ...it, [field]: val } : it));

  const grandTotal = items.reduce((acc, it) => acc + lineTotal(it), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) { setError('Title must be at least 3 characters.'); return; }
    if (!description.trim() || description.length < 10) { setError('Description must be at least 10 characters.'); return; }
    for (const it of items) {
      if (!it.name.trim() || !it.unit.trim()) { setError('Each item needs a name and unit.'); return; }
      if (it.price === '' || isNaN(Number(it.price)) || Number(it.price) < 0) { setError('Each item must have a valid price.'); return; }
    }
    setError(''); setSubmitting(true);
    try {
      await api.patch(`/api/requirements/${id}/resubmit`, {
        title: title.trim(), priority, description: description.trim(),
        items: items.map(({ name, quantity, unit, price, description: d }) => ({
          name: name.trim(), quantity: Number(quantity), unit: unit.trim(), price: Number(price), description: d.trim(),
        })),
      });
      navigate('/center-head/requirements');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loader"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">Revise</span>
          <h1 className="page-title">Resubmit Requirement</h1>
          <p className="page-subtitle">Update and resubmit</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/center-head/requirements')}>Cancel</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <div className="form-card-title">Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-field">
              <label className="form-label required">Title</label>
              <input className="form-input" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Laptops for Computer Lab" maxLength={200} />
            </div>
            <div className="form-field">
              <label className="form-label required">Priority</label>
              <div className="priority-options">
                {PRIORITIES.map((p) => (
                  <button key={p} type="button" className={`priority-option${priority === p ? ` active-${p}` : ''}`}
                    onClick={() => setPriority(p)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label className="form-label required">Description</label>
              <textarea className="form-textarea" rows={4} value={description}
                onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-title" style={{ justifyContent: 'space-between' }}>
            <span>Items</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((p) => [...p, makeItem()])}>
              <Plus size={15} /> Add
            </button>
          </div>
          <div className="item-row-header" style={{ gridTemplateColumns: '1fr 70px 90px 110px 110px 36px' }}>
            <span className="item-header-label">Item Name</span>
            <span className="item-header-label">Qty</span>
            <span className="item-header-label">Unit</span>
            <span className="item-header-label">Unit Price (₹)</span>
            <span className="item-header-label">Line Total</span>
            <span />
          </div>
          <div className="items-list">
            {items.map((it) => (
              <div key={it._key} className="item-row" style={{ gridTemplateColumns: '1fr 70px 90px 110px 110px 36px' }}>
                <input className="form-input" value={it.name}
                  onChange={(e) => updateItem(it._key, 'name', e.target.value)} placeholder="Item name" />
                <input className="form-input" type="number" min={1} value={it.quantity}
                  onChange={(e) => updateItem(it._key, 'quantity', e.target.value)} />
                <input className="form-input" value={it.unit}
                  onChange={(e) => updateItem(it._key, 'unit', e.target.value)} placeholder="Unit" />
                <input className="form-input" type="number" min={0} step="0.01" value={it.price}
                  onChange={(e) => updateItem(it._key, 'price', e.target.value)} placeholder="0" />
                <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {formatCurrency(lineTotal(it))}
                </span>
                <button type="button" className="del-item-btn" onClick={() => setItems((p) => p.filter((x) => x._key !== it._key))}
                  disabled={items.length === 1}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '12px 4px 0', borderTop: '1px solid var(--color-border)', marginTop: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Estimated Total</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent)' }}>{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/center-head/requirements')} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <span className="spinner spinner-sm" /> : <Send size={16} />}
            Resubmit
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResubmitRequirement;
