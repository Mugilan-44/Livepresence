import React, { useState, useEffect } from 'react';
import { X, UserPlus, IndianRupee, Mail, Plus } from 'lucide-react';
import AddLocationModal from '../admin/AddLocationModal';
import RoleManagementModal from '../admin/RoleManagementModal';

export default function AddEmployeeModal({ onClose, onAddEmployee, activeUser }) {
  const [locationsList, setLocationsList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
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

  const fetchJobRoles = () => {
    fetch('/api/collaboration/job-roles').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setJobRoles(data);
    }).catch(() => setJobRoles([]));
  };

  useEffect(() => {
    fetch('/api/locations')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLocationsList(data.filter(l => l.active !== false));
      })
      .catch(e => console.error("Failed to load locations", e));

    fetchRolesData();
    fetchJobRoles();
  }, []);

  const addJobRole = async () => {
    const name = window.prompt('New company role (example: UI/UX Designer)');
    if (!name?.trim()) return;
    const res = await fetch('/api/collaboration/job-roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, actorRole: activeUser?.role }) });
    const data = await res.json();
    if (data.role) { setJobRoles(prev => [...prev, data.role].sort((a, b) => a.name.localeCompare(b.name))); setFormData(prev => ({ ...prev, designation: data.role.name })); }
    else setError(data.error || 'Unable to add company role.');
  };

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
    password: '',
    accessLevel: 'EMPLOYEE_ACCESS',
    employmentType: 'EMPLOYEE',
    department: 'Product',
    designation: 'Developer',
    branch: 'Chennai',
    shift: 'General shift (09:00 AM - 07:00 PM)',
    payType: 'PAID',
    internshipMonths: '3',
    baseSalary: '',
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
    if (formData.password.length < 8) {
      setError('Set a temporary password with at least 8 characters. Share it privately with the employee.');
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
        role: formData.employmentType === 'INTERN' ? 'INTERN' : formData.accessLevel === 'FULL_ACCESS' ? 'MANAGER' : 'FULL_TIME',
        baseSalary: formData.payType === 'UNPAID' ? 0 : formData.baseSalary,
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

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Temporary password *</label>
            <input type="password" required minLength="8" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Set the employee's first sign-in password" className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500" />
            <p className="mt-1 text-[11px] text-slate-500">This password is stored securely and is never shown in the platform after creation.</p>
          </div>

          {/* Row 2: Role & Designation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-slate-700 dark:text-slate-300 font-semibold">Access level</label>
              <select
                value={formData.accessLevel}
                onChange={e => setFormData({ ...formData, accessLevel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-medium"
              >
                <option value="EMPLOYEE_ACCESS">Employee access</option>
                <option value="FULL_ACCESS">Full access</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1"><label className="block text-slate-700 dark:text-slate-300 font-semibold">Company role</label>{activeUser?.role === 'SUPER_ADMIN' && <button type="button" onClick={addJobRole} className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">+ Add role</button>}</div>
              <select value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500">
                <option value="">Select company role</option>
                {jobRoles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}
              </select>
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
                <option value="Product">Product</option>
                <option value="Service">Service</option>
                <option value="Product and Service">Product and Service</option>
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
                    <option value="Chennai">Chennai</option>
                  </>
                )}
                {isAdmin && (
                  <>
                    <option disabled className="text-slate-400">────────────────────────</option>
                    <option value="__ADD_NEW_LOCATION__" className="font-bold text-cyan-600 dark:text-cyan-400">
                      + Add branch
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
                <option value="General shift (09:00 AM - 07:00 PM)">General shift (09:00 AM - 07:00 PM)</option>
                <option value="Intern shift (09:00 AM - 05:00 PM)">Intern shift (09:00 AM - 05:00 PM)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Salary</label>
              <select value={formData.payType} onChange={e => setFormData({ ...formData, payType: e.target.value, baseSalary: e.target.value === 'UNPAID' ? '' : formData.baseSalary })} className="mb-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option></select>
              {formData.payType === 'PAID' && <>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Monthly salary (₹)</label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="number"
                  placeholder="65000"
                  value={formData.baseSalary}
                  onChange={e => setFormData({ ...formData, baseSalary: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                />
              </div>
              </>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold">Engagement<select value={formData.employmentType} onChange={e => setFormData({ ...formData, employmentType: e.target.value, shift: e.target.value === 'INTERN' ? 'Intern shift (09:00 AM - 05:00 PM)' : formData.shift })} className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"><option value="EMPLOYEE">Employee</option><option value="INTERN">Intern</option></select></label>
            {formData.employmentType === 'INTERN' && <label className="block text-slate-700 dark:text-slate-300 font-semibold">Internship duration<select value={formData.internshipMonths} onChange={e => setFormData({ ...formData, internshipMonths: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"><option value="1">1 month</option><option value="2">2 months</option><option value="3">3 months</option></select></label>}
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
