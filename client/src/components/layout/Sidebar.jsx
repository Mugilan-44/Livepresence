import React from 'react';
import {
  LayoutDashboard, UserRound, CalendarDays, CalendarClock, Users,
  FileCheck2, ReceiptText, Megaphone, BarChart3, ShieldCheck,
  PanelLeftClose, PanelLeftOpen, BriefcaseBusiness, ListChecks, Shield, X, MapPin, Mail
} from 'lucide-react';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Workspace', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'profile', label: 'My profile', icon: UserRound, group: 'Workspace', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'attendance', label: 'Attendance', icon: CalendarDays, group: 'People', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'leaves', label: 'Leave management', icon: CalendarClock, group: 'People', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'employees', label: 'Employees', icon: Users, group: 'People', roles: ['SUPER_ADMIN', 'HR', 'MANAGER'] },
  { id: 'documents', label: 'Documents', icon: FileCheck2, group: 'People', roles: ['SUPER_ADMIN', 'HR'] },
  { id: 'projects', label: 'Projects', icon: BriefcaseBusiness, group: 'Work management', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'worklogs', label: 'Work logs', icon: ListChecks, group: 'Work management', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'payroll', label: 'Payroll', icon: ReceiptText, group: 'Organisation', roles: ['SUPER_ADMIN', 'HR', 'FULL_TIME'] },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, group: 'Organisation', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'reports', label: 'Reports', icon: BarChart3, group: 'Organisation', roles: ['SUPER_ADMIN', 'HR', 'MANAGER'] },
  { id: 'locations', label: 'Work locations', icon: MapPin, group: 'Administration', roles: ['SUPER_ADMIN'] },
  { id: 'email_templates', label: 'Email templates', icon: Mail, group: 'Administration', roles: ['SUPER_ADMIN'] },
  { id: 'audit', label: 'Audit log', icon: ShieldCheck, group: 'Administration', roles: ['SUPER_ADMIN'] }
];




export default function Sidebar({ activeNav, onSelectNav, activeUser, isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) {
  const visibleItems = navigation.filter((item) => item.roles.includes(activeUser?.role));
  const groups = visibleItems.reduce((result, item) => {
    (result[item.group] ||= []).push(item);
    return result;
  }, {});

  const handleNavClick = (id) => {
    onSelectNav(id);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 border-r border-slate-200/80 dark:border-slate-800">
      {/* Sidebar Header */}
      <div className="h-[72px] px-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            <img src="/logo.png" alt="Prolync" className="w-7 h-7 object-contain" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="min-w-0 leading-tight">
              <div className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white font-heading">Prolync</div>
              <div className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">People operations</div>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6" aria-label="Main navigation">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            {(!isCollapsed || isMobileOpen) && (
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.1em] text-slate-400 uppercase">{group}</p>
            )}
            <div className="space-y-1">
              {items.map(({ id, label, icon: Icon }) => {
                const isActive = activeNav === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleNavClick(id)}
                    title={label}
                    className={`nav-item w-full ${isActive ? 'nav-item-active' : ''} ${isCollapsed && !isMobileOpen ? 'justify-center px-2' : ''}`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.25 : 1.8} />
                    {(!isCollapsed || isMobileOpen) && <span className="truncate">{label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle (Desktop only) */}
      {!isMobileOpen && (
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 hidden lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`nav-item w-full text-slate-500 hover:text-slate-900 dark:hover:text-white ${isCollapsed ? 'justify-center px-2' : ''}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <><PanelLeftClose className="w-[18px] h-[18px]" /><span>Collapse</span></>}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, flex on lg screens) */}
      <aside className={`hidden lg:flex flex-col transition-[width] duration-200 shrink-0 ${isCollapsed ? 'w-[72px]' : 'w-[248px]'}`}>
        {navContent}
      </aside>

      {/* Mobile Slide-Over Drawer (only visible when isMobileOpen is true on screens < lg) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          {/* Drawer Sidebar Container */}
          <div className="relative w-[280px] max-w-[80vw] h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
