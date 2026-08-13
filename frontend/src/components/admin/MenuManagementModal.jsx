import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Shield, Sliders, CheckCircle2 } from 'lucide-react';

const availableIcons = [
  'LayoutDashboard', 'UserCheck', 'CalendarCheck', 'Home', 'Users',
  'FileText', 'Briefcase', 'DollarSign', 'Bell', 'BarChart3', 'Shield', 'Settings'
];

const availableRoles = [
  { code: 'SUPER_ADMIN', name: 'Super Admin' },
  { code: 'HR', name: 'HR Manager' },
  { code: 'MANAGER', name: 'Project Lead / Manager' },
  { code: 'FULL_TIME', name: 'Full-Time Staff' },
  { code: 'INTERN', name: 'Intern / Trainee' }
];

export default function MenuManagementModal({ isOpen, onClose, menus = [], onSaveMenus, activeUser }) {
  const [menuList, setMenuList] = useState(menus);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    icon: 'LayoutDashboard',
    category: 'Core Operations',
    roles: ['SUPER_ADMIN', 'HR', 'MANAGER'],
    enabled: true
  });

  const handleToggleEnable = async (id) => {
    const item = menuList.find(m => m.id === id);
    if (!item) return;
    const updated = { ...item, enabled: !item.enabled };

    const res = await fetch(`/api/menus/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: updated.enabled,
        userRole: activeUser?.role,
        actorName: activeUser?.name
      })
    });
    if (res.ok) {
      const data = await res.json();
      setMenuList(data.menus);
      onSaveMenus(data.menus);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menuList.length) return;

    const list = [...menuList];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // re-assign order property
    const reordered = list.map((item, i) => ({ ...item, order: i + 1 }));
    setMenuList(reordered);

    const res = await fetch('/api/menus/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reorderedMenus: reordered,
        userRole: activeUser?.role,
        actorName: activeUser?.name
      })
    });
    if (res.ok) {
      const data = await res.json();
      onSaveMenus(data.menus);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    const res = await fetch(`/api/menus/${id}?userRole=${activeUser?.role}&actorName=${encodeURIComponent(activeUser?.name || '')}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const data = await res.json();
      setMenuList(data.menus);
      onSaveMenus(data.menus);
    }
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.label) return;

    if (editingId) {
      const res = await fetch(`/api/menus/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMenuList(data.menus);
        onSaveMenus(data.menus);
        setEditingId(null);
        setShowAddForm(false);
      }
    } else {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMenuList(data.menus);
        onSaveMenus(data.menus);
        setShowAddForm(false);
      }
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      label: item.label,
      icon: item.icon,
      category: item.category,
      roles: [...item.roles],
      enabled: item.enabled
    });
    setShowAddForm(true);
  };

  const toggleRolePermission = (roleCode) => {
    setFormData(prev => {
      const has = prev.roles.includes(roleCode);
      const roles = has ? prev.roles.filter(r => r !== roleCode) : [...prev.roles, roleCode];
      return { ...prev, roles };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Dynamic Menu Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add, reorder, show/hide, and configure role-based navigation menus</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Add / Edit Form */}
          {showAddForm ? (
            <form onSubmit={handleSaveForm} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editingId ? 'Edit Menu Item' : 'Create New Sidebar Module'}
                </h4>
                <button type="button" onClick={() => { setShowAddForm(false); setEditingId(null); }} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Menu Label</label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g. Leave Calendar"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category Group</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Core Operations">Core Operations</option>
                    <option value="Workforce Governance">Workforce Governance</option>
                    <option value="Delivery & Velocity">Delivery & Velocity</option>
                    <option value="Finance & Operations">Finance & Operations</option>
                    <option value="Communication">Communication</option>
                    <option value="Management & Audit">Management & Audit</option>
                    <option value="Custom Modules">Custom Modules</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Icon Symbol</label>
                  <select
                    value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    {availableIcons.map(ic => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="menuEnabled"
                    checked={formData.enabled}
                    onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                    className="rounded text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="menuEnabled" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Enable Module Live across Portal
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Role Permissions (Show/Hide per role)</label>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.map(r => {
                    const isChecked = formData.roles.includes(r.code);
                    return (
                      <button
                        type="button"
                        key={r.code}
                        onClick={() => toggleRolePermission(r.code)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isChecked ? 'text-cyan-500' : 'opacity-0'}`} />
                        <span>{r.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg shadow transition"
                >
                  {editingId ? 'Save Changes' : 'Create Menu Item'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configured Navigation Items</span>
              <button
                onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ label: '', icon: 'LayoutDashboard', category: 'Core Operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER'], enabled: true }); }}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Module
              </button>
            </div>
          )}

          {/* List of Menus */}
          <div className="space-y-2">
            {menuList.map((item, index) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition ${
                  item.enabled
                    ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === menuList.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Shield className="w-3 h-3 text-cyan-500" />
                      <span>Roles: {item.roles.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleEnable(item.id)}
                    className={`p-1.5 rounded-lg border transition ${
                      item.enabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-300 dark:border-slate-600'
                    }`}
                    title={item.enabled ? 'Enabled (Click to Disable)' : 'Disabled (Click to Enable)'}
                  >
                    {item.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition"
                    title="Edit Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
