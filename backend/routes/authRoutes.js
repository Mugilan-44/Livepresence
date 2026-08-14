import express from 'express';
import crypto from 'crypto';
import { querySQL } from '../db.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();
const activeSessions = new Map();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
// Kept in environment configuration in production. The fallback lets an existing
// local installation work while still making sessions survive a server restart.
const SESSION_SECRET = process.env.AUTH_SESSION_SECRET || process.env.JWT_SECRET || 'prolync-local-session-secret-change-before-production';

// Helper: scrypt password hashing
function hashPassword(password, salt = 'prolync_salt_2026') {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function passwordMatches(storedPassword, submittedPassword) {
  if (!storedPassword || !submittedPassword) return false;
  const hashedInput = hashPassword(submittedPassword);
  const stored = String(storedPassword);
  if (/^[a-f0-9]{128}$/i.test(stored)) {
    return crypto.timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(hashedInput, 'hex'));
  }
  // Existing accounts created before password hashing are supported once, then migrated below.
  return stored === submittedPassword;
}

function createSessionToken(userId) {
  const payload = Buffer.from(JSON.stringify({ userId: String(userId), expiresAt: Date.now() + SESSION_TTL_MS })).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readSignedSession(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session?.userId && Number(session.expiresAt) > Date.now() ? session : null;
  } catch {
    return null;
  }
}

async function verifyTurnstile(token, request) {
  const shouldEnforce = process.env.TURNSTILE_ENABLED === 'true'
    || process.env.TURNSTILE_ENFORCE_LOCAL === 'true';
  if (!shouldEnforce) return { success: true };
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { success: false };
  if (!token) return { success: false };
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: request.ip || '' });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(8000) });
    const result = await response.json();
    return { success: Boolean(result.success) && (!result.action || result.action === 'login') };
  } catch (error) {
    console.error('Turnstile validation failed:', error.message);
    return { success: false };
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password, turnstileToken } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username/Email and Password are required." });
  }

  try {
    const turnstile = await verifyTurnstile(turnstileToken, req);
    if (!turnstile.success) return res.status(403).json({ error: 'Security verification failed. Please complete the check and try again.' });
    const cleanUsername = username.trim().toLowerCase();
    const users = await querySQL(
      'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(employee_id) = ? LIMIT 1',
      [cleanUsername, cleanUsername]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials. User not found." });
    }

    const user = users[0];
    const isMatch = passwordMatches(user.password, password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials. Incorrect password." });
    }

    // Transparently upgrade legacy plaintext passwords after a successful sign-in.
    if (!/^[a-f0-9]{128}$/i.test(String(user.password || ''))) {
      await querySQL('UPDATE users SET password = ? WHERE id = ?', [hashPassword(password), user.id]);
    }

    const { password: _, ...safeUser } = user;
    const sessionToken = createSessionToken(user.id);
    activeSessions.set(sessionToken, { userId: String(user.id), expiresAt: Date.now() + SESSION_TTL_MS });
    res.json({
      message: 'Login successful.',
      token: sessionToken,
      user: safeUser
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : "Database error during authentication." });
  }
});

const resetAttempts = new Map();
const RESET_WINDOW_MS = 2 * 60 * 1000;
const RESET_EXPIRY_MS = 30 * 60 * 1000;
const CHANGE_PASSWORD_OTP_EXPIRY_MS = 10 * 60 * 1000;

function canRequestReset(email, request) {
  const key = `${String(email || '').trim().toLowerCase()}:${request.ip || 'unknown'}`;
  const previous = resetAttempts.get(key) || 0;
  if (Date.now() - previous < RESET_WINDOW_MS) return false;
  resetAttempts.set(key, Date.now());
  return true;
}

function publicResetResponse(res) {
  return res.json({ message: 'If that work email belongs to an account, a password reset link has been sent.' });
}

