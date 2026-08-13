import React, { useState } from 'react';
import { X, DollarSign, Calculator, CheckCircle2 } from 'lucide-react';

export default function ProcessPayrollModal({ onClose, onProcessPayroll, employees, activeUser }) {
  const [selectedUserId, setSelectedUserId] = useState(employees[0]?.id || '');
  const [monthYear, setMonthYear] = useState('July 2026');
  const [grossSalary, setGrossSalary] = useState('75000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedEmployee = employees.find(u => u.id === selectedUserId) || employees[0];

  const gross = parseInt(grossSalary || 65000, 10);
  const basic = Math.round(gross * 0.5);
  const hra = Math.round(gross * 0.25);
  const special = gross - basic - hra;
  const pf = Math.round(basic * 0.12);
  const esi = Math.round(gross * 0.0075);
  const tax = Math.round(gross * 0.05);
  const net = gross - pf - esi - tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select an employee.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onProcessPayroll({
        userId: selectedUserId,
        monthYear,
        grossSalary: gross,
        userRole: activeUser?.role,
        actorName: activeUser?.name
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to process payroll.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Process Monthly Payroll</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Salary Component Calculation & Net Pay Generation (INR ₹)</p>
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
          
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Select Employee</label>
            <select
              value={selectedUserId}
              onChange={e => {
                const uId = e.target.value;
                setSelectedUserId(uId);
                const emp = employees.find(x => x.id === uId);
                if (emp) setGrossSalary(emp.base_salary || 65000);
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.designation} - {emp.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Month / Year Cycle</label>
              <input
                type="text"
                value={monthYear}
                onChange={e => setMonthYear(e.target.value)}
                placeholder="July 2026"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Gross Salary (₹)</label>
              <input
                type="number"
                value={grossSalary}
                onChange={e => setGrossSalary(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Automatic Calculation Preview */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="flex items-center gap-1.5"><Calculator className="w-4 h-4 text-emerald-500" /> Automated Earnings & Statutory Tax Rules</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Basic Salary (50%):</span> <span className="font-mono text-slate-800 dark:text-slate-200">₹{basic.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Provident Fund (12%):</span> <span className="font-mono text-rose-500">₹{pf.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>HRA Allowance (25%):</span> <span className="font-mono text-slate-800 dark:text-slate-200">₹{hra.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>ESI Contribution (0.75%):</span> <span className="font-mono text-rose-500">₹{esi.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Special Allowance:</span> <span className="font-mono text-slate-800 dark:text-slate-200">₹{special.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Income Tax TDS (5%):</span> <span className="font-mono text-rose-500">₹{tax.toLocaleString('en-IN')}</span></div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-900 dark:text-white">Estimated Net Payable:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">₹{net.toLocaleString('en-IN')}</span>
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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center gap-2"
            >
              {loading ? 'Processing...' : 'Run Payroll & Issue Payslip'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
