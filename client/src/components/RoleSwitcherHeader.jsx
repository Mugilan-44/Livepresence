import React from 'react';
import { ShieldCheck, UserCheck, LogOut, Code, Layers, Database } from 'lucide-react';

export default function RoleSwitcherHeader({ activeUser, users, onSelectUser, onOpenMatrix, onLogout }) {
  const getTierNumber = (role) => {
    switch (role) {
      case 'SUPER_ADMIN': return '1';
      case 'HR': return '2';
      case 'MANAGER': return '3';
      case 'FULL_TIME': return '4';
      default: return '5';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Suite Subtitle */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Prolync Logo"
            className="w-10 h-10 object-contain drop-shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-heading text-white tracking-wide">
                Prolync <span className="text-cyan-400">LivePresence</span>
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Tier {getTierNumber(activeUser.role)} Authorized
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              5-Tier Role Hierarchy • Geofenced Attendance • WFH Engine • Project Velocity
            </p>
          </div>
        </div>

        {/* Tech Stack Pills (Slide 1) */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="glass-pill flex items-center gap-1.5 text-cyan-300">
            <Code className="w-3.5 h-3.5 text-cyan-400" /> React.js
          </span>
          <span className="glass-pill flex items-center gap-1.5 text-emerald-300">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Node.js / Express
          </span>
          <span className="glass-pill flex items-center gap-1.5 text-amber-300">
            <Database className="w-3.5 h-3.5 text-amber-400" /> MySQL DB
          </span>
        </div>

        {/* Role Switcher Controls & Logout */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={onOpenMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="View 5-Role Capability Matrix"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Capability Matrix</span>
          </button>

          {/* Quick Role Switcher Selector */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5">
            <UserCheck className="w-4 h-4 text-slate-400 ml-1" />
            <select
              value={activeUser.id}
              onChange={(e) => {
                const selected = users.find(u => u.id === e.target.value);
                if (selected) onSelectUser(selected);
              }}
              className="bg-slate-800 text-white text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  Tier {getTierNumber(u.role)}: {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

      </div>
    </header>
  );
}
