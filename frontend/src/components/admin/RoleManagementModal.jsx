import React, { useState, useEffect } from 'react';
import { X, Shield, Plus, Edit2, Trash2, Copy, Check, Users, ShieldAlert, Key, CheckCircle2, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../../config/api';

export default function RoleManagementModal({ isOpen, onClose, activeUser, onRolesUpdated }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  // Edit / Create Form state
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/roles'));
      const data = await res.json();
      if (Array.isArray(data)) setRoles(data);
    } catch (err) {
      console.error("Failed to fetch system roles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchRoles();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleCode('');
    setRoleDesc('');
    setShowRoleForm(true);
    setMsg(null);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleCode(role.code);
    setRoleDesc(role.description || '');
    setShowRoleForm(true);
    setMsg(null);
  };

  const handleCloneRole = (role) => {
    setEditingRole(null);
    setRoleName(`${role.name} (Copy)`);
    setRoleCode(`${role.code}_COPY`);
    setRoleDesc(role.description || '');
    setShowRoleForm(true);
    setMsg(null);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(getApiUrl(url), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName,
          code: roleCode,
          description: roleDesc,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message });
        setShowRoleForm(false);
        await fetchRoles();
        if (onRolesUpdated) onRolesUpdated();
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to save role.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Server connection error.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Are you sure you want to delete role "${role.name}" (${role.code})?`)) return;
    setMsg(null);

    try {
      const res = await fetch(getApiUrl(`/api/roles/${role.id}`), { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message });
        await fetchRoles();
        if (onRolesUpdated) onRolesUpdated();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to delete role.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Dynamic Role &amp; Access Control (RBAC)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Centralized Role Management • Expandable Enterprise System Roles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          }`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{msg.text}</span>
          </div>
        )}

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Active System Roles ({roles.length})
          </span>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Create New Role
          </button>
        </div>

        {/* Create / Edit Form */}
        {showRoleForm && (
          <form onSubmit={handleSaveRole} className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 text-xs animate-in slide-in-from-top-2 duration-200">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Key className="w-4 h-4 text-cyan-500" />
              {editingRole ? `Edit Role: ${editingRole.name}` : 'Configure New System Role'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Role Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Security Auditor"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">System Role Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SECURITY_AUDITOR"
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Role Description &amp; Scope</label>
              <input
                type="text"
                placeholder="Enterprise governance scope and access permissions..."
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRoleForm(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-xs"
              >
                {saving ? 'Saving Role...' : 'Save System Role'}
              </button>
            </div>
          </form>
        )}

        {/* Roles Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 font-semibold">
                <th className="py-3 px-3">Role Code</th>
                <th className="py-3 px-3">Role Name</th>
                <th className="py-3 px-3">Assigned Staff</th>
                <th className="py-3 px-3">Scope Description</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {roles.map((r) => (
                <tr key={r.id || r.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {r.code}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    {r.name}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Users className="w-3 h-3 inline mr-1 text-cyan-500" />
                      {r.user_count || 0} Members
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                    {r.description || 'Enterprise RBAC Role'}
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-500 transition"
                      title="Edit Role"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCloneRole(r)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-500 transition"
                      title="Clone Role"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {['SUPER_ADMIN', 'HR', 'FULL_TIME', 'INTERN', 'MANAGER'].includes(r.code) ? (
                      <span className="text-[10px] text-slate-400 italic px-1">Core</span>
                    ) : (
                      <button
                        onClick={() => handleDeleteRole(r)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
