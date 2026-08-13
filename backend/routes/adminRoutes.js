import express from 'express';
import { querySQL } from '../db.js';
import { sendEmail, verifySmtpConnection } from '../services/emailService.js';

const router = express.Router();

// GET /api/admin/company
router.get('/company', async (req, res) => {
  try {
    const rows = await querySQL('SELECT * FROM company_settings LIMIT 1');
    res.json((rows && rows.length > 0) ? rows[0] : {});
  } catch (err) {
    console.error('Error fetching company settings:', err);
    res.status(500).json({ error: "Failed to fetch company settings." });
  }
});

// PUT /api/admin/company
router.put('/company', async (req, res) => {
  const { company_name, tax_id, headquarters, currency, fiscal_year, office_name, latitude, longitude, radius_meters } = req.body;

  try {
    const name = company_name || 'Prolync Infotech Pvt. Ltd.';
    const tax = tax_id || 'GSTIN33AAACN1298E1Z4';
    const hq = headquarters || 'Kilambakkam, Vandalur, Tamil Nadu';
    const curr = currency || 'INR (₹)';
    const fy = fiscal_year || '2026-2027';
    const offName = office_name || 'Prolync HQ (Vandalur, Tamil Nadu)';
    const lat = parseFloat(latitude || 12.871133);
    const lng = parseFloat(longitude || 80.083898);
    const rad = parseInt(radius_meters || 50, 10);

    await querySQL(
      `INSERT INTO company_settings (id, company_name, tax_id, headquarters, currency, fiscal_year, office_name, latitude, longitude, radius_meters)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), tax_id=VALUES(tax_id), headquarters=VALUES(headquarters), currency=VALUES(currency), fiscal_year=VALUES(fiscal_year), office_name=VALUES(office_name), latitude=VALUES(latitude), longitude=VALUES(longitude), radius_meters=VALUES(radius_meters)`,
      [name, tax, hq, curr, fy, offName, lat, lng, rad]
    );

    const updated = await querySQL('SELECT * FROM company_settings WHERE id = 1');
    res.json({ message: "Company settings updated.", company_settings: updated[0] });
  } catch (err) {
    console.error('Error updating company settings:', err);
    res.status(500).json({ error: "Failed to update company settings." });
  }
});

// GET /api/admin/branches
router.get('/branches', async (req, res) => {
  try {
    const branches = await querySQL('SELECT * FROM branches ORDER BY created_at ASC');
    res.json(branches);
  } catch (err) {
    console.error('Error fetching branches:', err);
    res.status(500).json({ error: "Failed to fetch branches." });
  }
});

// GET /api/admin/departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await querySQL('SELECT * FROM departments ORDER BY created_at ASC');
    res.json(departments);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: "Failed to fetch departments." });
  }
});

// GET /api/admin/roles
router.get('/roles', async (req, res) => {
  try {
    const roles = await querySQL('SELECT * FROM roles ORDER BY id ASC');
    res.json(roles);
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ error: "Failed to fetch roles." });
  }
});

// GET /api/admin/locations
router.get('/locations', async (req, res) => {
  try {
    const locations = await querySQL('SELECT * FROM office_locations ORDER BY created_at DESC');
    res.json(locations);
  } catch (err) {
    console.error('Error fetching office locations:', err);
    res.status(500).json({ error: "Failed to fetch office locations." });
  }
});

// POST /api/admin/locations
router.post('/locations', async (req, res) => {
  const { name, address, city, state, postalCode, latitude, longitude, branchCode, description } = req.body;

  try {
    const locId = `loc-${Date.now()}`;
    await querySQL(
      `INSERT INTO office_locations (id, name, address, city, state, country, postal_code, latitude, longitude, time_zone, weekly_off_pattern, branch_code, description, active)
       VALUES (?, ?, ?, ?, ?, 'India', ?, ?, ?, 'IST (UTC+05:30)', 'Saturday & Sunday', ?, ?, 1)`,
      [
        locId, name, address || '', city || '', state || '',
        postalCode || '', parseFloat(latitude || 12.871133), parseFloat(longitude || 80.083898),
        branchCode || 'HQ-01', description || ''
      ]
    );

    const created = await querySQL('SELECT * FROM office_locations WHERE id = ?', [locId]);
    res.json({ message: "Office location added successfully.", location: created[0] });
  } catch (err) {
    console.error('Error adding office location:', err);
    res.status(500).json({ error: "Failed to add office location." });
  }
});

