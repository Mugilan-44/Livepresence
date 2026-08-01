import React from 'react';
import { ShieldCheck, X, Check, Minus } from 'lucide-react';

export default function CapabilityMatrixModal({ onClose }) {
  const matrixData = [
    {
      capability: "System Settings & GPS Geofence Centroid",
      superAdmin: true,
      hr: false,
      manager: false,
      fullTime: false,
      intern: false
    },
    {
      capability: "Manage Employees & Payroll Runs",
      superAdmin: true,
      hr: true,
      manager: false,
      fullTime: false,
      intern: false
    },
    {
      capability: "Create Projects & Assign Tasks",
      superAdmin: true,
      hr: false,
      manager: "TEAM ONLY",
      fullTime: false,
      intern: false
    },
    {
      capability: "Approve WFH & Leave Requests",
      superAdmin: true,
      hr: true,
      manager: "TEAM ONLY",
      fullTime: false,
      intern: false
    },
    {
      capability: "Radius Check-In & Task Execution",
      superAdmin: true,
      hr: true,
      manager: true,
      fullTime: true,
      intern: true
    }
  ];

  const renderBadge = (val) => {
    if (val === true) {
      return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"><Check className="w-3 h-3" /> YES</span>;
    }
    if (val === false) {
      return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40"><Minus className="w-3 h-3" /> NO</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">TEAM ONLY</span>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title (Slide 10) */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-heading">5-Role Capability Matrix</h2>
            <p className="text-xs text-slate-400">Governance & Authorization Breakdown across Enterprise Tiers</p>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-300 bg-slate-950/60">
                <th className="py-3 px-4 font-bold text-white">Capability / Module</th>
                <th className="py-3 px-3 text-cyan-400 font-bold">Super Admin</th>
                <th className="py-3 px-3 text-emerald-400 font-bold">HR</th>
                <th className="py-3 px-3 text-purple-400 font-bold">Manager</th>
                <th className="py-3 px-3 text-blue-400 font-bold">Full Time</th>
                <th className="py-3 px-3 text-amber-400 font-bold">Intern</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {matrixData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-slate-200">{row.capability}</td>
                  <td className="py-3 px-3">{renderBadge(row.superAdmin)}</td>
                  <td className="py-3 px-3">{renderBadge(row.hr)}</td>
                  <td className="py-3 px-3">{renderBadge(row.manager)}</td>
                  <td className="py-3 px-3">{renderBadge(row.fullTime)}</td>
                  <td className="py-3 px-3">{renderBadge(row.intern)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20"
          >
            Close Matrix View
          </button>
        </div>

      </div>
    </div>
  );
}
