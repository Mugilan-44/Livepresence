import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, CheckCircle2, Lock, ShieldAlert, Key } from 'lucide-react';

export default function ManagePermissionsModal({ onClose, employees, activeUser, onUpdatePermissions }) {
  const [selectedUserId, setSelectedUserId] = useState(employees?.[0]?.id || '');
  const [permissions, setPermissions] = useState(employees?.[0]?.custom_permissions || []);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const availablePermissions = [
    { key: 'view_attendance_audit', label: 'Attendance Audit & Team Muster Reports', desc: 'Can view full company attendance audit logs and person tracking.' },
    { key: 'manage_employees', label: 'Employee Onboarding & Directory Control', desc: 'Can add, edit, or modify employee profile details.' },
    { key: 'process_payroll', label: 'Payroll & Salary Management', desc: 'Can view and generate monthly salary processing records.' },
    { key: 'manage_documents', label: 'Document Verification Audit', desc: 'Can inspect Aadhaar, PAN, Bank Passbooks, and Resume uploads.' },
    { key: 'view_all_projects', label: 'View All Projects & Work Logs', desc: 'Can view projects outside assigned scope.' },
  ];

  const handleUserChange = (userId) => {
    setSelectedUserId(userId);
    const targetUser = employees.find(e => e.id === userId);
    setPermissions(targetUser?.custom_permissions || []);
    setMsg(null);
  };

  const togglePermission = (key) => {
    if (permissions.includes(key)) {
      setPermissions(permissions.filter(p => p !== key));
    } else {
      setPermissions([...permissions, key]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await onUpdatePermissions(selectedUserId, permissions);
      setMsg({ type: 'success', text: 'Access permissions updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to update permissions' });
    } finally {
      setLoading(false);
    }
  };

  const selectedUserObj = employees?.find(e => e.id === selectedUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">Super Admin - Access Control & Permissions</h3>
              <p className="text-xs text-slate-500">Grant or restrict specific module access per user</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Selector Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Select Employee to Manage:
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => handleUserChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
          >
            {employees?.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.role} - {emp.department})
              </option>
            ))}
          </select>
        </div>

        {/* User Info Badge */}
        {selectedUserObj && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-900 dark:text-white">{selectedUserObj.name}</span>
              <span className="text-[11px] text-slate-500 ml-2">({selectedUserObj.designation})</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              selectedUserObj.role === 'SUPER_ADMIN' ? 'bg-purple-500/10 text-purple-600 border border-purple-500/30' :
              selectedUserObj.role === 'HR' ? 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/30' :
              'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {selectedUserObj.role}
            </span>
          </div>
        )}

        {/* Granular Permission Toggles */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Module Permissions:
          </div>

          {availablePermissions.map((perm) => {
            const isGranted = permissions.includes(perm.key) || ['SUPER_ADMIN', 'HR'].includes(selectedUserObj?.role);
            const isRoleDefault = ['SUPER_ADMIN', 'HR'].includes(selectedUserObj?.role);

            return (
              <div
                key={perm.key}
                onClick={() => !isRoleDefault && togglePermission(perm.key)}
                className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${
                  isGranted
                    ? 'bg-cyan-500/5 border-cyan-500/30 text-slate-900 dark:text-white'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500 opacity-80'
                } ${isRoleDefault ? 'cursor-not-allowed opacity-90' : ''}`}
              >
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold flex items-center gap-1.5">
                    {perm.label}
                    {isRoleDefault && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-600 font-mono">Role Inherited</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{perm.desc}</p>
                </div>

                <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5 ${
                  isGranted ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                }`}>
                  {isGranted && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Banner */}
        {msg && (
          <div className={`p-3 rounded-xl text-xs font-semibold ${
            msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
          }`}>
            {msg.text}
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || ['SUPER_ADMIN', 'HR'].includes(selectedUserObj?.role)}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Saving Permissions...' : 'Save Permissions'}
          </button>
        </div>

      </div>
    </div>
  );
}
