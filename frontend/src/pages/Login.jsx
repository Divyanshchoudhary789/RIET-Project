import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/helpers';
import '../styles/login.css';

/* ── OTP input that auto-focuses next cell ── */
const OtpInput = ({ length = 6, value, onChange }) => {
  const inputs = useRef([]);
  const vals = value.split('');

  const handleKey = (i, e) => {
    const digits = '0123456789';
    if (e.key === 'Backspace') {
      const next = [...vals];
      if (next[i]) { next[i] = ''; onChange(next.join('')); }
      else if (i > 0) { inputs.current[i - 1]?.focus(); }
      return;
    }
    if (digits.includes(e.key)) {
      const next = [...vals];
      next[i] = e.key;
      onChange(next.join(''));
      if (i < length - 1) inputs.current[i + 1]?.focus();
    }
  };

  return (
    <div className="auth-otp-inputs">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          className="auth-otp-input"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={vals[i] || ''}
          onChange={() => {}}
          onKeyDown={(e) => handleKey(i, e)}
        />
      ))}
    </div>
  );
};

/* ── Steps: login | forgot-email | forgot-otp | change-required ── */
const Login = () => {
  const { user, loading, mustChangePassword, login, forgotPassword, resetPassword, changePassword, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('login'); // login | forgot-email | forgot-otp | change-required
  const [showPw, setShowPw] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fpEmail, setFpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [currentPw, setCurrentPw] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // OTP resend timer
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = React.useRef(null);

  const startResendTimer = () => {
    setResendTimer(60);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  React.useEffect(() => () => clearInterval(timerRef.current), []);

  // Already logged in → redirect
  useEffect(() => {
    if (!loading && user) {
      if (mustChangePassword) { setStep('change-required'); return; }
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [user, loading, mustChangePassword]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setError(''); setSubmitting(true);
    try {
      const { user: u, mustChangePassword: mcp } = await login(email, password);
      if (mcp) { setStep('change-required'); }
      else { navigate(getDashboardPath(u.role), { replace: true }); }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotEmail = async (e) => {
    e.preventDefault();
    if (!fpEmail.trim()) { setError('Email is required.'); return; }
    setError(''); setSubmitting(true);
    try {
      await forgotPassword(fpEmail);
      setSuccess('If that email exists, an OTP has been sent.');
      setStep('forgot-otp');
      startResendTimer();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    if (!newPw || newPw.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    setError(''); setSubmitting(true);
    try {
      await resetPassword(fpEmail, otp, newPw, confirmPw);
      setSuccess('Password reset successfully. Please log in.');
      setStep('login');
      setOtp(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRequired = async (e) => {
    e.preventDefault();
    if (!currentPw) { setError('Current password is required.'); return; }
    if (!newPw || newPw.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    setError(''); setSubmitting(true);
    try {
      await changePassword(currentPw, newPw, confirmPw);
      setSuccess('Password changed. Please log in with your new password.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loader"><span className="spinner" /></div>;

  const clearError = () => setError('');

  return (
    <div className="auth-page">
      {/* Brand panel */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-logo-icon">
            <img src="/sapiens-logo.png" alt="RIET" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <div className="auth-brand-logo-text">
            <span className="auth-brand-logo-name">RIET</span>
            <span className="auth-brand-logo-sub">Platform</span>
          </div>
        </div>
        <div className="auth-brand-content">
          <div className="auth-brand-eyebrow">Management System</div>
          <h1 className="auth-brand-title">Multi-Campus Procurement Workflow</h1>
          <p className="auth-brand-desc">
            A single system of record for every resource requirement — from Center Head to Accounts — with full audit trail and real-time visibility.
          </p>
        </div>
        <p className="auth-brand-motto">नभः स्पृशं · Touching the skies</p>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-box">

          {/* ── LOGIN ── */}
          {step === 'login' && (
            <>
              <h1 className="auth-form-title">Sign in</h1>
              <p className="auth-form-subtitle">Use the credentials provided by your administrator.</p>
              {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
              {success && <div className="alert alert-success" style={{ marginBottom: 20 }}>{success}</div>}
              <form className="auth-form" onSubmit={handleLogin} noValidate>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="email">Email</label>
                  <input id="email" className="auth-input" type="email" autoComplete="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }} placeholder="you@riet.edu" disabled={submitting} />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="password">Password</label>
                  <div className="auth-password-wrap">
                    <input id="password" className="auth-input" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                      value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }} placeholder="Enter password" disabled={submitting} />
                    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw((p) => !p)}>
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <button type="button" className="auth-forgot-link" onClick={() => { setStep('forgot-email'); setError(''); setSuccess(''); }}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" className="auth-submit" disabled={submitting}>
                  {submitting ? <span className="spinner spinner-sm" /> : 'Sign In'}
                </button>
              </form>
            </>
          )}

          {/* ── FORGOT — ENTER EMAIL ── */}
          {step === 'forgot-email' && (
            <>
              <h1 className="auth-form-title">Reset password</h1>
              <p className="auth-form-subtitle">Enter your email to receive a one-time OTP.</p>
              {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
              <form className="auth-form" onSubmit={handleForgotEmail}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="fp-email">Email</label>
                  <input id="fp-email" className="auth-input" type="email" value={fpEmail}
                    onChange={(e) => { setFpEmail(e.target.value); clearError(); }} placeholder="you@riet.edu" disabled={submitting} />
                </div>
                <button type="submit" className="auth-submit" disabled={submitting}>
                  {submitting ? <span className="spinner spinner-sm" /> : 'Send OTP'}
                </button>
              </form>
              <div className="auth-back-link">
                <button onClick={() => { setStep('login'); setError(''); }}>Back to sign in</button>
              </div>
            </>
          )}

          {/* ── FORGOT — ENTER OTP + NEW PASSWORD ── */}
          {step === 'forgot-otp' && (
            <>
              <h1 className="auth-form-title">Enter OTP</h1>
              <p className="auth-form-subtitle">A 6-digit code was sent to {fpEmail}</p>
              {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
              {success && <div className="alert alert-success" style={{ marginBottom: 20 }}>{success}</div>}
              <form className="auth-form" onSubmit={handleResetPassword}>
                <div className="auth-field">
                  <label className="auth-label">OTP</label>
                  <OtpInput length={6} value={otp} onChange={setOtp} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    {resendTimer > 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Resend in {resendTimer}s</span>
                    ) : (
                      <button type="button" className="auth-forgot-link" style={{ marginTop: 0 }}
                        onClick={async () => {
                          setError(''); setSubmitting(true);
                          try { await forgotPassword(fpEmail); setSuccess('New OTP sent.'); startResendTimer(); }
                          catch (e) { setError(getErrorMessage(e)); }
                          finally { setSubmitting(false); }
                        }} disabled={submitting}>
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="new-pw">New Password</label>
                  <div className="auth-password-wrap">
                    <input id="new-pw" className="auth-input" type={showPw ? 'text' : 'password'} value={newPw}
                      onChange={(e) => { setNewPw(e.target.value); clearError(); }} placeholder="Min 8 characters" disabled={submitting} />
                    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw((p) => !p)}>
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="confirm-pw">Confirm Password</label>
                  <input id="confirm-pw" className="auth-input" type="password" value={confirmPw}
                    onChange={(e) => { setConfirmPw(e.target.value); clearError(); }} placeholder="Re-enter password" disabled={submitting} />
                </div>
                <button type="submit" className="auth-submit" disabled={submitting}>
                  {submitting ? <span className="spinner spinner-sm" /> : 'Reset Password'}
                </button>
              </form>
              <div className="auth-back-link">
                <button onClick={() => { setStep('forgot-email'); setError(''); }}>Back</button>
              </div>
            </>
          )}

          {/* ── FORCED PASSWORD CHANGE ── */}
          {step === 'change-required' && (
            <>
              <h1 className="auth-form-title">Change your password</h1>
              <p className="auth-form-subtitle">You must set a new password before accessing the platform.</p>

              {success ? (
                /* ── Success state: show message + go to login button ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
                  <div className="alert alert-success">{success}</div>
                  <button
                    type="button"
                    className="auth-submit"
                    onClick={() => {
                      setStep('login');
                      setSuccess('');
                      setCurrentPw('');
                      setNewPw('');
                      setConfirmPw('');
                      setEmail('');
                      setPassword('');
                    }}
                  >
                    Go to Sign In
                  </button>
                </div>
              ) : (
                /* ── Form state ── */
                <>
                  <div className="auth-info-box" style={{ marginBottom: 20 }}>
                    Password must be at least 8 characters with uppercase, lowercase, digit and special character.
                  </div>
                  {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
                  <form className="auth-form" onSubmit={handleChangeRequired}>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="cur-pw">Current Password</label>
                      <input id="cur-pw" className="auth-input" type="password" value={currentPw}
                        onChange={(e) => { setCurrentPw(e.target.value); clearError(); }} placeholder="Temporary password" disabled={submitting} />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="new-pw2">New Password</label>
                      <div className="auth-password-wrap">
                        <input id="new-pw2" className="auth-input" type={showPw ? 'text' : 'password'} value={newPw}
                          onChange={(e) => { setNewPw(e.target.value); clearError(); }} placeholder="Min 8 characters" disabled={submitting} />
                        <button type="button" className="auth-pw-toggle" onClick={() => setShowPw((p) => !p)}>
                          {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="confirm-pw2">Confirm New Password</label>
                      <input id="confirm-pw2" className="auth-input" type="password" value={confirmPw}
                        onChange={(e) => { setConfirmPw(e.target.value); clearError(); }} placeholder="Re-enter new password" disabled={submitting} />
                    </div>
                    <button type="submit" className="auth-submit" disabled={submitting}>
                      {submitting ? <span className="spinner spinner-sm" /> : 'Set New Password'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