// GET /api/admin/smtp
router.get('/smtp', async (req, res) => {
  try {
    const rows = await querySQL('SELECT * FROM smtp_config LIMIT 1');
    const smtp = (rows && rows.length > 0) ? rows[0] : {
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      user: process.env.SMTP_USER || 'careers@prolync.in',
      pass: '',
      sender_name: process.env.SMTP_FROM_NAME || 'Prolync LiveSpace',
      sender_email: process.env.SMTP_FROM || process.env.SMTP_USER || 'careers@prolync.in',
      secure: 1,
      enabled: 1
    };
    // Credentials must never be exposed to the browser. The UI only needs to
    // know whether a password has been configured.
    const { pass, ...safeSmtp } = smtp;
    res.json({ ...safeSmtp, has_password: Boolean((pass || process.env.SMTP_PASS || '').trim()) });
  } catch (err) {
    console.error('Error fetching SMTP config:', err);
    res.status(500).json({ error: "Failed to fetch SMTP configuration." });
  }
});

// PUT /api/admin/smtp
router.put('/smtp', async (req, res) => {
  const { host, port, user, pass, sender_name, sender_email, secure, enabled } = req.body;

  try {
    const existingRows = await querySQL('SELECT * FROM smtp_config WHERE id = 1 LIMIT 1');
    const existing = existingRows?.[0] || {};
    const h = host || existing.host || 'smtp.hostinger.com';
    const p = parseInt(port || existing.port || 465, 10);
    const u = (user || '').trim();
    // A blank password in the settings form means "keep the existing secret".
    const pwd = (pass || '').trim() || existing.pass || '';
    const sn = sender_name || existing.sender_name || 'Prolync LiveSpace';
    const se = (sender_email || u).trim();
    const sec = port === 465 || secure === true || secure === 1 ? 1 : 0;
    const en = enabled !== false ? 1 : 0;

    await querySQL(
      `INSERT INTO smtp_config (id, host, port, user, pass, sender_name, sender_email, secure, enabled)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE host=VALUES(host), port=VALUES(port), user=VALUES(user), pass=VALUES(pass), sender_name=VALUES(sender_name), sender_email=VALUES(sender_email), secure=VALUES(secure), enabled=VALUES(enabled)`,
      [h, p, u, pwd, sn, se, sec, en]
    );

    const updated = await querySQL('SELECT * FROM smtp_config WHERE id = 1');
    const { pass: _password, ...safeUpdated } = updated[0] || {};
    res.json({ message: "SMTP configuration updated successfully.", smtp_config: { ...safeUpdated, has_password: Boolean((pwd || process.env.SMTP_PASS || '').trim()) } });
  } catch (err) {
    console.error('Error updating SMTP config:', err);
    res.status(500).json({ error: "Failed to update SMTP configuration." });
  }
});

// POST /api/admin/smtp/test
router.post('/smtp/test', async (req, res) => {
  const config = req.body;
  const result = await verifySmtpConnection(config);
  if (result.success) res.json(result);
  else res.status(400).json(result);
});

// POST /api/admin/smtp/test-email
router.post('/smtp/test-email', async (req, res) => {
  const targetEmail = String(req.body?.targetEmail || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(targetEmail)) {
    return res.status(400).json({ error: 'A valid test email address is required.' });
  }

  try {
    const result = await sendEmail({
      to: targetEmail,
      customSubject: 'Prolync LiveSpace SMTP test',
      customBody: '<p>This confirms that your Prolync LiveSpace email delivery is configured correctly.</p>'
    });

    if (result.status === 'Delivered (Live SMTP)') {
      return res.json({ message: `Test email sent to ${targetEmail}.`, status: result.status });
    }

    return res.status(400).json({
      error: 'Test email was not delivered.',
      message: result.status,
      status: result.status
    });
  } catch (err) {
    console.error('Error sending SMTP test email:', err);
    return res.status(500).json({ error: 'Unable to send test email.' });
  }
});

// GET /api/admin/email-logs
router.get('/email-logs', async (req, res) => {
  try {
    const logs = await querySQL('SELECT * FROM email_logs ORDER BY sent_at DESC');
    res.json(logs);
  } catch (err) {
    console.error('Error fetching email logs:', err);
    res.status(500).json({ error: "Failed to fetch email logs." });
  }
});

export default router;
