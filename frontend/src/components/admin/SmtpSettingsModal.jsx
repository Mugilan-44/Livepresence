import React, { useState, useEffect } from 'react';
import { X, Mail, Send, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Key, Server } from 'lucide-react';

export default function SmtpSettingsModal({ isOpen, onClose, activeUser }) {
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    user: 'careers@prolync.in',
    pass: '',
    sender_name: 'Prolync LiveSpace',
    sender_email: 'careers@prolync.in',
    enabled: true
  });

  const [testEmail, setTestEmail] = useState(activeUser?.email || 'admin@prolync.in');
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [verifying, setVerifying] = useState(false);

  const safeFetchJson = async (url, options = {}) => {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (res.status === 500 || text.includes('Proxy error') || text.includes('ECONNREFUSED')) {
            data = {
              error: "Backend Server Unreachable",
              message: "The backend REST server at http://localhost:5000 is unreachable or offline. Please ensure the backend Express process is active."
            };
          } else {
            data = {
              error: `HTTP ${res.status} Response Error`,
              message: `Server returned non-JSON response body (Status Code: ${res.status}).`
            };
          }
        }
      }

      if (!res.ok) {
        const title = (data && data.error) ? data.error : `Server Error (HTTP ${res.status})`;
        const errorMsg = (data && data.message) ? data.message : (data && data.error) ? data.error : `Server request failed with HTTP status ${res.status}.`;
        const errObj = new Error(errorMsg);
        errObj.errorType = title;
        throw errObj;
      }

      return data || {};
    } catch (err) {
      throw err;
    }
  };


  useEffect(() => {
    if (isOpen) {
      fetchSmtpData();
    }
  }, [isOpen]);

  const fetchSmtpData = async () => {
    try {
      const [cfgRes, logRes] = await Promise.all([
        safeFetchJson('/api/admin/smtp', { headers: { 'x-user-role': activeUser?.role || 'SUPER_ADMIN' } }).catch(e => ({})),
        safeFetchJson('/api/admin/email-logs', { headers: { 'x-user-role': activeUser?.role || 'SUPER_ADMIN' } }).catch(e => ([]))
      ]);
      if (cfgRes && cfgRes.host) setSmtpConfig(cfgRes);
      if (Array.isArray(logRes)) setLogs(logRes);
    } catch (e) {
      console.error("Failed to load SMTP settings", e);
    }
  };

  const handleApplyPreset = (preset) => {
    if (preset === 'hostinger') {
      setSmtpConfig({
        ...smtpConfig,
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        user: smtpConfig.user || 'careers@prolync.in',
        sender_email: smtpConfig.sender_email || 'careers@prolync.in'
      });
    } else if (preset === 'gmail') {
      setSmtpConfig({
        ...smtpConfig,
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: smtpConfig.user || 'notifications@prolync.in'
      });
    } else if (preset === 'office365') {
      setSmtpConfig({
        ...smtpConfig,
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        user: smtpConfig.user || 'notifications@prolync.in'
      });
    }
  };

  const [saveMsg, setSaveMsg] = useState(null);

  const handleVerifyConnection = async () => {
    try {
      setVerifying(true);
      setSaveMsg(null);
      const data = await safeFetchJson('/api/admin/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig)
      });
      setSaveMsg({ type: 'success', title: 'Connection Verified', text: data.message || 'SMTP Server Connection Verified!' });
    } catch (err) {
      console.error("Failed to verify SMTP credentials", err);
      setSaveMsg({ type: 'error', title: err.errorType || 'SMTP Connection Error', text: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveMsg(null);
      
      const data = await safeFetchJson('/api/admin/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...smtpConfig,
          userRole: activeUser?.role || 'SUPER_ADMIN',
          actorName: activeUser?.name || 'Admin User'
        })
      });

      setSaveMsg({ type: 'success', title: 'Configuration Saved', text: data.message || 'SMTP Configuration saved & applied live!' });
      fetchSmtpData();
    } catch (err) {
      console.error("Failed to save SMTP config", err);
      setSaveMsg({ type: 'error', title: err.errorType || 'Configuration Save Error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) return;
    try {
      setTesting(true);
      setTestResult(null);

      const data = await safeFetchJson('/api/admin/smtp/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: testEmail,
          userRole: activeUser?.role || 'SUPER_ADMIN'
        })
      });

      setTestResult({ success: true, message: data.message || 'Test email dispatched successfully!' });
      fetchSmtpData();
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Test email delivery failed.' });
    } finally {
      setTesting(false);
    }
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">SMTP Email Gateway Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure email server triggers, credentials, templates, & delivery retry queue</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {saveMsg && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-3 shadow-sm ${
              saveMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/30'
            }`}>
              {saveMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1">
                {saveMsg.title && <p className="font-bold uppercase tracking-wider text-[11px] opacity-90">{saveMsg.title}</p>}
                <p className="font-normal text-xs leading-relaxed">{saveMsg.text}</p>
              </div>
              <button onClick={() => setSaveMsg(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}



          
          {/* Quick Presets Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Quick Configuration Presets:</span>
          <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('hostinger')}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-medium transition"
              >
                Hostinger Mail
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('gmail')}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-medium transition"
              >
                Gmail SMTP
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('office365')}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-medium transition"
              >
                Office 365 / Outlook
              </button>
            </div>
          </div>

          {/* Config Form */}
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">SMTP Server Host</label>
                <input
                  type="text"
                  required
                  value={smtpConfig.host}
                  onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Port</label>
                <input
                  type="number"
                  required
                  value={smtpConfig.port}
                  onChange={e => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value, 10) })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sender Name</label>
                <input
                  type="text"
                  required
                  value={smtpConfig.sender_name}
                  onChange={e => setSmtpConfig({ ...smtpConfig, sender_name: e.target.value })}
                  placeholder="Prolync HR System"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sender Email Address</label>
                <input
                  type="email"
                  required
                  value={smtpConfig.sender_email}
                  onChange={e => setSmtpConfig({ ...smtpConfig, sender_email: e.target.value })}
                  placeholder="notifications@prolync.in"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">SMTP Username / Account</label>
                <input
                  type="text"
                  value={smtpConfig.user}
                  onChange={e => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  placeholder="user@prolync.in"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">SMTP Password / App Secret</label>
                <input
                  type="password"
                  value={smtpConfig.pass}
                  onChange={e => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtpEnableToggle"
                  checked={smtpConfig.enabled}
                  onChange={e => setSmtpConfig({ ...smtpConfig, enabled: e.target.checked })}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="smtpEnableToggle" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Enable Automated System Email Dispatching
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleVerifyConnection}
                  disabled={verifying || saving}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Server className="w-3.5 h-3.5 text-cyan-500" />
                  {verifying ? 'Verifying...' : 'Verify Connection'}
                </button>
                <button
                  type="submit"
                  disabled={saving || verifying}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  {saving ? 'Saving...' : 'Save SMTP Configuration'}
                </button>
              </div>
            </div>
          </form>


          {/* Test Email Section */}
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-3">
            <h4 className="text-xs font-bold text-cyan-900 dark:text-cyan-200 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-4 h-4 text-cyan-500" />
              Dispatch Test Email Verification
            </h4>

            <div className="flex items-center gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Enter recipient email..."
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSendTestEmail}
                disabled={testing}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>

            {testResult && (
              <div className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                testResult.success ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Delivery Queue Logs */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email System Transmission Logs</h4>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{log.subject}</div>
                    <div className="text-[10px] text-slate-400">Recipient: {log.to} • Template: {log.template}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold">
                      {log.status}
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
