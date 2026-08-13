import React from 'react';
import { Shield, ShieldAlert, Clock, UserCheck, Key, Lock } from 'lucide-react';

export default function AuditLogsTable({ logs }) {
  return (
    <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
            Security Audit Logs &amp; Compliance Stream
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Section 21 &amp; 22: Immutable Transaction Log, RBAC Auth &amp; Session Auditing
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-900/80 font-bold">
              <th className="py-3 px-3">Timestamp</th>
              <th className="py-3 px-3">Actor / User</th>
              <th className="py-3 px-3">Security Action</th>
              <th className="py-3 px-3">Target Scope</th>
              <th className="py-3 px-3">Transaction Details</th>
              <th className="py-3 px-3">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {logs?.map((item, index) => (
              <tr key={`${item.id}-${item.timestamp}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-mono font-medium">
                  {new Date(item.timestamp).toLocaleString()}
                </td>
                <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">{item.actor}</td>
                <td className="py-3.5 px-3">
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 font-bold text-[11px] inline-block">
                    {item.action}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-slate-900 dark:text-slate-100 font-semibold">{item.target}</td>
                <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{item.details}</td>
                <td className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px] font-bold">{item.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
