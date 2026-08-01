import React, { useState, useEffect } from 'react';
import { X, UserPlus, Building2, MapPin, Clock, DollarSign, Mail, Phone, Calendar, ShieldCheck, Shield, Plus } from 'lucide-react';
import AddLocationModal from '../admin/AddLocationModal';
import RoleManagementModal from '../admin/RoleManagementModal';

export default function AddEmployeeModal({ onClose, onAddEmployee, activeUser }) {
  const [locationsList, setLocationsList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [showManageRoles, setShowManageRoles] = useState(false);

  const isAdmin = ['SUPER_ADMIN', 'HR'].includes(activeUser?.role);

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

  const handleLocationCreated = (newLoc) => {
    const locName = newLoc?.name || 'New Location';
    setLocationsList(prev => [...prev, newLoc || { id: `loc-${Date.now()}`, name: locName }]);
    setFormData(prev => ({ ...prev, branch: locName }));
    setShowAddLoc(false);
  };


  const [formData, setFormData] = useState({
    employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    email: '',
    role: 'FULL_TIME',
    department: 'Engineering',
    designation: 'Software Engineer',
    branch: 'Chennai HQ',
    shift: 'General (09:00 AM - 06:00 PM)',
    baseSalary: '65000',
    joiningDate: new Date().toISOString().split('T')[0],
    phone: '',
    emergencyContact: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setError('Please provide employee full name.');
      return;
    }

    // Email Validation (Must contain @ and domain)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      setError("Please enter a valid work email address containing '@' (e.g. name@prolync.com).");
      return;
    }

    // Phone Number Validation (Must contain exactly 10 digits 0-9)
    if (formData.phone && formData.phone.length !== 10) {
      setError("Phone number must contain exactly 10 digits (0-9).");
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAddEmployee({
        ...formData,
        employee_id: formData.employeeId,
        userRole: activeUser?.role,
        actorName: activeUser?.name
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to onboard new employee.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Onboard New Employee</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enterprise HR Governance • Complete Profile Registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          
          {/* Row 0: Employee ID */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Employee ID (System Code) *</label>
            <input
              type="text"
              required
              placeholder="e.g. EMP-1006"
              value={formData.employeeId}
              onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-hidden focus:border-cyan-500"
            />
          </div>

          
          {/* Row 1: Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ananya Sharma"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Work Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="ananya@prolync.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Role & Designation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold">System Access Role</label>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowManageRoles(true)}
                    className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add / Edit Roles
                  </button>
                )}
              </div>
              <select
                value={formData.role}
                onChange={e => {
                  if (e.target.value === '__MANAGE_ROLES__') {
                    setShowManageRoles(true);
                  } else {
                    setFormData({ ...formData, role: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-medium"
              >
                {rolesList.length > 0 ? (
                  rolesList.map(r => (
                    <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                  ))
                ) : (
                  <>
                    <option value="FULL_TIME">Full-Time Staff</option>
                    <option value="MANAGER">Project Lead / Manager</option>
                    <option value="HR">HR Administrator</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="INTERN">Intern</option>
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
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Designation</label>
              <input
                type="text"
                placeholder="Senior Full Stack Engineer"
                value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Row 3: Department & Branch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Department</label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance & Operations">Finance & Operations</option>
                <option value="Sales & Marketing">Sales & Marketing</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Branch / Location</label>
              <select
                value={formData.branch}
                onChange={e => {
                  if (e.target.value === '__ADD_NEW_LOCATION__') {
                    setShowAddLoc(true);
                  } else {
                    setFormData({ ...formData, branch: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
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
                    <option value="Hyderabad Campus">Hyderabad Campus</option>
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

          {/* Row 4: Shift & Base Salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Shift Timing</label>
              <select
                value={formData.shift}
                onChange={e => setFormData({ ...formData, shift: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
              >
                <option value="General (09:00 AM - 06:00 PM)">General (09:00 AM - 06:00 PM)</option>
                <option value="Early Shift (07:00 AM - 04:00 PM)">Early Shift (07:00 AM - 04:00 PM)</option>
                <option value="US Shift (06:00 PM - 03:00 AM)">US Shift (06:00 PM - 03:00 AM)</option>
                <option value="Flexible Shift">Flexible Shift</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Monthly Base Salary (₹ INR)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="number"
                  placeholder="65000"
                  value={formData.baseSalary}
                  onChange={e => setFormData({ ...formData, baseSalary: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Joining Date & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number (10 Digits)</label>
              <input
                type="text"
                placeholder="9876543210"
                maxLength={10}
                value={formData.phone}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setFormData({ ...formData, phone: val });
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition flex items-center gap-2"
            >
              {loading ? 'Onboarding...' : 'Complete Employee Onboarding'}
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


