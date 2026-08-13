import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomInt, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import dotenv from 'dotenv';
import { initMySQLPool, isMySQLConnected, querySQL, executeTransaction } from './db.js';
import { sendEmail, verifySmtpConnection } from './services/emailService.js';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const app = express();
const PORT = process.env.PORT || 5000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Import Modular Routers
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import collaborationRoutes from './routes/collaborationRoutes.js';

// Mount Modular Routers
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/collaboration', collaborationRoutes);

// Root API Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Prolync LivePresence Backend API Service is Live',
    company: 'Prolync Infotech Pvt. Ltd.',
    service: 'LivePresence Enterprise Backend',
    version: '1.0.0',
    status: 'healthy',
    mysql_connected: isMySQLConnected(),
    endpoints: {
      health: '/health',
      auth: '/api/auth/login',
      employees: '/api/employees',
      leaves: '/api/leaves/policy',
      attendance: '/api/attendance/geofence',
      company: '/api/admin/company'
    }
  });
});

// Production Health Check Endpoints
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: isMySQLConnected() ? 'healthy' : 'degraded',
    service: 'Prolync LivePresence Backend API',
    company: 'Prolync Infotech Pvt. Ltd.',
    database: isMySQLConnected()
      ? (process.env.LOCAL_DB === 'true' ? 'Connected to local SQLite database' : 'Connected to MySQL')
      : 'Database disconnected',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Top-Level Auxiliary Endpoints for Frontend Compatibility

// GET /api/users
app.get('/api/users', async (req, res) => {
  try {
    const users = await querySQL('SELECT * FROM users ORDER BY created_at DESC');
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// GET /api/roles
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await querySQL('SELECT * FROM roles ORDER BY id ASC');
    if (!roles || roles.length === 0) {
      const defaultRoles = [
        { id: 1, name: "Super Admin", code: "SUPER_ADMIN" },
        { id: 2, name: "HR Manager", code: "HR" },
        { id: 3, name: "Project Lead", code: "MANAGER" },
        { id: 4, name: "Full-Time Staff", code: "FULL_TIME" },
        { id: 5, name: "Intern / Trainee", code: "INTERN" }
      ];
      return res.json(defaultRoles);
    }
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch roles." });
  }
});

// GET /api/company/settings
app.get('/api/company/settings', async (req, res) => {
  try {
    const rows = await querySQL('SELECT * FROM company_settings LIMIT 1');
    const settings = (rows && rows.length > 0) ? rows[0] : {
      company_name: "Prolync Infotech Pvt. Ltd.",
      tax_id: "GSTIN33AAACN1298E1Z4",
      headquarters: "Kilambakkam, Vandalur, Tamil Nadu - 603210, India",
      currency: "INR (₹)",
      fiscal_year: "2026-2027",
      office_name: "Prolync HQ (Vandalur, Tamil Nadu)",
      latitude: 12.871133,
      longitude: 80.083898,
      radius_meters: 200
    };
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch company settings." });
  }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await querySQL('SELECT COUNT(*) as cnt FROM users');
    const totalAtt = await querySQL('SELECT COUNT(*) as cnt FROM attendance_logs WHERE DATE(check_in) = CURDATE()');
    const totalLeave = await querySQL('SELECT COUNT(*) as cnt FROM leave_requests WHERE status = "Approved" AND CURDATE() BETWEEN start_date AND end_date');

    const total = totalUsers[0]?.cnt || 0;
    const present = totalAtt[0]?.cnt || 0;
    const leave = totalLeave[0]?.cnt || 0;
    const not_in = Math.max(0, total - (present + leave));

    res.json({
      all: total,
      present,
      not_in,
      leave,
      weekoff: 0,
      public_holiday: 0
    });
  } catch (err) {
    res.json({ all: 6, present: 6, not_in: 0, leave: 0, weekoff: 0, public_holiday: 0 });
  }
});

