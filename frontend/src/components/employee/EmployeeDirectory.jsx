import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Eye, Building2, MapPin, Grid, List, GitFork, ShieldCheck, Settings, Plus, Edit3, Shield, Trash2 } from 'lucide-react';

import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeLocationModal from './EditEmployeeLocationModal';
import AddLocationModal from '../admin/AddLocationModal';
import RoleManagementModal from '../admin/RoleManagementModal';
import { calculateDynamicProfileScore } from '../../config/api';

export default function EmployeeDirectory({ employees, onSelectEmployee, onAddEmployee, activeUser, documents = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // Default: Cards view ('grid')
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showRoleManagementModal, setShowRoleManagementModal] = useState(false);
  const [editLocationEmp, setEditLocationEmp] = useState(null);

  const [branchesList, setBranchesList] = useState([
    'Chennai HQ',
    'Bengaluru Tech Park',
    'Hyderabad Campus',
    'Remote Workforce'
  ]);

  useEffect(() => {
    fetch('/api/locations')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const locNames = data.filter(l => l.active !== false).map(l => l.name);
          setBranchesList(prev => Array.from(new Set([...prev, ...locNames])));
        }
      })
      .catch(e => console.error("Failed to fetch locations", e));
  }, []);

  const isAdmin = ['SUPER_ADMIN', 'HR'].includes(activeUser?.role);
  const canAddEmployee = isAdmin;
  const isSuperAdmin = activeUser?.role === 'SUPER_ADMIN';

  const [removingId, setRemovingId] = useState(null);

  const handleRemoveEmployee = async (emp) => {
    const confirmed = window.confirm(
      `PERMANENT REMOVAL CONFIRMATION\n\nYou are about to permanently remove employee:\n\n  Name: ${emp.name}\n  ID: ${emp.employee_id}\n  Department: ${emp.department}\n\nThis action CANNOT be undone. All associated data will be archived in the audit log.\n\nDo you want to proceed?`
    );
    if (!confirmed) return;

    setRemovingId(emp.id);
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (onAddEmployee) onAddEmployee(null); // trigger re-fetch in parent
      } else {
        alert(`Error: ${data.error || 'Failed to remove employee.'}`);
      }
    } catch (err) {
      alert('Server connection error. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleLocationCreated = (newLoc) => {
    const locName = newLoc?.name || 'New Work Location';
    setBranchesList(prev => Array.from(new Set([...prev, locName])));
    setBranchFilter(locName);
    setShowAddLocationModal(false);
  };

  const filtered = employees?.filter(emp => {
    const matchesSearch = (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (emp.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (emp.designation || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = departmentFilter === 'All' || emp.department === departmentFilter;
    const matchesBranch = branchFilter === 'All' || emp.branch === branchFilter;
    
    return matchesSearch && matchesDept && matchesBranch;
  }) || [];


  return (
    <div className="space-y-4 select-none">
      
      {/* Top Banner & Action Controls */}
      <div className="glass-card p-4 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">Employee Directory</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                {filtered?.length || 0} Staff Members
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Centralized Enterprise Directory &amp; Roles</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition ${
                  viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                <List className="w-3.5 h-3.5" /> Table
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition ${
                  viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> Cards
              </button>
              <button
                onClick={() => setViewMode('hierarchy')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition ${
                  viewMode === 'hierarchy' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" /> Org Chart
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowRoleManagementModal(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
              >
                <Shield className="w-3.5 h-3.5 text-cyan-500" /> Manage Roles
              </button>
            )}

            {canAddEmployee && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs flex items-center gap-1.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Employee
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, ID, designation..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-cyan-500"
          >
            <option value="All">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product & Design">Product & Design</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Finance & Operations">Finance & Operations</option>
          </select>

          <select
            value={branchFilter}
            onChange={(e) => {
              if (e.target.value === '__ADD_NEW_LOCATION__') {
                setShowAddLocationModal(true);
              } else {
                setBranchFilter(e.target.value);
              }
            }}
            className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-cyan-500 font-medium"
          >
            <option value="All">All Office Branches</option>
            {branchesList.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
            {isAdmin && (
              <>
                <option disabled className="text-slate-400 dark:text-slate-600">────────────────────────</option>
                <option value="__ADD_NEW_LOCATION__" className="font-bold text-cyan-600 dark:text-cyan-400">
                  + Add New Work Location
                </option>
              </>
            )}
          </select>

        </div>
      </div>

      {/* Directory Content Views */}
      {viewMode === 'table' && (
        <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60">
                <th className="py-3 px-3">Emp ID</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Department & Branch</th>
                <th className="py-3 px-3">Role & Shift</th>
                <th className="py-3 px-3">Profile Verification</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                  <td className="py-3 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{emp.employee_id}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{emp.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-800 dark:text-slate-200 font-medium">{emp.department}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-cyan-500" /> {emp.branch || 'Chennai HQ'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                      {emp.role}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">{emp.shift_timing || 'General Shift'}</div>
                  </td>
                  <td className="py-3 px-3">
                    {(() => {
                      const dynamicScore = calculateDynamicProfileScore(emp, documents);
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${dynamicScore === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${dynamicScore}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">{dynamicScore}%</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAdmin && (
                        <button
                          onClick={() => setEditLocationEmp(emp)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs inline-flex items-center gap-1.5 transition"
                          title="Edit Employee Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Details
                        </button>
                      )}
                      <button
                        onClick={() => onSelectEmployee(emp)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Full Profile
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleRemoveEmployee(emp)}
                          disabled={removingId === emp.id}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white inline-flex items-center gap-1.5 transition disabled:opacity-60"
                          title="Remove Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {removingId === emp.id ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div key={emp.id} className="glass-card p-5 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{emp.name}</h3>
                    <p className="text-xs text-slate-500">{emp.designation}</p>
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">{emp.employee_id}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between"><span>Department:</span> <span className="font-medium text-slate-900 dark:text-white">{emp.department}</span></div>
                <div className="flex justify-between"><span>Location:</span> <span className="font-medium text-slate-900 dark:text-white">{emp.branch || 'Chennai HQ'}</span></div>
                <div className="flex justify-between"><span>Role:</span> <span className="font-mono text-slate-900 dark:text-white font-bold">{emp.role}</span></div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {isAdmin && (
                  <button
                    onClick={() => setEditLocationEmp(emp)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button
                  onClick={() => onSelectEmployee(emp)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5" /> Profile
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleRemoveEmployee(emp)}
                    disabled={removingId === emp.id}
                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center gap-1.5 transition disabled:opacity-60"
                    title="Remove Employee"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

        </div>
      )}

      {viewMode === 'hierarchy' && (
        <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-8 select-none">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">Enterprise Organization Reporting Hierarchy</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">4-Tier Organizational Flow: Executive Leadership ➔ Project Managers ➔ Senior Developers ➔ Interns</p>
          </div>

          <div className="flex flex-col items-center space-y-8">
            
            {/* Level 1: Super Admin / Executive Leadership */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                Level 1 • Executive Leadership
              </span>
              {filtered.filter(e => e.role === 'SUPER_ADMIN').map(ceo => (
                <div key={ceo.id} className="p-4 rounded-2xl bg-cyan-500/10 border-2 border-cyan-500/40 text-center max-w-sm w-full shadow-lg transition hover:scale-105">
                  <img src={ceo.avatar} alt={ceo.name} className="w-14 h-14 rounded-full mx-auto object-cover border-2 border-cyan-500 mb-2 shadow-md" />
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{ceo.name}</div>
                  <div className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">{ceo.title || 'CEO & Executive Lead'}</div>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-600 text-white shadow-2xs">
                    Super Admin
                  </span>
                </div>
              ))}
            </div>

            {/* Connecting Line Level 1 -> 2 */}
            <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-500 to-purple-500" />

            {/* Level 2: Project Managers & HR Leads */}
            <div className="w-full space-y-2">
              <div className="text-center">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                  Level 2 • Project Managers & HR Leads
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-4 w-full">
                {filtered.filter(e => e.role === 'MANAGER' || e.role === 'HR').map(mgr => (
                  <div key={mgr.id} className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-purple-500/30 text-center shadow-sm hover:border-purple-500 transition w-full sm:w-[280px]">
                    <img src={mgr.avatar} alt={mgr.name} className="w-11 h-11 rounded-full mx-auto object-cover mb-2 border border-purple-500/40" />
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{mgr.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{mgr.designation}</div>
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                      {mgr.role === 'MANAGER' ? 'Project Manager' : 'HR Controller'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Connecting Line Level 2 -> 3 */}
            <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500 to-blue-500" />

            {/* Level 3: Senior Developers & Full-Time Staff */}
            <div className="w-full space-y-2">
              <div className="text-center">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  Level 3 • Senior Developers & Full-Time Staff
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-4 w-full">
                {filtered.filter(e => e.role === 'FULL_TIME').map(dev => (
                  <div key={dev.id} className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-blue-500/30 text-center shadow-sm hover:border-blue-500 transition w-full sm:w-[280px]">
                    <img src={dev.avatar} alt={dev.name} className="w-10 h-10 rounded-full mx-auto object-cover mb-2 border border-blue-500/40" />
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{dev.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{dev.designation}</div>
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                      Senior Developer
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Connecting Line Level 3 -> 4 */}
            <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500 to-cyan-500" />

            {/* Level 4: Interns & Associate Developers */}
            <div className="w-full space-y-2">
              <div className="text-center">
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  Level 4 • Interns & Associate Developers
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-4 w-full">
                {filtered.filter(e => e.role === 'INTERN').map(intern => (
                  <div key={intern.id} className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-cyan-500/30 text-center shadow-sm hover:border-cyan-500 transition w-full sm:w-[280px]">
                    <img src={intern.avatar} alt={intern.name} className="w-10 h-10 rounded-full mx-auto object-cover mb-2 border border-cyan-500/40" />
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{intern.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{intern.designation}</div>
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20">
                      Intern Engineer
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onAddEmployee={onAddEmployee}
          activeUser={activeUser}
        />
      )}

      {/* Admin Add Location Modal */}
      <AddLocationModal
        isOpen={showAddLocationModal}
        onClose={() => setShowAddLocationModal(false)}
        activeUser={activeUser}
        onLocationSaved={handleLocationCreated}
      />

      {/* SuperAdmin Edit Work Location & Onboarding Governance Modal */}
      {editLocationEmp && (
        <EditEmployeeLocationModal
          employee={editLocationEmp}
          activeUser={activeUser}
          onClose={() => setEditLocationEmp(null)}
          onSave={() => {
            setEditLocationEmp(null);
            if (onAddEmployee) {
              onAddEmployee(null); // Triggers re-fetch of /api/employees without posting a duplicate record
            }
          }}

        />
      )}



      {/* System Roles Management Modal */}
      <RoleManagementModal
        isOpen={showRoleManagementModal}
        onClose={() => setShowRoleManagementModal(false)}
        activeUser={activeUser}
      />
    </div>
  );
}



