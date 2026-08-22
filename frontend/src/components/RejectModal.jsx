import React, { useState } from 'react';
import { X } from 'lucide-react';
import useModalA11y from '../hooks/useModalA11y';

const RejectModal = ({ title = 'Reject', onConfirm, onClose, loading }) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useModalA11y(() => { if (!loading) onClose(); });

  const handleSubmit = () => {
    if (!note.trim() || note.trim().length < 5) {
      setError('Rejection note is required (min 5 characters).');
      return;
    }
    onConfirm(note.trim());
  };

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
            A mandatory note is required explaining the reason for rejection.
          </p>
          <div>
            <textarea
              className="reject-note-textarea"
              placeholder="Write the rejection reason clearly..."
              value={note}
              onChange={(e) => { setNote(e.target.value); setError(''); }}
              disabled={loading}
              autoFocus
            />
            {error && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', marginTop: 4 }}>{error}</p>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : null}
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;