// GET /api/birthdays
app.get('/api/birthdays', async (req, res) => {
  try {
    const users = await querySQL(
      `SELECT id, name, email, avatar, dob FROM users WHERE dob IS NOT NULL AND MONTH(dob) = MONTH(CURDATE()) ORDER BY DAY(dob) ASC`
    );
    res.json(users);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/anniversaries
app.get('/api/anniversaries', async (req, res) => {
  try {
    const users = await querySQL(
      `SELECT id, name, email, avatar, joining_date FROM users WHERE joining_date IS NOT NULL AND MONTH(joining_date) = MONTH(CURDATE()) ORDER BY DAY(joining_date) ASC`
    );
    res.json(users);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/branches
app.get('/api/branches', async (req, res) => {
  try {
    const branches = await querySQL('SELECT * FROM branches ORDER BY created_at ASC');
    if (!branches || branches.length === 0) {
      return res.json([
        { id: "br-1", name: "Chennai HQ", city: "Chennai", code: "MAA-01", employees_count: 4 },
        { id: "br-2", name: "Bengaluru Tech Park", city: "Bengaluru", code: "BLR-02", employees_count: 2 }
      ]);
    }
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch branches." });
  }
});

// GET /api/departments
app.get('/api/departments', async (req, res) => {
  try {
    const departments = await querySQL('SELECT * FROM departments ORDER BY created_at ASC');
    if (!departments || departments.length === 0) {
      return res.json([
        { id: "dept-1", name: "Engineering & Operations", code: "ENG", lead: "Mugilan S", budget: "₹15,00,000" },
        { id: "dept-2", name: "Human Resources", code: "HR", lead: "Sarah Jenkins", budget: "₹4,50,000" },
        { id: "dept-3", name: "Executive & Leadership", code: "EXEC", lead: "Rahul Kannan", budget: "₹20,00,000" }
      ]);
    }
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch departments." });
  }
});

// GET /api/customizations
app.get('/api/customizations', async (req, res) => {
  try {
    const rows = await querySQL('SELECT * FROM customizations LIMIT 1');
    const custom = (rows && rows.length > 0) ? rows[0] : {
      theme: 'dark',
      primary_color: '#4F46E5',
      portal_title: 'Prolync LivePresence'
    };
    res.json(custom);
  } catch (err) {
    res.json({ theme: 'dark', primary_color: '#4F46E5', portal_title: 'Prolync LivePresence' });
  }
});

// PUT /api/customizations
app.put('/api/customizations', async (req, res) => {
  const { theme, primary_color, portal_title, leave_types, task_statuses } = req.body;
  try {
    await querySQL(
      `INSERT INTO customizations (id, theme, primary_color, portal_title, leave_types, task_statuses)
       VALUES (1, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE theme=VALUES(theme), primary_color=VALUES(primary_color), portal_title=VALUES(portal_title), leave_types=VALUES(leave_types), task_statuses=VALUES(task_statuses)`,
      [theme || 'paper', primary_color || '#5e245f', portal_title || 'Prolync', JSON.stringify(leave_types || []), JSON.stringify(task_statuses || [])]
    );
    const customizations = (await querySQL('SELECT * FROM customizations WHERE id = 1'))[0];
    res.json({ message: "Customizations updated successfully.", customizations });
  } catch (err) {
    res.status(500).json({ error: "Failed to update customizations." });
  }
});

// GET /api/notifications
app.get('/api/notifications', async (req, res) => {
  const { userId } = req.query;
  try {
    let notifs = [];
    if (userId) {
      notifs = await querySQL('SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC', [userId]);
    } else {
      notifs = await querySQL('SELECT * FROM notifications ORDER BY created_at DESC');
    }
    res.json(notifs);
  } catch (err) {
    res.json([]);
  }
});

// POST /api/notifications/read
app.post('/api/notifications/read', async (req, res) => {
  const { userId } = req.body;
  try {
    if (userId) {
      await querySQL('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    } else {
      await querySQL('UPDATE notifications SET is_read = 1');
    }
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notifications read." });
  }
});

// GET /api/geofence
app.get('/api/geofence', async (req, res) => {
  try {
    const rows = await querySQL('SELECT * FROM company_settings LIMIT 1');
    const settings = (rows && rows.length > 0) ? rows[0] : {};
    res.json({
      office_name: settings.office_name || "Prolync HQ (Vandalur, Tamil Nadu)",
      latitude: settings.latitude || 12.871133,
      longitude: settings.longitude || 80.083898,
      radius_meters: settings.radius_meters || 200
    });
  } catch (err) {
    res.json({
      office_name: "Prolync HQ (Vandalur, Tamil Nadu)",
      latitude: 12.871133,
      longitude: 80.083898,
      radius_meters: 200
    });
  }
});

// GET /api/menus
app.get('/api/menus', async (req, res) => {
  try {
    const rows = await querySQL('SELECT * FROM menus ORDER BY menu_order ASC');
    if (!rows || rows.length === 0) {
      const defaultMenus = [
        { id: 'dashboard', label: 'Dashboard Overview', icon: 'LayoutDashboard', category: 'Core Operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 1 },
        { id: 'profile', label: 'My Profile', icon: 'UserCheck', category: 'Core Operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 2 },
        { id: 'attendance', label: 'Attendance', icon: 'CalendarCheck', category: 'Core Operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 3 },
        { id: 'leaves', label: 'Leaves & Calendar', icon: 'Home', category: 'Core Operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 4 },
        { id: 'employees', label: 'Employee Directory', icon: 'Users', category: 'Workforce Governance', roles: ['SUPER_ADMIN', 'HR', 'MANAGER'], enabled: true, order: 5 },
        { id: 'documents', label: 'Document Verification', icon: 'FileText', category: 'Workforce Governance', roles: ['SUPER_ADMIN', 'HR'], enabled: true, order: 6 },
        { id: 'projects', label: 'Projects & Tasks', icon: 'Briefcase', category: 'Delivery & Velocity', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 7 },
        { id: 'worklogs', label: 'Daily Work Logs', icon: 'FileText', category: 'Delivery & Velocity', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 8 },
        { id: 'payroll', label: 'Payroll & Payslips', icon: 'DollarSign', category: 'Finance & Operations', roles: ['SUPER_ADMIN', 'HR', 'FULL_TIME'], enabled: true, order: 9 },
        { id: 'announcements', label: 'Company Hub', icon: 'Bell', category: 'Communication', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 10 },
        { id: 'reports', label: 'Reports & Analytics', icon: 'BarChart3', category: 'Management & Audit', roles: ['SUPER_ADMIN', 'HR', 'MANAGER'], enabled: true, order: 11 },
        { id: 'leave_settings', label: 'Leave & Location Settings', icon: 'Sliders', category: 'Management & Audit', roles: ['SUPER_ADMIN', 'HR'], enabled: true, order: 12 },
        { id: 'audit', label: 'Security & Audit Logs', icon: 'Shield', category: 'Management & Audit', roles: ['SUPER_ADMIN'], enabled: true, order: 13 }
      ];
      return res.json(defaultMenus);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch menus." });
  }
});

// GET /api/tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await querySQL('SELECT * FROM tasks ORDER BY created_at DESC');
    const activity = await querySQL('SELECT * FROM task_activity ORDER BY created_at DESC');
    const today = new Date().toISOString().slice(0, 10);
    res.json(tasks.map(task => ({
      ...task,
      is_overdue: Boolean(task.due_date && String(task.due_date).slice(0, 10) < today && !['Completed', 'Done'].includes(task.status)),
      movement_history: activity.filter(item => item.task_id === task.id)
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

// POST /api/tasks
app.post('/api/tasks', async (req, res) => {
  const { title, projectId, projectTitle, assigneeId, assignedToId, assigneeName, assignedToName, dueDate, priority, userRole, creatorId, creatorName } = req.body;
    if (!title?.trim() || !creatorId || !dueDate) return res.status(400).json({ error: 'A task title, completion date and creator are required.' });
  try {
    const taskId = `tsk-${Date.now()}`;
    const canAssignOthers = ['SUPER_ADMIN', 'MANAGER'].includes(userRole);
    const targetId = canAssignOthers ? (assigneeId || assignedToId || creatorId) : creatorId;
    const targetName = canAssignOthers ? (assigneeName || assignedToName || creatorName || '') : (creatorName || 'Employee');
    await querySQL(
      `INSERT INTO tasks (id, project_id, project_title, title, assigned_to, assigned_to_name, due_date, priority, status, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Research and planning', ?, ?)`,
      [taskId, projectId || null, projectTitle || '', title.trim(), targetId, targetName, dueDate || null, priority || 'Medium', creatorId, creatorName || 'Employee']
    );
    await querySQL('INSERT INTO task_activity (id, task_id, actor_id, actor_name, from_status, to_status, action) VALUES (?, ?, ?, ?, ?, ?, ?)', [`task-act-${Date.now()}-created`, taskId, creatorId, creatorName || 'Employee', '', 'Research and planning', 'created']);
    const created = await querySQL('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.json({ message: "Task created successfully.", task: created[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create task." });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { status, userRole, userId } = req.body;
  try {
    const task = (await querySQL('SELECT assigned_to, status FROM tasks WHERE id = ? LIMIT 1', [req.params.id]))[0];
    if (!task) return res.status(404).json({ error: 'Assigned work was not found.' });
    if (!userId) return res.status(400).json({ error: 'A signed-in user is required to move work on the board.' });
    await querySQL('UPDATE tasks SET status = ? WHERE id = ?', [status, req.params.id]);
    await querySQL('INSERT INTO task_activity (id, task_id, actor_id, actor_name, from_status, to_status, action) VALUES (?, ?, ?, ?, ?, ?, ?)', [`task-act-${Date.now()}`, req.params.id, userId || null, req.body.actorName || 'Founder', task.status || 'Not started', status, 'moved']);
    const updated = await querySQL('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ task: updated[0] });
  } catch (err) { res.status(500).json({ error: 'Failed to update task.' }); }
});

app.get('/api/daily-tasks', async (_req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await querySQL('SELECT * FROM daily_tasks ORDER BY due_date ASC, created_at DESC');
    const completions = await querySQL('SELECT task_id, user_id, user_name, status, completed_at FROM daily_task_completions ORDER BY completed_at DESC');
    const completionByTask = completions.reduce((all, completion) => {
      (all[completion.task_id] ||= []).push(completion);
      return all;
    }, {});
    res.json(rows.map((task) => ({
      ...task,
      completions: completionByTask[task.id] || [],
      is_overdue: String(task.due_date).slice(0, 10) < today && task.status !== 'Completed'
    })));
  } catch { res.status(500).json({ error: 'Could not load daily tasks.' }); }
});

app.post('/api/daily-tasks', async (req, res) => {
  const { title, dueDate, assigneeId, assigneeName, creatorId, creatorName } = req.body;
  if (!title?.trim() || !dueDate || !creatorId || !assigneeId) return res.status(400).json({ error: 'Task name, completion date and assignee are required.' });
  try {
    const task = { id: `daily-${Date.now()}`, title: title.trim(), due_date: dueDate, assigned_to: assigneeId, assigned_to_name: assigneeId === 'ALL' ? 'All employees' : (assigneeName || 'Team member'), created_by: creatorId, created_by_name: creatorName || 'Employee', status: 'Open' };
    await querySQL('INSERT INTO daily_tasks (id, title, due_date, assigned_to, assigned_to_name, created_by, created_by_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', Object.values(task));
    res.status(201).json({ task });
  } catch { res.status(500).json({ error: 'Could not create this daily task.' }); }
});

app.put('/api/daily-tasks/:id', async (req, res) => {
  const { userId, status } = req.body;
  if (!userId || !['Open', 'Completed'].includes(status)) return res.status(400).json({ error: 'A valid task update is required.' });
  try {
    const task = (await querySQL('SELECT * FROM daily_tasks WHERE id = ? LIMIT 1', [req.params.id]))[0];
    if (!task) return res.status(404).json({ error: 'Daily task not found.' });
    if (![task.assigned_to, task.created_by, 'ALL'].includes(userId) && task.assigned_to !== 'ALL') return res.status(403).json({ error: 'Only an assigned person can complete this task.' });
    const user = (await querySQL('SELECT id, name FROM users WHERE id = ? LIMIT 1', [userId]))[0];
    if (!user) return res.status(404).json({ error: 'Employee not found.' });

    // Company-wide tasks have one independent completion record per employee.
    // One employee finishing it must never complete it for everybody else.
    if (task.assigned_to === 'ALL') {
      if (status === 'Completed') {
        await querySQL('DELETE FROM daily_task_completions WHERE task_id = ? AND user_id = ?', [task.id, user.id]);
        await querySQL(
          `INSERT INTO daily_task_completions (task_id, user_id, user_name, status, completed_at)
           VALUES (?, ?, ?, 'Completed', ?)`,
          [task.id, user.id, user.name, new Date().toISOString().slice(0, 19).replace('T', ' ')]
        );
      } else {
        await querySQL('DELETE FROM daily_task_completions WHERE task_id = ? AND user_id = ?', [task.id, user.id]);
      }
      const completions = await querySQL('SELECT task_id, user_id, user_name, status, completed_at FROM daily_task_completions WHERE task_id = ? ORDER BY completed_at DESC', [task.id]);
      return res.json({ task: { ...task, completions } });
    }

    await querySQL('UPDATE daily_tasks SET status = ?, completed_at = ? WHERE id = ?', [status, status === 'Completed' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null, task.id]);
    const updated = (await querySQL('SELECT * FROM daily_tasks WHERE id = ? LIMIT 1', [task.id]))[0];
    res.json({ task: { ...updated, completions: status === 'Completed' ? [{ task_id: task.id, user_id: user.id, user_name: user.name, status, completed_at: updated.completed_at }] : [] } });
  } catch { res.status(500).json({ error: 'Could not update this daily task.' }); }
});

app.delete('/api/daily-tasks/:id', async (req, res) => {
  if (req.body?.userRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only the founder can delete daily tasks.' });
  try { await querySQL('DELETE FROM daily_tasks WHERE id = ?', [req.params.id]); res.json({ deleted: true }); }
  catch { res.status(500).json({ error: 'Could not delete this daily task.' }); }
});

// Founder-only downloadable record.  This is intentionally generated on the
// server so the document always reflects the current MySQL records.
app.get('/api/founder/employee-timeline/:userId.pdf', async (req, res) => {
  if (req.query.requesterRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only the founder can download employee timelines.' });
  }
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '')
    ? req.query.month
    : new Date().toISOString().slice(0, 7);
  const [startDate, endDate] = [`${month}-01`, `${month}-31`];

  try {
    const employee = (await querySQL(
      'SELECT id, employee_id, name, email, role, title, department, branch, joining_date, employment_status, shift_timing FROM users WHERE id = ? LIMIT 1',
      [req.params.userId]
    ))[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    const [attendance, leaves, workLogs, homeTime] = await Promise.all([
      querySQL('SELECT DATE(check_in) AS work_date, check_in, check_out, working_hours, overtime, status FROM attendance_logs WHERE user_id = ? AND DATE(check_in) BETWEEN ? AND ? ORDER BY check_in ASC', [employee.id, startDate, endDate]),
      querySQL("SELECT leave_type, start_date, end_date, days_count, status FROM leave_requests WHERE user_id = ? AND start_date <= ? AND end_date >= ? ORDER BY start_date ASC", [employee.id, endDate, startDate]),
      querySQL('SELECT date, project_title, task_title, hours_spent, summary, founder_seen FROM work_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC', [employee.id, startDate, endDate]),
      querySQL('SELECT work_date, start_time, end_time, work_kind, status, reason FROM home_work_sessions WHERE user_id = ? AND work_date BETWEEN ? AND ? ORDER BY work_date ASC', [employee.id, startDate, endDate])
    ]);

    const completedAttendance = attendance.filter(item => item.check_out);
    const officeMinutes = completedAttendance.reduce((total, item) => total + Math.max(0, new Date(item.check_out).getTime() - new Date(item.check_in).getTime()) / 60000, 0);
    const homeMinutes = homeTime.reduce((total, item) => {
      const [sh = 0, sm = 0] = String(item.start_time || '0:0').split(':').map(Number);
      const [eh = 0, em = 0] = String(item.end_time || '0:0').split(':').map(Number);
      return total + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    }, 0);
    const extraMinutes = completedAttendance.reduce((total, item) => {
      const out = new Date(item.check_out);
      const cutoff = new Date(item.check_out); cutoff.setHours(19, 0, 0, 0);
      return total + Math.max(0, out.getTime() - cutoff.getTime()) / 60000;
    }, 0);
    const approvedLeaveDays = leaves
      .filter(item => String(item.status).toLowerCase().includes('approve'))
      .reduce((total, item) => total + Number(item.days_count || 0), 0);
    const formatHours = (minutes) => `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
    const value = (item) => String(item ?? '—').replace(/[\r\n]+/g, ' ').trim();
    const pdfDate = (item) => item ? new Date(item).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const pdfTime = (item) => item ? new Date(item).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
    const presenceByDay = new Map();
    for (const item of attendance) {
      const key = String(item.work_date || item.check_in || '').slice(0, 10);
      const current = presenceByDay.get(key) || { date: item.work_date || item.check_in, firstIn: null, lastOut: null, totalMinutes: 0, statuses: new Set(), sessions: 0 };
      const inTime = new Date(item.check_in);
      const outTime = item.check_out ? new Date(item.check_out) : null;
      if (!current.firstIn || inTime < current.firstIn) current.firstIn = inTime;
      if (outTime && (!current.lastOut || outTime > current.lastOut)) current.lastOut = outTime;
      current.totalMinutes += outTime ? Math.max(0, outTime.getTime() - inTime.getTime()) / 60000 : 0;
      if (item.status) current.statuses.add(item.status);
      current.sessions += 1;
      presenceByDay.set(key, current);
    }
    const presenceDays = [...presenceByDay.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
    const safeFileName = employee.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'employee';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}-${month}-timeline.pdf"`);
    const doc = new PDFDocument({ margin: 42, size: 'A4', bufferPages: true });
    doc.pipe(res);
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 84;
    const navy = '#101A33'; const plum = '#B02562'; const ink = '#1D2939'; const muted = '#667085'; const border = '#DDE3ED'; const pale = '#F7F8FB';
    // Keep a reserved footer area so content and page numbers never collide.
    const contentBottom = () => doc.page.height - 72;
    const ensureSpace = (height) => { if (doc.y + height > contentBottom()) doc.addPage(); };
    const section = (title, subtitle = '') => {
      ensureSpace(50); doc.x = 42; doc.moveDown(0.65); doc.font('Helvetica-Bold').fontSize(13).fillColor(ink).text(title);
      if (subtitle) { doc.x = 42; doc.moveDown(0.14).font('Helvetica').fontSize(8.5).fillColor(muted).text(subtitle); }
      doc.moveDown(0.38);
    };
    const divider = () => { doc.moveTo(42, doc.y).lineTo(pageWidth - 42, doc.y).strokeColor(border).lineWidth(0.7).stroke(); doc.moveDown(0.55); };
    const paragraph = (text, options = {}) => { doc.x = 42; doc.font('Helvetica').fontSize(options.size || 9).fillColor(options.color || '#344054').text(value(text), { width: options.width || contentWidth, lineGap: 2, ...options }); };
    const table = (columns, rows, emptyText) => {
      const startX = 42; const padding = 7; const headerHeight = 22;
      const drawHeader = () => { ensureSpace(headerHeight + 26); const headerY = doc.y; doc.rect(startX, headerY, contentWidth, headerHeight).fill('#EEF1F6'); const y = headerY + 7; let x = startX; columns.forEach(col => { doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475467').text(col.label.toUpperCase(), x + padding, y, { width: col.width - (padding * 2), ellipsis: true }); x += col.width; }); doc.x = startX; doc.y = headerY + headerHeight; };
      if (!rows.length) { doc.roundedRect(startX, doc.y, contentWidth, 34, 6).fill(pale); doc.font('Helvetica').fontSize(9).fillColor(muted).text(emptyText, startX + 10, doc.y - 24, { width: contentWidth - 20 }); doc.y += 12; return; }
      drawHeader();
      rows.forEach((row, index) => {
        const cellHeights = columns.map(col => doc.heightOfString(value(row[col.key]), { width: col.width - (padding * 2), fontSize: 8.2, lineGap: 1.5 }));
        const rowHeight = Math.max(28, Math.max(...cellHeights) + 14);
        if (doc.y + rowHeight > contentBottom()) { doc.addPage(); doc.x = startX; doc.y = 42; drawHeader(); }
        const rowY = doc.y;
        if (index % 2 === 1) doc.rect(startX, rowY, contentWidth, rowHeight).fill('#FBFCFE');
        const y = rowY + 7; let x = startX;
        columns.forEach(col => { doc.font(col.emphasis ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.2).fillColor(col.color || '#344054').text(value(row[col.key]), x + padding, y, { width: col.width - (padding * 2), lineGap: 1.5 }); x += col.width; });
        doc.moveTo(startX, rowY + rowHeight).lineTo(startX + contentWidth, rowY + rowHeight).strokeColor('#E9ECF2').lineWidth(0.45).stroke(); doc.x = startX; doc.y = rowY + rowHeight;
      });
    };
    const metricCards = [
      ['Office days', String(presenceDays.length), 'Recorded days'],
      ['Office time', formatHours(officeMinutes), 'Completed sessions'],
      ['After 7 PM', formatHours(extraMinutes), 'Extra office time'],
      ['Home / off-day', formatHours(homeMinutes), 'Recorded work'],
      ['Leave approved', `${approvedLeaveDays} day${approvedLeaveDays === 1 ? '' : 's'}`, 'This month'],
      ['Daily updates', String(workLogs.length), 'Work logs filed']
    ];

    doc.rect(0, 0, pageWidth, 88).fill(navy);
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#FFFFFF').text('Employee timeline', 42, 25);
    doc.font('Helvetica').fontSize(9).fillColor('#D0D5DD').text(`Founder record  |  ${month}`, 42, 51);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF').text('PROLYNC LIVESPACE', pageWidth - 158, 31, { width: 116, align: 'right' });
    doc.y = 112; doc.x = 42;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(ink).text(value(employee.name));
    doc.x = 42; doc.font('Helvetica').fontSize(9).fillColor(muted).text(`${value(employee.employee_id || 'Employee ID pending')}  |  ${value(employee.title || employee.role || 'Team member')}`);
    doc.moveDown(0.35); paragraph(`${value(employee.department || 'Department not set')}  |  ${value(employee.branch || 'Branch not set')}  |  Joined ${pdfDate(employee.joining_date)}`);
    paragraph(`${value(employee.email)}  |  ${value(employee.shift_timing || 'General shift: 9:00 AM - 7:00 PM')}`, { color: muted });
    doc.moveDown(0.7); divider();

    section('Month at a glance', 'A concise summary of presence, work and approved time away.');
    const cardWidth = (contentWidth - 16) / 3;
    const cardTop = doc.y;
    metricCards.forEach((metric, index) => {
      const col = index % 3; const row = Math.floor(index / 3); const x = 42 + col * (cardWidth + 8); const y = cardTop + row * 67;
      doc.roundedRect(x, y, cardWidth, 57, 7).fillAndStroke('#FAFBFD', border);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(muted).text(metric[0].toUpperCase(), x + 10, y + 10);
      doc.font('Helvetica-Bold').fontSize(15).fillColor(index === 2 ? plum : ink).text(metric[1], x + 10, y + 23, { width: cardWidth - 20, ellipsis: true });
      doc.font('Helvetica').fontSize(7.5).fillColor(muted).text(metric[2], x + 10, y + 43);
    });
    doc.x = 42; doc.y = cardTop + 134;

    section('Office presence', 'One row per day. Multiple check-ins are grouped into one daily record.');
    table([
      { label: 'Date', key: 'date', width: 105, emphasis: true },
      { label: 'First in', key: 'firstIn', width: 83 },
      { label: 'Last out', key: 'lastOut', width: 83 },
      { label: 'Office time', key: 'duration', width: 92 },
      { label: 'Status', key: 'status', width: 126 }
    ], presenceDays.map(day => ({ date: pdfDate(day.date), firstIn: day.firstIn ? pdfTime(day.firstIn) : '—', lastOut: day.lastOut ? pdfTime(day.lastOut) : 'Active shift', duration: day.lastOut ? formatHours(day.totalMinutes) : 'In progress', status: `${[...day.statuses].join(', ') || 'Present'}${day.sessions > 1 ? ` (${day.sessions} sessions)` : ''}` })), 'No office presence records for this month.');

    section('Daily work updates', 'Employee-submitted work summaries.');
    table([
      { label: 'Date', key: 'date', width: 76, emphasis: true },
      { label: 'Project', key: 'project', width: 118 },
      { label: 'Hours', key: 'hours', width: 55 },
      { label: 'Work update', key: 'summary', width: 240 }
    ], workLogs.map(item => ({ date: pdfDate(item.date), project: item.project_title || 'General work', hours: `${item.hours_spent || 0}h`, summary: item.summary || item.task_title || 'No summary provided' })), 'No daily work updates for this month.');

    section('Leave and home / off-day work', 'Approved leave and work recorded outside the normal office day.');
    const timeAwayRows = [
      ...leaves.map(item => ({ date: `${pdfDate(item.start_date)} - ${pdfDate(item.end_date)}`, type: item.leave_type || 'Leave', time: `${item.days_count || 0} day${Number(item.days_count) === 1 ? '' : 's'}`, status: item.status || 'Pending', notes: 'Leave request' })),
      ...homeTime.map(item => ({ date: pdfDate(item.work_date), type: item.work_kind || 'Home / off-day work', time: `${value(item.start_time)} - ${value(item.end_time)}`, status: item.status || 'Pending', notes: item.reason || 'No work note provided' }))
    ];
    table([
      { label: 'Date', key: 'date', width: 110, emphasis: true },
      { label: 'Type', key: 'type', width: 115 },
      { label: 'Time / days', key: 'time', width: 82 },
      { label: 'Status', key: 'status', width: 82 },
      { label: 'Notes', key: 'notes', width: 100 }
    ], timeAwayRows, 'No leave or home / off-day work recorded for this month.');

    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i += 1) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 56;
      doc.font('Helvetica').fontSize(7.5).fillColor('#98A2B3').text('Confidential people record - Prolync LiveSpace', 42, footerY, { lineBreak: false });
      doc.text(`Page ${i + 1} of ${pageCount}`, pageWidth - 112, footerY, { width: 70, align: 'right', lineBreak: false });
    }
    doc.end();
  } catch (err) {
    console.error('Employee timeline PDF error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Could not generate employee timeline PDF.' });
  }
});

// GET /api/work-logs
app.get('/api/work-logs', async (req, res) => {
  try {
    const logs = await querySQL('SELECT * FROM work_logs ORDER BY created_at DESC');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch work logs." });
  }
});

// POST /api/work-logs
app.post('/api/work-logs', async (req, res) => {
  const { userId, userName, projectTitle, taskTitle, hoursSpent, hoursLogged, summary, completedWork, date } = req.body;
  if (!userId || !(summary || completedWork)?.trim()) return res.status(400).json({ error: 'A work update is required.' });
  try {
    const logId = `wl-${Date.now()}`;
    const logDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : new Date().toISOString().split('T')[0];
    await querySQL(
      `INSERT INTO work_logs (id, user_id, user_name, project_title, task_title, hours_spent, summary, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, userId, userName, projectTitle, taskTitle, parseFloat(hoursSpent || hoursLogged || 8), summary || completedWork || '', logDate]
    );
    const created = await querySQL('SELECT * FROM work_logs WHERE id = ?', [logId]);
    res.json({ message: "Work log submitted successfully.", workLog: created[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit work log." });
  }
});

// A personal log can be corrected for 48 hours after it was filed.  This keeps
// the ledger trustworthy without preventing ordinary typing mistakes.
app.put('/api/work-logs/:id', async (req, res) => {
  const { userId, summary, projectTitle, hoursSpent } = req.body;
  const records = await querySQL('SELECT * FROM work_logs WHERE id = ? LIMIT 1', [req.params.id]);
  const record = records[0];
  if (!record) return res.status(404).json({ error: 'Work log not found.' });
  if (record.user_id !== userId) return res.status(403).json({ error: 'You can only edit your own work logs.' });
  if (Date.now() - new Date(record.created_at).getTime() > 48 * 60 * 60 * 1000) return res.status(403).json({ error: 'This log is locked after 48 hours.' });
  if (!summary?.trim()) return res.status(400).json({ error: 'A work update is required.' });
  try {
    await querySQL('UPDATE work_logs SET summary = ?, project_title = ?, hours_spent = ? WHERE id = ?', [summary.trim(), projectTitle || record.project_title, parseFloat(hoursSpent || record.hours_spent), req.params.id]);
    res.json({ workLog: (await querySQL('SELECT * FROM work_logs WHERE id = ?', [req.params.id]))[0] });
  } catch {
    res.status(500).json({ error: 'Could not update this work log.' });
  }
});

// Founder review acknowledgement for daily employee updates.
app.put('/api/work-logs/:id/seen', async (req, res) => {
  const { userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only the founder can mark employee logs as seen.' });
  try {
    await querySQL('UPDATE work_logs SET founder_seen = 1, founder_seen_by = ?, founder_seen_at = UTC_TIMESTAMP() WHERE id = ?', [actorName || 'Founder', req.params.id]);
    const workLog = (await querySQL('SELECT * FROM work_logs WHERE id = ?', [req.params.id]))[0];
    if (!workLog) return res.status(404).json({ error: 'Work log not found.' });
    await querySQL(
      'INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, 0)',
      [`worklog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, workLog.user_id, 'Daily log reviewed', `${actorName || 'Founder'} reviewed your daily log for ${workLog.date || 'today'}.`, 'daily_log']
    );
    res.json({ workLog });
  } catch { res.status(500).json({ error: 'Could not mark this work log as seen.' }); }
});

// GET /api/announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await querySQL('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(announcements);
  } catch (err) {
    res.json([]);
  }
});

// POST /api/announcements
app.post('/api/announcements', async (req, res) => {
  const { title, content, category, priority, author } = req.body;
  try {
    const ancId = `anc-${Date.now()}`;
    await querySQL(
      `INSERT INTO announcements (id, title, content, category, priority, author)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ancId, title, content, category || 'General', priority || 'Normal', author || 'HR Team']
    );
    const created = await querySQL('SELECT * FROM announcements WHERE id = ?', [ancId]);
    res.json({ message: "Announcement published successfully.", announcement: created[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to publish announcement." });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  const { userRole } = req.body || {};
  if (!['SUPER_ADMIN', 'HR'].includes(userRole)) return res.status(403).json({ error: 'Only the founder or HR can delete announcements.' });
  try {
    await querySQL('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: 'Could not delete this announcement.' }); }
});

// GET /api/events
app.get('/api/events', async (req, res) => {
  try {
    const events = await querySQL('SELECT * FROM company_events ORDER BY date ASC');
    res.json(events);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/audit-logs
app.get(['/api/audit-logs', '/api/audit'], async (req, res) => {
  try {
    const logs = await querySQL('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
    res.json(logs);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/workload
app.get('/api/workload', async (req, res) => {
  try {
    const fullTime = await querySQL('SELECT COUNT(*) as count FROM users WHERE role = "FULL_TIME"');
    const interns = await querySQL('SELECT COUNT(*) as count FROM users WHERE role = "INTERN"');
    const ceo = await querySQL('SELECT COUNT(*) as count FROM users WHERE role = "SUPER_ADMIN"');
    const hr = await querySQL('SELECT COUNT(*) as count FROM users WHERE role = "HR"');

    res.json({
      full_time_staff: { count: fullTime[0]?.count || 0, active_deliverables: 0, label: "Full-Time Senior Devs" },
      interns: { count: interns[0]?.count || 0, active_deliverables: 0, label: "Software Engineer Interns" },
      ceo: { count: ceo[0]?.count || 0, active_deliverables: 0, label: "CEO & Leadership" },
      hr_admins: { count: hr[0]?.count || 0, active_deliverables: 0, label: "HR Operations" }
    });
  } catch (err) {
    res.json({
      full_time_staff: { count: 2, active_deliverables: 0, label: "Full-Time Senior Devs" },
      interns: { count: 1, active_deliverables: 0, label: "Software Engineer Interns" },
      ceo: { count: 1, active_deliverables: 0, label: "CEO & Leadership" },
      hr_admins: { count: 1, active_deliverables: 0, label: "HR Operations" }
    });
  }
});

// Start Express Application & Connect to MySQL
app.listen(PORT, async () => {
  console.log(`🚀 Prolync LivePresence HRMS Server starting on port ${PORT}...`);
  await initMySQLPool();
});
