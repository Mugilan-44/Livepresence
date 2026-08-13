import React, { useEffect, useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Search, UserRound } from 'lucide-react';
import { getApiUrl } from '../../config/api';
import brandLogo from '../../../logo/ae8bdec4f9bcd1ca610caf981d45352b64fdb759642e554e6d334cc6fb0d405f-removebg-preview.png';

export default function Header({ activeUser, onLogout, notificationsList = [], onToggleMobileMenu, onSearchResult, onNavigate }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const unreadNotifications = notificationsList.filter((notification) => !(notification.is_read ?? notification.read));

  useEffect(() => setAvatarFailed(false), [activeUser?.avatar]);
  useEffect(() => {
    if (searchTerm.trim().length < 2) return setSearchResults([]);
    const timer = setTimeout(() => fetch(getApiUrl(`/api/collaboration/search?q=${encodeURIComponent(searchTerm)}`)).then(r => r.json()).then(setSearchResults).catch(() => setSearchResults([])), 180);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const initials = (activeUser?.name || 'U').split(' ').map(part => part[0]).join('').slice(0, 2);
  const closeMenus = () => { setShowNotifications(false); setShowProfileMenu(false); };

  return <header className="sticky top-0 z-40 h-[72px] border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-[#0f172a]/90 sm:px-6 lg:px-8">
    <div className="flex h-full items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onToggleMobileMenu} className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden" title="Open navigation"><Menu className="h-6 w-6" /></button>
        <div className="flex items-center gap-2 lg:hidden"><img src={brandLogo} alt="Prolync LiveSpace" className="h-8 w-8 object-contain" /><span className="font-heading text-base font-bold tracking-tight text-slate-900 dark:text-white">Prolync LiveSpace</span></div>
      </div>

      <div className="relative hidden w-full max-w-[460px] md:block" aria-label="Universal search">
        <label className="relative flex items-center"><Search className="absolute left-3.5 h-4 w-4 text-slate-400" /><input type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search people, work, messages…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 py-0 pl-10 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:focus:border-slate-500 dark:focus:bg-slate-800" /></label>
        {searchResults.length > 0 && <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">{searchResults.map(result => <button key={`${result.type}-${result.id}`} onClick={() => { onSearchResult?.(result); setSearchTerm(''); setSearchResults([]); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"><span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-ink)]">{result.type}</span><span className="min-w-0 truncate text-xs font-semibold">{result.title}</span>{result.subtitle && <span className="ml-auto truncate text-[11px] text-slate-400">{result.subtitle}</span>}</button>)}</div>}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="relative">
          <button type="button" onClick={() => { setShowNotifications(current => !current); setShowProfileMenu(false); }} className="header-icon-button relative" title="Notifications"><Bell className="h-[19px] w-[19px]" />{unreadNotifications.length > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />}</button>
          {showNotifications && <div className="absolute right-0 mt-3 w-[min(94vw,460px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><p className="text-base font-bold text-slate-900 dark:text-white">Notifications</p><p className="mt-0.5 text-xs text-slate-500">Messages, approvals and company updates</p></div><span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent-ink)]">{unreadNotifications.length} unread</span></div><div className="max-h-[470px] overflow-y-auto p-2">{notificationsList.length ? notificationsList.slice(0, 20).map(notification => <div key={notification.id} className="rounded-xl px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800"><p className="text-sm font-bold text-slate-800 dark:text-white">{notification.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{notification.message}</p></div>) : <div className="py-12 text-center text-sm text-slate-500">You are all caught up.</div>}</div></div>}
        </div>

        <div className="relative">
          <button type="button" onClick={() => { setShowProfileMenu(current => !current); setShowNotifications(false); }} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition hover:bg-slate-100 sm:px-2 dark:hover:bg-slate-800" aria-expanded={showProfileMenu}>
            {!activeUser?.avatar || avatarFailed ? <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-ink)]">{initials}</span> : <img src={activeUser.avatar} alt="" onError={() => setAvatarFailed(true)} className="h-9 w-9 rounded-full border border-slate-200 bg-slate-100 object-cover dark:border-slate-700" />}
            <div className="hidden max-w-[140px] leading-tight sm:block"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{activeUser?.name}</p><p className="truncate text-[10px] text-slate-500">{activeUser?.role?.replace('_', ' ')}</p></div><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
          </button>
          {showProfileMenu && <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"><button onClick={() => { onNavigate?.('settings'); closeMenus(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><UserRound className="h-4 w-4" />My profile</button><button onClick={() => { closeMenus(); onLogout?.(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"><LogOut className="h-4 w-4" />Sign out</button></div>}
        </div>
      </div>
    </div>
  </header>;
}
