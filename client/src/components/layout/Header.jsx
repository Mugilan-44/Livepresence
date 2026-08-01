import React, { useState } from 'react';
import { Bell, CheckCircle2, LogOut, Moon, Search, Sun, Menu } from 'lucide-react';

export default function Header({ activeUser, onLogout, theme, onToggleTheme, notificationsList = [], onToggleMobileMenu }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadNotifications = notificationsList.filter((notification) => !notification.read);

  return (
    <header className="sticky top-0 z-40 h-[72px] bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
      <div className="h-full flex items-center justify-between gap-3">
        
        {/* Left Side: Mobile Menu Button & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Open Mobile Navigation Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 lg:hidden">
            <img src="/logo.png" alt="Prolync" className="w-7 h-7 object-contain" />
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight font-heading">Prolync</span>
          </div>
        </div>

        {/* Desktop Search Field */}
        <label className="hidden md:flex relative items-center w-full max-w-[360px]" aria-label="Search">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search employees, leave or documents"
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 pl-10 pr-4 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 transition"
          />
        </label>

        {/* Right Side Tools & User Profile */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={onToggleTheme} className="header-icon-button" title={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          <div className="relative">
            <button type="button" onClick={() => setShowNotifications((current) => !current)} className="header-icon-button relative" title="Notifications">
              <Bell className="w-[18px] h-[18px]" />
              {unreadNotifications.length > 0 && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-[280px] sm:w-[320px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3">
                <div className="flex items-center justify-between px-1 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
                  <span className="text-[11px] text-slate-400">{unreadNotifications.length} unread</span>
                </div>
                <div className="py-4 text-center text-xs text-slate-500">
                  {notificationsList.length ? 'Your latest updates are shown here.' : 'You are all caught up.'}
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2.5 pl-2">
            <img src={activeUser?.avatar} alt="" className="w-9 h-9 rounded-full object-cover bg-slate-100 border border-slate-200 dark:border-slate-700" />
            <div className="leading-tight max-w-[120px]">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{activeUser?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{activeUser?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <button type="button" onClick={onLogout} className="header-icon-button text-slate-500 hover:text-rose-600 dark:hover:text-rose-400" title="Sign out">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
