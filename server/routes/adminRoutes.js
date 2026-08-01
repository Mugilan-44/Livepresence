import express from 'express';
import { getData, saveData } from '../db.js';
import { verifySmtpConnection, sendEmail } from '../services/emailService.js';

const router = express.Router();

// GET /api/admin/company
router.get('/company', (req, res) => {
  const db = getData();
  res.json(db.company_settings || {});
});

// PUT /api/admin/company
router.put('/company', (req, res) => {
  const db = getData();
  db.company_settings = { ...db.company_settings, ...req.body, updated_at: new Date().toISOString() };
  saveData(db);
  res.json({ message: "Company settings updated.", company_settings: db.company_settings });
});

// GET /api/admin/branches
router.get('/branches', (req, res) => {
  const db = getData();
  res.json(db.branches || []);
});

// GET /api/admin/departments
router.get('/departments', (req, res) => {
  const db = getData();
  res.json(db.departments || []);
});

// GET /api/admin/roles
router.get('/roles', (req, res) => {
  const db = getData();
  res.json(db.roles || []);
});

// GET /api/admin/locations
router.get('/locations', (req, res) => {
  const db = getData();
  res.json(db.office_locations || []);
});

// POST /api/admin/locations
router.post('/locations', (req, res) => {
  const { name, address, city, state, postalCode, latitude, longitude, branchCode, description } = req.body;
  const db = getData();

  const newLocation = {
    id: `loc-${Date.now()}`,
    name,
    address,
    city,
    state,
    country: 'India',
    postal_code: postalCode,
    latitude: parseFloat(latitude || 12.871133),
    longitude: parseFloat(longitude || 80.083898),
    time_zone: 'IST (UTC+05:30)',
    weekly_off_pattern: 'Saturday & Sunday',
    branch_code: branchCode || 'HQ-01',
    description,
    active: true,
    created_at: new Date().toISOString()
  };

  if (!db.office_locations) db.office_locations = [];
  db.office_locations.push(newLocation);
  saveData(db);

  res.json({ message: "Office location added successfully.", location: newLocation });
});

// GET /api/admin/smtp
router.get('/smtp', (req, res) => {
  const db = getData();
  const smtp = db.smtp_config || {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'mohammed.muzzammil.s@gmail.com',
    pass: process.env.SMTP_PASS || 'wevc kffx mrtm hyvo',
    sender_name: 'Prolync HR System',
    sender_email: process.env.SMTP_USER || 'mohammed.muzzammil.s@gmail.com',
    secure: false,
    enabled: true
  };
  res.json(smtp);
});

// PUT /api/admin/smtp
router.put('/smtp', (req, res) => {
  const { host, port, user, pass, sender_name, sender_email, secure, enabled } = req.body;
  const db = getData();

  db.smtp_config = {
    host: host || 'smtp.gmail.com',
    port: parseInt(port || 587, 10),
    user: (user || '').trim(),
    pass: (pass || '').trim(),
    sender_name: sender_name || 'Prolync HR System',
    sender_email: (sender_email || user || '').trim(),
    secure: !!secure,
    enabled: enabled !== false,
    updated_at: new Date().toISOString()
  };

  saveData(db);
  res.json({ message: "SMTP configuration updated successfully.", smtp_config: db.smtp_config });
});

// POST /api/admin/smtp/test
router.post('/smtp/test', async (req, res) => {
  const config = req.body;
  const result = await verifySmtpConnection(config);
  if (result.success) res.json(result);
  else res.status(400).json(result);
});

// GET /api/admin/email-logs
router.get('/email-logs', (req, res) => {
  const db = getData();
  res.json(db.email_logs || []);
});

export default router;
