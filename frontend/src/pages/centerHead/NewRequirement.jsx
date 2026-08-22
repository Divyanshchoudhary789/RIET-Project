import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Send } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/helpers';
import '../../styles/pages.css';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const makeItem = () => ({ _key: crypto.randomUUID(), name: '', quantity: 1, unit: '', description: '' });

const NewRequirement = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [justification, setJustification] = useState('');
  const [items, setItems] = useState([makeItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (key, field, val) =>
    setItems((p) => p.map((it) => it._key === key ? { ...it, [field]: val } : it));

  const removeItem = (key) => {
    if (items.length === 1) return;
    setItems((p) => p.filter((it) => it._key !== key));
  };

  const validate = () => {
    if (!title.trim() || title.trim().length < 3) return 'Title must be at least 3 characters.';
    if (!justification.trim() || justification.trim().length < 10) return 'Justification must be at least 10 characters.';
    for (const it of items) {
      if (!it.name.trim()) return 'Each item must have a name.';
      if (!it.unit.trim()) return 'Each item must have a unit.';
      if (it.quantity < 1) return 'Quantity must be at least 1.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setSubmitting(true);
    try {
      await api.post('/api/requirements', {
        title: title.trim(),
        priority,
        justification: justification.trim(),
        items: items.map(({ name, quantity, unit, description }) => ({
          name: name.trim(), quantity: Number(quantity), unit: unit.trim(), description: description.trim(),
        })),
      });
      navigate('/center-head/requirements');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">Create</span>
          <h1 className="page-title">New Requirement</h1>
          <p className="page-subtitle">Submit a resource requirement for your campus</p>
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
                  <button key={p} type="button"
                    className={`priority-option${priority === p ? ` active-${p}` : ''}`}
                    onClick={() => setPriority(p)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label className="form-label required">Justification</label>
              <textarea className="form-textarea" rows={4} value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain why this resource is needed (min 10 characters)" />
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-title" style={{ justifyContent: 'space-between' }}>
            <span>Items</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((p) => [...p, makeItem()])}>
              <Plus size={15} /> Add Item
            </button>
          </div>

          <div className="item-row-header">
            <span className="item-header-label">Item Name</span>
            <span className="item-header-label">Qty</span>
            <span className="item-header-label">Unit</span>
            <span />
          </div>

          <div className="items-list">
            {items.map((it) => (
              <div key={it._key} className="item-row">
                <input className="form-input" value={it.name}
                  onChange={(e) => updateItem(it._key, 'name', e.target.value)} placeholder="e.g. Laptop" />
                <input className="form-input" type="number" min={1} value={it.quantity}
                  onChange={(e) => updateItem(it._key, 'quantity', e.target.value)} />
                <input className="form-input" value={it.unit}
                  onChange={(e) => updateItem(it._key, 'unit', e.target.value)} placeholder="pcs / sets" />
                <button type="button" className="del-item-btn" onClick={() => removeItem(it._key)}
                  disabled={items.length === 1}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/center-head/requirements')} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <span className="spinner spinner-sm" /> : <Send size={16} />}
            Submit Requirement
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewRequirement;
