import React, { useState, useEffect } from 'react';
import { MapPin, Building2, Plus, Search, Edit2, Trash2, Users, CheckCircle2, XCircle, Shield, Globe, Clock, Power, Filter, Grid, List } from 'lucide-react';
import AddLocationModal from './AddLocationModal';

export default function LocationManagementPage({ activeUser }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table', 'grid'
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [msg, setMsg] = useState(null);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (Array.isArray(data)) setLocations(data);
    } catch (err) {
      console.error("Failed to load work locations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const isSuperAdmin = activeUser?.role === 'SUPER_ADMIN';

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = (loc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (loc.branch_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (loc.city || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === 'ACTIVE') return matchesSearch && loc.active !== false;
    if (statusFilter === 'INACTIVE') return matchesSearch && loc.active === false;
    return matchesSearch;
  });

  const activeCount = locations.filter(l => l.active !== false).length;
  const inactiveCount = locations.filter(l => l.active === false).length;
  const totalEmployeesAssigned = locations.reduce((sum, l) => sum + (l.user_count || 0), 0);

  const handleToggleStatus = async (loc) => {
    if (!isSuperAdmin) {
      alert("Access Denied: Only Super Admin can enable or disable work locations.");
      return;
    }
    const newActiveState = !loc.active;
    try {
      const res = await fetch(`/api/locations/${loc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: newActiveState,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: `Location "${loc.name}" is now ${newActiveState ? 'Active' : 'Inactive'}.` });
        fetchLocations();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Server error updating status.' });
    }
  };

  const handleDeleteLocation = async (loc) => {
    if (!isSuperAdmin) {
      alert("Access Denied: Only Super Admin can delete work locations.");
      return;
    }

    if (loc.user_count > 0) {
      alert(`CANNOT DELETE: ${loc.user_count} employee(s) are currently assigned to "${loc.name}". Please reassign them or set status to Inactive instead.`);
      return;
    }

    if (!window.confirm(`CONFIRM DELETION:\n\nAre you sure you want to permanently delete work location "${loc.name}" (${loc.branch_code})?`)) return;

    try {
      const res = await fetch(`/api/locations/${loc.id}?userRole=${activeUser?.role}&actorName=${encodeURIComponent(activeUser?.name || 'Admin')}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message });
        fetchLocations();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to delete work location.' });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Total Work Locations</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-1">{locations.length} Locations</div>
            <span className="text-[10px] text-slate-400">Enterprise Offices</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Active Branches</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{activeCount} Active</div>
            <span className="text-[10px] text-emerald-500">Operational Perimeter</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Inactive Locations</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">{inactiveCount} Inactive</div>
            <span className="text-[10px] text-amber-500">Disabled / Offline</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Assigned Workforce</span>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono mt-1">{totalEmployeesAssigned} Staff</div>
            <span className="text-[10px] text-purple-500">Across All Locations</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-xs font-semibold ${
          msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Control Bar: Search, Filters, & Actions */}
      <div className="glass-card p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by branch name, code, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500"
          />
        </div>

        {/* Status Filter Tabs & View Toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${statusFilter === 'ALL' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              All ({locations.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${statusFilter === 'ACTIVE' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${statusFilter === 'INACTIVE' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-500'}`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`}
              title="Grid Cards View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Add Work Location
            </button>
          )}
        </div>

      </div>

      {/* Locations List Views */}
      {viewMode === 'table' ? (
        <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 font-semibold">
                <th className="py-3 px-3">Branch Code</th>
                <th className="py-3 px-3">Location Name</th>
                <th className="py-3 px-3">Address & City</th>
                <th className="py-3 px-3">Branch Manager</th>
                <th className="py-3 px-3">Assigned Staff</th>
                <th className="py-3 px-3">Active Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredLocations.map((loc) => (
                <tr key={loc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                  <td className="py-3 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{loc.branch_code || 'LOC-MAIN'}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-500" /> {loc.name}
                    </div>
                    <div className="text-[10px] text-slate-500">{loc.time_zone || 'IST (UTC+05:30)'}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    <div className="font-medium">{loc.city || loc.name}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{loc.address || 'Enterprise HQ Facility'}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {loc.manager || 'Rahul Kannan (Founder)'}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Users className="w-3 h-3 inline mr-1 text-cyan-500" />
                      {loc.user_count || 0} Staff
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => handleToggleStatus(loc)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition flex items-center gap-1 ${
                        loc.active !== false
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {loc.active !== false ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5">
                    {isSuperAdmin && (
                      <>
                        <button
                          onClick={() => handleDeleteLocation(loc)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition"
                          title="Delete Location"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((loc) => (
            <div key={loc.id} className="glass-card p-5 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">{loc.branch_code || 'LOC-MAIN'}</span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-cyan-500" /> {loc.name}
                  </h3>
                  <p className="text-xs text-slate-500">{loc.city}, {loc.state || 'India'}</p>
                </div>
                <button
                  onClick={() => handleToggleStatus(loc)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    loc.active !== false
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  }`}
                >
                  {loc.active !== false ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between"><span>Address:</span> <span className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]">{loc.address || 'Main Campus Facility'}</span></div>
                <div className="flex justify-between"><span>Branch Manager:</span> <span className="font-medium text-slate-900 dark:text-white">{loc.manager || 'Rahul Kannan'}</span></div>
                <div className="flex justify-between"><span>Assigned Staff:</span> <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{loc.user_count || 0} Employees</span></div>
                <div className="flex justify-between"><span>Weekly Off:</span> <span className="font-medium text-slate-900 dark:text-white">{loc.weekly_off_pattern || 'Saturday & Sunday'}</span></div>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => handleDeleteLocation(loc)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddLocationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        activeUser={activeUser}
        onLocationSaved={() => {
          fetchLocations();
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
