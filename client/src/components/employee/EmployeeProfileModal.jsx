import React from 'react';
import { X, User, Phone, Mail, MapPin, Calendar, CreditCard, Building, ShieldCheck, HeartPulse, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import { calculateDynamicProfileScore } from '../../config/api';

export default function EmployeeProfileModal({ employee, onClose, activeUser, onEditEmployee, documents = [] }) {
  if (!employee) return null;
  const isAdmin = ['SUPER_ADMIN', 'HR'].includes(activeUser?.role);
  const dynamicScore = calculateDynamicProfileScore(employee, documents);
  const onboarding = {
    percentage: dynamicScore,
    status: dynamicScore === 100 ? 'Onboarding Completed' : 'In Progress',
    completedItems: ['Personal Details Completed', 'Contact Details Completed', 'Address Details Completed', 'Department Assigned', 'Designation Assigned'],
    pendingItems: dynamicScore === 100 ? [] : ['Mandatory Document Verification Pending']
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
          <img
            src={employee.avatar}
            alt={employee.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/50 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white font-heading">{employee.name}</h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {employee.employee_id}
              </span>
            </div>
            <p className="text-xs text-slate-400">{employee.title || employee.designation} • {employee.department}</p>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                onboarding.percentage === 100
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {onboarding.percentage === 100 ? '100% Onboarding Completed' : `Automated Onboarding (${onboarding.percentage}%)`}
              </span>
            </div>
          </div>
        </div>

        {/* Automated Onboarding Progress Bar Widget */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Automated Onboarding Progress ({onboarding.percentage}%)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {onboarding.completedCount || onboarding.completedItems?.length || 0} of {onboarding.totalCount || 20} Mandatory Checks Passed
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                onboarding.percentage === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${onboarding.percentage}%` }}
            />
          </div>

          {/* Pending Mandatory Items List */}
          {onboarding.pendingItems && onboarding.pendingItems.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Pending Mandatory Onboarding Items:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-400">
                {onboarding.pendingItems.slice(0, 6).map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Profile Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Personal Information</span>
            <div className="text-slate-300">Gender: <strong className="text-white">{employee.gender}</strong></div>
            <div className="text-slate-300">Date of Birth: <strong className="text-white">{employee.dob}</strong></div>
            <div className="text-slate-300 flex items-center gap-1">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" /> Blood Group: <strong className="text-white">{employee.blood_group}</strong>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Contact Information</span>
            <div className="text-slate-300 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-cyan-400" /> Mobile: <strong className="text-white font-mono">{employee.mobile || employee.phone}</strong></div>
            <div className="text-slate-300 flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-cyan-400" /> Email: <strong className="text-white">{employee.email}</strong></div>
            <div className="text-slate-300 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-rose-400" /> Emergency: <strong className="text-white font-mono">{employee.emergency_contact}</strong></div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Employment Details</span>
            <div className="text-slate-300">System Role: <strong className="text-cyan-400 font-mono font-bold">{employee.role}</strong></div>
            <div className="text-slate-300">Branch: <strong className="text-white">{employee.branch || employee.office_location}</strong></div>
            <div className="text-slate-300">Joining Date: <strong className="text-white">{employee.joining_date}</strong></div>
            <div className="text-slate-300">Status: <strong className="text-emerald-400">{employee.employment_status}</strong></div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Financial & Bank Details</span>
            <div className="text-slate-300">Monthly Base Salary: <strong className="text-emerald-400 font-mono">₹{employee.salary_base?.toLocaleString('en-IN')}</strong></div>
            <div className="text-slate-300">Bank: <strong className="text-white">{employee.bank_name}</strong></div>
            <div className="text-slate-300">Account No: <strong className="text-white font-mono">{employee.bank_account}</strong></div>
          </div>

        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-500 uppercase font-bold text-[10px]">Residential Address</span>
          <div className="text-slate-200 mt-0.5">{employee.address}</div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          {isAdmin && onEditEmployee && (
            <button
              onClick={() => {
                onClose();
                onEditEmployee(employee);
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Employee Details
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
}
