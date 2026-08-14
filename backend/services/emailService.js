import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { querySQL } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function renderEmailTemplate(templateName, data = {}) {
  const brandHeader = `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 24px 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="vertical-align: middle; padding-right: 12px;">
            <img src="cid:prolync_logo" alt="Prolync Logo" style="width: 38px; height: 38px; display: block; border: 0; object-fit: contain;" />
          </td>
          <td style="vertical-align: middle; text-align: left;">
            <h2 style="color: #ffffff; margin: 0; font-family: 'Inter', Arial, sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Prolync <span style="color: #38bdf8;">LivePresence</span></h2>
          </td>
        </tr>
      </table>
      <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 11px; font-family: 'Inter', Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;">Prolync Infotech Pvt. Ltd. &nbsp;&bull;&nbsp; Enterprise Workforce Platform</p>
    </div>
  `;

  const closingSignature = `
    <p style="margin-top: 28px; color: #475569; font-family: 'Inter', Arial, sans-serif; font-size: 13px; line-height: 1.6;">
      Regards,<br/>
      <strong style="color: #0f172a;">Prolync Team</strong><br/>
      <span style="color: #0891b2; font-weight: 700;">Prolync LivePresence</span>
    </p>
  `;

  const brandFooter = `
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; font-family: 'Inter', Arial, sans-serif;">
      <p style="margin: 0 0 4px;">This is an automated operational notification from <strong>Prolync LivePresence</strong>.</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Prolync Infotech Pvt. Ltd. &nbsp;&bull;&nbsp; All Rights Reserved</p>
    </div>
  `;

  let body = '';
  let subject = 'System Notification - Prolync LivePresence';

  switch (templateName) {
    case 'invitation':
      subject = `Activate your Prolync LivePresence account, ${data.name || 'Team Member'}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Welcome aboard, ${data.name || 'Team Member'}!</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your employee profile has been created on Prolync LivePresence. For your security, administrators do not set or store your password.</p>
        <div style="background-color: #f1f5f9; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0 0 6px; font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #475569;"><strong>Employee ID:</strong> ${data.employeeId || 'EMP-100X'}</p>
          <p style="margin: 0; font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #475569;"><strong>One-Time Activation Code:</strong> <span style="font-family: monospace; font-size: 18px; font-weight: 800; color: #0369a1; letter-spacing: 2px;">${data.code || '123456'}</span></p>
        </div>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Please click the button below to set your secure password and activate your account:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${data.loginUrl || '#'}/activate?code=${data.code || ''}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-family: 'Inter', Arial, sans-serif; display: inline-block; font-size: 14px;">Set Password & Activate Account</a>
        </div>
      `;
      break;

    case 'password_reset':
      subject = `Reset your Prolync LiveSpace password`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Password Reset Request</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Hello ${data.name || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">We received a request to reset your password. Use the secure link below to choose a new password. The link expires in 30 minutes.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${data.resetUrl || '#'}" style="background-color: #b02562; color: #ffffff; padding: 13px 26px; text-decoration: none; border-radius: 8px; font-weight: 700; font-family: 'Inter', Arial, sans-serif; display: inline-block; font-size: 14px;">Reset my password</a>
        </div>
        <p style="color: #64748b; font-family: 'Inter', Arial, sans-serif; font-size: 12px; line-height: 1.5;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
      `;
      break;

    case 'password_change_otp':
      subject = 'Your Prolync LiveSpace password-change code';
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Confirm your password change</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Hello ${data.name || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Use this verification code in Prolync LiveSpace to confirm your new password:</p>
        <div style="margin: 24px 0; border: 1px solid #f1c6d8; background: #fff6f9; border-radius: 12px; padding: 18px; text-align: center;">
          <div style="font-family: monospace; font-size: 28px; font-weight: 800; letter-spacing: 8px; color: #b02562;">${data.otp || '000000'}</div>
        </div>
        <p style="color: #64748b; font-family: 'Inter', Arial, sans-serif; font-size: 12px; line-height: 1.5;">This code expires in ${data.expiresIn || 10} minutes and can be used only once. If you did not request a password change, ignore this email.</p>
      `;
      break;

    case 'leave_submitted':
      subject = `Leave Application Submitted: ${data.leaveType || 'Leave Request'}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Leave Application Received</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your leave application has been logged and sent for manager review.</p>
        <ul style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.8; padding-left: 20px;">
          <li><strong>Leave Type:</strong> ${data.leaveType || 'Casual Leave'}</li>
          <li><strong>Duration:</strong> ${data.startDate} to ${data.endDate}</li>
          <li><strong>Reason:</strong> ${data.reason || 'N/A'}</li>
        </ul>
      `;
      break;

    case 'leave_approved':
      subject = `✅ Approved: Leave Request (${data.leaveType || 'Leave'})`;
      body = `
        <h3 style="color: #166534; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Leave Request Approved</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your request for <strong>${data.leaveType}</strong> from <strong>${data.startDate}</strong> to <strong>${data.endDate}</strong> has been approved by ${data.reviewedBy || 'HR Operations'}.</p>
      `;
      break;

    case 'leave_rejected':
      subject = `❌ Declined: Leave Request (${data.leaveType || 'Leave'})`;
      body = `
        <h3 style="color: #991b1b; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Leave Request Declined</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your request for <strong>${data.leaveType}</strong> (${data.startDate} - ${data.endDate}) could not be approved at this time.</p>
        <p style="color: #475569; font-family: 'Inter', Arial, sans-serif; font-size: 13px;"><strong>Reason / Notes:</strong> ${data.reviewNotes || 'Project bandwidth restrictions.'}</p>
      `;
      break;

    case 'task_assigned':
      subject = `New Task Assigned: ${data.taskTitle || 'Task'}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Task Assignment Notification</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Hello ${data.assigneeName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">You have been assigned a new task in <strong>${data.projectTitle || 'Project'}</strong>.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #4f46e5; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="margin: 0 0 6px; font-family: 'Inter', Arial, sans-serif;"><strong>Task:</strong> ${data.taskTitle}</p>
          <p style="margin: 0 0 6px; font-family: 'Inter', Arial, sans-serif;"><strong>Priority:</strong> ${data.priority || 'Medium'}</p>
          <p style="margin: 0; font-family: 'Inter', Arial, sans-serif;"><strong>Due Date:</strong> ${data.dueDate || 'ASAP'}</p>
        </div>
      `;
      break;

    default:
      subject = data.subject || 'Prolync System Notice';
      body = `<p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">${data.message || 'System update notification.'}</p>`;
      break;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Inter', Arial, sans-serif; }
        </style>
      </head>
      <body>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <tr>
                  <td>
                    ${brandHeader}
                    <div style="padding: 30px 32px;">
                      ${body}
                      ${closingSignature}
                      ${brandFooter}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html: fullHtml };
}

function parseSmtpError(err, host, user, port) {
  const msg = err.message || '';
  const code = err.code || '';

  if (code === 'EAUTH' || msg.includes('535') || msg.includes('Authentication failed')) {
    return `Authentication failed for user '${user}'. Please verify your email and 16-character App Password.`;
  }
  if (code === 'ESOCKET' || code === 'ETIMEDOUT' || msg.includes('timeout')) {
    return `Unable to connect to SMTP server ${host}:${port}. Please verify host address and port.`;
  }
  if (code === 'ENOTFOUND') {
    return `SMTP Server hostname '${host}' could not be resolved.`;
  }
  return `SMTP Connection Failed: ${msg}`;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

async function getSmtpConfig() {
  try {
    const rows = await querySQL('SELECT * FROM smtp_config LIMIT 1');
    const dbSmtp = (rows && rows.length > 0) ? rows[0] : {};

    const envHost = String(process.env.SMTP_HOST || '').trim();
    const envUser = String(process.env.SMTP_USER || '').trim();
    const envPass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
    const envConfigured = Boolean(envHost && envUser && envPass);

    // Render's environment is the deployed source of truth. A stale smtp_config
    // row must not silently route OTPs through an old employee mailbox.
    const host = envConfigured ? envHost : String(dbSmtp.host || '').trim() || envHost;
    const port = envConfigured
      ? parseInt(process.env.SMTP_PORT || 465, 10)
      : parseInt(dbSmtp.port || process.env.SMTP_PORT || 465, 10);
    const rawUser = envConfigured ? envUser : (dbSmtp.user || envUser);
    const rawPass = envConfigured ? envPass : (dbSmtp.pass || envPass);

    const user = String(rawUser || '').trim();
    const pass = String(rawPass || '').replace(/\s+/g, '');
    const enabled = envConfigured
      ? parseBoolean(process.env.SMTP_ENABLED, true)
      : dbSmtp.enabled !== 0 && dbSmtp.enabled !== false;
    const sender_name = envConfigured
      ? String(process.env.SMTP_FROM_NAME || 'Prolync LiveSpace').trim()
      : (dbSmtp.sender_name || process.env.SMTP_FROM_NAME || 'Prolync HR System');
    const sender_email = envConfigured
      ? String(process.env.SMTP_FROM || user).trim()
      : (dbSmtp.sender_email || process.env.SMTP_FROM || user);
    const isSecure = port === 465 || parseBoolean(
      envConfigured ? process.env.SMTP_SECURE : dbSmtp.secure,
      false
    );

    return { host, port, user, pass, enabled, sender_name, sender_email, isSecure };
  } catch (e) {
    return {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || 465, 10),
      user: (process.env.SMTP_USER || '').trim(),
      pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
      enabled: parseBoolean(process.env.SMTP_ENABLED, true),
      sender_name: process.env.SMTP_FROM_NAME || 'Prolync HR System',
      sender_email: process.env.SMTP_FROM || process.env.SMTP_USER || '',
      isSecure: parseBoolean(process.env.SMTP_SECURE, false)
    };
  }
}

export async function verifySmtpConnection(config = {}) {
  const defaults = await getSmtpConfig();
  const host = config.host || defaults.host;
  const port = parseInt(config.port || defaults.port, 10);
  const user = (config.user || defaults.user).trim();
  const pass = (config.pass || defaults.pass).replace(/\s+/g, '');
  const isSecure = port === 465 || parseBoolean(config.secure, defaults.isSecure);

  if (!user || !pass) {
    return {
      success: false,
      error: "Missing Credentials",
      message: "SMTP Username and App Password / Secret are required before verification."
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    await transporter.verify();
    return {
      success: true,
      message: `Successfully connected & authenticated with ${host}:${port}!`
    };
  } catch (err) {
    console.error(`[SMTP VERIFICATION EXCEPTION] ${host}:${port}`, err);
    const friendlyMessage = parseSmtpError(err, host, user, port);

    return {
      success: false,
      error: "SMTP Verification Failed",
      message: friendlyMessage,
      details: err.message
    };
  }
}

export async function sendEmail({ to, template, data = {}, customSubject, customBody, replyTo }) {
  const smtp = await getSmtpConfig();

  let subject = customSubject;
  let html = customBody;

  if (template) {
    const rendered = renderEmailTemplate(template, data);
    if (!subject) subject = rendered.subject;
    if (!html) html = rendered.html;
  }

  let sendStatus = 'Simulated (SMTP Disabled)';
  let errorDetails = null;

  if (smtp.enabled && smtp.user && smtp.pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.isSecure,
        auth: {
          user: smtp.user,
          pass: smtp.pass
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000
      });

      const senderAddr = smtp.sender_email || smtp.user;
      const senderHeader = smtp.sender_name ? `"${smtp.sender_name}" <${senderAddr}>` : senderAddr;

      const logoPath = path.resolve(__dirname, '../../frontend/public/logo.png');
      const attachments = fs.existsSync(logoPath) ? [{
        filename: 'logo.png',
        path: logoPath,
        cid: 'prolync_logo'
      }] : [];

      await transporter.sendMail({
        from: senderHeader,
        to,
        replyTo: replyTo || undefined,
        subject,
        html,
        attachments
      });

      sendStatus = 'Delivered (Live SMTP)';
      console.log(`[LIVE SMTP SUCCESS] Sent email "${subject}" to <${to}> via ${smtp.host}`);
    } catch (err) {
      console.error(`[SMTP TRANSMISSION EXCEPTION] ${smtp.host}:`, err);
      const friendly = parseSmtpError(err, smtp.host, smtp.user, smtp.port);
      sendStatus = `Failed: ${friendly}`;
      errorDetails = friendly;
    }
  } else {
    console.log(`[SMTP SIMULATED ENGINE] Logged email "${subject}" to <${to}>`);
  }

  const logEntry = {
    id: `eml-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recipient: to,
    template: template || 'custom',
    status: sendStatus,
    sent_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    details: errorDetails || subject
  };

  try {
    await querySQL(
      `INSERT INTO email_logs (id, recipient, template, status, sent_at, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [logEntry.id, logEntry.recipient, logEntry.template, logEntry.status, logEntry.sent_at, logEntry.details]
    );
  } catch (e) {
    console.error('Failed to log email to MySQL:', e.message);
  }

  return { status: sendStatus, log: logEntry };
}
