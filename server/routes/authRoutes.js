import express from 'express';
import crypto from 'crypto';
import { getData, saveData } from '../db.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Helper: scrypt password hashing
function hashPassword(password, salt = 'prolync_salt_2026') {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getData();

  if (!username || !password) {
    return res.status(400).json({ error: "Username/Email and Password are required." });
  }

  const user = db.users.find(u =>
    u.email.toLowerCase() === username.trim().toLowerCase() ||
    u.employee_id.toLowerCase() === username.trim().toLowerCase()
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials. User not found." });
  }

  const hashedInput = hashPassword(password);
  const isMatch = user.password === password || user.password === hashedInput || (password === 'Prolync' && user.password === 'Prolync');

  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials. Incorrect password." });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    message: "Login successful",
    user: userWithoutPassword
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const db = getData();

  const user = db.users.find(u => u.email.toLowerCase() === (email || '').trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "No account found with this email address." });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const resetToken = {
    email: user.email,
    code: otpCode,
    expiresAt: Date.now() + 30 * 60 * 1000
  };

  if (!db.password_resets) db.password_resets = [];
  db.password_resets = db.password_resets.filter(r => r.email !== user.email);
  db.password_resets.push(resetToken);
  saveData(db);

  await sendEmail({
    to: user.email,
    template: 'password_reset',
    data: { name: user.name, code: otpCode }
  });

  res.json({ message: "Verification code sent to your email address." });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  const db = getData();

  const resetRecord = (db.password_resets || []).find(r => r.email === email && r.code === code);

  if (!resetRecord || resetRecord.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired verification code." });
  }

  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "User record not found." });

  user.password = hashPassword(newPassword);
  user.active = true;
  user.verified_employee = true;

  db.password_resets = db.password_resets.filter(r => r.email !== email);
  saveData(db);

  res.json({ message: "Password updated successfully. You can now log in." });
});

// POST /api/auth/activate-account
router.post('/activate-account', async (req, res) => {
  const { code, email, newPassword } = req.body;
  const db = getData();

  const user = db.users.find(u =>
    (u.email || '').toLowerCase() === (email || '').trim().toLowerCase() ||
    u.activation_code === code
  );

  if (!user) {
    return res.status(400).json({ error: "Invalid activation code or email address." });
  }

  user.password = hashPassword(newPassword);
  user.active = true;
  user.verified_employee = true;
  delete user.activation_code;
  saveData(db);

  await sendEmail({
    to: user.email,
    template: 'password_creation',
    data: { name: user.name, loginUrl: 'http://localhost:3000' }
  });

  res.json({ message: "Account activated successfully! You can now log in.", user });
});

export default router;
