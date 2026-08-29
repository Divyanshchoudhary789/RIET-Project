import React, { useState } from 'react';
import { X } from 'lucide-react';
import useModalA11y from '../hooks/useModalA11y';

/**
 * Confirmation modal for "forward" / "approve" style actions that let the actor
 * attach an OPTIONAL note. Mirrors RejectModal but the note is not mandatory and
 * the confirm button is a primary (not danger) action.
 */
const ActionNoteModal = ({
  title = 'Confirm',
  description = 'Add an optional note for this action.',
  confirmLabel = 'Confirm',
  placeholder = 'Optional note…',
  onConfirm,
  onClose,
  loading,
}) => {
  const [note, setNote] = useState('');

  useModalA11y(() => { if (!loading) onClose(); });

  return (
    <div className="modal-overlay" onClick={() => { if (!loading) onClose(); }}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose} disabled={loading} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="reject-modal-body">
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {description}
          </p>
          <div className="form-field">
            <label className="form-label">Note (optional)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder={placeholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(note.trim())} disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionNoteModal;
