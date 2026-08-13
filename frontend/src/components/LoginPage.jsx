import React, { useCallback, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { getApiUrl } from '../config/api';
import TurnstileWidget from './TurnstileWidget';

export default function LoginPage({ onLoginSuccess }) {
  const resetToken = new URLSearchParams(window.location.search).get('resetToken');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [view, setView] = useState(resetToken ? 'reset' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const turnstileEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
    && (import.meta.env.PROD || import.meta.env.VITE_TURNSTILE_ENFORCE_LOCAL === 'true');
  const setSecurityToken = useCallback((token) => setTurnstileToken(token), []);

  const clearFeedback = () => { setError(''); setNotice(''); };
  const backToLogin = () => {
    clearFeedback(); setView('login'); setNewPassword(''); setConfirmPassword('');
    if (window.location.search) window.history.replaceState({}, '', window.location.pathname);
  };

  const signIn = async (event) => {
    event.preventDefault(); clearFeedback(); setLoading(true);
    if (turnstileEnabled && !turnstileToken) {
      setLoading(false); setError('Complete the security check before signing in.'); return;
    }
    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email.trim(), password, turnstileToken })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) {
        setTurnstileResetKey(value => value + 1);
        throw new Error(data.error || 'Invalid work email or password.');
      }
      onLoginSuccess(data.token, data.user);
    } catch (err) { setError(err.message || 'Unable to sign in right now.'); }
    finally { setLoading(false); }
  };

  const requestReset = async (event) => {
    event.preventDefault(); clearFeedback(); setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/auth/forgot-password'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not request a password reset.');
      setNotice(data.message || 'Check your inbox for a password reset link.');
    } catch (err) { setError(err.message || 'Unable to request a password reset.'); }
    finally { setLoading(false); }
  };

  const saveNewPassword = async (event) => {
    event.preventDefault(); clearFeedback();
    if (newPassword.length < 8) return setError('Use at least 8 characters for your new password.');
    if (newPassword !== confirmPassword) return setError('The passwords do not match.');
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: resetToken, newPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not reset your password.');
      setNotice(data.message || 'Password updated. You can now sign in.');
      setTimeout(backToLogin, 1200);
    } catch (err) { setError(err.message || 'Unable to reset your password.'); }
    finally { setLoading(false); }
  };

  const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--accent-soft)]';
  const feedback = <>{error && <div className="mb-5 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}{notice && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700">{notice}</div>}</>;
  const passwordInput = (value, onChange, label, autoComplete) => <label className="block text-sm font-semibold text-slate-700">{label}<div className="relative mt-2"><Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input required type={showPassword ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={event => onChange(event.target.value)} placeholder="Enter your password" className={input} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>;

  return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 font-[Geist,Inter,sans-serif]"><section className="w-full max-w-md"><header className="mb-7 text-center"><img src="/logo.png" alt="Prolync" className="mx-auto h-14 w-14 object-contain" /><h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Prolync LiveSpace</h1><p className="mt-1 text-sm text-slate-500">Sign in to your work workspace</p></header><form onSubmit={view === 'login' ? signIn : view === 'forgot' ? requestReset : saveNewPassword} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8"><div className="mb-6 border-b-2 border-[var(--accent)] pb-5"><h2 className="text-lg font-bold text-slate-950">{view === 'login' ? 'Welcome back' : view === 'forgot' ? 'Reset your password' : 'Choose a new password'}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{view === 'login' ? 'Use your registered work email and password to access Prolync.' : view === 'forgot' ? 'We’ll email a secure reset link to your registered work address.' : 'Use a strong password that you do not use elsewhere.'}</p></div>{feedback}{view !== 'reset' && <label className="mb-4 block text-sm font-semibold text-slate-700">Work email<div className="relative mt-2"><Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@prolync.in" className={input} /></div></label>}{view === 'login' && <>{passwordInput(password, setPassword, 'Password', 'current-password')}<TurnstileWidget enabled={turnstileEnabled} onToken={setSecurityToken} resetKey={turnstileResetKey} /><button type="button" onClick={() => { clearFeedback(); setView('forgot'); }} className="mt-4 text-sm font-semibold text-[var(--accent)] hover:underline">Forgot your password?</button></>}{view === 'reset' && <div className="space-y-4">{passwordInput(newPassword, setNewPassword, 'New password', 'new-password')}{passwordInput(confirmPassword, setConfirmPassword, 'Confirm new password', 'new-password')}</div>}{view !== 'login' && <button type="button" onClick={backToLogin} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Back to sign in</button>}<button disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--accent-soft)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">{loading ? (view === 'login' ? 'Signing in…' : 'Please wait…') : view === 'login' ? <>Sign in <ArrowRight className="h-4 w-4" /></> : view === 'forgot' ? 'Send reset link' : 'Save new password'}</button></form><p className="mt-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Prolync Infotech Pvt. Ltd.</p></section></main>;
}
