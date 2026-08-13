import React, { useState } from 'react';
import { Bell, Calendar, PartyPopper, Award, FileText, Megaphone, Plus, Trash2 } from 'lucide-react';
import CreateAnnouncementModal from './CreateAnnouncementModal';

export default function AnnouncementsHub({ announcements, events, onPublishAnnouncement, onDeleteAnnouncement, activeUser }) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canPublish = ['SUPER_ADMIN', 'HR'].includes(activeUser?.role);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Company Hub & Corporate Communications</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Broadcasts, Holiday Calendar, Kudos, Policy Updates & Events</p>
          </div>
        </div>

        {canPublish && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Broadcast Announcement
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Broadcast Announcements Feed */}
        <div className="lg:col-span-2 glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Bell className="w-4 h-4 text-purple-500" /> Corporate Broadcasts ({announcements?.length || 0})
          </h3>

          <div className="space-y-3">
            {announcements?.map((item) => (
              <div key={item.id} className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-heading">{item.title}</span>
                  <div className="flex shrink-0 items-center gap-2"><span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-bold border border-purple-500/30">{item.category}</span>{canPublish && <button type="button" onClick={() => { if (window.confirm(`Delete “${item.title}”?`)) onDeleteAnnouncement?.(item.id); }} title="Delete announcement" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>}</div>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{item.content}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Author: <strong className="text-slate-800 dark:text-slate-200">{item.author}</strong></span>
                  <span className="font-mono">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Events, Birthdays & Holidays */}
        <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Calendar className="w-4 h-4 text-cyan-500" /> Upcoming Holidays & Events
          </h3>

          <div className="space-y-3">
            {events?.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  {ev.type === 'Holiday' ? <Calendar className="w-4 h-4 text-cyan-500" /> :
                   ev.type === 'Anniversary' ? <Award className="w-4 h-4 text-amber-500" /> :
                   <PartyPopper className="w-4 h-4 text-rose-500" />}
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{ev.title}</div>
                    <div className="text-[10px] text-slate-500">{ev.type}</div>
                  </div>
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{ev.event_date || ev.date}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Broadcast Announcement Modal */}
      {showCreateModal && (
        <CreateAnnouncementModal
          onClose={() => setShowCreateModal(false)}
          onPublishAnnouncement={onPublishAnnouncement}
          activeUser={activeUser}
        />
      )}

    </div>
  );
}
