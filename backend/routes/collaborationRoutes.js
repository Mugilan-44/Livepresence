import express from 'express';
import { querySQL } from '../db.js';

const router = express.Router();
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function safeRows(sql, params = []) {
  try { return await querySQL(sql, params); } catch { return []; }
}

// MySQL DATETIME values are stored as UTC text. Parse them explicitly as UTC
// so founder reports do not depend on the backend machine's timezone.
const parseStoredUtc = (value) => new Date(`${String(value || '').replace(' ', 'T').replace(/Z$/, '')}Z`);
const indiaParts = (date) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
const indiaDate = (date) => { const part = indiaParts(date); return `${part.year}-${String(part.month).padStart(2, '0')}-${String(part.day).padStart(2, '0')}`; };
const isValidAttendance = (log) => {
  if (!log?.check_out) return true;
  const duration = (parseStoredUtc(log.check_out) - parseStoredUtc(log.check_in)) / 60000;
  return Number.isFinite(duration) && duration >= 0 && duration <= 12 * 60;
};

const isDirectChannel = (channel) => channel?.type === 'dm' || channel?.name?.startsWith('dm-');

async function getChannel(channelId) {
  return (await safeRows('SELECT * FROM channels WHERE id = ? LIMIT 1', [channelId]))[0];
}

async function getActivePeople() {
  return safeRows("SELECT id, name, email, role, avatar FROM users WHERE employment_status IS NULL OR LOWER(employment_status) <> 'inactive' ORDER BY name ASC");
}

async function listedMembers(channel) {
  const members = await safeRows(`SELECT u.id, u.name, u.email, u.role, u.avatar
    FROM channel_members cm JOIN users u ON u.id = cm.user_id
    WHERE cm.channel_id = ? ORDER BY u.name ASC`, [channel.id]);
  // Existing public channels are company-wide until a manager intentionally
  // changes their membership. This preserves today's open-channel behaviour.
  if (!isDirectChannel(channel) && !members.length) return { members: await getActivePeople(), managed: false };
  return { members, managed: true };
}

async function seedManagedMembers(channelId) {
  // Seed legacy public channels only once. Re-seeding on every removal would
  // silently add back everyone who was already removed.
  const existing = await safeRows('SELECT user_id FROM channel_members WHERE channel_id = ? LIMIT 1', [channelId]);
  if (existing.length) return;
  await querySQL(`INSERT IGNORE INTO channel_members (channel_id, user_id)
    SELECT ?, id FROM users WHERE employment_status IS NULL OR LOWER(employment_status) <> 'inactive'`, [channelId]);
}

async function requireChannelManager(channelId, actorId) {
  const channel = await getChannel(channelId);
  if (!channel) throw new Error('This channel no longer exists.');
  if (isDirectChannel(channel)) throw new Error('Direct-message members cannot be changed.');
  const actor = (await safeRows('SELECT id, role FROM users WHERE id = ? LIMIT 1', [actorId]))[0];
  if (!actor) throw new Error('Your account could not be verified.');
  if (actor.role !== 'SUPER_ADMIN' && channel.created_by !== actorId) throw new Error('Only the channel creator or founder can manage this channel.');
  return channel;
}

router.get('/channels', async (_req, res) => {
  let channels = await safeRows('SELECT * FROM channels ORDER BY created_at ASC');
  if (!channels.length) {
    const defaults = [
      ['chn-engineering', 'engineering', 'Build updates, releases and technical decisions.', 'channel'],
      ['chn-company', 'company-updates', 'Announcements and important organisation updates.', 'channel'],
      ['chn-standup', 'daily-standup', 'Short daily progress, blockers and plans.', 'channel']
    ];
    for (const [id, name, description, type] of defaults) await querySQL('INSERT INTO channels (id, name, description, type) VALUES (?, ?, ?, ?)', [id, name, description, type]);
    channels = await safeRows('SELECT * FROM channels ORDER BY created_at ASC');
  }
  res.json(channels);
});

router.post('/channels', async (req, res) => {
  const { name, description = '', type = 'channel', createdBy } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Channel name is required.' });
  const channel = { id: uid('chn'), name: name.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-'), description, type, created_by: createdBy || null };
  try {
    await querySQL('INSERT INTO channels (id, name, description, type, created_by) VALUES (?, ?, ?, ?, ?)', Object.values(channel));
    res.status(201).json({ channel });
  } catch {
    res.status(409).json({ error: 'A channel with that name already exists.' });
  }
});

router.get('/channels/:channelId/members', async (req, res) => {
  const channel = await getChannel(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'This channel no longer exists.' });
  const data = await listedMembers(channel);
  res.json({ channel, ...data });
});

