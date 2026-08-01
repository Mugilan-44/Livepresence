import React, { useState, useEffect } from 'react';
import { X, MapPin, ShieldCheck, UserCheck, Building2, CheckCircle2, Award, DollarSign, User, Mail, Phone, Edit3, Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import AddLocationModal from '../admin/AddLocationModal';
import RoleManagementModal from '../admin/RoleManagementModal';
import { calculateDynamicProfileScore } from '../../config/api';

export default function EditEmployeeLocationModal({ employee, activeUser, onClose, onSave, documents = [] }) {
  const [locationsList, setLocationsList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [showManageRoles, setShowManageRoles] = useState(false);

  const fetchRolesData = () => {
    fetch('/api/roles')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRolesList(data);
      })
      .catch(e => console.error("Failed to load roles", e));
  };

  useEffect(() => {
    fetch('/api/locations')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLocationsList(data.filter(l => l.active !== false));
      })
      .catch(e => console.error("Failed to load locations", e));

    fetchRolesData();
  }, []);


  const [employeeId, setEmployeeId] = useState(employee?.employee_id || '');
  const [name, setName] = useState(employee?.name || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [mobile, setMobile] = useState(employee?.mobile || employee?.phone || '');
  const [branch, setBranch] = useState(employee?.branch || employee?.office_location || 'Chennai HQ');
  const [department, setDepartment] = useState(employee?.department || 'Engineering');
  const [designation, setDesignation] = useState(employee?.designation || employee?.title || 'Software Engineer');
  const [sysRole, setSysRole] = useState(employee?.role || 'FULL_TIME');
  const [empStatus, setEmpStatus] = useState(employee?.employment_status || 'Active');
  const [salary, setSalary] = useState(employee?.salary_base || 65000);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const isAdmin = ['SUPER_ADMIN', 'HR'].includes(activeUser?.role);
  const dynamicScore = calculateDynamicProfileScore(employee, documents);
  const onboardingDetails = {
    percentage: dynamicScore,
    status: dynamicScore === 100 ? 'Onboarding Completed' : 'In Progress',
    completedItems: ['Personal Details', 'Contact Details', 'Joining Date', 'Department Assigned'],
    pendingItems: dynamicScore === 100 ? [] : ['Mandatory Document Verification Pending']
  };

  const handleRoleChange = (newRole) => {
    if (['SUPER_ADMIN', 'HR'].includes(newRole) && !['SUPER_ADMIN', 'HR'].includes(employee?.role)) {
      const confirmed = window.confirm(
        `SECURITY CONFIRMATION REQUIRED:\n\nYou are granting High-Privilege Administrative Rights ("${newRole}") to employee "${name}".\n\nThis will grant access to sensitive employee salary data, system settings, and security controls.\n\nDo you want to proceed?`
      );
      if (!confirmed) return;
    }
    setSysRole(newRole);
  };

  const handleLocationCreated = (newLoc) => {
    const locName = newLoc?.name || 'New Location';
    setLocationsList(prev => [...prev, newLoc || { id: `loc-${Date.now()}`, name: locName }]);
    setBranch(locName);
    setShowAddLoc(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          name,
          email,
          mobile,
          phone: mobile,
          branch,
          office_location: branch,
          department,
          designation,
          title: designation,
          role: sysRole,
          employment_status: empStatus,
          salary_base: parseInt(salary, 10),
          actorName: activeUser?.name || "Admin Controller"
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: 'Employee details & automated onboarding updated!' });
        setTimeout(() => {
          if (typeof onSave === 'function') onSave(data.employee);
          if (typeof onClose === 'function') onClose();
        }, 800);

      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to update employee.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Server connection error.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Edit Employee Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enterprise HR Governance • Updating <strong className="text-slate-900 dark:text-white">{employee.name}</strong> ({employee.employee_id})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-xs font-semibold ${
            msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          }`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Row 1: Employee ID & Full Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cyan-500" /> Employee ID *
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-1005"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-500" /> Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Row 2: Work Email & Contact Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-500" /> Work Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@prolync.com"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-500" /> Contact Phone
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98402 00000"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Row 3: Dynamic System Role & Designation (Displayed Separately) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-500" /> Dynamic System Role (RBAC) *
                </label>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowManageRoles(true)}
                    className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    + Add / Edit Roles
                  </button>
                )}
              </div>
              <select
                value={sysRole}
                onChange={(e) => {
                  if (e.target.value === '__MANAGE_ROLES__') {
                    setShowManageRoles(true);
                  } else {
                    handleRoleChange(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-cyan-500"
              >
                {rolesList.length > 0 ? (
                  rolesList.map(r => (
                    <option key={r.id || r.code} value={r.code}>
                      {r.name} ({r.code})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="SUPER_ADMIN">Super Admin (Full Governance)</option>
                    <option value="HR">HR Manager (People Operations)</option>
                    <option value="MANAGER">Project Manager (Delivery Lead)</option>
                    <option value="FULL_TIME">Full-Time Staff (Employee)</option>
                    <option value="TEAM_LEAD">Team Lead (Technical Lead)</option>
                    <option value="INTERN">Intern / Trainee</option>
                  </>
                )}
                {isAdmin && (
                  <>
                    <option disabled className="text-slate-400">────────────────────────</option>
                    <option value="__MANAGE_ROLES__" className="font-bold text-cyan-600 dark:text-cyan-400">
                      + Add / Create New System Role
                    </option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-cyan-500" /> Designation / Job Title *
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Full-Stack Developer"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Row 4: Department & Work Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-500" /> Department *
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-500" /> Work Location / Office Branch *
              </label>
              <select
                value={branch}
                onChange={(e) => {
                  if (e.target.value === '__ADD_NEW_LOCATION__') {
                    setShowAddLoc(true);
                  } else {
                    setBranch(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
              >
                {locationsList.length > 0 ? (
                  locationsList.map(loc => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name} ({loc.city || loc.branch_code})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Chennai HQ">Chennai HQ</option>
                    <option value="Bengaluru Tech Park">Bengaluru Tech Park</option>
                    <option value="Remote Workforce">Remote Workforce</option>
                  </>
                )}
                {isAdmin && (
                  <>
                    <option disabled className="text-slate-400">────────────────────────</option>
                    <option value="__ADD_NEW_LOCATION__" className="font-bold text-cyan-600 dark:text-cyan-400">
                      + Add New Work Location
                    </option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Row 5: Base Salary & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Base Monthly Salary (₹)</label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Employment Status</label>
              <select
                value={empStatus}
                onChange={(e) => setEmpStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
              >
                <option value="Active">Active Duty</option>
                <option value="On Leave">On Approved Leave</option>
                <option value="Probation">Probation Period</option>
                <option value="Notice Period">Notice Period</option>
                <option value="Terminated">Terminated / Inactive</option>
              </select>
            </div>
          </div>

          {/* Automated Onboarding Progress Display (NO MANUAL OVERRIDE) */}
          <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Automated Onboarding Completion Progress
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                onboardingDetails.percentage === 100
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
              }`}>
                {onboardingDetails.percentage}% ({onboardingDetails.status})
              </span>
            </div>

            {/* Automated Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  onboardingDetails.percentage === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                }`}
                style={{ width: `${onboardingDetails.percentage}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 italic">
              ℹ️ Onboarding percentage is calculated automatically based on profile completion and verified documents (Aadhaar, PAN, Bank Details, Agreements). Manual editing disabled.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save & Update Employee Details'}
            </button>
          </div>

        </form>

      </div>

      <AddLocationModal
        isOpen={showAddLoc}
        onClose={() => setShowAddLoc(false)}
        activeUser={activeUser}
        onLocationSaved={handleLocationCreated}
      />

      <RoleManagementModal
        isOpen={showManageRoles}
        onClose={() => {
          setShowManageRoles(false);
          fetchRolesData();
        }}
        activeUser={activeUser}
        onRolesUpdated={fetchRolesData}
      />
    </div>
  );
}

