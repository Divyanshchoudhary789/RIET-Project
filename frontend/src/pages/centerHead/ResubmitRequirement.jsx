import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Send } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/helpers';
import '../../styles/pages.css';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const makeItem = () => ({ _key: crypto.randomUUID(), name: '', quantity: 1, unit: '', description: '' });

const ResubmitRequirement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState('medium');
  const [justification, setJustification] = useState('');
  const [items, setItems] = useState([makeItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/requirements/${id}`)
      .then((r) => {
        const req = r.data.data;
        setPriority(req.priority || 'medium');
        setJustification(req.justification || '');
        setItems(req.items?.map((it) => ({ ...it, _key: crypto.randomUUID() })) || [makeItem()]);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const updateItem = (key, field, val) =>
    setItems((p) => p.map((it) => it._key === key ? { ...it, [field]: val } : it));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!justification.trim() || justification.length < 10) { setError('Justification must be at least 10 characters.'); return; }
    for (const it of items) {
      if (!it.name.trim() || !it.unit.trim()) { setError('Each item needs a name and unit.'); return; }
    }
    setError(''); setSubmitting(true);
    try {
      await api.patch(`/api/requirements/${id}/resubmit`, {
        priority, justification: justification.trim(),
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

  if (loading) return <div className="page-loader"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">Revise</span>
          <h1 className="page-title">Resubmit Requirement</h1>
          <p className="page-subtitle">Update and resubmit after rejection</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/center-head/requirements')}>Cancel</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <div className="form-card-title">Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
              <label className="form-label required">Justification</label>
              <textarea className="form-textarea" rows={4} value={justification}
                onChange={(e) => setJustification(e.target.value)} />
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
          <div className="items-list">
            {items.map((it) => (
              <div key={it._key} className="item-row">
                <input className="form-input" value={it.name}
                  onChange={(e) => updateItem(it._key, 'name', e.target.value)} placeholder="Item name" />
                <input className="form-input" type="number" min={1} value={it.quantity}
                  onChange={(e) => updateItem(it._key, 'quantity', e.target.value)} />
                <input className="form-input" value={it.unit}
                  onChange={(e) => updateItem(it._key, 'unit', e.target.value)} placeholder="Unit" />
                <button type="button" className="del-item-btn" onClick={() => setItems((p) => p.filter((x) => x._key !== it._key))}
                  disabled={items.length === 1}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
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
