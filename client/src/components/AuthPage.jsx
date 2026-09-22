import { useState, useEffect } from 'react';
import { loginUser, registerUser, requestPasswordReset, resetPassword } from '../api';
import './auth.css';

// ── Shared SVG icons ──────────────────────────────────────────────────────────

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MailCheckIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="m2 7 10 6.5L22 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="m16 19 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Error/Success alert helpers ───────────────────────────────────────────────

function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="auth-error" role="alert" style={{ marginBottom: 16 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span>{message}</span>
    </div>
  );
}

function SuccessAlert({ message }) {
  if (!message) return null;
  return (
    <div className="auth-success" style={{ marginBottom: 16 }}>
      {message}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AuthPage({ onAuthSuccess, initialMode = 'login' }) {
  // mode: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login / Register form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles (login/register)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Reset password
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // On mount: check URL for ?token= and auto-switch to reset mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setResetToken(tokenParam);
      setMode('reset');
      // Clean the token from the URL bar without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMsg('');
    setForgotSent(false);
  };

  // ── Login / Register submit ──────────────────────────────────────────────

  const handleLoginRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'register') {
      if (!name.trim()) { setError('Please enter your full name.'); return; }
      if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters long.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

      setLoading(true);
      try {
        const data = await registerUser({ name: name.trim(), email: email.trim(), password, confirmPassword });
        setMode('login');
        setSuccessMsg(data.message || 'Registration successful! Please sign in.');
        setPassword('');
        setConfirmPassword('');
      } catch (err) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!email.trim() || !password) { setError('Please enter both email and password.'); return; }

      setLoading(true);
      try {
        const data = await loginUser(email.trim(), password);
        onAuthSuccess(data.user);
      } catch (err) {
        setError(err.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  // ── Forgot password submit ───────────────────────────────────────────────

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(forgotEmail.trim());
      setForgotSent(true);
    } catch {
      // Even on error, show success to prevent email enumeration
      setForgotSent(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset password submit ────────────────────────────────────────────────

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters long.'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const data = await resetPassword(resetToken, newPassword, confirmNewPassword);
      setMode('login');
      setSuccessMsg(data.message || 'Password reset! You can now sign in with your new password.');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetToken('');
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const isLoginOrRegister = mode === 'login' || mode === 'register';

  return (
    <div className="auth-wrapper">
      <div className="auth-card">

        {/* ── Brand header ── */}
        <div className="auth-brand">
          <div className="auth-brand-badge">
            <span className="brand-mark" />
            <span className="brand-name">TrueLense</span>
          </div>
          {isLoginOrRegister && (
            <>
              <h2>{mode === 'login' ? 'Welcome Back' : 'Create an Account'}</h2>
              <p>
                {mode === 'login'
                  ? 'Sign in to access your media detector and private history'
                  : 'Register to start analyzing images and videos for AI generation'}
              </p>
            </>
          )}
          {mode === 'forgot' && (
            <>
              <h2>Forgot Password</h2>
              <p>Enter your registered email and we'll send a reset link.</p>
            </>
          )}
          {mode === 'reset' && (
            <>
              <h2>Reset Password</h2>
              <p>Choose a new password for your TrueLense account.</p>
            </>
          )}
        </div>

        {/* ── Tab switcher (login / register only) ── */}
        {isLoginOrRegister && (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>
        )}

        {/* ── Back button (forgot / reset) ── */}
        {(mode === 'forgot' || mode === 'reset') && (
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => switchMode('login')}
            aria-label="Back to sign in"
          >
            <ArrowLeftIcon />
            Back to Sign In
          </button>
        )}

        {/* ── Alerts ── */}
        <ErrorAlert message={error} />
        <SuccessAlert message={successMsg} />

        {/* ════════════════════════════════════════════════
            LOGIN / REGISTER FORM
            ════════════════════════════════════════════════ */}
        {isLoginOrRegister && (
          <form className="auth-form" onSubmit={handleLoginRegisterSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="reg-name">Full Name</label>
                <input
                  id="reg-name"
                  className="form-input"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="auth-password">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => switchMode('forgot')}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="password-input-wrapper">
                <input
                  id="auth-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label htmlFor="reg-confirm-password">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="reg-confirm-password"
                      className="form-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="role-notice">
                  * All newly registered accounts are standard user accounts with private history and storage controls.
                </div>
              </>
            )}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  {mode === 'login' ? 'Signing In…' : 'Creating Account…'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>
        )}

        {/* ════════════════════════════════════════════════
            FORGOT PASSWORD FORM
            ════════════════════════════════════════════════ */}
        {mode === 'forgot' && (
          <>
            {forgotSent ? (
              <div className="auth-sent-state">
                <div className="auth-sent-icon">
                  <MailCheckIcon />
                </div>
                <h3 className="auth-sent-title">Check your inbox</h3>
                <p className="auth-sent-body">
                  If <strong>{forgotEmail}</strong> is registered, a password reset link has been sent.
                  The link expires in <strong>15 minutes</strong>.
                </p>
                <p className="auth-sent-hint">
                  Don't see it? Check your spam folder, or{' '}
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => { setForgotSent(false); setForgotEmail(''); }}
                  >
                    try another email
                  </button>.
                </p>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleForgotSubmit}>
                <div className="form-group">
                  <label htmlFor="forgot-email">Registered Email Address</label>
                  <input
                    id="forgot-email"
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Sending…
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════
            RESET PASSWORD FORM
            ════════════════════════════════════════════════ */}
        {mode === 'reset' && (
          <form className="auth-form" onSubmit={handleResetSubmit}>
            {!resetToken && (
              <div className="auth-error" role="alert" style={{ marginBottom: 16 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>No reset token found. Please use the link from your email.</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="reset-new-password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="reset-new-password"
                  className="form-input"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={!resetToken}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  disabled={!resetToken}
                >
                  {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="reset-confirm-password"
                  className="form-input"
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  placeholder="Re-enter your new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={!resetToken}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmNewPassword((v) => !v)}
                  aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                  disabled={!resetToken}
                >
                  {showConfirmNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={loading || !resetToken}>
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Resetting Password…
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

        {/* ── Footer (login / register switcher) ── */}
        {isLoginOrRegister && (
          <div className="auth-footer">
            {mode === 'login' ? (
              <span>
                Don't have an account yet?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('register')}>
                  Register
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                  Login
                </button>
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}