router.post('/channels/:channelId/members', async (req, res) => {
  try {
    const { actorId, userId } = req.body;
    if (!actorId || !userId) return res.status(400).json({ error: 'A channel manager and team member are required.' });
    const channel = await requireChannelManager(req.params.channelId, actorId);
    const person = (await safeRows("SELECT id FROM users WHERE id = ? AND (employment_status IS NULL OR LOWER(employment_status) <> 'inactive') LIMIT 1", [userId]))[0];
    if (!person) return res.status(404).json({ error: 'That active team member was not found.' });
    await seedManagedMembers(channel.id);
    await querySQL('INSERT IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)', [channel.id, userId]);
    res.status(201).json(await listedMembers(channel));
  } catch (error) { res.status(403).json({ error: error.message }); }
});

router.delete('/channels/:channelId/members/:userId', async (req, res) => {
  try {
    const { actorId } = req.body;
    if (!actorId) return res.status(400).json({ error: 'A channel manager is required.' });
    const channel = await requireChannelManager(req.params.channelId, actorId);
    await seedManagedMembers(channel.id);
    const members = await safeRows('SELECT user_id FROM channel_members WHERE channel_id = ?', [channel.id]);
    if (members.length <= 1) return res.status(400).json({ error: 'A channel needs at least one member.' });
    await querySQL('DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?', [channel.id, req.params.userId]);
    res.json(await listedMembers(channel));
  } catch (error) { res.status(403).json({ error: error.message }); }
});

router.delete('/channels/:channelId', async (req, res) => {
  try {
    const { actorId } = req.body;
    if (!actorId) return res.status(400).json({ error: 'A channel manager is required.' });
    const channel = await requireChannelManager(req.params.channelId, actorId);
    await querySQL('DELETE mr FROM message_reactions mr INNER JOIN messages m ON m.id = mr.message_id WHERE m.channel_id = ?', [channel.id]);
    await querySQL('DELETE FROM messages WHERE channel_id = ?', [channel.id]);
    await querySQL('DELETE FROM channel_members WHERE channel_id = ?', [channel.id]);
    await querySQL('DELETE FROM channels WHERE id = ?', [channel.id]);
    res.json({ deleted: true });
  } catch (error) { res.status(403).json({ error: error.message }); }
});

router.post('/dm', async (req, res) => {
  const { userId, targetUserId } = req.body;
  if (!userId || !targetUserId || userId === targetUserId) return res.status(400).json({ error: 'Choose another team member.' });
  const [first, second] = [userId, targetUserId].sort();
  const name = `dm-${first}-${second}`;
  // Find by pair name first: legacy direct messages existed before the type column.
  const existing = await safeRows('SELECT * FROM channels WHERE name = ? LIMIT 1', [name]);
  if (existing[0]) {
    if (existing[0].type !== 'dm') {
      await querySQL('UPDATE channels SET type = ? WHERE id = ?', ['dm', existing[0].id]);
    }
    await querySQL('INSERT IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?), (?, ?)', [existing[0].id, userId, existing[0].id, targetUserId]);
    return res.json({ channel: { ...existing[0], type: 'dm' } });
  }
  const target = (await safeRows('SELECT name FROM users WHERE id = ? LIMIT 1', [targetUserId]))[0];
  const channel = { id: uid('dm'), name, description: `Direct message with ${target?.name || 'team member'}`, type: 'dm', created_by: userId };
  await querySQL('INSERT INTO channels (id, name, description, type, created_by) VALUES (?, ?, ?, ?, ?)', Object.values(channel));
  await querySQL('INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?), (?, ?)', [channel.id, userId, channel.id, targetUserId]);
  res.status(201).json({ channel });
});

router.get('/channels/:channelId/messages', async (req, res) => {
  const messages = await safeRows(`SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
    FROM messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.channel_id = ? ORDER BY m.created_at ASC`, [req.params.channelId]);
  const reactions = await safeRows('SELECT * FROM message_reactions');
  res.json(messages.map(message => ({ ...message, reactions: reactions.filter(reaction => reaction.message_id === message.id) })));
});

