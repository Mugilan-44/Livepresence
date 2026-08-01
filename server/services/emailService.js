import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getData, saveData } from '../db.js';

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
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Use the 6-digit account activation code below to set up your password and complete your onboarding.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0891b2; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 3px 0; font-family: 'Inter', Arial, sans-serif; font-size: 13px;"><strong>Employee ID:</strong> ${data.employeeId || 'N/A'}</p>
          <p style="margin: 3px 0; font-family: 'Inter', Arial, sans-serif; font-size: 13px;"><strong>Activation Code:</strong> <span style="font-family: monospace; font-size: 20px; font-weight: 800; color: #0891b2; letter-spacing: 2px;">${data.code || ''}</span></p>
          <p style="margin: 14px 0 0 0;"><a href="${data.loginUrl || 'http://localhost:3000'}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 700; font-size: 13px;">Activate Account Now &rarr;</a></p>
        </div>
        <p style="color: #64748b; font-family: 'Inter', Arial, sans-serif; font-size: 12px;">This activation code is valid for 24 hours. Do not share this code with anyone.</p>
        ${closingSignature}
      `;
      break;

    case 'welcome':
      subject = `Welcome to Prolync LivePresence, ${data.name || 'Team Member'}!`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Welcome aboard, ${data.name || 'Team Member'}!</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">We are excited to have you join Prolync Infotech Pvt. Ltd.! Your employment profile is now active on <strong>Prolync LivePresence</strong>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0891b2; padding: 18px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 4px 0; font-family: 'Inter', Arial, sans-serif; font-size: 13px;"><strong>Employee ID:</strong> ${data.employeeId || 'N/A'}</p>
          <p style="margin: 4px 0; font-family: 'Inter', Arial, sans-serif; font-size: 13px;"><strong>Work Email:</strong> ${data.email || ''}</p>
          <p style="margin: 12px 0 0 0;"><a href="${data.loginUrl || 'http://localhost:3000'}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 700; font-size: 13px;">Open Prolync LivePresence</a></p>
        </div>
        ${closingSignature}
      `;
      break;

    case 'otp_verification':
      subject = `Security Verification Code – Prolync LivePresence`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Security Verification Code</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Dear ${data.name || 'User'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Please use the 6-digit verification code below to authorize your action on Prolync LivePresence.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0891b2; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: 6px;">${data.code || ''}</span>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">Valid for 15 minutes</p>
        </div>
        ${closingSignature}
      `;
      break;

    case 'password_creation':
      subject = `Password Set Successfully – Prolync LivePresence`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Password Configured Successfully</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Dear ${data.name || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your password for Prolync LivePresence has been set successfully. You can now log in anytime to access your dashboard, attendance, and leaves.</p>
        <div style="margin: 20px 0;">
          <a href="${data.loginUrl || 'http://localhost:3000'}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 700; font-size: 13px;">Log In to Prolync LivePresence</a>
        </div>
        ${closingSignature}
      `;
      break;

    case 'password_reset':
      subject = 'Password Reset Verification Code – Prolync LivePresence';
      body = `
        <p style="margin: 0 0 14px; font-size: 14px; font-weight: 600; color: #0f172a; font-family: 'Inter', Arial, sans-serif;">Dear ${data.name || 'Team Member'},</p>
        <p style="margin: 0 0 14px; font-size: 14px; color: #334155; line-height: 1.6; font-family: 'Inter', Arial, sans-serif;">
          We received a request to reset your password for Prolync LivePresence.
          Please use the verification code below to proceed. This code is valid for <strong>30 minutes</strong>.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0891b2; border-radius: 8px; padding: 22px 28px; text-align: center; margin: 20px 0;">
          <p style="margin: 0 0 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">Your Verification Code</p>
          <p style="margin: 0; font-size: 34px; font-weight: 800; letter-spacing: 0.35em; color: #0f172a; font-family: monospace;">${data.code || ''}</p>
          <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8;">Valid for 30 minutes from time of issue</p>
        </div>
        <p style="font-size: 12px; color: #78350f; background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 6px; line-height: 1.6;">
          <strong>Security Notice:</strong> If you did not initiate this password reset, please disregard this email. Your account remains secure.
        </p>
        ${closingSignature}
      `;
      break;

    case 'leave_submitted':
      subject = `Leave Request Submitted: ${data.leaveType || 'Leave'} (${data.startDate} to ${data.endDate})`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Leave Application Received</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your application for <strong>${data.leaveType}</strong> from <strong>${data.startDate}</strong> to <strong>${data.endDate}</strong> has been submitted to management for review.</p>
        <p style="color: #64748b; font-family: 'Inter', Arial, sans-serif; font-size: 13px;">Reason: <em>${data.reason || 'No reason specified'}</em></p>
        ${closingSignature}
      `;
      break;

    case 'leave_approved':
      subject = `[APPROVED] Leave Request for ${data.startDate} to ${data.endDate}`;
      body = `
        <h3 style="color: #16a34a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Leave Request Approved</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your <strong>${data.leaveType || 'Leave'}</strong> request from <strong>${data.startDate}</strong> to <strong>${data.endDate}</strong> has been approved by <strong>${data.reviewedBy || 'Management'}</strong>.</p>
        ${data.reviewNotes ? `<p style="color: #475569; font-family: 'Inter', Arial, sans-serif; font-size: 13px;"><strong>Notes:</strong> ${data.reviewNotes}</p>` : ''}
        ${closingSignature}
      `;
      break;

    case 'leave_rejected':
      subject = `[REJECTED] Leave Request for ${data.startDate} to ${data.endDate}`;
      body = `
        <h3 style="color: #dc2626; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Leave Request Declined</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your <strong>${data.leaveType || 'Leave'}</strong> request from <strong>${data.startDate}</strong> to <strong>${data.endDate}</strong> could not be approved at this time.</p>
        ${data.reviewNotes ? `<p style="color: #dc2626; font-family: 'Inter', Arial, sans-serif; font-size: 13px;"><strong>Reason:</strong> ${data.reviewNotes}</p>` : ''}
        ${closingSignature}
      `;
      break;

    case 'leave_cancelled':
      subject = `[CANCELLED] Leave Request for ${data.startDate} to ${data.endDate}`;
      body = `
        <h3 style="color: #475569; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Leave Request Cancelled</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your <strong>${data.leaveType || 'Leave'}</strong> request from <strong>${data.startDate}</strong> to <strong>${data.endDate}</strong> has been cancelled. Any deducted leave balance has been restored.</p>
        ${closingSignature}
      `;
      break;

    case 'attendance_alert':
      subject = `Attendance Notification – Prolync LivePresence`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Attendance Alert</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">${data.message || 'Your daily attendance status has been updated on Prolync LivePresence.'}</p>
        ${closingSignature}
      `;
      break;

    case 'project_allocated':
      subject = `Project Assignment: ${data.projectTitle}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Project Assignment Notice</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">You have been assigned to project <strong>${data.projectTitle}</strong> as <strong>${data.roleInProject || 'Contributor'}</strong> with an allocation of <strong>${data.allocationPct || 100}%</strong>.</p>
        <p style="color: #64748b; font-family: 'Inter', Arial, sans-serif; font-size: 13px;">Duration: ${data.startDate || 'Immediate'} to ${data.endDate || 'Ongoing'}</p>
        ${closingSignature}
      `;
      break;

    case 'task_assigned':
      subject = `New Task Assignment: ${data.taskTitle}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Task Assigned to You</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.assigneeName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;"><strong>${data.assignerName || 'Manager'}</strong> assigned a new task to you under <strong>${data.projectTitle || 'Project'}</strong>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0891b2; padding: 16px; margin: 18px 0; border-radius: 6px;">
          <p style="margin: 0; font-weight: bold; color: #0f172a; font-size: 14px;">${data.taskTitle}</p>
          <p style="margin: 6px 0 0 0; color: #475569; font-size: 12px;">Due Date: ${data.dueDate || 'N/A'} | Priority: ${data.priority || 'Medium'}</p>
        </div>
        ${closingSignature}
      `;
      break;

    case 'task_updated':
      subject = `Task Status Update: ${data.taskTitle}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Task Status Updated</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.assigneeName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Task <strong>${data.taskTitle}</strong> status has been updated to <strong>${data.status}</strong>.</p>
        ${closingSignature}
      `;
      break;

    case 'task_completed':
      subject = `Task Completed: ${data.taskTitle}`;
      body = `
        <h3 style="color: #16a34a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Task Marked as Completed</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.assigneeName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Great job! Task <strong>${data.taskTitle}</strong> has been marked as completed and verified.</p>
        ${closingSignature}
      `;
      break;

    case 'rework_requested':
      subject = `[REWORK REQUIRED] Changes Requested for Task: ${data.taskTitle}`;
      body = `
        <h3 style="color: #d97706; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Rework Requested on Task</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.assigneeName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your task <strong>${data.taskTitle}</strong> requires revisions before final approval.</p>
        <div style="background: #fffbeb; border-left: 4px solid #d97706; padding: 16px; margin: 18px 0; border-radius: 6px;">
          <p style="margin: 0; font-weight: bold; color: #92400e; font-size: 13px;">Revision Comments from ${data.reviewedBy || 'Reviewer'}:</p>
          <p style="margin: 6px 0 0 0; color: #b45309; font-size: 13px;">${data.comments || 'Please revise work.'}</p>
        </div>
        ${closingSignature}
      `;
      break;

    case 'meeting_invitation':
      subject = `Meeting Invitation: ${data.meetingTitle || 'Sync Session'}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Meeting Invitation</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">You have been invited to a meeting: <strong>${data.meetingTitle || 'Team Meeting'}</strong>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0891b2; padding: 16px; margin: 18px 0; border-radius: 6px;">
          <p style="margin: 3px 0; font-size: 13px;"><strong>Date & Time:</strong> ${data.meetingTime || 'Scheduled'}</p>
          <p style="margin: 3px 0; font-size: 13px;"><strong>Organizer:</strong> ${data.organizer || 'Management'}</p>
          ${data.meetingUrl ? `<p style="margin: 10px 0 0 0;"><a href="${data.meetingUrl}" style="color: #0891b2; font-weight: 700; text-decoration: none;">Join Meeting Link &rarr;</a></p>` : ''}
        </div>
        ${closingSignature}
      `;
      break;

    case 'meeting_reminder':
      subject = `Reminder: ${data.meetingTitle || 'Upcoming Meeting'}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Upcoming Meeting Reminder</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">This is a reminder for your upcoming meeting: <strong>${data.meetingTitle || 'Team Sync'}</strong> scheduled at <strong>${data.meetingTime || 'Soon'}</strong>.</p>
        ${closingSignature}
      `;
      break;

    case 'employee_added':
      subject = `New Employee Record Created: ${data.name}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">New Employee Profile Created</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">A new employee profile has been created for <strong>${data.name}</strong> (${data.employeeId}) in the <strong>${data.department}</strong> department.</p>
        ${closingSignature}
      `;
      break;

    case 'role_changed':
      subject = `Role Permission Update – Prolync LivePresence`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Role & Access Permissions Updated</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Dear ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your system access role on Prolync LivePresence has been updated to <strong>${data.newRole}</strong>.</p>
        ${closingSignature}
      `;
      break;

    case 'wfh_approved':
      subject = `[APPROVED] Work From Home Pass for ${data.startDate} to ${data.endDate}`;
      body = `
        <h3 style="color: #16a34a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Work From Home Pass Approved</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif;">Hello ${data.userName || 'Team Member'},</p>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">Your remote Work From Home request from <strong>${data.startDate}</strong> to <strong>${data.endDate}</strong> has been approved.</p>
        ${closingSignature}
      `;
      break;

    case 'announcement_email':
      subject = `📢 Announcement: ${data.title}`;
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">${data.title}</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">${data.content}</p>
        <p style="color: #64748b; font-family: 'Inter', Arial, sans-serif; font-size: 12px; margin-top: 15px;">Published by ${data.author || 'Management'} on ${data.date || new Date().toISOString().split('T')[0]}</p>
        ${closingSignature}
      `;
      break;

    default:
      body = `
        <h3 style="color: #0f172a; font-family: 'Inter', Arial, sans-serif; margin-top: 0;">Prolync Notification</h3>
        <p style="color: #334155; font-family: 'Inter', Arial, sans-serif; line-height: 1.6;">${data.message || 'Notification from Prolync LivePresence.'}</p>
        ${closingSignature}
      `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${subject}</title>
    </head>
    <body style="background-color: #f1f5f9; margin: 0; padding: 20px; font-family: 'Inter', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        ${brandHeader}
        <div style="padding: 28px 30px;">
          ${body}
        </div>
        ${brandFooter}
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

// Utility: Translate raw SMTP error exceptions to friendly user messages
function parseSmtpError(err, host, user, port) {
  const msg = err.message || '';
  const response = err.response || '';
  const code = err.code || '';

  if (code === 'EAUTH' || response.includes('535') || msg.includes('Invalid login') || msg.includes('Username and Password not accepted')) {
    return `SMTP Authentication failed for '${user}'. Make sure 2FA is enabled on your Google account and you are using a 16-character Google App Password (not your normal Gmail password).`;
  }
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || msg.includes('timeout')) {
    return `Unable to connect to SMTP server ${host}:${port}. Please verify the host address and port (use 587 for TLS, 465 for SSL).`;
  }
  if (code === 'ENOTFOUND') {
    return `SMTP Server hostname '${host}' could not be resolved. Please verify the host domain name.`;
  }
  if (msg.includes('Greeting never received')) {
    return `SMTP Server ${host}:${port} connection timed out waiting for server greeting. Try port 587 (secure: false) or port 465 (secure: true).`;
  }
  return `SMTP Connection Failed: ${msg}`;
}

