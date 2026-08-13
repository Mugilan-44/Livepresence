import React from 'react';
import {
  LayoutDashboard, CalendarDays, CalendarClock, UsersRound, Megaphone,
  PanelLeftClose, PanelLeftOpen, BriefcaseBusiness, ListChecks, X, MessagesSquare, AtSign, CalendarRange, Settings, Mail
} from 'lucide-react';
import brandLogo from '../../../logo/ae8bdec4f9bcd1ca610caf981d45352b64fdb759642e554e6d334cc6fb0d405f-removebg-preview.png';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Workspace', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'attendance', label: 'Presence', icon: CalendarDays, group: 'Workspace', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'leaves', label: 'Leave management', icon: CalendarClock, group: 'Workspace', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'team', label: 'Channels', icon: MessagesSquare, group: 'Teamspace', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'mentions', label: 'Mentions', icon: AtSign, group: 'Teamspace', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'calendar', label: 'Team calendar', icon: CalendarRange, group: 'Calendar', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'projects', label: 'Projects', icon: BriefcaseBusiness, group: 'Work and operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'daily_tasks', label: 'Daily tasks', icon: ListChecks, group: 'Work and operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'worklogs', label: 'Daily logs', icon: ListChecks, group: 'Work and operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'payroll', label: 'People', icon: UsersRound, group: 'Organization', roles: ['SUPER_ADMIN'] },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, group: 'Organization', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Settings', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'] },
  { id: 'hostinger_mail', label: 'Hostinger mail', icon: Mail, group: 'Settings', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], external: true }
];




export default function Sidebar({ activeNav, onSelectNav, activeUser, isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile, counts = {} }) {
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
          <div className="w-9 h-9 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={brandLogo} alt="Prolync LiveSpace" className="w-9 h-9 object-contain" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="min-w-0 leading-tight">
              <div className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white font-heading">Prolync LiveSpace</div>
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
              {items.map(({ id, label, icon: Icon, external }) => {
                const isActive = activeNav === id;
                if (external) return (
                  <a
                    key={id}
                    href="https://mail.hostinger.com/"
                    target="_blank"
                    rel="noreferrer"
                    title="Open Hostinger Mail"
                    className={`nav-item w-full ${isCollapsed && !isMobileOpen ? 'justify-center px-2' : ''}`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                    {(!isCollapsed || isMobileOpen) && <span className="truncate">{label}</span>}
                  </a>
                );
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleNavClick(id)}
                    title={label}
                    className={`nav-item w-full ${isActive ? 'nav-item-active' : ''} ${isCollapsed && !isMobileOpen ? 'justify-center px-2' : ''}`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.25 : 1.8} />
                    {(!isCollapsed || isMobileOpen) && <><span className="truncate">{label}</span>{counts[id] > 0 && <span className="ml-auto min-w-5 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-center text-[10px] font-bold text-[var(--accent-ink)]">{counts[id]}</span>}</>}
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
