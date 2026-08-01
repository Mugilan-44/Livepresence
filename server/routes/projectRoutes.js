import express from 'express';
import { getData, saveData } from '../db.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// GET /api/projects
router.get('/', (req, res) => {
  const db = getData();
  res.json(db.projects || []);
});

// POST /api/projects
router.post('/', (req, res) => {
  const { title, client, budget, deadline, lead, status } = req.body;
  const db = getData();

  const newProject = {
    id: `prj-${Date.now()}`,
    title,
    client: client || 'Prolync Global',
    budget: budget || '₹10,00,000',
    deadline: deadline || '2026-12-31',
    lead: lead || 'Mugilan S',
    status: status || 'Active',
    created_at: new Date().toISOString()
  };

  if (!db.projects) db.projects = [];
  db.projects.unshift(newProject);
  saveData(db);

  res.json({ message: "Project created successfully.", project: newProject });
});

// GET /api/projects/tasks
router.get('/tasks', (req, res) => {
  const db = getData();
  res.json(db.tasks || []);
});

// POST /api/projects/tasks
router.post('/tasks', async (req, res) => {
  const { title, projectId, projectTitle, assigneeId, assigneeName, dueDate, priority } = req.body;
  const db = getData();

  const newTask = {
    id: `tsk-${Date.now()}`,
    title,
    project_id: projectId,
    project_title: projectTitle,
    assignee_id: assigneeId,
    assignee_name: assigneeName,
    due_date: dueDate,
    priority: priority || 'Medium',
    status: 'To Do',
    created_at: new Date().toISOString()
  };

  if (!db.tasks) db.tasks = [];
  db.tasks.unshift(newTask);
  saveData(db);

  const assignee = db.users.find(u => u.id === assigneeId);
  if (assignee) {
    await sendEmail({
      to: assignee.email,
      template: 'task_assigned',
      data: { assigneeName: assignee.name, taskTitle: title, projectTitle, dueDate, priority }
    });
  }

  res.json({ message: "Task assigned successfully.", task: newTask });
});

// GET /api/projects/work-logs
router.get('/work-logs', (req, res) => {
  const db = getData();
  res.json(db.work_logs || []);
});

// POST /api/projects/work-logs
router.post('/work-logs', (req, res) => {
  const { userId, userName, projectTitle, taskTitle, hoursSpent, summary } = req.body;
  const db = getData();

  const newLog = {
    id: `wl-${Date.now()}`,
    user_id: userId,
    user_name: userName,
    project_title: projectTitle,
    task_title: taskTitle,
    hours_spent: parseFloat(hoursSpent || 8),
    summary,
    date: new Date().toISOString().split('T')[0]
  };

  if (!db.work_logs) db.work_logs = [];
  db.work_logs.unshift(newLog);
  saveData(db);

  res.json({ message: "Work log submitted successfully.", workLog: newLog });
});

export default router;
