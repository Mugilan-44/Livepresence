import React, { useState } from 'react';
import { Send, Clock, User, Filter, MessageSquare, CheckCircle2, ThumbsUp, Sparkles, MapPin, Briefcase } from 'lucide-react';

export default function DailyWorkLogForm({ activeUser, onSubmitLog, logs = [], users = [], projects = [], attendanceLogs = [] }) {
  const [updateMessage, setUpdateMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(projects?.[0]?.id || 'proj-1');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msgStatus, setMsgStatus] = useState(null);
  const [likedLogs, setLikedLogs] = useState({});

  // Find active user's attendance check-in session for today
  const todayStr = new Date().toISOString().split('T')[0];
  const myTodayAttendance = (attendanceLogs || []).find(l =>
    l.user_id === activeUser?.id &&
    (l.check_in || '').startsWith(todayStr)
  );

  // Format check-in time and elapsed duration
  let checkInDisplay = 'Not checked in today';
  if (myTodayAttendance?.check_in) {
    const timeStr = new Date(myTodayAttendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    checkInDisplay = `Checked in at ${timeStr} (${myTodayAttendance.status || 'Present'})`;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!updateMessage.trim()) return;

    setIsSubmitting(true);
    setMsgStatus(null);

    const selectedProj = projects?.find(p => p.id === selectedProjectId) || projects?.[0];

    try {
      await onSubmitLog({
        userId: activeUser?.id,
        userName: activeUser?.name,
        completedWork: updateMessage.trim(),
        summary: updateMessage.trim(),
        projectId: selectedProj?.id || 'proj-1',
        projectTitle: selectedProj?.title || 'Main Project',
        hoursLogged: 8.0,
        checkInTime: myTodayAttendance?.check_in || new Date().toISOString(),
        date: todayStr
      });
      setUpdateMessage('');
      setMsgStatus({ type: 'success', text: 'Work update posted to Timesheet Chat!' });
      setTimeout(() => setMsgStatus(null), 3000);
    } catch (err) {
      setMsgStatus({ type: 'error', text: 'Failed to post update.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = (logId) => {
    setLikedLogs(prev => ({ ...prev, [logId]: !prev[logId] }));
  };

  const filteredLogs = selectedPersonFilter === 'ALL'
    ? logs
    : logs?.filter(l => l.user_id === selectedPersonFilter || l.userId === selectedPersonFilter);

  return (
    <div className="space-y-6 select-none">
      
      {/* Top Banner: Check-In Intake & Standup Header */}
      <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Timesheet & Standup Chat</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold font-mono">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Type your daily work updates below. Check-in timestamps and hours are automatically attached to your messages.
            </p>
          </div>
        </div>

        {/* Automatic Attendance Intake Badge */}
        <div className="bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-2xs shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Today's Check-in Intake</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">{checkInDisplay}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Chat Input & Right Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Chat Input Card */}
        <div className="glass-card p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" /> Post Work Update
            </h3>
            <span className="text-[10px] font-mono text-slate-400">{activeUser?.name}</span>
          </div>

          {msgStatus && (
            <div className={`p-3 rounded-xl text-xs font-semibold ${msgStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}>
              {msgStatus.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">What are you working on today? *</label>
              <textarea
                value={updateMessage}
                onChange={e => setUpdateMessage(e.target.value)}
                placeholder="Type your daily work update (e.g. Morning V1 release, Evening V2 module)..."
                rows={5}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-cyan-500 resize-none"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-800 dark:text-cyan-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-cyan-500 mt-0.5" />
              <span>Your attendance check-in timestamp and profile info will be automatically attached to this update.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !updateMessage.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Posting Update...' : 'Post Update to Timesheet'}
            </button>

          </form>
        </div>

        {/* Right Column: Timesheet Chat Stream */}
        <div className="lg:col-span-2 glass-card p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Team Standup Updates Stream ({filteredLogs?.length || 0})
              </h3>
            </div>

            {/* Filter by Team Member */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedPersonFilter}
                onChange={e => setSelectedPersonFilter(e.target.value)}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="ALL">All Team Members</option>
                {users?.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Chat Messages List */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {(!filteredLogs || filteredLogs.length === 0) ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                <p>No work updates posted yet today.</p>
                <p className="text-[11px] text-slate-500">Be the first to post your standup update on the left!</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const author = users?.find(u => u.id === (log.user_id || log.userId)) || { name: log.user_name || log.userName || 'Team Member', role: 'Staff' };
                const isLiked = likedLogs[log.id];

                const messageText = log.completed_work || log.completedWork || log.summary || log.text || 'Daily work update submitted.';
                const projectTitle = log.project_title || log.projectTitle || 'Main Project';
                const logTime = log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';

                return (
                  <div key={log.id || Math.random()} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3 hover:border-cyan-500/30 transition">
                    
                    {/* Author & Intake Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={author.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                          alt={author.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white font-heading">{author.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                              {author.role?.replace('_', ' ') || 'Team'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-cyan-500" /> {logTime} &bull; <Briefcase className="w-3 h-3 text-purple-500" /> {projectTitle}
                          </span>
                        </div>
                      </div>

                      {/* Check-In Intake Badge attached to log */}
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold font-mono shrink-0">
                        ⚡ Checked In
                      </span>
                    </div>

                    {/* Chat Message Content */}
                    <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium bg-white dark:bg-[#0b101d] p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      {messageText}
                    </div>

                    {/* Reactions & Actions */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <button
                        onClick={() => toggleLike(log.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${isLiked ? 'bg-cyan-500/10 text-cyan-600 font-bold' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500'}`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-cyan-500 text-cyan-500' : ''}`} />
                        {isLiked ? 'Acknowledged' : 'Acknowledge'}
                      </button>

                      <span className="text-[10px] text-slate-400 font-mono">
                        Verified Standup Entry
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
