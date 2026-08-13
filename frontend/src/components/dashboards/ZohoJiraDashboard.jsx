import React, { useState } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Users, UserCheck, AlertTriangle,
  Clock, Award, Cake, Gift, Heart, Send, FileCheck, CheckCircle2, ShieldCheck, MapPin, DollarSign, Settings
} from 'lucide-react';

export default function ZohoJiraDashboard({
  activeUser, statCounts, birthdays, anniversaries, onNavigateTab, onCheckIn, geofence
}) {
  const [currentDate, setCurrentDate] = useState('27-07-2026 | Monday');
  const [quickFilter, setQuickFilter] = useState('Summary');

  const stats = statCounts || {
    all: 404,
    present: 360,
    not_in: 41,
    leave: 3,
    weekoff: 0,
    public_holiday: 0
  };

  const statCards = [
    { title: 'All Staff', count: stats.all, subtitle: 'Total Headcount', bg: 'bg-blue-600', textColor: 'text-blue-400', border: 'border-blue-500/30' },
    { title: 'Present', count: stats.present, subtitle: 'On Duty Today', bg: 'bg-emerald-600', textColor: 'text-emerald-400', border: 'border-emerald-500/30' },
    { title: 'Not in', count: stats.not_in, subtitle: 'Absent / Late', bg: 'bg-rose-600', textColor: 'text-rose-400', border: 'border-rose-500/30' },
    { title: 'Leave', count: stats.leave, subtitle: 'Approved Pass', bg: 'bg-amber-600', textColor: 'text-amber-400', border: 'border-amber-500/30' },
    { title: 'Weekoff', count: stats.weekoff, subtitle: 'Scheduled Off', bg: 'bg-indigo-600', textColor: 'text-indigo-400', border: 'border-indigo-500/30' },
    { title: 'P.Holiday', count: stats.public_holiday, subtitle: 'Public Holiday', bg: 'bg-cyan-600', textColor: 'text-cyan-400', border: 'border-cyan-500/30' },
  ];

  const quickLinks = ['Summary', 'Branch', 'Department', 'Shift', 'Category', 'Designation', 'Muster'];

  const quickActions = [
    { id: 'attendance', label: 'Attendance', icon: MapPin, color: 'bg-emerald-500', tab: 'attendance' },
    { id: 'my_attendance', label: 'My Attendance', icon: Clock, color: 'bg-teal-500', tab: 'attendance' },
    { id: 'employee_detail', label: 'Employee Detail', icon: Users, color: 'bg-amber-500', tab: 'employees' },
    { id: 'my_profile', label: 'My Profile', icon: UserCheck, color: 'bg-orange-500', tab: 'employees' },
    { id: 'request', label: 'Request WFH', icon: Send, color: 'bg-cyan-500', tab: 'leaves' },
    { id: 'my_approvals', label: 'My Approvals', icon: CheckCircle2, color: 'bg-purple-500', tab: 'leaves' },
    { id: 'mark_attendance', label: 'GPS Check-In', icon: ShieldCheck, color: 'bg-rose-500', tab: 'attendance' },
    { id: 'payroll', label: 'Payroll & Salary', icon: DollarSign, color: 'bg-blue-500', tab: 'payroll' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'bg-slate-600', tab: 'attendance' },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Date Switcher Bar */}
      <div className="glass-card p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">
            <Calendar className="w-4 h-4" /> {currentDate}
          </div>
          <button className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Prolync LivePresence:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold">
            Live Synchronized
          </span>
        </div>
      </div>

      {/* 2. 6 Colorful Stat Box Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border ${card.border} bg-white dark:bg-slate-900/90 shadow-sm relative overflow-hidden transition hover:scale-105`}
          >
            <div className={`absolute top-0 right-0 w-12 h-12 ${card.bg} opacity-10 rounded-bl-full`} />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{card.title}</span>
            <div className={`text-2xl font-bold font-mono my-1 ${card.textColor}`}>{card.count}</div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{card.subtitle}</span>
          </div>
        ))}
      </div>

      {/* 3. Quick Links Sub-Navigation Bar */}
      <div className="glass-card p-2 border border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-3 uppercase tracking-wider">Quick Links:</span>
        {quickLinks.map((link) => (
          <button
            key={link}
            onClick={() => setQuickFilter(link)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              quickFilter === link
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {link}
          </button>
        ))}
      </div>

      {/* 4. Quick Action Icon Grid */}
      <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-heading">
          Quick Action Launchpad
        </h3>

        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onNavigateTab(action.tab)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition group"
              >
                <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 text-center leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Birthday's Today & Work Anniversary Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Widget: Birthday's Today & Upcoming */}
        <div className="glass-card p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">Birthday's Today & Upcoming</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
              Celebrations
            </span>
          </div>

          <div className="space-y-3">
            {birthdays?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 transition">
                <div className="flex items-center gap-3">
                  <img src={item.avatar} alt={item.name} className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-[11px] text-rose-500 font-medium">{item.subtitle}</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Widget: Work Anniversary Today & Upcoming */}
        <div className="glass-card p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">Work Anniversary Today & Upcoming</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
              Milestones
            </span>
          </div>

          <div className="space-y-3">
            {anniversaries?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition">
                <div className="flex items-center gap-3">
                  <img src={item.avatar} alt={item.name} className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-[11px] text-amber-500 font-medium">{item.subtitle}</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