router.get('/mentions', async (req, res) => {
  const { userId } = req.query;
  const person = (await safeRows('SELECT id, name FROM users WHERE id = ? LIMIT 1', [userId]))[0];
  if (!person) return res.status(400).json({ error: 'A valid team member is required.' });
  const firstName = person.name.split(/\s|\(/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const messages = await safeRows(`SELECT m.*, c.name AS channel_name, u.name AS sender_name, u.avatar AS sender_avatar
    FROM messages m JOIN channels c ON c.id = m.channel_id LEFT JOIN users u ON u.id = m.sender_id
    WHERE LOWER(m.content) REGEXP ? ORDER BY m.created_at DESC`, [`@${firstName.toLowerCase()}([^a-z0-9_.-]|$)`]);
  const reactions = await safeRows('SELECT * FROM message_reactions');
  res.json(messages.map(message => ({ ...message, reactions: reactions.filter(reaction => reaction.message_id === message.id) })));
});

router.post('/channels/:channelId/messages', async (req, res) => {
  const { senderId, content, parentId = null } = req.body;
  if (!senderId || !content?.trim()) return res.status(400).json({ error: 'A message and sender are required.' });
  const channel = await getChannel(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'This channel no longer exists.' });
  const sender = (await safeRows('SELECT name, avatar FROM users WHERE id = ? LIMIT 1', [senderId]))[0];
  if (!sender) return res.status(404).json({ error: 'Sender account was not found.' });
  const message = { id: uid('msg'), channel_id: req.params.channelId, sender_id: senderId, content: content.trim(), parent_id: parentId };
  try {
    await querySQL('INSERT INTO messages (id, channel_id, sender_id, content, parent_id) VALUES (?, ?, ?, ?, ?)', Object.values(message));
    const people = await safeRows('SELECT id, name FROM users WHERE id <> ?', [senderId]);
    const mentionNames = [...content.matchAll(/@([\w.-]+)/g)].map(match => match[1].toLowerCase());
    const isDirect = isDirectChannel(channel);
    const members = await safeRows('SELECT user_id FROM channel_members WHERE channel_id = ?', [channel.id]);
    const isManagedChannel = !isDirect && members.length > 0;
    if (isManagedChannel && !members.some((member) => member.user_id === senderId)) return res.status(403).json({ error: 'You are no longer a member of this channel.' });
    const recipientIds = members.map(member => member.user_id).filter(id => id !== senderId);
    const recipients = (isDirect || isManagedChannel) ? people.filter(person => recipientIds.includes(person.id)) : people;
    for (const person of recipients) {
      const mentioned = mentionNames.includes(person.name.split(/\s|\(/)[0].toLowerCase());
      const title = mentioned ? `${sender.name} mentioned you` : (isDirect ? `New message from ${sender.name}` : `New message in #${channel.name}`);
      await querySQL('INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, ?)', [uid('ntf'), person.id, title, content.trim(), mentioned ? 'mention' : 'message', 0]);
    }
    res.status(201).json({ message: { ...message, sender_name: sender.name, sender_avatar: sender.avatar, reactions: [] } });
  } catch (error) {
    res.status(500).json({ error: 'Message could not be delivered. Please try again.' });
  }
});

router.post('/messages/:messageId/reactions', async (req, res) => {
  const { userId, emoji } = req.body;
  if (!userId || !emoji) return res.status(400).json({ error: 'Reaction details are required.' });
  const existing = await safeRows('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ? LIMIT 1', [req.params.messageId, userId, emoji]);
  if (existing.length) {
    await querySQL('DELETE FROM message_reactions WHERE id = ?', [existing[0].id]);
    return res.json({ removed: true });
  }
  const reaction = { id: uid('rxn'), message_id: req.params.messageId, user_id: userId, emoji };
  await querySQL('INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)', Object.values(reaction));
  res.status(201).json({ reaction });
});

router.get('/search', async (req, res) => {
  const needle = (req.query.q || '').trim().toLowerCase();
  if (!needle) return res.json([]);
  const [users, projects, tasks, channels, messages] = await Promise.all([
    safeRows('SELECT id, name, email, role FROM users'), safeRows('SELECT id, title FROM projects'), safeRows('SELECT id, title, project_title FROM tasks'), safeRows('SELECT id, name, description FROM channels'), safeRows('SELECT id, channel_id, content FROM messages')
  ]);
  const includes = (...values) => values.filter(Boolean).join(' ').toLowerCase().includes(needle);
  const result = [
    ...users.filter(x => includes(x.name, x.email)).map(x => ({ type: 'People', id: x.id, title: x.name, subtitle: x.role })),
    ...projects.filter(x => includes(x.title)).map(x => ({ type: 'Project', id: x.id, title: x.title })),
    ...tasks.filter(x => includes(x.title, x.project_title)).map(x => ({ type: 'Task', id: x.id, title: x.title, subtitle: x.project_title })),
    ...channels.filter(x => includes(x.name, x.description)).map(x => ({ type: 'Channel', id: x.id, title: `#${x.name}`, subtitle: x.description })),
    ...messages.filter(x => includes(x.content)).map(x => ({ type: 'Message', id: x.id, title: x.content.slice(0, 80), channelId: x.channel_id }))
  ];
  res.json(result.slice(0, 20));
});

router.get('/calendar', async (_req, res) => {
  let events = await safeRows('SELECT * FROM calendar_events ORDER BY event_date ASC');
  if (!events.length) {
    const today = new Date().toISOString().slice(0, 10);
    await querySQL('INSERT INTO calendar_events (id, title, event_date, event_time, type) VALUES (?, ?, ?, ?, ?)', ['evt-standup', 'Engineering stand-up', today, '10:00', 'Team ritual']);
    events = await safeRows('SELECT * FROM calendar_events ORDER BY event_date ASC');
  }
  const holidays = await safeRows('SELECT id, title, date FROM holidays ORDER BY date ASC');
  const approvedLeaves = await safeRows(`SELECT l.id, l.start_date, l.end_date, l.leave_type, u.name AS user_name FROM leave_requests l LEFT JOIN users u ON u.id = l.user_id WHERE LOWER(l.status) LIKE '%approve%' ORDER BY l.start_date ASC`);
  const approvedHomeWork = await safeRows(`SELECT h.id, h.work_date, h.start_time, h.end_time, h.work_kind, u.name AS user_name FROM home_work_sessions h LEFT JOIN users u ON u.id = h.user_id WHERE LOWER(h.status) LIKE '%approve%' ORDER BY h.work_date ASC`);
  const holidayEvents = holidays.map(holiday => ({ id: `holiday-${holiday.id}`, title: holiday.title, event_date: holiday.date, event_time: '', type: 'Holiday', created_by: null }));
  const leaveEvents = approvedLeaves.flatMap(leave => {
    const start = new Date(`${String(leave.start_date).slice(0, 10)}T00:00:00`);
    const end = new Date(`${String(leave.end_date || leave.start_date).slice(0, 10)}T00:00:00`);
    const entries = [];
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateKey = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
      entries.push({ id: `leave-${leave.id}-${dateKey}`, title: `${leave.user_name || 'Employee'} — ${leave.leave_type || 'Leave'}`, event_date: dateKey, event_time: '', type: 'Approved leave', created_by: null });
    }
    return entries;
  });
  const homeWorkEvents = approvedHomeWork.map(entry => ({ id: `home-${entry.id}`, title: `${entry.user_name || 'Employee'} — ${entry.work_kind || 'Home work'}`, event_date: entry.work_date, event_time: `${entry.start_time}–${entry.end_time}`, type: 'Approved home work', created_by: null }));
  res.json([...events, ...holidayEvents, ...leaveEvents, ...homeWorkEvents].sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))));
});
router.post('/calendar', async (req, res) => {
  const { title, eventDate, eventTime = '', type = 'Team event', createdBy, userRole } = req.body;
  if (userRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only the founder can create team calendar events.' });
  if (!title || !eventDate) return res.status(400).json({ error: 'Title and date are required.' });
  const event = { id: uid('evt'), title, event_date: eventDate, event_time: eventTime, type, created_by: createdBy || null };
  await querySQL('INSERT INTO calendar_events (id, title, event_date, event_time, type, created_by) VALUES (?, ?, ?, ?, ?, ?)', Object.values(event));
  await querySQL(
    'INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES (?, NULL, ?, ?, ?, 0)',
    [uid('ntf'), 'Team calendar updated', `${title} was added to the team calendar for ${eventDate}.`, 'calendar']
  );
  res.status(201).json({ event });
});

router.get('/home-time', async (req, res) => {
  const rows = await safeRows(`SELECT h.*, u.name AS user_name FROM home_work_sessions h LEFT JOIN users u ON u.id = h.user_id ORDER BY h.work_date DESC`);
  res.json(req.query.userId ? rows.filter(row => row.user_id === req.query.userId) : rows);
});
router.post('/home-time', async (req, res) => {
  const { userId, workDate, startTime, endTime, reason = '', workKind = 'Remote extension' } = req.body;
  if (!userId || !workDate || !startTime || !endTime) return res.status(400).json({ error: 'Date and time range are required.' });
  const session = { id: uid('home'), user_id: userId, work_date: workDate, start_time: startTime, end_time: endTime, reason, work_kind: workKind, status: 'Pending' };
  await querySQL('INSERT INTO home_work_sessions (id, user_id, work_date, start_time, end_time, reason, work_kind, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', Object.values(session));
  res.status(201).json({ session });
});
router.put('/home-time/:id', async (req, res) => {
  const { status, reviewedBy, userId, workDate, startTime, endTime, reason, workKind } = req.body;
  const existing = (await safeRows('SELECT * FROM home_work_sessions WHERE id = ? LIMIT 1', [req.params.id]))[0];
  if (!existing) return res.status(404).json({ error: 'Home work entry not found.' });

  // Founder / manager review is retained; employees can only correct their own
  // entry during the same 48-hour grace window.
  if (status) {
    await querySQL('UPDATE home_work_sessions SET status = ?, reviewed_by = ? WHERE id = ?', [status, reviewedBy || null, req.params.id]);
    return res.json({ message: 'Home work session updated.' });
  }
  if (existing.user_id !== userId) return res.status(403).json({ error: 'You can only edit your own home-time entries.' });
  if (Date.now() - new Date(existing.created_at).getTime() > 48 * 60 * 60 * 1000) return res.status(403).json({ error: 'This entry is locked after 48 hours.' });
  if (!workDate || !startTime || !endTime || !reason?.trim()) return res.status(400).json({ error: 'Date, time and work details are required.' });
  await querySQL('UPDATE home_work_sessions SET work_date = ?, start_time = ?, end_time = ?, reason = ?, work_kind = ? WHERE id = ?', [workDate, startTime, endTime, reason.trim(), workKind || existing.work_kind, req.params.id]);
  res.json({ session: (await safeRows('SELECT * FROM home_work_sessions WHERE id = ? LIMIT 1', [req.params.id]))[0] });
});

router.get('/reports', async (req, res) => res.json(await safeRows('SELECT * FROM saved_reports WHERE user_id = ? ORDER BY created_at DESC', [req.query.userId])));
router.post('/reports', async (req, res) => {
  const { userId, name, filters = {} } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'Report name is required.' });
  const report = { id: uid('rpt'), user_id: userId, name, filters: JSON.stringify(filters) };
  await querySQL('INSERT INTO saved_reports (id, user_id, name, filters) VALUES (?, ?, ?, ?)', Object.values(report));
  res.status(201).json({ report });
});

