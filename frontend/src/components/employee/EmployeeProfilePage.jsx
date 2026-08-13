import React, { useState } from 'react';
import { UserCheck, Save, Mail, Phone, MapPin, Calendar, Heart, Shield, Building2, CreditCard, User, Camera, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

export default function EmployeeProfilePage({ activeUser, onUpdateProfile, onChangePassword, onRequestPasswordOtp }) {
  const canManageEmployment = activeUser?.role === 'SUPER_ADMIN';
  const employeeEditableFields = [
    'name', 'mobile', 'dob', 'blood_group', 'gender', 'address',
    'emergency_contact', 'bank_name', 'bank_account', 'ifsc_swift',
    'aadhaar_number', 'pan_number', 'avatar'
  ];
  const [formData, setFormData] = useState({
    name: activeUser?.name || '',
    email: activeUser?.email || '',
    mobile: activeUser?.mobile || '',
    dob: activeUser?.dob || '',
    blood_group: activeUser?.blood_group || 'O+',
    gender: activeUser?.gender || 'Male',
    address: activeUser?.address || '',
    emergency_contact: activeUser?.emergency_contact || '',
    bank_name: activeUser?.bank_name || '',
    bank_account: activeUser?.bank_account || '',
    ifsc_swift: activeUser?.ifsc_swift || '',
    aadhaar_number: activeUser?.aadhaar_number || '',
    pan_number: activeUser?.pan_number || '',
    avatar: activeUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: activeUser?.title || activeUser?.designation || '',
    office_location: activeUser?.office_location || 'Delhi NCR Headquarters'
  });


  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [passwordState, setPasswordState] = useState({ saving: false, message: '', error: '' });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const image = new Image();
        image.onload = () => {
          const size = 192; const scale = Math.min(1, size / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          setFormData(prev => ({ ...prev, avatar: canvas.toDataURL('image/jpeg', 0.82) }));
        };
        image.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      // Employees can maintain their own personal, banking, and identity data.
      // Employment/access records stay founder-managed and are omitted entirely.
      const profileUpdates = canManageEmployment
        ? formData
        : Object.fromEntries(employeeEditableFields.map((field) => [field, formData[field]]));
      await onUpdateProfile(activeUser.id, profileUpdates);
      setMsg({ type: 'success', text: 'Profile details updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const validateNewPassword = () => {
    if (!passwords.newPassword || !passwords.confirmPassword) {
      setPasswordState({ saving: false, message: '', error: 'Enter and confirm your new password.' });
      return false;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordState({ saving: false, message: '', error: 'Use at least 8 characters for your new password.' });
      return false;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordState({ saving: false, message: '', error: 'The new password and confirmation do not match.' });
      return false;
    }
    return true;
  };

  const handleRequestPasswordOtp = async () => {
    setPasswordState({ saving: false, message: '', error: '' });
    if (!validateNewPassword()) return;
    setPasswordState({ saving: true, message: '', error: '' });
    try {
      const result = await onRequestPasswordOtp();
      setOtpSent(true);
      setPasswordState({ saving: false, message: result.message || 'A verification code was sent to your work email.', error: '' });
    } catch (err) {
      setPasswordState({ saving: false, message: '', error: err.message || 'A verification code could not be sent.' });
    }
  };

  const handlePasswordChange = async (event) => {
    event?.preventDefault();
    setPasswordState({ saving: false, message: '', error: '' });
    if (!validateNewPassword()) return;
    if (!otpSent || !/^\d{6}$/.test(passwords.otp)) return setPasswordState({ saving: false, message: '', error: 'Enter the six-digit verification code sent to your work email.' });
    setPasswordState({ saving: true, message: '', error: '' });
    try {
      await onChangePassword({ newPassword: passwords.newPassword, otp: passwords.otp });
      setPasswords({ newPassword: '', confirmPassword: '', otp: '' });
      setOtpSent(false);
      setPasswordState({ saving: false, message: 'Password changed successfully.', error: '' });
    } catch (err) {
      setPasswordState({ saving: false, message: '', error: err.message || 'Password could not be changed.' });
    }
  };

  return (
    <div className="space-y-6 select-none w-full">
      
      {/* Top Banner Header */}
      <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          
          {/* Avatar Upload Container */}
          <div className="relative group">
            <img
              src={formData.avatar}
              alt={formData.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500 shadow-md"
            />
            <label className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition text-white">
              <Camera className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">{activeUser?.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                {activeUser?.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{activeUser?.title || 'Team Member'} • {activeUser?.department}</p>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">Employee ID: {activeUser?.employee_id}</p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Profile...' : 'Save Profile Changes'}
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {!canManageEmployment && (
        <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
          You can update your personal, contact, bank, Aadhaar, PAN, and profile-photo details here. Your work email, designation, and office assignment are managed by the founder.
        </div>
      )}

      {/* Editable Details Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Personal Information */}
        <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading uppercase tracking-wider">
              Personal Details
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => handleChange('gender', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
                <select
                  value={formData.blood_group}
                  onChange={e => handleChange('blood_group', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={e => handleChange('dob', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Residential Address</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Contact & Emergency Info */}
        <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Phone className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading uppercase tracking-wider">
              Contact & Emergency Information
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                readOnly={!canManageEmployment}
                className={`w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden ${canManageEmployment ? 'bg-slate-50 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-950 cursor-not-allowed opacity-75'}`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone Number</label>
              <input
                type="text"
                value={formData.mobile}
                onChange={e => handleChange('mobile', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Number & Relation</label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={e => handleChange('emergency_contact', e.target.value)}
                placeholder="+91 98765 00000 (Father / Spouse)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Designation / Role Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                readOnly={!canManageEmployment}
                className={`w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none ${canManageEmployment ? 'bg-slate-50 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-950 cursor-not-allowed opacity-75'}`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                Assigned Office Location
              </label>
              <select
                value={formData.office_location}
                onChange={e => handleChange('office_location', e.target.value)}
                disabled={!canManageEmployment}
                className={`w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none ${canManageEmployment ? 'bg-slate-50 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-950 cursor-not-allowed opacity-75'}`}
              >
                <option value="Delhi NCR Headquarters">Delhi NCR Headquarters (Gurugram)</option>
                <option value="Bengaluru Tech Hub">Bengaluru Tech Hub (ORR)</option>
                <option value="Hyderabad Operations Center">Hyderabad Operations Center (HITEC)</option>
                <option value="Chennai Vandalur Office">Chennai Vandalur Office (Kilambakkam)</option>
                <option value="Remote / Anywhere Workplace">Remote / Anywhere Workplace</option>
              </select>
            </div>

          </div>
        </div>

        {/* Card 3: Bank Account & Payroll Info */}
        <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <CreditCard className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading uppercase tracking-wider">
              Bank Account & Salary Deposit Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={e => handleChange('bank_name', e.target.value)}
                placeholder="e.g. HDFC Bank / ICICI Bank"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
              <input
                type="text"
                value={formData.bank_account}
                onChange={e => handleChange('bank_account', e.target.value)}
                placeholder="•••• •••• 8842"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">IFSC / SWIFT Code</label>
              <input
                type="text"
                value={formData.ifsc_swift}
                onChange={e => handleChange('ifsc_swift', e.target.value)}
                placeholder="HDFC0001928"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-cyan-500" />
            <div><h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading uppercase tracking-wider">Identity details</h3><p className="mt-0.5 text-xs text-slate-500">Visible only to you and the founder for onboarding verification.</p></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div><label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Aadhaar card number</label><input value={formData.aadhaar_number} onChange={e => handleChange('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} inputMode="numeric" placeholder="12-digit Aadhaar number" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 dark:border-slate-700 dark:bg-slate-900" /></div>
            <div><label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">PAN card number</label><input value={formData.pan_number} onChange={e => handleChange('pan_number', e.target.value.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 font-mono uppercase dark:border-slate-700 dark:bg-slate-900" /></div>
          </div>
        </div>

        <section className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <KeyRound className="w-4 h-4 text-[var(--accent)]" />
            <div><h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading uppercase tracking-wider">Change password</h3><p className="mt-0.5 text-xs text-slate-500">We’ll email a code to your work address before changing your password.</p></div>
          </div>
          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">New password<input required type="password" minLength="8" autoComplete="new-password" value={passwords.newPassword} onChange={e => setPasswords(current => ({ ...current, newPassword: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">Confirm new password<input required type="password" minLength="8" autoComplete="new-password" value={passwords.confirmPassword} onChange={e => setPasswords(current => ({ ...current, confirmPassword: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>
          </div>
          {otpSent && <label className="block max-w-sm text-xs font-semibold text-slate-700 dark:text-slate-300">Verification code<input required inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={passwords.otp} onChange={e => setPasswords(current => ({ ...current, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="Enter the 6-digit code" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 font-mono tracking-[0.35em] dark:border-slate-700 dark:bg-slate-900" /></label>}
          {passwordState.error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{passwordState.error}</p>}
          {passwordState.message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{passwordState.message}</p>}
          <div className="flex flex-wrap gap-3"><button type="button" onClick={handleRequestPasswordOtp} disabled={passwordState.saving} className="rounded-xl border border-[var(--accent)] px-4 py-2.5 text-xs font-bold text-[var(--accent)] disabled:opacity-60">{passwordState.saving && !otpSent ? 'Sending code…' : otpSent ? 'Send a new code' : 'Send verification code'}</button>{otpSent && <button type="button" onClick={handlePasswordChange} disabled={passwordState.saving} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{passwordState.saving ? 'Changing password…' : 'Confirm and change password'}</button>}</div>
        </section>

      </form>

    </div>
  );
}
