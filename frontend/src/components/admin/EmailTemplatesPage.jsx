import React, { useState, useEffect } from 'react';
import { Mail, Settings, Send, CheckCircle2, Eye, Laptop, Smartphone, X, Palette, Server, AlertCircle, Sparkles } from 'lucide-react';
import SmtpSettingsModal from './SmtpSettingsModal';

export default function EmailTemplatesPage({ activeUser }) {
  const [branding, setBranding] = useState({
    company_name: 'Prolync Infotech Pvt. Ltd.',
    company_logo: '/logo.png',
    brand_primary_color: '#0891b2',
    website: 'www.prolync.in',
    support_email: 'hr@prolync.in',
    phone: '+91 98402 00000',
    address: 'Chennai HQ Campus, Tamil Nadu, India',
    footer_disclaimer: 'Confidentiality Notice: This communication contains confidential information intended solely for the addressee. Prolync Infotech Pvt. Ltd.',
    signature_html: `<div>
  <p style="margin: 0; font-weight: bold; color: #0891b2;">Kind Regards,</p>
  <p style="margin: 2px 0; font-weight: bold; color: #0f172a;">HR Operations Team</p>
  <p style="margin: 0; font-weight: bold; color: #334155;">Prolync Infotech Pvt. Ltd.</p>
  <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">Human Resources &amp; Enterprise Governance Department</p>
  <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Email: hr@prolync.in | Web: www.prolync.in</p>
</div>`
  });

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop', 'mobile'
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState({ connected: false, host: 'smtp.gmail.com' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Test Email state
  const [testEmailAddr, setTestEmailAddr] = useState(activeUser?.email || 'hr@prolync.in');
  const [sendingTest, setSendingTest] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/email-templates');
      const data = await res.json();
      if (data.branding) setBranding(data.branding);
      if (Array.isArray(data.templates) && data.templates.length > 0) {
        setTemplates(data.templates);
        setSelectedTemplate(prev => {
          if (!prev) return data.templates[0];
          const found = data.templates.find(t => t.id === prev.id);
          return found || data.templates[0];
        });
      }
    } catch (err) {
      console.error("Failed to load email templates", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSmtpConfig = async () => {
    try {
      const res = await fetch('/api/admin/smtp');
      const data = await res.json();
      if (data && data.host) {
        setSmtpStatus({
          connected: Boolean(data.enabled && data.user && data.has_password),
          host: data.host,
          user: data.user
        });
      }
    } catch (e) {
      console.error("Failed to check SMTP config", e);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchSmtpConfig();
  }, []);

  const isAdmin = ['SUPER_ADMIN', 'HR'].includes(activeUser?.role);

  const insertVariable = (varName) => {
    if (!selectedTemplate) return;
    const tag = `{{${varName}}}`;
    setSelectedTemplate(prev => ({
      ...prev,
      body: (prev.body || '') + ' ' + tag
    }));
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/email-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedTemplate)
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message || 'Template saved successfully!' });
        fetchTemplates();
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to save template.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Server connection error.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch('/api/email-branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding)
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message || 'Branding updated successfully!' });
        setShowBrandingModal(false);
        fetchTemplates();
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to update branding.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update email branding.' });
    } finally {
      setSaving(false);
    }
  };

  const [testMsg, setTestMsg] = useState(null);

  const handleSendTestEmail = async () => {
    if (!selectedTemplate) return;
    setSendingTest(true);
    setMsg(null);
    setTestMsg(null);

    try {
      const res = await fetch('/api/email-templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate,
          target_email: testEmailAddr
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestMsg({ type: 'success', text: data.message });
      } else {
        setTestMsg({ type: 'error', text: data.error || 'Failed to dispatch test email.' });
      }
    } catch (err) {
      setTestMsg({ type: 'error', text: 'Test email service unreachable.' });
    } finally {
      setSendingTest(false);
    }
  };


  const generateLiveHtml = (tpl) => {
    if (!tpl) return '';
    const brandName = branding.company_name || 'Prolync Infotech Pvt. Ltd.';
    const color = branding.brand_primary_color || '#0891b2';
    
    const placeholders = {
      EmployeeName: 'Mohammed Muzzammil S',
      FirstName: 'Mohammed',
      LastName: 'Muzzammil',
      EmployeeID: 'EMP-1005',
      Designation: 'Full Stack Software Engineer',
      Department: 'Engineering & Operations',
      CompanyName: brandName,
      ManagerName: 'Rahul Kannan (CEO & Founder)',
      PortalLink: 'http://localhost:3000',
      OTP: '849204',
      ResetLink: 'http://localhost:3000/reset-password',
      SupportEmail: branding.support_email || 'hr@prolync.in'
    };

    const replaceTags = (str = '') => str.replace(/\{\{(\w+)\}\}/g, (_, k) => placeholders[k] || `{{${k}}}`);

    return `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px; color: #334155; font-size: 13px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: ${color}; padding: 18px 24px; color: #ffffff;">
            <div style="font-size: 18px; font-weight: bold;">${brandName}</div>
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85;">Human Resources Department</div>
          </div>
          <div style="padding: 24px;">
            <h2 style="margin-top: 0; color: #0f172a; font-size: 16px;">${replaceTags(tpl.heading || '')}</h2>
            <p style="font-weight: bold; color: #334155;">${replaceTags(tpl.greeting || '')}</p>
            <p style="line-height: 1.6; color: #475569;">${replaceTags(tpl.body || '').replace(/\n/g, '<br/>')}</p>
            
            ${tpl.cta_text ? `
            <div style="margin: 20px 0;">
              <a href="#" style="background: ${color}; color: #ffffff; padding: 10px 20px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 12px; display: inline-block;">${replaceTags(tpl.cta_text)}</a>
            </div>
            ` : ''}

            ${tpl.footer_text ? `
            <div style="font-size: 11px; color: #64748b; font-style: italic; background: #f1f5f9; padding: 10px; border-radius: 6px; margin-top: 15px;">
              ℹ️ ${replaceTags(tpl.footer_text)}
            </div>
            ` : ''}
          </div>
          <div style="padding: 0 24px 20px 24px; border-top: 1px solid #f1f5f9; font-size: 11px;">
            ${branding.signature_html || ''}
          </div>
          <div style="background: #0f172a; color: #94a3b8; padding: 15px; text-align: center; font-size: 10px;">
            ${branding.footer_disclaimer || ''}
            <div style="margin-top: 4px; opacity: 0.7;">© 2026 ${brandName}. All rights reserved.</div>
          </div>
        </div>
      </div>
    `;
  };

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">
      
      {/* Top Header Bar */}
      <div className="glass-card p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Enterprise Email Templates &amp; Branding Gateway
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                smtpStatus.connected
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${smtpStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {smtpStatus.connected ? `SMTP Gateway Active (${smtpStatus.host})` : 'SMTP Unconfigured (Simulated Mode)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active Corporate Identity: <strong className="text-slate-900 dark:text-white">{branding.company_name}</strong> • Automated Email Workflows &amp; Direct Dispatch
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => setShowSmtpModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 flex items-center gap-2 transition"
              >
                <Server className="w-4 h-4" /> Configure SMTP Mail Server
              </button>

              <button
                onClick={() => setShowBrandingModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition"
              >
                <Palette className="w-4 h-4 text-cyan-500" /> Branding &amp; Signature Settings
              </button>
            </>
          )}
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm ${
          msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main 2-Column Balanced Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Template Selector & Plain-Text Component Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Template Horizontal Selector Bar */}
          <div className="glass-card p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Select System Email Template ({templates.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {templates.map(tpl => {
                const isSelected = selectedTemplate?.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs truncate font-medium">{tpl.name}</div>
                      <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 truncate">{tpl.code}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                      tpl.active ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}>
                      {tpl.active ? 'Active' : 'Off'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Template Plain-Text Editor Form */}
          {selectedTemplate && (
            <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">{selectedTemplate.name}</h3>
                  <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">{selectedTemplate.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-semibold">Template Active</label>
                  <input
                    type="checkbox"
                    checked={selectedTemplate.active !== false}
                    onChange={(e) => setSelectedTemplate(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 accent-cyan-600 rounded"
                  />
                </div>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
                
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Subject Line *</label>
                  <input
                    type="text"
                    required
                    value={selectedTemplate.subject}
                    onChange={(e) => setSelectedTemplate(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Heading</label>
                    <input
                      type="text"
                      value={selectedTemplate.heading || ''}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, heading: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Greeting</label>
                    <input
                      type="text"
                      value={selectedTemplate.greeting || ''}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, greeting: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Dynamic Variables Quick Buttons */}
                <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Insert Dynamic Variables</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['EmployeeName', 'FirstName', 'EmployeeID', 'Designation', 'Department', 'ManagerName', 'CompanyName', 'OTP', 'PortalLink'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition font-bold"
                      >
                        + {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Body Content *</label>
                  <textarea
                    rows={6}
                    required
                    value={selectedTemplate.body}
                    onChange={(e) => setSelectedTemplate(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-sans leading-relaxed focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Button Label (CTA)</label>
                    <input
                      type="text"
                      value={selectedTemplate.cta_text || ''}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, cta_text: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Button Link URL</label>
                    <input
                      type="text"
                      value={selectedTemplate.cta_url || ''}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, cta_url: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="email"
                          placeholder="mohammed.muzzammil.s@gmail.com"
                          value={testEmailAddr}
                          onChange={(e) => setTestEmailAddr(e.target.value)}
                          className="w-full sm:w-56 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] focus:outline-none focus:border-cyan-500 font-medium"
                        />
                        <button
                          type="button"
                          disabled={sendingTest}
                          onClick={handleSendTestEmail}
                          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1.5 hover:bg-slate-800 shrink-0 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" /> {sendingTest ? 'Dispatching...' : 'Test Mail'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Template Changes'}
                      </button>
                    </div>

                    {testMsg && (
                      <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
                        testMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      }`}>
                        <span>{testMsg.text}</span>
                        <button type="button" onClick={() => setTestMsg(null)}><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                )}


              </form>

            </div>
          )}

        </div>

        {/* Right Column: Live Email Preview (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 border border-slate-200 dark:border-slate-800 space-y-4 sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-cyan-500" /> HTML Live Email Preview
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-white dark:bg-slate-800 text-cyan-500 shadow-xs' : 'text-slate-400'}`}
                title="Desktop View"
              >
                <Laptop className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-white dark:bg-slate-800 text-cyan-500 shadow-xs' : 'text-slate-400'}`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'max-w-[320px]' : 'w-full'}`}>
            <div
              className="bg-white rounded-2xl shadow-xl overflow-hidden text-slate-900 text-left border border-slate-200 min-h-[500px]"
              dangerouslySetInnerHTML={{ __html: generateLiveHtml(selectedTemplate) }}
            />
          </div>
        </div>

      </div>

      {/* Branding & Signature Settings Modal */}
      {showBrandingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Company Email Branding &amp; Signature Settings
              </h3>
              <button onClick={() => setShowBrandingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={branding.company_name}
                    onChange={(e) => setBranding(prev => ({ ...prev, company_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Brand Primary Color</label>
                  <input
                    type="color"
                    value={branding.brand_primary_color}
                    onChange={(e) => setBranding(prev => ({ ...prev, brand_primary_color: e.target.value }))}
                    className="w-full h-9 p-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">HR Support Email</label>
                  <input
                    type="email"
                    value={branding.support_email}
                    onChange={(e) => setBranding(prev => ({ ...prev, support_email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Website</label>
                  <input
                    type="text"
                    value={branding.website}
                    onChange={(e) => setBranding(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Physical Address</label>
                <input
                  type="text"
                  value={branding.address}
                  onChange={(e) => setBranding(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Standard Professional Signature (HTML)</label>
                <textarea
                  rows={5}
                  value={branding.signature_html}
                  onChange={(e) => setBranding(prev => ({ ...prev, signature_html: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBrandingModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/20"
                >
                  {saving ? 'Saving...' : 'Save Branding'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* SMTP Gateway Settings Modal */}
      <SmtpSettingsModal
        isOpen={showSmtpModal}
        onClose={() => {
          setShowSmtpModal(false);
          fetchSmtpConfig();
        }}
        activeUser={activeUser}
      />

    </div>
  );
}