function getSmtpConfig() {
  const db = getData();
  const dbSmtp = db.smtp_config || {};

  const host = dbSmtp.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(dbSmtp.port || process.env.SMTP_PORT || 587, 10);
  const rawUser = dbSmtp.user || process.env.SMTP_USER || 'mohammed.muzzammil.s@gmail.com';
  const rawPass = dbSmtp.pass || process.env.SMTP_PASS || 'wevc kffx mrtm hyvo';

  const user = (rawUser || '').trim();
  const pass = (rawPass || '').replace(/\s+/g, ''); // Remove spaces from Google App Passwords
  const enabled = dbSmtp.enabled !== false;
  const sender_name = dbSmtp.sender_name || 'Prolync HR System';
  const sender_email = dbSmtp.sender_email || user;
  const isSecure = port === 465 || dbSmtp.secure === true;

  return { host, port, user, pass, enabled, sender_name, sender_email, isSecure };
}

export async function verifySmtpConnection(config = {}) {
  const defaults = getSmtpConfig();
  const host = config.host || defaults.host;
  const port = parseInt(config.port || defaults.port, 10);
  const user = (config.user || defaults.user).trim();
  const pass = (config.pass || defaults.pass).replace(/\s+/g, '');
  const isSecure = port === 465 || config.secure === true;

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

export async function sendEmail({ to, template, data = {}, customSubject, customBody }) {
  const smtp = getSmtpConfig();

  let subject = customSubject;
  let html = customBody;

  if (template) {
    const rendered = renderEmailTemplate(template, data);
    if (!subject) subject = rendered.subject;
    if (!html) html = rendered.html;
  }

  let sendStatus = 'Simulated (SMTP Disabled)';
  let errorDetails = null;

  // Real SMTP Dispatch via Nodemailer if SMTP is enabled & credentials present
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

      const logoPath = path.resolve(__dirname, '../../client/public/logo.png');
      const attachments = fs.existsSync(logoPath) ? [{
        filename: 'logo.png',
        path: logoPath,
        cid: 'prolync_logo'
      }] : [];

      await transporter.sendMail({
        from: senderHeader,
        to,
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
    console.log(`[SMTP SIMULATED ENGINE] Logged email "${subject}" to <${to}> (SMTP User/Pass missing or disabled)`);
  }

  const db = getData();
  const logEntry = {
    id: `eml-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    to,
    subject,
    template: template || 'custom',
    status: sendStatus,
    error: errorDetails,
    timestamp: new Date().toISOString(),
    sender: smtp.sender_email || smtp.user
  };

  if (!db.email_logs) db.email_logs = [];
  db.email_logs.unshift(logEntry);
  saveData(db);

  return { status: sendStatus, log: logEntry };
}