// POST /api/auth/forgot-password
// Always returns the same response to avoid revealing which company emails exist.
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Enter a valid work email address.' });
  if (!canRequestReset(email, req)) return publicResetResponse(res);

  try {
    const users = await querySQL('SELECT id, name, email FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
    if (!users?.length) return publicResetResponse(res);

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = Date.now() + RESET_EXPIRY_MS;
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/?resetToken=${encodeURIComponent(rawToken)}`;

    await querySQL('DELETE FROM password_resets WHERE email = ?', [email]);
    await querySQL(
      'INSERT INTO password_resets (email, code, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [email, 'link', tokenHash, expiresAt]
    );

    const delivery = await sendEmail({
      to: users[0].email,
      template: 'password_reset',
      data: { name: users[0].name, resetUrl }
    });
    if (!String(delivery.status || '').startsWith('Delivered')) {
      console.error(`Password reset email was not delivered for ${email}: ${delivery.status}`);
    }
  } catch (err) {
    console.error('Password reset request failed:', err.message);
  }
  return publicResetResponse(res);
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const token = String(req.body?.token || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!token || newPassword.length < 8) {
    return res.status(400).json({ error: 'Use the link from your email and choose a password with at least 8 characters.' });
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resets = await querySQL(
      'SELECT email FROM password_resets WHERE token_hash = ? AND expires_at > ? ORDER BY id DESC LIMIT 1',
      [tokenHash, Date.now()]
    );
    if (!resets?.length) return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });
    const email = resets[0].email;
    await querySQL('UPDATE users SET password = ?, verified_employee = 1 WHERE LOWER(email) = ?', [hashPassword(newPassword), email]);
    await querySQL('DELETE FROM password_resets WHERE email = ?', [email]);
    return res.json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('Password reset failed:', err.message);
    return res.status(500).json({ error: 'Could not reset your password right now.' });
  }
});

function getActiveSession(req, userId) {
  const token = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const session = activeSessions.get(token);
  if (session && session.expiresAt >= Date.now() && String(session.userId) === String(userId)) return session;
  if (session?.expiresAt < Date.now()) activeSessions.delete(token);

  const signedSession = readSignedSession(token);
  if (!signedSession || String(signedSession.userId) !== String(userId)) return null;
  activeSessions.set(token, signedSession);
  return signedSession;
}

// POST /api/auth/change-password/request-otp
// A signed-in person must prove control of their work email before changing a password.
router.post('/change-password/request-otp', async (req, res) => {
  const userId = String(req.body?.userId || '');
  if (!userId) return res.status(400).json({ error: 'Account details are required.' });
  if (!getActiveSession(req, userId)) return res.status(401).json({ error: 'Your session has expired. Sign in again before changing your password.' });
  if (!canRequestReset(`change-password:${userId}`, req)) return res.status(429).json({ error: 'Please wait two minutes before requesting another code.' });

  try {
    const users = await querySQL('SELECT id, name, email FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!users?.length) return res.status(404).json({ error: 'Account not found.' });

    const user = users[0];
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    await querySQL('DELETE FROM password_resets WHERE email = ?', [user.email.toLowerCase()]);
    await querySQL(
      'INSERT INTO password_resets (email, code, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [user.email.toLowerCase(), 'change-password', otpHash, Date.now() + CHANGE_PASSWORD_OTP_EXPIRY_MS]
    );

    const delivery = await sendEmail({
      to: user.email,
      template: 'password_change_otp',
      data: { name: user.name, otp, expiresIn: 10 }
    });
    if (!String(delivery.status || '').startsWith('Delivered')) {
      console.error(`Password-change OTP email was not delivered for ${user.email}: ${delivery.status}`);
      return res.status(503).json({ error: 'The verification email could not be sent. Please try again shortly.' });
    }
    return res.json({ message: `A six-digit verification code was sent to ${user.email}. It expires in 10 minutes.` });
  } catch (err) {
    console.error('Password-change OTP request failed:', err);
    return res.status(500).json({ error: 'Could not send a verification code right now.' });
  }
});

// POST /api/auth/change-password
// A signed-in person can change only their own password after verifying the email OTP.
router.post('/change-password', async (req, res) => {
  const { userId, newPassword, otp } = req.body || {};
  if (!userId || !newPassword || !otp) {
    return res.status(400).json({ error: 'Enter your new password and the six-digit verification code.' });
  }
  if (String(newPassword).length < 8) return res.status(400).json({ error: 'Use at least 8 characters for your new password.' });
  if (!/^\d{6}$/.test(String(otp))) return res.status(400).json({ error: 'Enter the six-digit verification code from your email.' });
  if (!getActiveSession(req, userId)) return res.status(401).json({ error: 'Your session has expired. Sign in again before changing your password.' });

  try {
    const users = await querySQL('SELECT id, email FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!users?.length) return res.status(404).json({ error: 'Account not found.' });
    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
    const matches = await querySQL(
      "SELECT id FROM password_resets WHERE email = ? AND code = 'change-password' AND token_hash = ? AND expires_at > ? ORDER BY id DESC LIMIT 1",
      [String(users[0].email).toLowerCase(), otpHash, Date.now()]
    );
    if (!matches?.length) return res.status(400).json({ error: 'That verification code is invalid or has expired. Request a new code.' });
    await querySQL('UPDATE users SET password = ?, verified_employee = 1 WHERE id = ?', [hashPassword(newPassword), userId]);
    await querySQL('DELETE FROM password_resets WHERE email = ?', [String(users[0].email).toLowerCase()]);
    res.json({ message: 'Your password has been changed successfully.' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Could not change your password right now.' });
  }
});

export default router;
