import React, { useState } from 'react';
import { X, Bell, Megaphone, Send } from 'lucide-react';


export default function CreateAnnouncementModal({ onClose, onPublishAnnouncement, activeUser }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Company Policy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      setError('Announcement title and content details are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onPublishAnnouncement({
        title,
        content,
        category,
        authorName: activeUser?.name,
        userRole: activeUser?.role
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to publish announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Publish Corporate Announcement</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Company Hub Broadcast</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Announcement Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 All-Hands Meeting & Annual Appraisal Schedule"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Category / Tag</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="Company Policy">Company Policy</option>
              <option value="Corporate Event">Corporate Event</option>
              <option value="Kudos & Rewards">Kudos & Rewards</option>
              <option value="IT & Infrastructure">IT & Infrastructure</option>
              <option value="Emergency Broadcast">Emergency Broadcast</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Detailed Content *</label>
            <textarea
              rows={4}
              required
              placeholder="Write announcement details..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" /> {loading ? 'Publishing...' : 'Broadcast Announcement'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
