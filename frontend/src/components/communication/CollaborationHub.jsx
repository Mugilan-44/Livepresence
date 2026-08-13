import React, { useEffect, useMemo, useState } from 'react';
import { AtSign, ChevronDown, Hash, Info, MessageCircle, MoreHorizontal, Paperclip, Plus, Search, Send, Smile, Trash2, UserPlus, UsersRound, X } from 'lucide-react';
import { getApiUrl } from '../../config/api';

const reactionOptions = ['👍', '❤️', '😂', '🎉'];
const legacyReactionEmoji = { Like: '👍', Thanks: '❤️', Noted: '👍', Celebrate: '🎉' };

async function jsonRequest(path, options) {
  const response = await fetch(getApiUrl(path), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

const displayName = (name) => typeof name === 'string' && name.trim() ? name.trim() : 'Unnamed teammate';
const initials = (name) => displayName(name).split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'UT';
const isDirect = (channel) => channel?.type === 'dm' || channel?.name?.startsWith('dm-');

function Avatar({ name, src, className = 'h-9 w-9' }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className={`${className} shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700`} />;
  return <span className={`${className} inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--accent-ink)]`}>{initials(name)}</span>;
}

export default function CollaborationHub({ activeUser, users = [], initialView = 'team' }) {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [channelMembers, setChannelMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [directQuery, setDirectQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [view, setView] = useState(initialView === 'mentions' ? 'mentions' : 'team');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const companyPeople = useMemo(() => users.filter((user) => user.id !== activeUser?.id && user.employment_status !== 'Inactive'), [users, activeUser?.id]);
  const filteredPeople = useMemo(() => companyPeople.filter((person) => displayName(person.name).toLowerCase().includes(directQuery.toLowerCase())), [companyPeople, directQuery]);
  const publicChannels = useMemo(() => channels.filter((channel) => !isDirect(channel)), [channels]);
  const suggestions = useMemo(() => companyPeople.filter((person) => message.includes('@') && displayName(person.name).toLowerCase().includes(message.split('@').pop().toLowerCase())).slice(0, 5), [companyPeople, message]);
  const shownMessages = view === 'mentions' ? mentions : messages;
  const activeTitle = view === 'mentions' ? 'Mentions' : isDirect(activeChannel) ? activeChannel.description : activeChannel?.name || 'Choose a channel';
  const activeDescription = view === 'mentions' ? 'Every message where a teammate used your @name.' : activeChannel?.description || 'Choose or create a channel to start talking.';
  const canManageChannel = Boolean(activeChannel && !isDirect(activeChannel) && (activeUser?.role === 'SUPER_ADMIN' || activeChannel.created_by === activeUser?.id));
  const availablePeople = useMemo(() => users.filter((user) => user.employment_status !== 'Inactive' && !channelMembers.some((member) => member.id === user.id) && displayName(user.name).toLowerCase().includes(memberQuery.toLowerCase())), [users, channelMembers, memberQuery]);

  const refreshChannels = async () => {
    const data = await jsonRequest('/api/collaboration/channels');
    setChannels(data);
    setActiveChannel((current) => current && data.some((channel) => channel.id === current.id)
      ? data.find((channel) => channel.id === current.id)
      : data.find((channel) => !isDirect(channel)) || data[0] || null);
  };
  const refreshMentions = async () => { if (activeUser?.id) setMentions(await jsonRequest(`/api/collaboration/mentions?userId=${encodeURIComponent(activeUser.id)}`)); };
  const loadMessages = async () => { if (activeChannel?.id) setMessages(await jsonRequest(`/api/collaboration/channels/${activeChannel.id}/messages`)); };
  const loadMembers = async () => {
    if (!activeChannel?.id || isDirect(activeChannel)) return setChannelMembers([]);
    const data = await jsonRequest(`/api/collaboration/channels/${activeChannel.id}/members`);
    setChannelMembers(data.members || []);
  };

  useEffect(() => setView(initialView === 'mentions' ? 'mentions' : 'team'), [initialView]);
  useEffect(() => { Promise.all([refreshChannels(), refreshMentions()]).catch((requestError) => setError(requestError.message)); }, [activeUser?.id]);
  useEffect(() => { loadMessages().catch((requestError) => setError(requestError.message)); loadMembers().catch((requestError) => setError(requestError.message)); }, [activeChannel?.id]);
  useEffect(() => {
    const timer = setInterval(() => { loadMessages().catch(() => {}); refreshMentions().catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [activeChannel?.id, activeUser?.id]);

  const createChannel = async (event) => {
    event.preventDefault();
    if (!newChannel.trim()) return;
    try {
      const data = await jsonRequest('/api/collaboration/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newChannel, createdBy: activeUser.id }) });
      setNewChannel(''); setShowCreate(false); await refreshChannels(); setActiveChannel(data.channel); setView('team');
    } catch (requestError) { setError(requestError.message); }
  };
  const openDirectMessage = async (targetUserId) => {
    try {
      const data = await jsonRequest('/api/collaboration/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: activeUser.id, targetUserId }) });
      await refreshChannels(); setActiveChannel(data.channel); setView('team');
    } catch (requestError) { setError(requestError.message); }
  };
  const sendMessage = async (event) => {
    event.preventDefault();
    if (!message.trim() || !activeChannel || sending) return;
    setSending(true); setError('');
    try {
      const data = await jsonRequest(`/api/collaboration/channels/${activeChannel.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderId: activeUser.id, content: message }) });
      setMessages((current) => [...current, data.message]); setMessage(''); refreshMentions().catch(() => {});
    } catch (requestError) { setError(requestError.message); } finally { setSending(false); }
  };
  const react = async (messageId, emoji) => {
    try {
      await jsonRequest(`/api/collaboration/messages/${messageId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: activeUser.id, emoji }) });
      await loadMessages();
    } catch (requestError) { setError(requestError.message); }
  };
  const addMember = async (userId) => {
    try {
      const data = await jsonRequest(`/api/collaboration/channels/${activeChannel.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: activeUser.id, userId }) });
      setChannelMembers(data.members || []);
    } catch (requestError) { setError(requestError.message); }
  };
  const removeMember = async (userId) => {
    try {
      const data = await jsonRequest(`/api/collaboration/channels/${activeChannel.id}/members/${userId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: activeUser.id }) });
      setChannelMembers(data.members || []);
    } catch (requestError) { setError(requestError.message); }
  };
  const deleteChannel = async () => {
    if (!window.confirm(`Delete #${activeChannel?.name}? Messages and member access will be permanently removed.`)) return;
    try {
      await jsonRequest(`/api/collaboration/channels/${activeChannel.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: activeUser.id }) });
      setShowChannelMenu(false); setShowDetails(false); await refreshChannels();
    } catch (requestError) { setError(requestError.message); }
  };
  const chooseMention = (name) => setMessage((current) => current.replace(/@[^@\s]*$/, `@${displayName(name).split(' ')[0]} `));
  const selectChannel = (channel) => { setActiveChannel(channel); setView('team'); setError(''); setShowChannelMenu(false); };

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#101012]">
    <div className={`grid min-h-[calc(100vh-150px)] grid-cols-1 xl:grid-cols-[290px_minmax(0,1fr)] ${showDetails ? '2xl:grid-cols-[290px_minmax(0,1fr)_280px]' : ''}`}>
      <aside className="flex min-h-[640px] flex-col border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#101012] xl:border-b-0 xl:border-r">
        <div className="flex items-center justify-between px-5 pb-4 pt-5"><div><h2 className="text-lg font-bold tracking-tight">Conversations</h2><p className="mt-1 text-xs text-slate-500">Channels and direct messages</p></div><button type="button" onClick={() => setShowCreate(true)} title="Create channel" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)] transition hover:bg-[var(--accent-line)]"><Plus className="h-[18px] w-[18px]" /></button></div>
        <div className="mx-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1 dark:bg-slate-900"><button type="button" onClick={() => setView('team')} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${view === 'team' ? 'bg-white text-[var(--accent-ink)] shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}>Chats</button><button type="button" onClick={() => { setView('mentions'); refreshMentions().catch((requestError) => setError(requestError.message)); }} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${view === 'mentions' ? 'bg-white text-[var(--accent-ink)] shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}>Mentions</button></div>
        <div className="mt-5 flex-1 overflow-y-auto px-4 pb-5"><div className="mb-2 flex items-center justify-between px-2"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Channels</p><ChevronDown className="h-3.5 w-3.5 text-slate-400" /></div><div className="space-y-0.5">{publicChannels.map((channel) => <button key={channel.id} type="button" onClick={() => selectChannel(channel)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${activeChannel?.id === channel.id && view === 'team' ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'}`}><Hash className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{channel.name}</span></button>)}{!publicChannels.length && <p className="px-3 py-2 text-xs text-slate-500">No channels yet.</p>}</div><button type="button" onClick={() => setShowCreate(true)} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"><Plus className="h-3.5 w-3.5" />Create channel</button>
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800"><p className="px-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Direct messages</p><div className="relative mt-3"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={directQuery} onChange={(event) => setDirectQuery(event.target.value)} placeholder="Search people…" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none transition focus:border-[var(--accent-line)] dark:border-slate-700 dark:bg-slate-900" /></div><div className="mt-3 space-y-0.5">{filteredPeople.map((user) => <button key={user.id} type="button" onClick={() => openDirectMessage(user.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"><Avatar name={user.name} src={user.avatar} className="h-7 w-7" /><span className="truncate">{user.name}</span></button>)}{!filteredPeople.length && <p className="px-2 py-2 text-xs text-slate-500">No team member found.</p>}</div></div></div>
      </aside>

      <section className="flex min-w-0 flex-col bg-white dark:bg-[#101012]"><header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800 sm:px-7"><div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-md bg-[var(--accent-soft)] p-1.5 text-[var(--accent-ink)]">{view === 'mentions' ? <AtSign className="h-4 w-4" /> : <Hash className="h-4 w-4" />}</span><h3 className="truncate text-base font-bold">{activeTitle}</h3></div><p className="mt-1 max-w-xl truncate text-xs text-slate-500">{activeDescription}</p></div><div className="flex shrink-0 items-center gap-1.5"><button type="button" onClick={() => setShowDetails((current) => !current)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"><UsersRound className="h-4 w-4" /><span className="hidden sm:inline">People</span></button>{canManageChannel && <div className="relative"><button type="button" onClick={() => setShowChannelMenu((current) => !current)} title="Channel options" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-900"><MoreHorizontal className="h-5 w-5" /></button>{showChannelMenu && <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"><button type="button" onClick={() => { setShowMembers(true); setShowChannelMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><UserPlus className="h-4 w-4 text-[var(--accent-ink)]" />Manage members</button><button type="button" onClick={deleteChannel} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" />Delete channel</button></div>}</div>}</div></header>
        {error && <div className="mx-5 mt-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"><span>{error}</span><button type="button" onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}
        <div className="flex-1 overflow-y-auto px-5 py-7 sm:px-8"><div className="mx-auto max-w-4xl space-y-5">{shownMessages.length ? shownMessages.map((item) => <MessageRow key={item.id} item={item} isOwn={item.sender_id === activeUser?.id} onReact={react} showChannel={view === 'mentions'} />) : <div className="flex flex-col items-center py-28 text-center"><span className="rounded-2xl bg-[var(--accent-soft)] p-4 text-[var(--accent-ink)]"><MessageCircle className="h-6 w-6" /></span><h4 className="mt-4 text-sm font-bold">{view === 'mentions' ? 'No mentions yet' : activeChannel ? 'Start the conversation' : 'Choose a conversation'}</h4><p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">{view === 'mentions' ? 'Messages addressed to your @name will show here.' : activeChannel ? 'Write the first update for your team.' : 'Choose a channel or start a direct message.'}</p></div>}</div></div>
        {view === 'team' && <Composer activeChannel={activeChannel} message={message} setMessage={setMessage} onSubmit={sendMessage} sending={sending} suggestions={suggestions} onChooseMention={chooseMention} />}
      </section>

      {showDetails && <aside className="hidden min-h-[640px] border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#101012] 2xl:block"><div className="flex items-center justify-between"><h4 className="text-sm font-bold">{isDirect(activeChannel) ? 'Conversation info' : 'Channel people'}</h4><button type="button" onClick={() => setShowDetails(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-900"><X className="h-4 w-4" /></button></div><p className="mt-3 text-xs leading-5 text-slate-500">{activeDescription}</p>{!isDirect(activeChannel) && <button type="button" onClick={() => setShowMembers(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"><UsersRound className="h-4 w-4" />View people</button>}<div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">{isDirect(activeChannel) ? 'People' : 'Members'}</p><div className="mt-4 space-y-3">{channelMembers.slice(0, 8).map((person) => <div key={person.id} className="flex items-center gap-2"><Avatar name={person.name} src={person.avatar} className="h-8 w-8" /><div className="min-w-0"><p className="truncate text-xs font-bold">{person.name}</p><p className="truncate text-[10px] text-slate-500">{person.role?.replace('_', ' ')}</p></div></div>)}{!channelMembers.length && <p className="text-xs leading-5 text-slate-500">Member details appear for channels.</p>}</div></div></aside>}
    </div>
    {showCreate && <CreateChannelModal newChannel={newChannel} setNewChannel={setNewChannel} onClose={() => setShowCreate(false)} onSubmit={createChannel} />}
    {showMembers && <MembersModal channel={activeChannel} members={channelMembers} availablePeople={availablePeople} memberQuery={memberQuery} setMemberQuery={setMemberQuery} canManage={canManageChannel} onAdd={addMember} onRemove={removeMember} onClose={() => setShowMembers(false)} />}
  </div>;
}

function Composer({ activeChannel, message, setMessage, onSubmit, sending, suggestions, onChooseMention }) {
  const [showEmoji, setShowEmoji] = useState(false);
  return <form onSubmit={onSubmit} className="relative border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101012] sm:px-8"><div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-[var(--accent-line)] focus-within:ring-2 focus-within:ring-[var(--accent-soft)] dark:border-slate-700 dark:bg-slate-900"><div className="flex items-end gap-2 p-3"><button type="button" disabled title="Attachments will be available through the connected cloud drive" className="mb-1 rounded-lg p-2 text-slate-300 disabled:cursor-not-allowed"><Paperclip className="h-4 w-4" /></button><textarea disabled={!activeChannel} rows={2} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={activeChannel ? `Message ${isDirect(activeChannel) ? 'this conversation' : `#${activeChannel.name}`} — use @name` : 'Choose a conversation first'} className="min-h-[54px] max-h-36 flex-1 resize-y bg-transparent py-1.5 text-sm leading-6 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed" /><div className="relative mb-1"><button type="button" onClick={() => setShowEmoji((current) => !current)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-[var(--accent-ink)] dark:hover:bg-slate-800"><Smile className="h-4 w-4" /></button>{showEmoji && <div className="absolute bottom-11 right-0 flex gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">{reactionOptions.map((emoji) => <button key={emoji} type="button" onClick={() => { setMessage((current) => `${current}${emoji}`); setShowEmoji(false); }} className="rounded-lg p-1.5 text-lg hover:bg-slate-50 dark:hover:bg-slate-800">{emoji}</button>)}</div>}</div><button disabled={!activeChannel || !message.trim() || sending} className="mb-1 inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 text-xs font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /><span className="hidden sm:inline">Send</span></button></div></div>{suggestions.length > 0 && <div className="absolute bottom-[91px] left-4 z-10 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:left-8">{suggestions.map((person) => <button type="button" key={person.id} onClick={() => onChooseMention(person.name)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800"><Avatar name={person.name} src={person.avatar} className="h-6 w-6" /><span className="font-bold">@{displayName(person.name).split(' ')[0]}</span><span className="truncate text-slate-400">{displayName(person.name)}</span></button>)}</div>}</form>;
}

function MessageRow({ item, isOwn, onReact, showChannel }) {
  const [showPicker, setShowPicker] = useState(false);
  const groupedReactions = Object.values((item.reactions || []).reduce((groups, reaction) => { (groups[reaction.emoji] ||= { emoji: reaction.emoji, count: 0 }).count += 1; return groups; }, {}));
  return <article className={`group flex ${isOwn ? 'justify-end' : 'justify-start'}`}><div className={`flex max-w-[82%] gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>{!isOwn && <Avatar name={item.sender_name} src={item.sender_avatar} className="mt-4 h-9 w-9" />}<div className={`min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}><div className={`mb-1 flex flex-wrap items-center gap-2 px-1 text-[11px] ${isOwn ? 'justify-end' : ''}`}>{!isOwn && <span className="font-bold text-slate-700 dark:text-slate-200">{item.sender_name || 'Team member'}</span>}{showChannel && <span className="font-bold text-[var(--accent-ink)]">#{item.channel_name}</span>}<span className="text-slate-400">{new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div><p className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm ${isOwn ? 'rounded-tr-md bg-[var(--accent)] text-white' : 'rounded-tl-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>{item.content}</p><div className={`mt-1.5 flex flex-wrap items-center gap-1 ${isOwn ? 'justify-end' : ''}`}>{groupedReactions.map((reaction) => <button key={reaction.emoji} type="button" onClick={() => onReact(item.id, reaction.emoji)} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] shadow-sm transition hover:border-[var(--accent-line)] dark:border-slate-700 dark:bg-slate-900">{legacyReactionEmoji[reaction.emoji] || reaction.emoji} <span className="text-slate-500">{reaction.count}</span></button>)}<div className="relative opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"><button type="button" onClick={() => setShowPicker((current) => !current)} className="rounded-full border border-slate-200 bg-white p-1 text-slate-400 shadow-sm hover:text-[var(--accent-ink)] dark:border-slate-700 dark:bg-slate-900"><Smile className="h-3.5 w-3.5" /></button>{showPicker && <div className={`absolute bottom-8 z-10 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 ${isOwn ? 'right-0' : 'left-0'}`}>{reactionOptions.map((emoji) => <button key={emoji} type="button" onClick={() => { onReact(item.id, emoji); setShowPicker(false); }} className="rounded-lg p-1 text-base hover:bg-slate-50 dark:hover:bg-slate-800">{emoji}</button>)}</div>}</div></div></div></div></article>;
}

function CreateChannelModal({ newChannel, setNewChannel, onClose, onSubmit }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between"><div><h3 className="text-lg font-bold">Create a channel</h3><p className="mt-1 text-xs text-slate-500">New channels start open to everyone. You can manage members afterwards.</p></div><button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div><label className="mt-6 block text-xs font-bold text-slate-700 dark:text-slate-200">Channel name<input autoFocus value={newChannel} onChange={(event) => setNewChannel(event.target.value)} placeholder="e.g. design-review" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-[var(--accent-line)] focus:bg-white dark:border-slate-700 dark:bg-slate-800" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)]">Create channel</button></div></form></div>;
}

function MembersModal({ channel, members, availablePeople, memberQuery, setMemberQuery, canManage, onAdd, onRemove, onClose }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between border-b border-slate-100 p-6 dark:border-slate-800"><div><h3 className="text-lg font-bold">People in #{channel?.name}</h3><p className="mt-1 text-xs text-slate-500">{canManage ? 'Add or remove people from this channel.' : 'Only the channel creator or founder can change members.'}</p></div><button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div><div className="grid max-h-[70vh] overflow-y-auto md:grid-cols-2"><div className="border-b border-slate-100 p-5 dark:border-slate-800 md:border-b-0 md:border-r"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Current members</p><div className="mt-4 space-y-2">{members.map((person) => <div key={person.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800"><Avatar name={person.name} src={person.avatar} className="h-8 w-8" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{person.name}</p><p className="truncate text-[10px] text-slate-500">{person.role?.replace('_', ' ')}</p></div>{canManage && <button type="button" onClick={() => onRemove(person.id)} title={`Remove ${person.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><X className="h-4 w-4" /></button>}</div>)}{!members.length && <p className="text-xs text-slate-500">No member data yet.</p>}</div></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Add people</p>{canManage ? <><div className="relative mt-3"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="Search company people…" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-[var(--accent-line)] dark:border-slate-700 dark:bg-slate-800" /></div><div className="mt-3 space-y-2">{availablePeople.map((person) => <button key={person.id} type="button" onClick={() => onAdd(person.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-2.5 text-left transition hover:border-[var(--accent-line)] hover:bg-[var(--accent-soft)] dark:border-slate-800"><Avatar name={person.name} src={person.avatar} className="h-8 w-8" /><span className="min-w-0 flex-1 truncate text-xs font-bold">{person.name}</span><UserPlus className="h-4 w-4 text-[var(--accent-ink)]" /></button>)}{!availablePeople.length && <p className="text-xs text-slate-500">Everyone available is already in this channel.</p>}</div></> : <p className="mt-3 text-xs leading-5 text-slate-500">Member controls are available to this channel’s creator and the founder.</p>}</div></div></section></div>;
}