router.get('/founder/attendance', async (req, res) => {
  const { userId, month } = req.query;
  const users = await safeRows('SELECT id, name, employee_id, role FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!users[0]) return res.status(404).json({ error: 'Employee not found.' });
  const logs = (await safeRows('SELECT * FROM attendance_logs WHERE user_id = ? ORDER BY check_in ASC', [userId])).filter(log => isValidAttendance(log) && (!month || indiaDate(parseStoredUtc(log.check_in)).startsWith(month)));
  const homeTime = (await safeRows('SELECT * FROM home_work_sessions WHERE user_id = ? ORDER BY work_date ASC', [userId])).filter(row => !month || String(row.work_date).startsWith(month));
  const leave = (await safeRows('SELECT * FROM leave_requests WHERE user_id = ?', [userId])).filter(row => !month || String(row.start_date).startsWith(month));
  const [projects, tasks, permissions] = await Promise.all([
    safeRows('SELECT * FROM projects WHERE created_by = ? OR `lead` = ?', [userId, users[0].name]),
    safeRows('SELECT * FROM tasks WHERE assigned_to = ?', [userId]),
    safeRows('SELECT * FROM time_permissions WHERE user_id = ?', [userId])
  ]);
  const days = logs.map(log => {
    const checkIn = parseStoredUtc(log.check_in);
    const checkOut = log.check_out ? parseStoredUtc(log.check_out) : null;
    const outPart = checkOut ? indiaParts(checkOut) : null;
    const outMinutes = outPart ? outPart.hour * 60 + outPart.minute : null;
    const extraMinutes = outMinutes ? Math.max(0, outMinutes - 19 * 60) : 0;
    const earlyMinutes = outMinutes ? Math.max(0, 19 * 60 - outMinutes) : 0;
    return { ...log, date: indiaDate(checkIn), early_minutes: earlyMinutes, extra_minutes: extraMinutes };
  });
  const enrichedHomeTime = homeTime.map(row => {
    const day = new Date(`${row.work_date}T12:00:00`);
    const onWeekend = [0, 6].includes(day.getDay());
    const onLeave = leave.some(item => item.status === 'Approved' && String(item.start_date) <= String(row.work_date) && String(item.end_date) >= String(row.work_date));
    const context = (onLeave || onWeekend) ? (onLeave ? 'Leave-day work' : 'Weekend work') : (row.work_kind || 'Remote extension');
    const [sh, sm] = row.start_time.split(':').map(Number); const [eh, em] = row.end_time.split(':').map(Number);
    return { ...row, context, minutes: Math.max(0, eh * 60 + em - sh * 60 - sm) };
  });
  const approvedLeave = leave.filter(row => String(row.status || '').toLowerCase() === 'approved');
  const approvedPermissions = permissions.filter(row => String(row.status || '').toLowerCase() === 'approved' && (!month || String(row.permission_date).startsWith(month)));
  res.json({ employee: users[0], summary: { present_days: new Set(days.map(day => day.date)).size, leave_days: approvedLeave.reduce((total, row) => total + Number(row.days_count || 1), 0), projects_total: projects.length, projects_completed: projects.filter(row => String(row.status || '').toLowerCase() === 'completed').length, tasks_total: tasks.length, tasks_completed: tasks.filter(row => ['completed', 'done'].includes(String(row.status || '').toLowerCase())).length, time_permissions: approvedPermissions.length, after_hours_minutes: days.reduce((sum, day) => sum + day.extra_minutes, 0), off_day_minutes: enrichedHomeTime.filter(row => row.status === 'Approved' && ['Weekend work', 'Leave-day work', 'Holiday work'].includes(row.context)).reduce((sum, row) => sum + row.minutes, 0), approved_home_minutes: enrichedHomeTime.filter(row => row.status === 'Approved').reduce((sum, row) => sum + row.minutes, 0) }, days, home_time: enrichedHomeTime, leave, time_permissions: approvedPermissions });
});

router.get('/job-roles', async (_req, res) => {
  let roles = await safeRows('SELECT * FROM job_roles ORDER BY name ASC');
  if (!roles.length) {
    for (const name of ['Developer', 'Editor', 'Digital Marketing', 'Business Executive', 'Tester']) await querySQL('INSERT INTO job_roles (id, name) VALUES (?, ?)', [uid('job'), name]);
    roles = await safeRows('SELECT * FROM job_roles ORDER BY name ASC');
  }
  res.json(roles);
});

router.post('/job-roles', async (req, res) => {
  const { name, actorRole } = req.body;
  if (actorRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only the founder can add company roles.' });
  if (!name?.trim()) return res.status(400).json({ error: 'Role name is required.' });
  const role = { id: uid('job'), name: name.trim() };
  try { await querySQL('INSERT INTO job_roles (id, name) VALUES (?, ?)', Object.values(role)); } catch { return res.status(409).json({ error: 'This company role already exists.' }); }
  res.status(201).json({ role });
});

router.get('/preferences/:userId', async (req, res) => res.json((await safeRows('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1', [req.params.userId]))[0] || { user_id: req.params.userId, theme: 'paper', accent: 'aubergine', density: 'comfortable', push_enabled: 0 }));
router.put('/preferences/:userId', async (req, res) => {
  const { theme = 'paper', accent = 'aubergine', density = 'comfortable', quietHours = '', pushEnabled = false } = req.body;
  const existing = await safeRows('SELECT user_id FROM user_preferences WHERE user_id = ? LIMIT 1', [req.params.userId]);
  if (existing.length) await querySQL('UPDATE user_preferences SET theme = ?, accent = ?, density = ?, quiet_hours = ?, push_enabled = ? WHERE user_id = ?', [theme, accent, density, quietHours, pushEnabled ? 1 : 0, req.params.userId]);
  else await querySQL('INSERT INTO user_preferences (user_id, theme, accent, density, quiet_hours, push_enabled) VALUES (?, ?, ?, ?, ?, ?)', [req.params.userId, theme, accent, density, quietHours, pushEnabled ? 1 : 0]);
  res.json({ preferences: { user_id: req.params.userId, theme, accent, density, quiet_hours: quietHours, push_enabled: pushEnabled ? 1 : 0 } });
});

export default router;
