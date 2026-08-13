import express from 'express';
import { querySQL } from '../db.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const projects = await querySQL('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: "Failed to fetch projects." });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  const { title, client, budget, deadline, lead, leadName, status, createdBy, creatorName } = req.body;
  if (!title?.trim() || !deadline) return res.status(400).json({ error: 'A project title and completion date are required.' });

  try {
    const projectId = `prj-${Date.now()}`;
    await querySQL(
      `INSERT INTO projects (id, title, client, budget, deadline, \`lead\`, status, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId, title, client || 'Prolync Global',
        budget || '₹0', deadline,
        leadName || lead || 'Prolync Team', status || 'Active', createdBy || null, creatorName || leadName || lead || 'Prolync Team'
      ]
    );

    const created = await querySQL('SELECT * FROM projects WHERE id = ?', [projectId]);
    res.json({ message: "Project created successfully.", project: created[0] });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: "Failed to create project." });
  }
});

// GET /api/projects/tasks
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await querySQL('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

// POST /api/projects/tasks
router.post('/tasks', async (req, res) => {
  const { title, projectId, projectTitle, assigneeId, assigneeName, dueDate, priority, userRole } = req.body;
  if (!title?.trim() || !dueDate) return res.status(400).json({ error: 'A task title and completion date are required.' });
  if (!['SUPER_ADMIN', 'MANAGER'].includes(userRole)) return res.status(403).json({ error: 'Only Founder and Manager can assign work.' });

  try {
    const taskId = `tsk-${Date.now()}`;
    await querySQL(
      `INSERT INTO tasks (id, project_id, project_title, title, assigned_to, assigned_to_name, due_date, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Research and planning')`,
      [taskId, projectId || null, projectTitle || '', title, assigneeId || null, assigneeName || '', dueDate || null, priority || 'Medium']
    );

    const created = await querySQL('SELECT * FROM tasks WHERE id = ?', [taskId]);

    if (assigneeId) {
      const users = await querySQL('SELECT * FROM users WHERE id = ? LIMIT 1', [assigneeId]);
      if (users && users.length > 0) {
        await sendEmail({
          to: users[0].email,
          template: 'task_assigned',
          data: { assigneeName: users[0].name, taskTitle: title, projectTitle, dueDate, priority }
        });
      }
    }

    res.json({ message: "Task assigned successfully.", task: created[0] });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: "Failed to create task." });
  }
});

// GET /api/projects/work-logs
router.get('/work-logs', async (req, res) => {
  try {
    const logs = await querySQL('SELECT * FROM work_logs ORDER BY created_at DESC');
    res.json(logs);
  } catch (err) {
    console.error('Error fetching work logs:', err);
    res.status(500).json({ error: "Failed to fetch work logs." });
  }
});

// POST /api/projects/work-logs
router.post('/work-logs', async (req, res) => {
  const { userId, userName, projectTitle, taskTitle, hoursSpent, summary } = req.body;

  try {
    const logId = `wl-${Date.now()}`;
    const logDate = new Date().toISOString().split('T')[0];

    await querySQL(
      `INSERT INTO work_logs (id, user_id, user_name, project_title, task_title, hours_spent, summary, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, userId, userName, projectTitle, taskTitle, parseFloat(hoursSpent || 8), summary || '', logDate]
    );

    const created = await querySQL('SELECT * FROM work_logs WHERE id = ?', [logId]);
    res.json({ message: "Work log submitted successfully.", workLog: created[0] });
  } catch (err) {
    console.error('Error submitting work log:', err);
    res.status(500).json({ error: "Failed to submit work log." });
  }
});

export default router;
