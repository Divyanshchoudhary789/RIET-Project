import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/helpers';

const ChangePassword = () => {
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const [current, setCurrent]   = useState('');
  const [newPw, setNewPw]       = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!current || !newPw || !confirm) { setError('All fields are required.'); return; }
    if (newPw !== confirm) { setError('New passwords do not match.'); return; }
    if (newPw.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      await changePassword(current, newPw, confirm);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>Change Password</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>Update your account password</p>
          </div>
        </div>

        {success ? (
          <div className="alert alert-success">Password changed successfully. Redirecting to login…</div>
        ) : (
          <>
            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            <div className="card">
              <div className="card-body">
                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="form-field">
                      <label className="form-label required" htmlFor="cp-current">Current password</label>
                      <div className="password-input-wrap" style={{ position: 'relative' }}>
                        <input
                          id="cp-current"
                          type={showPw ? 'text' : 'password'}
                          className="form-input"
                          placeholder="Current password"
                          value={current}
                          onChange={(e) => setCurrent(e.target.value)}
                          style={{ paddingRight: 42 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((p) => !p)}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
                          aria-label="Toggle password visibility"
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label required" htmlFor="cp-new">New password</label>
                      <input
                        id="cp-new"
                        type={showPw ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Min 8 characters"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label required" htmlFor="cp-confirm">Confirm new password</label>
                      <input
                        id="cp-confirm"
                        type={showPw ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Repeat new password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                      {loading ? <><span className="spinner spinner-sm" /> Saving…</> : 'Change password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
