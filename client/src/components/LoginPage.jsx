import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

/* ── Shared Sub-Components (Defined OUTSIDE parent component to prevent unmounting/focus loss) ── */
const inputBase = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 38px 10px 38px',
  fontSize: 13,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  color: '#1e293b',
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  outline: 'none',
  transition: 'border-color 0.18s, box-shadow 0.18s',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  letterSpacing: '0.01em',
};

function InputField({ icon: Icon, rightSlot, style: extraStyle, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: 15, height: 15, pointerEvents: 'none' }} />
      <input
        {...props}
        style={{ ...inputBase, ...extraStyle }}
        onFocus={e => { e.target.style.borderColor = '#0891b2'; e.target.style.boxShadow = '0 0 0 3px rgba(8,145,178,0.1)'; e.target.style.background = '#ffffff'; }}
        onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
      />
      {rightSlot && (
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
          {rightSlot}
        </div>
      )}
    </div>
  );
}

function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' }}
      tabIndex={-1}
    >
      {show ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
    </button>
  );
}

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null); setInfoMsg(null); setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (res.ok) { onLoginSuccess(data.token, data.user); }
      else { setErrorMsg(data.error || 'Authentication failed. Please verify your credentials.'); }
    } catch {
      setErrorMsg('Unable to connect to the authentication server. Please try again.');
    } finally { setIsLoading(false); }
  };

  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setErrorMsg(null); setInfoMsg(null); setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (data.success !== false && (res.ok || data.message)) {
        setInfoMsg(data.message);
        if (data.email) setEmail(data.email);
        setMode('FORGOT_STEP_2');
      } else {
        setErrorMsg(data.error || data.message || 'Failed to dispatch the verification code. Please try again.');
      }
    } catch {
      setErrorMsg('Server connection error. Please ensure the backend service is running.');
    } finally { setIsLoading(false); }
  };

  const handleVerifyAndResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg(null); setInfoMsg(null);
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(newPassword)) {
      setErrorMsg('Use 12+ characters including upper-case, lower-case, a number, and a symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your new password.');
      return;
    }
    setIsLoading(true);
    try {
      const isActivation = mode === 'ACTIVATE_STEP_2';
      const res = await fetch(isActivation ? '/api/auth/activate-account' : '/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: resetCode.trim(), newPassword: newPassword.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setInfoMsg(isActivation ? 'Your account is active. You may now sign in with your new password.' : 'Your password has been reset successfully. You may now sign in with your new credentials.');
        setPassword(newPassword.trim());
        setMode('LOGIN');
        setResetCode(''); setNewPassword(''); setConfirmPassword('');
      } else {
        setErrorMsg(data.error || 'Failed to reset password. Please verify the code and try again.');
      }
    } catch {
      setErrorMsg('A network error occurred while resetting your password.');
    } finally { setIsLoading(false); }
  };

  const resetToLogin = () => {
    setMode('LOGIN');
    setErrorMsg(null); setInfoMsg(null);
    setResetCode(''); setNewPassword(''); setConfirmPassword('');
  };

  const primaryBtn = {
    width: '100%',
    padding: '11px 20px',
    borderRadius: 8,
    border: 'none',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: 13,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    letterSpacing: '0.01em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'background 0.18s, box-shadow 0.18s',
    background: isLoading ? '#94a3b8' : '#0f172a',
    color: '#ffffff',
    boxShadow: isLoading ? 'none' : '0 2px 8px rgba(15,23,42,0.18)',
    opacity: isLoading ? 0.8 : 1,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '24px 16px',
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-card { animation: fadeUp 0.32s ease both; }
        .lp-ghost-btn:hover { background: #f1f5f9 !important; color: #0f172a !important; }
        .lp-primary:hover:not(:disabled) { background: #1e3a5f !important; }
        .lp-link-btn { background: none; border: none; cursor: pointer; font-family: 'Inter','Segoe UI',sans-serif; }
        .lp-link-btn:hover { text-decoration: underline; }
        input:-webkit-autofill { box-shadow: 0 0 0 100px #ffffff inset !important; -webkit-text-fill-color: #1e293b !important; }
      `}</style>

      <div className="lp-card" style={{ width: '100%', maxWidth: 420 }}>

        {/* ── Brand Header ─────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <img
              src="/logo.png"
              alt="Prolync Logo"
              style={{ width: 52, height: 52, objectFit: 'contain' }}
            />
          </div>
          <h1 style={{
            margin: '0 0 5px',
            fontSize: 22,
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.03em',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
          }}>
            Prolync LivePresence
          </h1>
          <p style={{
            margin: 0,
            fontSize: 12,
            color: '#64748b',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}>
            Enterprise Workforce Management Platform
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>
            Prolync Infotech Pvt. Ltd.
          </p>
        </div>

        {/* ── Card ────────────────────────────────────────────── */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '32px 32px 28px',
          boxShadow: '0 4px 24px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)',
        }}>

          {/* Divider bar at top of card */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #0891b2, #0f172a)', borderRadius: '6px 6px 0 0', margin: '-32px -32px 24px', borderTopLeftRadius: 11, borderTopRightRadius: 11 }} />

          {/* Notifications */}
          {errorMsg && (
            <div style={{ marginBottom: 18, padding: '11px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 9, lineHeight: 1.5 }}>
              <AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1, color: '#dc2626' }} />
              <span>{errorMsg}</span>
            </div>
          )}
          {infoMsg && (
            <div style={{ marginBottom: 18, padding: '11px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 9, lineHeight: 1.5 }}>
              <CheckCircle2 style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1, color: '#16a34a' }} />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* ── MODE 1: Sign In ──────────────────────────────── */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} autoComplete="on">
              <div style={{ marginBottom: 4 }}>
                <h2 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Sign in to your account
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  Use your registered work email and password to access the portal.
                </p>
              </div>

              <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Work Email Address</label>
                <InputField
                  icon={Mail}
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="name@prolync.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                  <button
                    type="button"
                    className="lp-link-btn"
                    onClick={() => { setMode('FORGOT_STEP_1'); setErrorMsg(null); setInfoMsg(null); }}
                    style={{ fontSize: 11, fontWeight: 600, color: '#0891b2' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <InputField
                  icon={Lock}
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  rightSlot={<EyeToggle show={showPass} onToggle={() => setShowPass(v => !v)} />}
                />
              </div>

              <button type="submit" disabled={isLoading} className="lp-primary" style={primaryBtn}>
                {isLoading ? 'Authenticating...' : 'Sign In'}
                {!isLoading && <ArrowRight style={{ width: 14, height: 14 }} />}
              </button>
              <button
                type="button"
                className="lp-link-btn"
                onClick={() => { setMode('ACTIVATE_STEP_1'); setErrorMsg(null); setInfoMsg(null); }}
                style={{ width: '100%', marginTop: 14, fontSize: 11, fontWeight: 600, color: '#0891b2' }}
              >
                Activate an invited account
              </button>
            </form>
          )}

          {/* ── MODE 2: Forgot Password — Step 1 ─────────────── */}
          {mode === 'FORGOT_STEP_1' && (
            <form onSubmit={handleSendResetCode} autoComplete="off">
              <div style={{ marginBottom: 4 }}>
                <h2 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Reset Your Password
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                  Enter your registered work email address. A 6-digit verification code will be sent to that inbox.
                </p>
              </div>

              <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Registered Work Email Address</label>
                <InputField
                  icon={Mail}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@prolync.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="lp-primary"
                style={{ ...primaryBtn, background: isLoading ? '#94a3b8' : '#0891b2', boxShadow: isLoading ? 'none' : '0 2px 8px rgba(8,145,178,0.2)' }}
              >
                {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                {!isLoading && <ArrowRight style={{ width: 14, height: 14 }} />}
              </button>

              <button
                type="button"
                className="lp-ghost-btn"
                onClick={resetToLogin}
                style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, fontFamily: "'Inter','Segoe UI',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.18s' }}
              >
                <ArrowLeft style={{ width: 13, height: 13 }} />
                Back to Sign In
              </button>
            </form>
          )}

          {mode === 'ACTIVATE_STEP_1' && (
            <form onSubmit={(e) => { e.preventDefault(); setErrorMsg(null); setInfoMsg(null); setMode('ACTIVATE_STEP_2'); }} autoComplete="off">
              <div style={{ marginBottom: 4 }}>
                <h2 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Activate Your Account</h2>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>Enter the work email that received your invitation OTP.</p>
              </div>
              <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Work Email Address</label>
                <InputField icon={Mail} type="email" required autoComplete="email" placeholder="name@prolync.in" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button type="submit" className="lp-primary" style={{ ...primaryBtn, background: '#0891b2' }}>Continue <ArrowRight style={{ width: 14, height: 14 }} /></button>
              <button type="button" className="lp-ghost-btn" onClick={resetToLogin} style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600 }}>Back to Sign In</button>
            </form>
          )}

          {/* ── MODE 3: Forgot Password — Step 2 ─────────────── */}
          {(mode === 'FORGOT_STEP_2' || mode === 'ACTIVATE_STEP_2') && (
            <form onSubmit={handleVerifyAndResetPassword} autoComplete="off">
              <div style={{ marginBottom: 4 }}>
                <h2 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {mode === 'ACTIVATE_STEP_2' ? 'Activate Your Account' : 'Enter Verification Code'}
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                  {mode === 'ACTIVATE_STEP_2' ? 'Enter the 6-digit invitation code sent to' : 'A 6-digit code has been sent to'}{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 600 }}>{email}</strong>.
                  Enter the code and choose a new password below.
                </p>
              </div>

              <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

              {/* OTP Code Block */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>6-Digit Verification Code</label>
                <InputField
                  icon={KeyRound}
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit code"
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                  style={{ letterSpacing: '0.22em', fontFamily: "'JetBrains Mono','Courier New',monospace", fontWeight: 700, fontSize: 16 }}
                />
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  Do not share this code with anyone.
                </p>
              </div>

              <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 16px' }} />

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>New Password</label>
                <InputField
                  icon={Lock}
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  placeholder="12+ characters, upper/lower/number/symbol"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  rightSlot={<EyeToggle show={showNewPass} onToggle={() => setShowNewPass(v => !v)} />}
                />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Confirm New Password</label>
                <InputField
                  icon={Lock}
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="lp-primary"
                style={{ ...primaryBtn, background: isLoading ? '#94a3b8' : '#16a34a', boxShadow: isLoading ? 'none' : '0 2px 8px rgba(22,163,74,0.2)' }}
              >
                <CheckCircle2 style={{ width: 14, height: 14 }} />
                {isLoading ? 'Saving Password...' : mode === 'ACTIVATE_STEP_2' ? 'Activate Account' : 'Reset Password'}
              </button>

              <button
                type="button"
                className="lp-ghost-btn"
                onClick={resetToLogin}
                style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, fontFamily: "'Inter','Segoe UI',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.18s' }}
              >
                <ArrowLeft style={{ width: 13, height: 13 }} />
                Cancel and Return to Sign In
              </button>
            </form>
          )}

        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: 22, padding: '0 4px' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 400, lineHeight: 1.7 }}>
            &copy; {new Date().getFullYear()} Prolync Infotech Pvt. Ltd.
            &nbsp;&middot;&nbsp;
            Prolync LivePresence
            &nbsp;&middot;&nbsp;
            All Rights Reserved.
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#cbd5e1' }}>
            Authorised personnel only. Unauthorised access is strictly prohibited.
          </p>
        </div>

      </div>
    </div>
  );
}
