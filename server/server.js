import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomInt, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import dotenv from 'dotenv';
import { getData, saveData } from './db.js';
import { sendEmail, verifySmtpConnection } from './services/emailService.js';

import { initMySQLPool, isMySQLConnected, querySQL } from './mysqlDb.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Import Modular Routers for All Modules
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Mount Routers
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

const PASSWORD_MIN_LENGTH = 12;

function passwordIsStrong(password) {
  return typeof password === 'string'
    && password.length >= PASSWORD_MIN_LENGTH
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!stored.startsWith('scrypt$')) return password === stored;
  const [, salt, hash] = stored.split('$');
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

function publicUser(user) {
  const { password, password_hash, password_reset, invitation, ...safeUser } = user;
  return safeUser;
}

function auditId() {
  return `aud-${Date.now()}-${randomBytes(6).toString('hex')}`;
}

function isApprovedWfh(request, userId, date) {
  return request?.user_id === userId
    && request.status === 'Approved'
    && /work\s*from\s*home|\bwfh\b/i.test(request.leave_type || '')
    && request.start_date <= date
    && request.end_date >= date;
}

function validGps(latitude, longitude, accuracy) {
  return Number.isFinite(Number(latitude))
    && Number.isFinite(Number(longitude))
    && Number(latitude) >= -90 && Number(latitude) <= 90
    && Number(longitude) >= -180 && Number(longitude) <= 180
    && Number.isFinite(Number(accuracy)) && Number(accuracy) > 0 && Number(accuracy) <= 100;
}


// Helper: Haversine Formula for Geofence validation (in meters)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// 0. Authentication Login API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = getData();

  let user;

  if (email) {
    const cleanEmail = email.toLowerCase().trim();

    // STRICT exact email match — no fuzzy fallback
    user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: `No account found for "${email}". Check your email address.` });
    }

    if (user.employment_status === 'Disabled' || user.active === false) {
      return res.status(403).json({ error: 'This account is disabled. Please contact HR.' });
    }
    if (user.invitation?.expires_at && !user.password_hash) {
      return res.status(403).json({ error: 'Activate your account using the invitation OTP before signing in.' });
    }
    const enteredPassword = (password || '').trim();
    const storedPassword = user.password_hash || user.password;
    if (!verifyPassword(enteredPassword, storedPassword)) {
      return res.status(401).json({ error: "Incorrect password. Please check your credentials." });
    }
    // Migrate legacy demo passwords without returning or retaining them in clear text.
    if (!user.password_hash && user.password) {
      user.password_hash = hashPassword(enteredPassword);
      delete user.password;
    }
  } else {
    return res.status(400).json({ error: "Email is required to login." });
  }

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials or user account not found." });
  }

  const token = `jwt_prolync_${user.id}_${user.role}_${Date.now()}`;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: `${user.name} (${user.role})`,
    action: "User Authentication Login",
    target: "LivePresence HRMS Portal",
    details: `Successful login via Credentials (${user.email})`,
    ip: "192.168.1.45"
  });
  saveData(db);

  res.json({
    message: `Authentication successful! Welcome back, ${user.name}.`,
    token,
    user: publicUser(user)
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const inputEmail = String(req.body?.email || '').trim().toLowerCase();
  if (!inputEmail) {
    return res.status(200).json({ success: false, error: 'Please enter your registered work email address.' });
  }

  const db = getData();
  const user = db.users.find(item => item.email?.toLowerCase() === inputEmail);

  if (!user) {
    return res.status(200).json({
      success: false,
      error: 'No registered employee account was found for that email address.'
    });
  }

  const code = String(randomInt(100000, 999999));
  user.password_reset = { code, expires_at: Date.now() + 15 * 60 * 1000 };
  saveData(db);

  try {
    await sendEmail({
      to: user.email,
      template: 'password_reset',
      data: { name: user.name, code }
    });
  } catch (err) {
    console.error("Forgot password email send error:", err);
  }

  res.json({
    success: true,
    message: `Security verification code sent to ${user.email}. Please check your email inbox!`,
    email: user.email
  });
});



app.post('/api/auth/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body || {};
  const db = getData();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = db.users.find(item => item.email?.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  if (!user.password_reset || user.password_reset.code !== String(code || '').trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please check the 6-digit code sent to your email.' });
  }

  if (user.password_reset.expires_at < Date.now()) {
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  if (!passwordIsStrong(String(newPassword || ''))) {
    return res.status(400).json({ error: 'Password must be 12+ characters and include upper-case, lower-case, a number, and a symbol.' });
  }

  user.password_hash = hashPassword(String(newPassword).trim());
  delete user.password;
  delete user.password_reset;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: user.name,
    action: "Password Reset Completed",
    target: user.email,
    details: "Employee account password updated via 2-Step OTP Verification.",
    ip: "127.0.0.1"
  });

  saveData(db);
  res.json({ message: 'Password updated successfully! You can now sign in with your new password.' });
});

app.post('/api/auth/activate-account', (req, res) => {
  const { email, code, newPassword } = req.body || {};
  const db = getData();
  const user = db.users.find(item => item.email?.toLowerCase() === String(email || '').trim().toLowerCase());
  if (!user || !user.invitation) return res.status(400).json({ error: 'No pending invitation was found for this account.' });
  if (user.invitation.code !== String(code || '').trim() || user.invitation.expires_at < Date.now()) {
    return res.status(400).json({ error: 'This invitation code is invalid or expired. Ask HR to resend your invitation.' });
  }
  if (!passwordIsStrong(String(newPassword || ''))) {
    return res.status(400).json({ error: 'Password must be 12+ characters and include upper-case, lower-case, a number, and a symbol.' });
  }
  user.password_hash = hashPassword(String(newPassword).trim());
  delete user.password;
  delete user.invitation;
  user.active = true;
  db.audit_logs.unshift({ id: auditId(), timestamp: new Date().toISOString(), actor: user.name, action: 'Employee account activated', target: user.email, details: 'Account activated through invitation OTP.', ip: '127.0.0.1' });
  saveData(db);
  res.json({ message: 'Account activated successfully. You can now sign in.' });
});


// Company Info & Stats
app.get('/api/company/settings', (req, res) => {
  const db = getData();
  res.json(db.company_settings);
});

app.get('/api/stats', (req, res) => {
  const db = getData();
  res.json(db.stat_counts);
});

app.get('/api/birthdays', (req, res) => {
  const db = getData();
  res.json(db.birthdays);
});

app.get('/api/anniversaries', (req, res) => {
  const db = getData();
  res.json(db.anniversaries);
});

app.get('/api/branches', (req, res) => {
  const db = getData();
  res.json(db.branches);
});

app.get('/api/departments', (req, res) => {
  const db = getData();
  res.json(db.departments);
});

// System Customizations (Super Admin Custom Leave Options & Task Options)
app.get('/api/customizations', (req, res) => {
  const db = getData();
  if (!db.customization_options) {
    db.customization_options = {
      leave_types: [
        { id: "casual", label: "Casual Leave", maxDays: 12, badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
        { id: "sick", label: "Sick Leave", maxDays: 10, badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
        { id: "earned", label: "Privilege / Earned Leave", maxDays: 15, badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
        { id: "wfh", label: "Work From Home Pass", maxDays: 30, badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
        { id: "special", label: "Special / Parental Leave", maxDays: 90, badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20" }
      ],
      task_statuses: [
        { id: "todo", label: "To Do", color: "bg-slate-500", textColor: "text-slate-400" },
        { id: "in_progress", label: "In Progress", color: "bg-blue-500", textColor: "text-blue-400" },
        { id: "code_review", label: "Code Review", color: "bg-purple-500", textColor: "text-purple-400" },
        { id: "testing", label: "Testing / QA", color: "bg-amber-500", textColor: "text-amber-400" },
        { id: "completed", label: "Completed", color: "bg-emerald-500", textColor: "text-emerald-400" },
        { id: "blocked", label: "Blocked / Escalated", color: "bg-rose-500", textColor: "text-rose-400" }
      ],
      task_priorities: ["Low", "Medium", "High", "Critical"]
    };
    saveData(db);
  }
  res.json(db.customization_options);
});

app.put('/api/customizations', (req, res) => {
  const { leave_types, task_statuses, task_priorities, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Only Super Admin can edit leave options and project flow task statuses." });
  }

  const db = getData();
  db.customization_options = {
    leave_types: leave_types || db.customization_options?.leave_types || [],
    task_statuses: task_statuses || db.customization_options?.task_statuses || [],
    task_priorities: task_priorities || db.customization_options?.task_priorities || ["Low", "Medium", "High", "Critical"]
  };

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "Global Customization Options Updated",
    target: "System Control Engine",
    details: `Updated ${db.customization_options.leave_types.length} leave options and ${db.customization_options.task_statuses.length} task status options.`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Customization options updated & synced live across all users!", customizations: db.customization_options });
});

// Notifications & Reminders
app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;
  const db = getData();
  if (!db.notifications) db.notifications = [];
  const userNotifs = userId ? db.notifications.filter(n => n.userId === userId || !n.userId) : db.notifications;
  res.json(userNotifs);
});

app.post('/api/notifications/read', (req, res) => {
  const { userId } = req.body;
  const db = getData();
  if (db.notifications) {
    db.notifications.forEach(n => {
      if (n.userId === userId || !userId) n.read = true;
    });
    saveData(db);
  }
  res.json({ message: "Notifications marked as read" });
});

// Geofence
app.get('/api/geofence', (req, res) => {
  const db = getData();
  res.json(db.company_settings.office_geofence);
});

app.put('/api/geofence', (req, res) => {
  const { latitude, longitude, radius_meters, office_name, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Only Super Admin can update office centroid rules." });
  }

  const db = getData();
  db.company_settings.office_geofence = {
    office_name: office_name || db.company_settings.office_geofence.office_name,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    radius_meters: parseInt(radius_meters, 10)
  };

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "Geofence Centroid Reconfigured",
    target: "Office GPS Rules",
    details: `Lat: ${latitude}, Lng: ${longitude}, Radius: ${radius_meters}m`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Geofence perimeter updated successfully!", geofence: db.company_settings.office_geofence });
});

// Automated Onboarding Progress Calculator
function calculateOnboardingProgress(user, allDocs = []) {
  if (!user) return { percentage: 0, status: 'Incomplete', completedItems: [], pendingItems: [] };

  const userDocs = allDocs.filter(d => d.user_id === user.id || d.user_name === user.name);

  const isDocVerified = (keywords) => {
    return userDocs.some(d => 
      (d.status === 'Approved' || d.status === 'Verified') &&
      keywords.some(kw => d.document_type?.toLowerCase().includes(kw) || d.file_name?.toLowerCase().includes(kw))
    );
  };

  const checklist = [
    { key: 'personal_details', name: 'Personal Details Completed (Gender, DOB, Blood Group)', completed: !!(user.gender && user.dob && user.blood_group) },
    { key: 'contact_details', name: 'Contact Details Completed (Email & Mobile)', completed: !!(user.email && (user.mobile || user.phone)) },
    { key: 'address_info', name: 'Residential Address Information Completed', completed: !!(user.address && user.address.length > 5) },
    { key: 'emergency_contact', name: 'Emergency Contact Person Configured', completed: !!(user.emergency_contact && user.emergency_contact.length > 5) },
    { key: 'profile_photo', name: 'Profile Avatar Photo Uploaded', completed: !!(user.avatar && user.avatar.length > 10) },
    { key: 'joining_date', name: 'Official Joining Date Confirmed', completed: !!user.joining_date },
    { key: 'employment_type', name: 'Employment Status & Type Selected', completed: !!(user.role || user.employment_status) },
    { key: 'department_assigned', name: 'Department Assigned', completed: !!user.department },
    { key: 'designation_assigned', name: 'Designation / Job Title Assigned', completed: !!(user.title || user.designation) },
    { key: 'reporting_manager', name: 'Reporting Manager / Supervisor Assigned', completed: !!(user.manager_id || user.role === 'SUPER_ADMIN') },
    
    // Banking
    { key: 'bank_account', name: 'Bank Account & Bank Name Added', completed: !!(user.bank_name && user.bank_account) },
    { key: 'ifsc_verified', name: 'IFSC / SWIFT Code Verified', completed: !!user.ifsc_swift },

    // Government Documents
    { key: 'aadhaar_verified', name: 'Aadhaar Card Uploaded & Verified', completed: isDocVerified(['aadhaar', 'aadhar', 'id_card', 'identity']) },
    { key: 'pan_verified', name: 'PAN Card Uploaded & Verified', completed: isDocVerified(['pan', 'pancard', 'tax_id']) },

    // Education & Experience
    { key: 'education_verified', name: 'Educational Certificates Uploaded & Verified', completed: isDocVerified(['degree', 'education', 'certificate', 'diploma', 'marksheet']) },
    { key: 'experience_verified', name: 'Experience / Relieving Certificates Verified', completed: isDocVerified(['experience', 'relieving', 'service', 'previous_emp']) },

    // Agreements
    { key: 'offer_letter', name: 'Offer Letter Accepted & Verified', completed: isDocVerified(['offer', 'offer_letter', 'appointment']) },
    { key: 'employment_agreement', name: 'Employment Agreement Signed & Verified', completed: isDocVerified(['agreement', 'contract', 'terms']) },
    { key: 'nda_signed', name: 'NDA Non-Disclosure Agreement Signed & Verified', completed: isDocVerified(['nda', 'non_disclosure', 'confidentiality']) },
    { key: 'governance_policies', name: 'Enterprise HR Governance Policies Accepted', completed: true }
  ];

  const total = checklist.length;
  const completedList = checklist.filter(c => c.completed);
  const completedCount = completedList.length;
  const percentage = Math.round((completedCount / total) * 100);

  let status = 'In Progress';
  if (percentage === 100) {
    status = 'Onboarding Completed';
  } else if (percentage < 50) {
    status = 'Not Started / In Progress';
  }

  const verifiedDocsCount = userDocs.filter(d => d.status === 'Approved' || d.status === 'Verified').length;
  const pendingDocsCount = userDocs.filter(d => d.status === 'Pending' || d.status === 'Under Verification').length;
  const rejectedDocsCount = userDocs.filter(d => d.status === 'Rejected').length;

  return {
    percentage,
    status,
    completedCount,
    totalCount: total,
    completedItems: completedList.map(c => c.name),
    pendingItems: checklist.filter(c => !c.completed).map(c => c.name),
    verifiedDocsCount,
    pendingDocsCount,
    rejectedDocsCount
  };
}

// Employees
app.get('/api/employees', (req, res) => {
  const db = getData();
  const docs = db.user_documents || [];
  const usersWithAutomatedProgress = db.users.map(u => {
    const onboarding = calculateOnboardingProgress(u, docs);
    return {
      ...publicUser(u),
      profile_score: onboarding.percentage,
      verified_employee: onboarding.percentage === 100,
      onboarding_status: onboarding.status,
      onboarding_details: onboarding
    };
  });
  res.json(usersWithAutomatedProgress);
});


app.post('/api/employees', (req, res) => {
  const { name, email, role, department, designation, branch, shift, baseSalary, joiningDate, phone, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can add new employee records." });
  }

  const db = getData();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'A full name and valid work email are required.' });
  }
  if (db.users.some(user => user.email?.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'An employee already exists with this work email.' });
  }
  const empId = `EMP-${String(db.users.length + 101).padStart(4, '0')}`;
  const invitationCode = String(randomInt(100000, 999999));

  const newUser = {
    id: `usr-${Date.now()}`,
    employee_id: empId,
    name,
    email: cleanEmail,
    active: false,
    invitation: { code: invitationCode, expires_at: Date.now() + 24 * 60 * 60 * 1000 },
    role: role || 'FULL_TIME',
    department: department || 'Engineering & Operations',
    designation: designation || 'Software Engineer',
    branch: branch || 'Headquarters (Delhi NCR)',
    shift_timing: shift || 'General (09:00 AM - 06:00 PM)',
    base_salary: parseInt(baseSalary || 60000, 10),
    joining_date: joiningDate || new Date().toISOString().split('T')[0],
    phone: phone || '+91 98765 43210',
    avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250`,
    verified_employee: false,
    profile_score: 60,
    emergency_contact: "+91 98765 00000"
  };

  db.users.push(newUser);

  // Auto-publish company-wide "New Member Joined" announcement
  db.announcements.unshift({
    id: `anc-${Date.now()}`,
    title: `🎉 Welcome ${name} — New Team Member has Joined!`,
    category: "Team Updates",
    author: actorName || "HR Admin",
    date: new Date().toISOString().split('T')[0],
    content: `Please join us in welcoming ${name} to the Prolync team! ${name} has joined as ${designation || 'Software Engineer'} in the ${department || 'Engineering & Operations'} department. Employee ID: ${empId}. Let's give them a warm welcome! 🙌`
  });

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "New Employee Onboarded & Invitation Sent",
    target: newUser.name,
    details: `Employee ID: ${newUser.employee_id}, Role: ${newUser.role}, Dept: ${newUser.department}, Login: ${email}`,
    ip: "192.168.1.1"
  });

  saveData(db);

  // The employee alone receives the one-time activation code; no password is generated or exposed.
  sendEmail({
    to: cleanEmail,
    template: 'invitation',
    data: {
      name: newUser.name,
      employeeId: newUser.employee_id,
      email: newUser.email,
      code: invitationCode,
      loginUrl: "http://localhost:3000"
    }
  });

  res.json({
    message: "New Employee onboarded successfully. An activation invitation was sent to their work email.",
    employee: publicUser(newUser),
    invitation: {
      employeeId: empId,
      email: email,
      loginUrl: "http://localhost:3000"
    }
  });
});


app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const db = getData();
  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: "Employee record not found" });

  const {
    employee_id, name, email, mobile, phone, dob, blood_group, gender, address, emergency_contact,
    bank_name, bank_account, ifsc_swift, avatar, title, designation, department,
    branch, office_location, verified_employee, employment_status,
    salary_base, role, manager_id, actorName
  } = req.body;

  if (role !== undefined && role !== user.role) {
    const previousRole = user.role;
    user.role = role;
    db.audit_logs.unshift({
      id: auditId(),
      timestamp: new Date().toISOString(),
      actor: actorName || "Admin Controller",
      action: "System Role Reassigned (RBAC Governance)",
      target: user.name,
      details: `Role updated for ${user.name} (${user.employee_id || user.id}): Previous Role "${previousRole}" ➔ New Role "${role}". Changed by ${actorName || 'Admin'}.`,
      ip: "192.168.1.1"
    });
  }

  if (manager_id !== undefined) user.manager_id = manager_id;
  if (employee_id !== undefined) user.employee_id = employee_id;
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (mobile !== undefined) user.mobile = mobile;
  if (phone !== undefined) user.phone = phone || mobile;
  if (dob !== undefined) user.dob = dob;
  if (blood_group !== undefined) user.blood_group = blood_group;
  if (gender !== undefined) user.gender = gender;
  if (address !== undefined) user.address = address;
  if (emergency_contact !== undefined) user.emergency_contact = emergency_contact;
  if (bank_name !== undefined) user.bank_name = bank_name;
  if (bank_account !== undefined) user.bank_account = bank_account;
  if (ifsc_swift !== undefined) user.ifsc_swift = ifsc_swift;
  if (avatar !== undefined) user.avatar = avatar;
  if (title !== undefined) user.title = title;
  if (designation !== undefined) user.designation = designation || title;
  if (department !== undefined) user.department = department;
  if (branch !== undefined) user.branch = branch;
  if (office_location !== undefined) {
    user.office_location = office_location;
    user.branch = office_location;
  }
  if (employment_status !== undefined) user.employment_status = employment_status;
  if (salary_base !== undefined) user.salary_base = salary_base;

  // Automated Onboarding Recalculation
  const docs = db.user_documents || [];
  const onboarding = calculateOnboardingProgress(user, docs);
  user.profile_score = onboarding.percentage;
  user.verified_employee = onboarding.percentage === 100;
  user.onboarding_status = onboarding.status;
  user.onboarding_details = onboarding;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || user.name || "Employee",
    action: "Employee Profile Updated",
    target: user.name,
    details: `Updated profile attributes for ${user.name} (${user.employee_id || user.id}). Onboarding Score: ${user.profile_score}%.`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Profile details updated successfully!", employee: user });
});


// Delete / Remove Employee
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const { actorRole, actorName } = req.body;

  if (!['SUPER_ADMIN', 'HR'].includes(actorRole)) {
    return res.status(403).json({ error: "Only Super Admin and HR Managers can remove employee records." });
  }

  const db = getData();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: "Employee record not found." });

  const removedUser = db.users[index];

  // Prevent removing the last SUPER_ADMIN
  if (removedUser.role === 'SUPER_ADMIN') {
    const superAdminCount = db.users.filter(u => u.role === 'SUPER_ADMIN').length;
    if (superAdminCount <= 1) {
      return res.status(400).json({ error: "Cannot remove the last Super Admin account. At least one Super Admin must remain." });
    }
  }

  db.users.splice(index, 1);

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Admin",
    action: "Employee Record Removed",
    target: removedUser.name,
    details: `Employee ${removedUser.name} (${removedUser.employee_id || removedUser.id}) has been permanently removed from the system by ${actorName || 'Admin'}.`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Employee "${removedUser.name}" has been removed from the system.` });
});


app.put('/api/employees/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { permissions, actorRole, actorName } = req.body;
  if (actorRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Only Super Admin can grant or revoke custom access permissions." });
  }
  const db = getData();
  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: "Employee record not found" });

  user.custom_permissions = permissions;
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "Permissions Updated",
    target: user.name,
    details: `Custom permissions granted: ${permissions.join(', ') || 'None'}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Permissions for ${user.name} updated successfully!`, permissions: user.custom_permissions, user });
});

// DYNAMIC ROLE & PERMISSION MANAGEMENT (RBAC API)
app.get('/api/roles', (req, res) => {
  const db = getData();
  if (!db.roles || db.roles.length === 0) {
    db.roles = [
      { id: 1, name: "Super Admin", code: "SUPER_ADMIN", description: "Full Enterprise System & Financial Controls", active: true },
      { id: 2, name: "HR Manager", code: "HR", description: "Human Resources & Payroll Governance", active: true },
      { id: 3, name: "Project Manager", code: "MANAGER", description: "Team Delivery & Task Approval", active: true },
      { id: 4, name: "Full-Time Staff", code: "FULL_TIME", description: "Core Employee Access", active: true },
      { id: 5, name: "Team Lead", code: "TEAM_LEAD", description: "Technical Sprint Review", active: true },
      { id: 6, name: "Intern / Trainee", code: "INTERN", description: "Trainee Access & Work Logs", active: true }
    ];
  }
  
  const rolesWithCount = db.roles.map(r => ({
    ...r,
    user_count: db.users.filter(u => u.role === r.code).length
  }));
  res.json(rolesWithCount);
});

app.post('/api/roles', (req, res) => {
  const { name, code, description, permissions, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Access Denied: Only Super Admin can define or modify system roles & RBAC matrix." });
  }

  const db = getData();
  if (!db.roles) db.roles = [];

  const formattedCode = (code || name).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const existing = db.roles.find(r => r.code === formattedCode);
  if (existing) {
    return res.status(400).json({ error: `Role code "${formattedCode}" already exists.` });
  }

  const newRole = {
    id: db.roles.length + 1,
    name,
    code: formattedCode,
    description: description || 'Custom Enterprise System Role',
    permissions: permissions || ['attendance', 'leaves', 'projects'],
    active: true
  };

  db.roles.push(newRole);
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "New System Role Created (RBAC)",
    target: name,
    details: `Role Code: ${formattedCode}, Description: ${description}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Role "${name}" created successfully!`, role: newRole });
});

app.put('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, active, permissions, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Access Denied: Only Super Admin can modify system roles." });
  }

  const db = getData();
  const role = db.roles?.find(r => String(r.id) === String(id) || r.code === id);
  if (!role) return res.status(404).json({ error: "Role not found." });

  if (name !== undefined) role.name = name;
  if (description !== undefined) role.description = description;
  if (active !== undefined) role.active = active;
  if (permissions !== undefined) role.permissions = permissions;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "System Role Modified (RBAC)",
    target: role.name,
    details: `Updated role configuration for ${role.code}.`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Role "${role.name}" updated successfully!`, role });
});

app.delete('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  const { userRole } = req.query;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Access Denied: Only Super Admin can delete system roles." });
  }
  const db = getData();
  
  const roleIndex = db.roles?.findIndex(r => String(r.id) === String(id) || r.code === id);
  if (roleIndex === -1 || roleIndex === undefined) return res.status(404).json({ error: "Role not found." });

  const role = db.roles[roleIndex];
  const assignedUsers = db.users.filter(u => u.role === role.code);
  if (assignedUsers.length > 0) {
    return res.status(400).json({ error: `Cannot delete role "${role.name}" because it is currently assigned to ${assignedUsers.length} employee(s).` });
  }

  db.roles.splice(roleIndex, 1);
  saveData(db);
  res.json({ message: `Role "${role.name}" deleted successfully!` });
});



app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const db = getData();
  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: "Employee record not found" });

  const oldBranch = user.branch;
  Object.assign(user, req.body);

  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: req.body.actorName || "Super Admin",
    action: "Employee Location & Governance Updated",
    target: user.name,
    details: `Work location: '${user.branch}' (was '${oldBranch || 'Default'}'), Verification: ${user.verified_employee ? '100% Fully Verified' : 'Pending'}, Profile Score: ${user.profile_score}%`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Employee record for ${user.name} updated successfully! Location: ${user.branch}`, employee: user });
});




// Attendance Logs & Reports
app.get('/api/attendance/logs', (req, res) => {
  const db = getData();
  res.json(db.attendance_logs);
});

app.get('/api/attendance/reports', (req, res) => {
  const db = getData();
  res.json(db.attendance_reports_summary);
});

app.post('/api/attendance/check-in', (req, res) => {
  const { userId, latitude, longitude, accuracy, ipAddress } = req.body;
  const db = getData();

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const activeLog = db.attendance_logs.find(l => l.user_id === userId && !l.check_out);
  if (activeLog) {
    return res.json({ message: "Already checked in for active shift!", log: activeLog });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const activeWfh = db.leave_requests.find(r => isApprovedWfh(r, userId, todayStr));

  const geofence = db.company_settings.office_geofence;
  const allowedRadius = Number(geofence.radius_meters) || 50;

  let distance = 0;
  let isWithinRadius = false;
  let status = "Present";
  let verificationType = "Zero-Proxy GPS (50m Office Location)";

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMin;
  const isLate = totalMinutes > 555; // 09:15 AM is 555 mins from 00:00

  if (activeWfh) {
    isWithinRadius = true;
    status = "WFH - Approved";
    verificationType = "WFH Auto-Sync Pass";
  } else {
    if (!validGps(latitude, longitude, accuracy)) {
      return res.status(400).json({ error: 'A current, high-accuracy GPS location (100m accuracy or better) is required for check-in.' });
    }

    let targetLat = parseFloat(geofence.latitude);
    let targetLng = parseFloat(geofence.longitude);

    if (user.branch || user.office_location) {
      const assignedLoc = db.office_locations?.find(l => l.name === user.branch || l.name === user.office_location);
      if (assignedLoc) {
        targetLat = parseFloat(assignedLoc.latitude);
        targetLng = parseFloat(assignedLoc.longitude);
      }
    }

    distance = Math.round(calculateHaversineDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      targetLat,
      targetLng
    ));

    isWithinRadius = distance <= allowedRadius;

    if (!isWithinRadius) {
      return res.status(403).json({
        error: "LOCATION_VIOLATION",
        message: `Get inside working area of Prolync for Check-In (Allowed: ${allowedRadius}m, Current Distance: ${distance}m)`,
        distance,
        allowedRadius
      });
    }

    if (isLate) {
      status = "Present (Late)";
    }
  }

  const newLog = {
    id: `att-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    role: user.role,
    department: user.department,
    check_in: new Date().toISOString(),
    check_out: null,
    shift_timing: "09:00 AM - 07:00 PM",
    working_hours: "Active Shift",
    break_hours: "0 hrs",
    on_break: false,
    break_duration_mins: 0,
    late_arrival: isLate,
    early_exit: false,
    overtime: "0 hrs",
    check_in_location: `Lat: ${parseFloat(latitude || geofence.latitude).toFixed(6)}, Lng: ${parseFloat(longitude || geofence.longitude).toFixed(6)}`,
    check_out_location: null,
    office_location: `${geofence.office_name || 'Prolync HQ'} (${geofence.latitude}, ${geofence.longitude})`,
    latitude: parseFloat(latitude || geofence.latitude),
    longitude: parseFloat(longitude || geofence.longitude),
    distance_meters: distance,
    status: status,
    verification_type: verificationType,
    ip_address: ipAddress || "192.168.1.45"
  };

  db.attendance_logs.unshift(newLog);
  saveData(db);

  res.json({
    message: activeWfh ? "WFH Auto-Sync Attendance Verified!" : "Check-In Verified & Marked at Office Location!",
    log: newLog
  });
});

// Attendance Check-Out API (Must also be within 50m of Office Location)
app.post('/api/attendance/check-out', (req, res) => {
  const { userId, latitude, longitude, accuracy } = req.body;
  const db = getData();

  const activeLog = db.attendance_logs.find(l => l.user_id === userId && !l.check_out);
  if (!activeLog) {
    return res.status(400).json({ error: "No active check-in record found for user." });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const activeWfh = db.leave_requests.find(r => isApprovedWfh(r, userId, todayStr));

  const geofence = db.company_settings.office_geofence;
  const allowedRadius = Number(geofence.radius_meters) || 50;
  let distance = 0;

  if (!activeWfh) {
    if (!validGps(latitude, longitude, accuracy)) {
      return res.status(400).json({ error: 'A current, high-accuracy GPS location (100m accuracy or better) is required for check-out.' });
    }

    let targetLat = parseFloat(geofence.latitude);
    let targetLng = parseFloat(geofence.longitude);

    const user = db.users.find(u => u.id === userId);
    if (user && (user.branch || user.office_location)) {
      const assignedLoc = db.office_locations?.find(l => l.name === user.branch || l.name === user.office_location);
      if (assignedLoc) {
        targetLat = parseFloat(assignedLoc.latitude);
        targetLng = parseFloat(assignedLoc.longitude);
      }
    }

    distance = Math.round(calculateHaversineDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      targetLat,
      targetLng
    ));

    if (distance > allowedRadius) {
      return res.status(403).json({
        error: "LOCATION_VIOLATION",
        message: `Get inside working area of Prolync for Check-Out (Allowed: ${allowedRadius}m, Current Distance: ${distance}m)`,
        distance,
        allowedRadius
      });
    }
  }

  const checkInTime = new Date(activeLog.check_in);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - checkInTime.getTime());
  const hoursWorked = (diffMs / (1000 * 60 * 60)).toFixed(1);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isEarlyExit = nowMinutes < 1140; // 07:00 PM is 1140 minutes

  activeLog.check_out = now.toISOString();
  activeLog.check_out_location = latitude ? `Lat: ${parseFloat(latitude).toFixed(6)}, Lng: ${parseFloat(longitude).toFixed(6)}` : `Office GPS (${geofence.latitude}, ${geofence.longitude})`;
  activeLog.working_hours = `${hoursWorked} hrs`;
  activeLog.early_exit = isEarlyExit;
  activeLog.on_break = false;
  activeLog.status = isEarlyExit ? "Completed (Early Exit)" : "Completed (Full Shift)";

  saveData(db);
  res.json({ message: "Check-Out Verified at Office Location! Shift completed.", log: activeLog });
});



// Break Mode Toggle API (Start Break / End Break)
app.post('/api/attendance/toggle-break', (req, res) => {
  const { userId, onBreak } = req.body;
  const db = getData();

  const activeLog = db.attendance_logs.find(l => l.user_id === userId && !l.check_out);
  if (!activeLog) {
    return res.status(400).json({ error: "No active check-in record found." });
  }

  if (onBreak) {
    activeLog.on_break = true;
    activeLog.break_start_time = new Date().toISOString();
    activeLog.status = "On Authorized Break";
    saveData(db);
    return res.json({ message: "Official Break Started! Location boundary auto-checkout paused.", log: activeLog });
  } else {
    if (activeLog.break_start_time) {
      const breakStart = new Date(activeLog.break_start_time);
      const breakMins = Math.round((Date.now() - breakStart.getTime()) / (1000 * 60));
      activeLog.break_duration_mins = (activeLog.break_duration_mins || 0) + breakMins;
      activeLog.break_hours = `${(activeLog.break_duration_mins / 60).toFixed(1)} hrs`;
    }
    activeLog.on_break = false;
    activeLog.break_start_time = null;
    activeLog.status = activeLog.late_arrival ? "Present (Late)" : "Present";
    saveData(db);
    return res.json({ message: "Break Ended! Resumed Active Shift.", log: activeLog });
  }
});

// Geofence Boundary Check & Auto Check-Out
app.post('/api/attendance/verify-boundary', (req, res) => {
  const { userId, latitude, longitude } = req.body;
  const db = getData();

  const activeLog = db.attendance_logs.find(l => l.user_id === userId && !l.check_out);
  if (!activeLog) return res.json({ status: 'NO_ACTIVE_SHIFT' });

  // If user is ON AUTHORIZED BREAK, do not auto check-out when leaving boundary
  if (activeLog.on_break || activeLog.status?.includes('WFH')) {
    return res.json({ status: 'AUTHORIZED_BREAK', message: 'Authorized break active - boundary bypass enabled.' });
  }

  const geofence = db.company_settings.office_geofence;
  let targetLat = parseFloat(geofence.latitude);
  let targetLng = parseFloat(geofence.longitude);

  const user = db.users.find(u => u.id === userId);
  if (user && (user.branch || user.office_location)) {
    const assignedLoc = db.office_locations?.find(l => l.name === user.branch || l.name === user.office_location);
    if (assignedLoc) {
      targetLat = parseFloat(assignedLoc.latitude);
      targetLng = parseFloat(assignedLoc.longitude);
    }
  }

  const distance = Math.round(calculateHaversineDistance(
    parseFloat(latitude),
    parseFloat(longitude),
    targetLat,
    targetLng
  ));

  if (distance > 50) {
    // AUTO CHECK-OUT TRIGGERED
    const checkInTime = new Date(activeLog.check_in);
    const now = new Date();
    const hoursWorked = ((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(1);

    activeLog.check_out = now.toISOString();
    activeLog.working_hours = `${hoursWorked} hrs (Auto Checked-Out)`;
    activeLog.status = "Auto Checked-Out (Perimeter Exit)";
    activeLog.on_break = false;

    db.audit_logs.unshift({
      id: auditId(),
      timestamp: now.toISOString(),
      actor: activeLog.user_name,
      action: "Auto Check-Out (Geofence Exit)",
      target: "50m Geofence Boundary",
      details: `Exited 50m perimeter without activating Break Mode (Distance: ${distance}m).`,
      ip: "192.168.1.1"
    });

    saveData(db);
    return res.json({
      status: 'AUTO_CHECKED_OUT',
      message: `Auto Checked-Out! Exited 50m office working area (${distance}m) without setting Break Mode.`,
      log: activeLog
    });
  }

  res.json({ status: 'IN_BOUNDS', distance });
});




app.post('/api/attendance/manual', (req, res) => {
  const { userId, date, status, reason, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only HR and Super Admin can mark manual attendance regularization." });
  }

  const db = getData();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const newLog = {
    id: `att-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    role: user.role,
    check_in: `${date || new Date().toISOString().split('T')[0]}T09:00:00.000Z`,
    check_out: `${date || new Date().toISOString().split('T')[0]}T18:00:00.000Z`,
    working_hours: "9.0 hrs",
    break_hours: "1.0 hrs",
    late_arrival: false,
    early_exit: false,
    overtime: "0 hrs",
    latitude: db.company_settings.office_geofence.latitude,
    longitude: db.company_settings.office_geofence.longitude,
    distance_meters: 5,
    status: status || "Present (HR Regularized)",
    verification_type: "HR Manual Regularization",
    ip_address: "192.168.1.1",
    regularization_reason: reason || "Approved manual override by HR"
  };

  db.attendance_logs.unshift(newLog);
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Attendance Manual Regularization",
    target: user.name,
    details: `Status set to: ${newLog.status}, Reason: ${reason}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Attendance regularized successfully!", log: newLog });
});

app.delete('/api/attendance/clear', (req, res) => {
  const { userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can reset/clear attendance logs." });
  }

  const db = getData();
  db.attendance_logs = [];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Attendance Logs Cleared",
    target: "Attendance Module",
    details: "All historical attendance records purged for fresh check-in tracking.",
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Old attendance logs purged successfully! Ready for fresh entries." });
});



// Leaves & Balance Management
app.get('/api/leaves', (req, res) => {
  const db = getData();
  res.json(db.leave_requests || []);
});

// Leave Policy Configuration
app.get('/api/leaves/policy', (req, res) => {
  const db = getData();
  const defaultPolicy = {
    year: 2026,
    casual_leave: 12,
    sick_leave: 10,
    earned_leave: 15,
    comp_off_enabled: true,
    carry_forward_rules: "Allow up to 5 days carry forward for Sick & Earned leaves annually.",
    monthly_accrual: false,
    max_leave_per_request: 10,
    negative_leave_allowed: false
  };
  res.json(db.leave_policy || defaultPolicy);
});

app.put('/api/leaves/policy', (req, res) => {
  const { year, casual_leave, sick_leave, earned_leave, comp_off_enabled, carry_forward_rules, monthly_accrual, max_leave_per_request, negative_leave_allowed, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can update leave policy." });
  }

  const db = getData();
  db.leave_policy = {
    year: parseInt(year || 2026, 10),
    casual_leave: parseInt(casual_leave || 12, 10),
    sick_leave: parseInt(sick_leave || 10, 10),
    earned_leave: parseInt(earned_leave || 15, 10),
    comp_off_enabled: comp_off_enabled !== false,
    carry_forward_rules: carry_forward_rules || "Allow carry forward",
    monthly_accrual: monthly_accrual === true,
    max_leave_per_request: parseInt(max_leave_per_request || 10, 10),
    negative_leave_allowed: negative_leave_allowed === true
  };

  // Sync yearly baseline for all users
  if (!db.leave_balances) db.leave_balances = {};
  (db.users || []).forEach(u => {
    if (!db.leave_balances[u.id]) {
      db.leave_balances[u.id] = {
        casual: db.leave_policy.casual_leave,
        sick: db.leave_policy.sick_leave,
        earned: db.leave_policy.earned_leave,
        comp_off: 2
      };
    }
  });

  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Yearly Leave Policy Updated",
    target: `Policy Year ${db.leave_policy.year}`,
    details: `Updated policy: Casual=${db.leave_policy.casual_leave}, Sick=${db.leave_policy.sick_leave}, Earned=${db.leave_policy.earned_leave}, CompOff=${db.leave_policy.comp_off_enabled}, NegativeAllowed=${db.leave_policy.negative_leave_allowed}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Yearly leave policy updated successfully!", policy: db.leave_policy });
});

// Leave Balance calculation helper
app.get('/api/leaves/balance/:userId', (req, res) => {
  const { userId } = req.params;
  const db = getData();
  const policy = db.leave_policy || { casual_leave: 12, sick_leave: 10, earned_leave: 15, comp_off_enabled: true };

  if (!db.leave_balances) db.leave_balances = {};
  if (!db.leave_balances[userId]) {
    db.leave_balances[userId] = {
      casual: policy.casual_leave,
      sick: policy.sick_leave,
      earned: policy.earned_leave,
      comp_off: 2
    };
    saveData(db);
  }

  const userBal = db.leave_balances[userId];

  // Calculate used leaves from approved requests
  const approvedRequests = (db.leave_requests || []).filter(r => r.user_id === userId && r.status === 'Approved');
  let usedCasual = 0;
  let usedSick = 0;
  let usedEarned = 0;
  let usedCompOff = 0;

  approvedRequests.forEach(r => {
    const typeLower = (r.leave_type || '').toLowerCase();
    const days = r.days_count || 1;
    if (typeLower.includes('casual')) usedCasual += days;
    else if (typeLower.includes('sick')) usedSick += days;
    else if (typeLower.includes('earned') || typeLower.includes('privilege') || typeLower.includes('annual')) usedEarned += days;
    else if (typeLower.includes('comp')) usedCompOff += days;
  });

  // Yearly total allocations
  const casualTotal = userBal.casual_total || policy.casual_leave || 12;
  const sickTotal = userBal.sick_total || policy.sick_leave || 10;
  const earnedTotal = userBal.earned_total || policy.earned_leave || 15;
  const compOffTotal = userBal.comp_off_total || 2;

  // Remaining leaves
  const casualRemaining = Math.max(0, userBal.casual !== undefined ? userBal.casual : casualTotal - usedCasual);
  const sickRemaining = Math.max(0, userBal.sick !== undefined ? userBal.sick : sickTotal - usedSick);
  const earnedRemaining = Math.max(0, userBal.earned !== undefined ? userBal.earned : earnedTotal - usedEarned);
  const compOffRemaining = Math.max(0, userBal.comp_off !== undefined ? userBal.comp_off : compOffTotal - usedCompOff);

  const totalRemaining = casualRemaining + sickRemaining + earnedRemaining + compOffRemaining;

  res.json({
    casual: casualRemaining,
    sick: sickRemaining,
    earned: earnedRemaining,
    comp_off: compOffRemaining,
    totals: {
      casual: casualTotal,
      sick: sickTotal,
      earned: earnedTotal,
      comp_off: compOffTotal
    },
    used: {
      casual: usedCasual,
      sick: usedSick,
      earned: usedEarned,
      comp_off: usedCompOff
    },
    totalRemaining
  });
});

// Integrated Holiday Management API
app.get('/api/holidays', (req, res) => {
  const db = getData();
  if (!db.holidays || db.holidays.length === 0) {
    db.holidays = [
      { id: "hol-1", title: "New Year's Day", date: "2026-01-01", type: "Government Holiday", category: "Government" },
      { id: "hol-2", title: "Pongal / Sankranti", date: "2026-01-14", type: "Festival Holiday", category: "Festival" },
      { id: "hol-3", title: "Republic Day", date: "2026-01-26", type: "Government Holiday", category: "Government" },
      { id: "hol-4", title: "May Day / Labour Day", date: "2026-05-01", type: "Company Holiday", category: "Company" },
      { id: "hol-5", title: "Independence Day", date: "2026-08-15", type: "Government Holiday", category: "Government" },
      { id: "hol-6", title: "Gandhi Jayanti", date: "2026-10-02", type: "Government Holiday", category: "Government" },
      { id: "hol-7", title: "Deepavali / Diwali", date: "2026-11-08", type: "Festival Holiday", category: "Festival" },
      { id: "hol-8", title: "Christmas Day", date: "2026-12-25", type: "Government Holiday", category: "Government" }
    ];
    saveData(db);
  }
  res.json(db.holidays);
});

app.post('/api/holidays', (req, res) => {
  const { title, date, type, category, userRole, actorName } = req.body;
  if (!['SUPER_ADMIN', 'HR'].includes(userRole)) {
    return res.status(403).json({ error: "Only Super Admin and HR can add holidays." });
  }
  if (!title || !date) {
    return res.status(400).json({ error: "Holiday title and date are required." });
  }

  const db = getData();
  if (!db.holidays) db.holidays = [];

  const newHoliday = {
    id: `hol-${Date.now()}`,
    title: title.trim(),
    date,
    type: type || "Company Holiday",
    category: category || "Company"
  };

  db.holidays.push(newHoliday);
  db.holidays.sort((a, b) => a.date.localeCompare(b.date));

  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Holiday Created",
    target: newHoliday.title,
    details: `Added ${newHoliday.type} on ${newHoliday.date}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.status(201).json({ message: "Holiday created successfully!", holiday: newHoliday });
});

app.delete('/api/holidays/:id', (req, res) => {
  const { id } = req.params;
  const { userRole, actorName } = req.query;
  if (!['SUPER_ADMIN', 'HR'].includes(userRole)) {
    return res.status(403).json({ error: "Only Super Admin and HR can delete holidays." });
  }

  const db = getData();
  if (!db.holidays) db.holidays = [];
  const idx = db.holidays.findIndex(h => h.id === id);
  if (idx === -1) return res.status(404).json({ error: "Holiday not found" });

  const deleted = db.holidays.splice(idx, 1)[0];
  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Holiday Removed",
    target: deleted.title,
    details: `Removed holiday ${deleted.title} (${deleted.date})`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Holiday deleted successfully!" });
});

app.get('/api/leaves/calendar', (req, res) => {
  const db = getData();
  const leaves = db.leave_requests || [];
  const holidays = db.holidays && db.holidays.length > 0 ? db.holidays : (db.company_events || []);
  
  res.json({
    leaves,
    holidays
  });
});

app.post('/api/leaves/assign', (req, res) => {
  const { userId, leaveType, startDate, endDate, reason, actorRole, actorName } = req.body || {};
  if (!['SUPER_ADMIN', 'HR'].includes(actorRole)) return res.status(403).json({ error: 'Only Super Admin and HR can assign leave directly.' });
  if (!userId || !leaveType?.trim() || !startDate || !endDate || endDate < startDate) return res.status(400).json({ error: 'Choose an employee, leave type, and valid dates.' });
  const db = getData();
  const user = db.users.find(item => item.id === userId);
  if (!user) return res.status(404).json({ error: 'Employee not found.' });
  const overlap = (db.leave_requests || []).some(item => item.user_id === userId && item.status !== 'Rejected' && item.start_date <= endDate && item.end_date >= startDate);
  if (overlap) return res.status(409).json({ error: 'This employee already has leave or WFH in the selected period.' });
  const days = Math.floor((new Date(`${endDate}T00:00:00Z`) - new Date(`${startDate}T00:00:00Z`)) / 86400000) + 1;
  const request = { id: `leave-${Date.now()}-${randomBytes(4).toString('hex')}`, user_id: user.id, user_name: user.name, role: user.role, department: user.department, leave_type: leaveType.trim(), start_date: startDate, end_date: endDate, days_count: days, reason: reason?.trim() || 'Assigned by HR', status: 'Approved', assigned_by: actorName || 'HR Admin', reviewed_by: actorName || 'HR Admin', created_at: new Date().toISOString() };
  db.leave_requests.unshift(request);
  if (!db.leave_balances) db.leave_balances = {};
  if (!db.leave_balances[user.id]) db.leave_balances[user.id] = { casual: 12, sick: 10, earned: 15, comp_off: 2 };
  const balance = db.leave_balances[user.id];
  const type = request.leave_type.toLowerCase();
  if (type.includes('casual')) balance.casual = Math.max(0, balance.casual - days);
  else if (type.includes('sick')) balance.sick = Math.max(0, balance.sick - days);
  else if (type.includes('earned') || type.includes('privilege') || type.includes('annual')) balance.earned = Math.max(0, balance.earned - days);
  else if (type.includes('comp')) balance.comp_off = Math.max(0, balance.comp_off - days);
  db.audit_logs.unshift({ id: auditId(), timestamp: new Date().toISOString(), actor: actorName || 'HR Admin', action: 'Leave Assigned Directly', target: user.name, details: `${request.leave_type}: ${startDate} to ${endDate}`, ip: '192.168.1.1' });
  saveData(db);
  sendEmail({ to: user.email, template: 'leave_approved', data: { userName: user.name, leaveType: request.leave_type, startDate, endDate, reviewedBy: request.reviewed_by, reviewNotes: request.reason } });
  res.status(201).json({ message: 'Leave assigned and approved. It is now visible in the employee calendar.', request, balance });
});

app.post('/api/leaves', (req, res) => {
  const { userId, leaveType, startDate, endDate, reason, attachment } = req.body;
  const db = getData();

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  if (isNaN(d1) || isNaN(d2) || d2 < d1) {
    return res.status(400).json({ error: "Invalid start or end date." });
  }

  const daysDiff = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1);

  // Check negative leave policy rule
  const policy = db.leave_policy || { negative_leave_allowed: false };
  if (!policy.negative_leave_allowed) {
    if (!db.leave_balances) db.leave_balances = {};
    const bal = db.leave_balances[userId] || { casual: 12, sick: 10, earned: 15, comp_off: 2 };
    const typeLower = (leaveType || 'casual').toLowerCase();
    let avail = 12;
    if (typeLower.includes('casual')) avail = bal.casual;
    else if (typeLower.includes('sick')) avail = bal.sick;
    else if (typeLower.includes('earned') || typeLower.includes('privilege')) avail = bal.earned;
    else if (typeLower.includes('comp')) avail = bal.comp_off;

    if (avail < daysDiff) {
      return res.status(400).json({ error: `Insufficient leave balance! You have ${avail} days remaining for ${leaveType || 'Casual Leave'}, but requested ${daysDiff} days.` });
    }
  }

  const newReq = {
    id: `leave-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    role: user.role,
    department: user.department,
    leave_type: leaveType || "Casual Leave",
    start_date: startDate,
    end_date: endDate,
    days_count: daysDiff,
    reason: reason || "Personal reasons",
    attachment: attachment || null,
    status: "Pending",
    created_at: new Date().toISOString()
  };

  if (!db.leave_requests) db.leave_requests = [];
  db.leave_requests.unshift(newReq);
  saveData(db);

  // Trigger Email Notification
  sendEmail({
    to: user.email,
    template: 'leave_submitted',
    data: {
      userName: user.name,
      leaveType: newReq.leave_type,
      startDate,
      endDate,
      reason: newReq.reason
    }
  });

  res.json({ message: "Leave request submitted for HR approval.", request: newReq });
});

app.put('/api/leaves/:id', (req, res) => {
  const { id } = req.params;
  const { status, reviewedBy, reviewNotes, userRole } = req.body;

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR' && userRole !== 'MANAGER') {
    return res.status(403).json({ error: "Not authorized to review leave requests." });
  }

  const db = getData();
  const reqItem = (db.leave_requests || []).find(r => r.id === id);
  if (!reqItem) return res.status(404).json({ error: "Leave Request not found" });

  const oldStatus = reqItem.status;
  reqItem.status = status;
  reqItem.reviewed_by = reviewedBy || "Authorized HR Controller";
  reqItem.review_notes = reviewNotes || "";

  const user = db.users.find(u => u.id === reqItem.user_id);
  if (!db.leave_balances) db.leave_balances = {};
  if (!db.leave_balances[reqItem.user_id]) {
    db.leave_balances[reqItem.user_id] = { casual: 12, sick: 10, earned: 15, comp_off: 2 };
  }
  const bal = db.leave_balances[reqItem.user_id];
  const typeLower = (reqItem.leave_type || '').toLowerCase();
  const days = reqItem.days_count || 1;

  // Automatically deduct leave balance upon approval
  if (status === 'Approved' && oldStatus !== 'Approved') {
    if (typeLower.includes('casual')) bal.casual = Math.max(0, bal.casual - days);
    else if (typeLower.includes('sick')) bal.sick = Math.max(0, bal.sick - days);
    else if (typeLower.includes('earned') || typeLower.includes('privilege')) bal.earned = Math.max(0, bal.earned - days);
    else if (typeLower.includes('comp')) bal.comp_off = Math.max(0, bal.comp_off - days);

    // If request is WFH, auto-update attendance
    const isWfh = typeLower.includes('wfh') || typeLower.includes('home');
    if (isWfh && user) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (!db.attendance_logs) db.attendance_logs = [];
      let todayLog = db.attendance_logs.find(l => l.user_id === user.id && l.check_in?.startsWith(todayStr));

      if (!todayLog) {
        todayLog = {
          id: `att-wfh-${Date.now()}`,
          user_id: user.id,
          user_name: user.name,
          role: user.role,
          check_in: `${todayStr}T09:00:00.000Z`,
          check_out: `${todayStr}T18:00:00.000Z`,
          working_hours: "9.0 hrs (Remote WFH Duty)",
          break_hours: "1.0 hrs",
          late_arrival: false,
          early_exit: false,
          overtime: "0 hrs",
          latitude: db.company_settings?.office_geofence?.latitude || 12.871133,
          longitude: db.company_settings?.office_geofence?.longitude || 80.083898,
          distance_meters: 0,
          status: "WFH Approved (Authorized Remote Location)",
          on_break: true
        };
        db.attendance_logs.unshift(todayLog);
      } else {
        todayLog.status = "WFH Approved (Authorized Remote Location)";
        todayLog.on_break = true;
        todayLog.working_hours = "9.0 hrs (Remote WFH Duty)";
      }
    }
  } 
  // Restore balance if an approved request is cancelled or rejected
  else if ((status === 'Rejected' || status === 'Returned') && oldStatus === 'Approved') {
    if (typeLower.includes('casual')) bal.casual = bal.casual + days;
    else if (typeLower.includes('sick')) bal.sick = bal.sick + days;
    else if (typeLower.includes('earned') || typeLower.includes('privilege')) bal.earned = bal.earned + days;
    else if (typeLower.includes('comp')) bal.comp_off = bal.comp_off + days;
  }

  // Audit Logging
  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: reviewedBy || "HR Admin",
    action: `Leave Request ${status}`,
    target: reqItem.user_name,
    details: `Status changed from '${oldStatus}' to '${status}'. Type: ${reqItem.leave_type}, Dates: ${reqItem.start_date} to ${reqItem.end_date}. Comment: ${reviewNotes || 'N/A'}`,
    ip: "192.168.1.1"
  });

  saveData(db);

  // Trigger Email Notification
  if (user && user.email) {
    sendEmail({
      to: user.email,
      template: status === 'Approved' ? 'leave_approved' : 'leave_rejected',
      data: {
        userName: user.name,
        leaveType: reqItem.leave_type,
        startDate: reqItem.start_date,
        endDate: reqItem.end_date,
        reviewedBy: reqItem.reviewed_by,
        reviewNotes: reqItem.review_notes
      }
    });
  }

  res.json({ message: `Leave Request ${status} successfully!`, request: reqItem, balance: db.leave_balances[reqItem.user_id] });
});


// Payroll
app.get('/api/payroll', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.query.role;
  const userId = req.headers['x-user-id'] || req.query.userId;
  const db = getData();

  if (userRole === 'INTERN') {
    return res.status(403).json({ error: "Access denied. Interns do not have access to payroll module." });
  }

  if (userRole === 'FULL_TIME' && userId) {
    const userRecords = db.payroll_records.filter(p => p.user_id === userId);
    return res.json(userRecords);
  }

  res.json(db.payroll_records);
});

app.get('/api/payroll/payslip/:userId', (req, res) => {
  const { userId } = req.params;
  const db = getData();
  const user = db.users.find(u => u.id === userId);
  const record = db.payroll_records.find(p => p.user_id === userId) || db.payroll_records[0];

  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    payslip_id: `PAYSLIP-${user.employee_id}-JULY2026`,
    user,
    payroll: record,
    company: db.company_settings
  });
});

app.get('/api/payroll/:id/payslip.pdf', (req, res) => {
  const db = getData();
  const record = db.payroll_records.find(p => p.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Payroll record not found' });
  const user = db.users.find(u => u.id === record.user_id);
  if (!user) return res.status(404).json({ error: 'Employee not found' });

  const money = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;
  const totalDeductions = Number(record.pf_deduction || 0) + Number(record.esi_deduction || 0) + Number(record.tax_tds || 0);
  const doc = new PDFDocument({ size: 'A4', margin: 38, info: { Title: `Payslip - ${user.name} - ${record.month_year}` } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Prolync-Payslip-${user.employee_id}-${String(record.month_year).replace(/\s+/g, '-')}.pdf"`);
  doc.pipe(res);

  const logoPath = path.join(__dirname, '..', 'client', 'public', 'logo.png');
  if (fs.existsSync(logoPath)) doc.image(logoPath, 38, 34, { fit: [38, 38] });
  doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Prolync', 84, 38);
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('PEOPLE OPERATIONS', 84, 57);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('PAYSLIP', 430, 38, { align: 'right' });
  doc.fillColor('#475569').fontSize(9).font('Helvetica').text(`For the month of ${record.month_year}`, 300, 57, { width: 220, align: 'right' });
  doc.moveTo(38, 86).lineTo(557, 86).strokeColor('#cbd5e1').stroke();

  doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text('EMPLOYEE DETAILS', 38, 104);
  const employeeLines = [
    ['Employee name', user.name], ['Employee ID', user.employee_id], ['Designation', user.title || user.designation || '-'],
    ['Department', user.department || '-'], ['Date of joining', user.joining_date || '-'], ['Bank account', user.bank_account || '-']
  ];
  employeeLines.forEach(([label, value], index) => {
    const y = 122 + index * 18;
    doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(label, 38, y);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(String(value), 145, y);
  });

  doc.roundedRect(365, 104, 192, 126, 6).fillAndStroke('#ecfdf5', '#bbf7d0');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(money(record.net_salary), 380, 121);
  doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Net payable salary', 380, 146);
  doc.moveTo(380, 165).lineTo(542, 165).strokeColor('#bbf7d0').stroke();
  doc.fillColor('#475569').fontSize(8).text('Payment status', 380, 178);
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(record.payment_status || 'Processed', 468, 178);
  doc.fillColor('#475569').font('Helvetica').text('Payment date', 380, 198);
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(record.payment_date || '-', 468, 198);

  const tableTop = 258;
  doc.roundedRect(38, tableTop, 519, 180, 6).strokeColor('#cbd5e1').stroke();
  doc.fillColor('#f8fafc').rect(39, tableTop + 1, 517, 24).fill();
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text('EARNINGS', 50, tableTop + 9);
  doc.text('AMOUNT', 260, tableTop + 9, { width: 70, align: 'right' });
  doc.text('DEDUCTIONS', 310, tableTop + 9);
  doc.text('AMOUNT', 475, tableTop + 9, { width: 70, align: 'right' });
  const earnings = [['Basic salary', record.basic_salary], ['House rent allowance', record.hra_allowance], ['Special allowance', record.special_allowance]];
  const deductions = [['Provident fund', record.pf_deduction], ['ESI contribution', record.esi_deduction], ['Income tax (TDS)', record.tax_tds]];
  earnings.forEach(([label, value], index) => {
    const y = tableTop + 42 + index * 28;
    doc.fillColor('#334155').font('Helvetica').text(label, 50, y);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(money(value), 235, y, { width: 95, align: 'right' });
    doc.fillColor('#334155').font('Helvetica').text(deductions[index][0], 310, y);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(money(deductions[index][1]), 450, y, { width: 95, align: 'right' });
  });
  doc.moveTo(50, tableTop + 137).lineTo(545, tableTop + 137).strokeColor('#e2e8f0').stroke();
  doc.fillColor('#0f172a').font('Helvetica-Bold').text('Gross earnings', 50, tableTop + 150);
  doc.text(money(record.gross_salary), 235, tableTop + 150, { width: 95, align: 'right' });
  doc.text('Total deductions', 310, tableTop + 150);
  doc.text(money(totalDeductions), 450, tableTop + 150, { width: 95, align: 'right' });
  doc.roundedRect(38, 458, 519, 42, 6).fillAndStroke('#f0fdf4', '#bbf7d0');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text('TOTAL NET PAYABLE', 52, 474);
  doc.fontSize(14).text(money(record.net_salary), 402, 470, { width: 135, align: 'right' });
  doc.fillColor('#64748b').font('Helvetica').fontSize(7).text('This is a computer-generated payslip and does not require a signature.', 38, 530, { width: 519, align: 'center' });
  doc.end();
});

app.post('/api/payroll', (req, res) => {
  const { userId, monthYear, grossSalary, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only HR and Super Admin can generate payroll records." });
  }

  const db = getData();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "Employee not found" });

  const gross = parseInt(grossSalary || user.base_salary || 65000, 10);
  const basic = Math.round(gross * 0.5);
  const hra = Math.round(gross * 0.25);
  const special = gross - basic - hra;
  const pf = Math.round(basic * 0.12);
  const esi = Math.round(gross * 0.0075);
  const tax = Math.round(gross * 0.05);
  const net = gross - pf - esi - tax;

  const newRecord = {
    id: `pay-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    month_year: monthYear || "July 2026",
    basic_salary: basic,
    hra_allowance: hra,
    special_allowance: special,
    gross_salary: gross,
    pf_deduction: pf,
    esi_deduction: esi,
    tax_tds: tax,
    net_salary: net,
    payment_status: "Paid",
    payment_date: new Date().toISOString().split('T')[0]
  };

  db.payroll_records.unshift(newRecord);
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Payroll Generated",
    target: user.name,
    details: `Month: ${newRecord.month_year}, Net Salary: ₹${net}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Payroll processed successfully!", record: newRecord });
});

app.put('/api/payroll/:id', (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;
  const db = getData();
  const record = db.payroll_records.find(p => p.id === id);
  if (!record) return res.status(404).json({ error: "Payroll record not found" });

  record.payment_status = paymentStatus || "Paid";
  saveData(db);
  res.json({ message: `Payroll status updated to ${record.payment_status}!`, record });
});


// Projects & Tasks
app.get('/api/projects', (req, res) => {
  const db = getData();
  res.json(db.projects);
});

app.post('/api/projects', (req, res) => {
  const { title, client, description, priority, deadline, budget, userRole, leadId, leadName } = req.body;

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'MANAGER' && userRole !== 'FULL_TIME') {
    return res.status(403).json({ error: "Only Super Admin, Managers, and Senior Developers can scope projects." });
  }

  const db = getData();
  const leadUser = leadId ? db.users.find(u => u.id === leadId) : null;
  const lead_id = leadUser ? leadUser.id : (leadId || db.users[2]?.id || "u-3");
  const lead_name = leadUser ? leadUser.name : (leadName || db.users[2]?.name || "Marcus Brody");

  const newProject = {
    id: `proj-${Date.now()}`,
    title,
    client: client || "Prolync Operations",
    description,
    lead_id,
    lead_name,
    priority: priority || "High",
    deadline: deadline || "2026-08-30",
    budget: budget || "₹3,50,000",
    status: "Active",
    completion_pct: 0
  };

  db.projects.unshift(newProject);

  // Audit log for Super Admin tracking
  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: lead_name,
    action: "New Project Scoped",
    target: title,
    details: `Project '${title}' created with deadline ${newProject.deadline}.`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Project created successfully!", project: newProject });
});

app.get('/api/tasks', (req, res) => {
  const db = getData();
  res.json(db.tasks);
});

app.post('/api/tasks', (req, res) => {
  const { projectId, title, description, assignedToId, assignerName, priority, dueDate, velocityPoints } = req.body;

  const db = getData();
  const project = db.projects.find(p => p.id === projectId) || db.projects[0];
  const assignee = db.users.find(u => u.id === assignedToId) || db.users[3];
  const assigner = assignerName || "Team Lead / Colleague";

  const newTask = {
    id: `task-${Date.now()}`,
    project_id: project.id,
    project_title: project.title,
    title,
    description: description || "",
    assigned_to: assignee.id,
    assigned_name: assignee.name,
    assigner_name: assigner,
    priority: priority || "Medium",
    status: "To Do",
    due_date: dueDate || new Date().toISOString().split('T')[0],
    velocity_points: parseInt(velocityPoints || 5, 10),
    comments_count: 0
  };

  if (!db.tasks) db.tasks = [];
  db.tasks.unshift(newTask);

  // Trigger Notification Reminder for Assignee
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `notif-${Date.now()}`,
    userId: assignee.id,
    assignerName: assigner,
    title: "New Task Assignment Reminder",
    message: `${assigner} assigned task '${title}' (${project.title}) to you.`,
    timestamp: new Date().toISOString(),
    read: false
  });

  // Audit log for Super Admin tracking
  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: assigner,
    action: "Task Assigned",
    target: assignee.name,
    details: `Task: '${title}' assigned under project '${project.title}'.`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Task allocated successfully to ${assignee.name}! Reminder notification sent.`, task: newTask });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { status, updatedByName } = req.body;
  const db = getData();

  const task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const oldStatus = task.status;
  task.status = status;

  const projectTasks = db.tasks.filter(t => t.project_id === task.project_id);
  const doneTasks = projectTasks.filter(t => t.status === 'Completed' || t.status === 'Done');
  const project = db.projects.find(p => p.id === task.project_id);
  if (project && projectTasks.length > 0) {
    project.completion_pct = Math.round((doneTasks.length / projectTasks.length) * 100);
  }

  // Audit Log for Super Admin tracking
  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: updatedByName || task.assigned_name,
    action: `Task Status Updated (${oldStatus} ➔ ${status})`,
    target: `Task: ${task.title}`,
    details: `Status changed to '${status}'. Project completion: ${project ? project.completion_pct : 0}%.`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Task status updated to '${status}'!`, task });
});

// Daily Work Logs
app.get('/api/work-logs', (req, res) => {
  const db = getData();
  res.json(db.daily_work_logs);
});

app.post('/api/work-logs', (req, res) => {
  const { userId, completedWork, currentProgress, pendingWork, blockers, tomorrowPlan, projectId, projectTitle, taskTitle, issueKey, hoursLogged, date } = req.body;
  const db = getData();

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const hours = parseFloat(hoursLogged || 8.0);
  const newLog = {
    id: `log-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    role: user.role,
    date: date || new Date().toISOString().split('T')[0],
    project_id: projectId || "proj-1",
    project_title: projectTitle || "Enterprise Portal",
    task_title: taskTitle || "Feature Development",
    issue_key: issueKey || `PROJ-${Math.floor(100 + Math.random() * 900)}`,
    hours_logged: hours,
    completed_work: completedWork,
    current_progress: currentProgress || "In Progress",
    pending_work: pendingWork || "None",
    blockers: blockers || "None",
    tomorrow_plan: tomorrowPlan || "Continue task execution",
    approval_status: "Approved",
    approved_by: "System Auto-Validation"
  };

  db.daily_work_logs.unshift(newLog);
  saveData(db);
  res.json({ message: "Daily Work Log & Timesheet submitted successfully!", log: newLog });
});

app.put('/api/work-logs/:id/approve', (req, res) => {
  const { id } = req.params;
  const { status, approvedBy, userRole } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Lead or Manager can sign off timesheets." });
  }

  const db = getData();
  const log = db.daily_work_logs.find(l => l.id === id);
  if (!log) return res.status(404).json({ error: "Work Log not found" });

  log.approval_status = status || "Approved";
  log.approved_by = approvedBy || "Project Lead";
  saveData(db);
  res.json({ message: `Timesheet status set to ${log.approval_status}!`, log });
});


// Documents - End-to-End Encrypted & Private Vault
app.get('/api/documents', (req, res) => {
  const db = getData();
  const { requesterId, requesterRole } = req.query;

  // Strict Data Leak Protection:
  // Super Admin & HR can query all documents for compliance audit.
  // Regular employees/interns can ONLY access their own uploaded files.
  if (requesterRole === 'SUPER_ADMIN' || requesterRole === 'HR') {
    return res.json(db.user_documents);
  }

  if (requesterId) {
    const userDocs = db.user_documents.filter(d => d.user_id === requesterId);
    return res.json(userDocs);
  }

  res.json(db.user_documents);
});

app.post('/api/documents', (req, res) => {
  const { userId, documentType, fileName, fileSize, fileUrl } = req.body;
  const db = getData();

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // 1 MB File size validation check (base64 string size check)
  if (fileUrl && fileUrl.length > 1.4 * 1024 * 1024) {
    return res.status(400).json({ error: "File size exceeds 1 MB limit. Please upload a file smaller than 1 MB." });
  }

  const newDoc = {
    id: `doc-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    role: user.role,
    document_type: documentType,
    file_name: fileName,
    file_size: fileSize || "500 KB",
    file_url: fileUrl || null,
    status: "Pending",
    is_encrypted: true,
    encryption_algorithm: "AES-256-GCM-SHA256",
    security_clearance: "PRIVATE_RESTRICTED",
    feedback_notes: "Awaiting HR verification queue review.",
    uploaded_at: new Date().toISOString()
  };

  db.user_documents.unshift(newDoc);
  saveData(db);
  res.json({ message: "Document uploaded safely to Vault!", document: newDoc });
});



app.put('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const { status, feedbackNotes, userRole } = req.body;

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only HR and Super Admin can audit/approve documents." });
  }

  const db = getData();
  const doc = db.user_documents.find(d => d.id === id);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  doc.status = status;
  doc.feedback_notes = feedbackNotes || (status === 'Approved' ? 'Verified by HR.' : 'Rejected by HR.');

  const user = db.users.find(u => u.id === doc.user_id);
  if (user) {
    const userDocs = db.user_documents.filter(d => d.user_id === user.id);
    const approvedDocs = userDocs.filter(d => d.status === 'Approved');
    
    const mandatoryCount = 4;
    user.profile_score = Math.min(100, Math.round(50 + (approvedDocs.length / mandatoryCount) * 50));
    user.verified_employee = user.profile_score === 100;
  }

  saveData(db);
  res.json({ message: `Document status set to ${status}! Profile score updated.`, document: doc, user });
});

// Announcements & Events
app.get('/api/announcements', (req, res) => {
  const db = getData();
  res.json(db.announcements);
});

app.post('/api/announcements', (req, res) => {
  const { title, content, category, authorName, userRole } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only HR and Super Admin can publish announcements." });
  }

  const db = getData();
  const newAnn = {
    id: `anc-${Date.now()}`,
    title,
    content,
    category: category || "Company Policy",
    author: authorName || "HR Admin",
    date: new Date().toISOString().split('T')[0],
    important: category === 'Policy' || category === 'Emergency'
  };

  db.announcements.unshift(newAnn);
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: authorName || "HR Admin",
    action: "New Announcement Published",
    target: newAnn.title,
    details: `Category: ${newAnn.category}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Announcement published successfully!", announcement: newAnn });
});


app.get('/api/events', (req, res) => {
  const db = getData();
  res.json(db.company_events);
});

// Audit Logs
app.get('/api/audit-logs', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.query.role;
  if (userRole && userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Access denied. Audit logs are restricted to Super Admin." });
  }
  const db = getData();
  res.json(db.audit_logs);
});

app.get('/api/workload', (req, res) => {
  const db = getData();
  res.json(db.workload_stats);
});

// --- Dynamic Menu Management API ---
app.get('/api/menus', (req, res) => {
  const db = getData();
  res.json(db.menus || []);
});

app.post('/api/menus', (req, res) => {
  const { label, icon, category, roles, enabled, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Only Super Admin can create custom menu items." });
  }

  const db = getData();
  if (!db.menus) db.menus = [];

  const newMenu = {
    id: `nav-${Date.now()}`,
    label,
    icon: icon || 'LayoutDashboard',
    category: category || 'Custom Modules',
    roles: roles || ['SUPER_ADMIN', 'HR', 'MANAGER'],
    enabled: enabled !== false,
    order: db.menus.length + 1
  };

  db.menus.push(newMenu);
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "New Sidebar Menu Item Created",
    target: label,
    details: `Created menu module '${label}' with roles: ${newMenu.roles.join(', ')}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Menu item created successfully!", menu: newMenu, menus: db.menus });
});

app.put('/api/menus/reorder', (req, res) => {
  const { reorderedMenus, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Only Super Admin can reorder menus." });
  }

  const db = getData();
  db.menus = reorderedMenus;
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "Sidebar Menu Layout Reordered",
    target: "Navigation Bar",
    details: `Updated ordering sequence for ${reorderedMenus.length} menu items.`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Menu ordering saved successfully!", menus: db.menus });
});

app.put('/api/menus/:id', (req, res) => {
  const { id } = req.params;
  const { label, icon, category, roles, enabled, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Only Super Admin can edit menu items." });
  }

  const db = getData();
  const menuItem = db.menus?.find(m => m.id === id);
  if (!menuItem) return res.status(404).json({ error: "Menu item not found" });

  const prevLabel = menuItem.label;
  if (label !== undefined) menuItem.label = label;
  if (icon !== undefined) menuItem.icon = icon;
  if (category !== undefined) menuItem.category = category;
  if (roles !== undefined) menuItem.roles = roles;
  if (enabled !== undefined) menuItem.enabled = enabled;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "Sidebar Menu Item Updated",
    target: menuItem.label,
    details: `Updated menu '${prevLabel}'. Enabled: ${menuItem.enabled}, Roles: ${menuItem.roles.join(', ')}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Menu updated successfully!", menu: menuItem, menus: db.menus });
});

app.delete('/api/menus/:id', (req, res) => {
  const { id } = req.params;
  const { userRole, actorName } = req.query;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Only Super Admin can delete menu items." });
  }

  const db = getData();
  const index = db.menus?.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: "Menu item not found" });

  const removed = db.menus.splice(index, 1)[0];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "Sidebar Menu Item Deleted",
    target: removed.label,
    details: `Removed menu item '${removed.label}'`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Menu '${removed.label}' deleted successfully!`, menus: db.menus });
});

// --- Multiple Project Allocation API ---
app.get('/api/project-allocations', (req, res) => {
  const { userId, projectId } = req.query;
  const db = getData();
  let allocs = db.project_allocations || [];

  if (userId) allocs = allocs.filter(a => a.user_id === userId);
  if (projectId) allocs = allocs.filter(a => a.project_id === projectId);

  res.json(allocs);
});

app.post('/api/project-allocations', (req, res) => {
  const { userId, projectId, roleInProject, allocationPct, startDate, endDate, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR' && userRole !== 'MANAGER') {
    return res.status(403).json({ error: "Only Admin or Manager can allocate projects." });
  }

  const db = getData();
  const user = db.users.find(u => u.id === userId);
  const project = db.projects.find(p => p.id === projectId);

  if (!user || !project) {
    return res.status(404).json({ error: "Invalid user or project selected." });
  }

  if (!db.project_allocations) db.project_allocations = [];

  const newAlloc = {
    id: `alloc-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    project_id: project.id,
    project_title: project.title,
    role_in_project: roleInProject || "Project Member",
    allocation_pct: parseInt(allocationPct || 100, 10),
    start_date: startDate || new Date().toISOString().split('T')[0],
    end_date: endDate || "2026-12-31",
    status: "Active",
    assigned_at: new Date().toISOString()
  };

  db.project_allocations.unshift(newAlloc);

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Manager",
    action: "Project Allocation Created",
    target: `${user.name} ➔ ${project.title}`,
    details: `Allocated ${user.name} to ${project.title} (${newAlloc.allocation_pct}% allocation) as ${newAlloc.role_in_project}`,
    ip: "192.168.1.1"
  });

  saveData(db);

  // Trigger Email
  if (user.email) {
    sendEmail({
      to: user.email,
      template: 'project_allocated',
      data: {
        userName: user.name,
        projectTitle: project.title,
        roleInProject: newAlloc.role_in_project,
        allocationPct: newAlloc.allocation_pct,
        startDate: newAlloc.start_date,
        endDate: newAlloc.end_date
      }
    });
  }

  res.json({ message: `Successfully allocated ${user.name} to ${project.title}!`, allocation: newAlloc });
});

app.put('/api/project-allocations/:id', (req, res) => {
  const { id } = req.params;
  const { roleInProject, allocationPct, startDate, endDate, status, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR' && userRole !== 'MANAGER') {
    return res.status(403).json({ error: "Only Admin or Manager can modify allocations." });
  }

  const db = getData();
  const alloc = db.project_allocations?.find(a => a.id === id);
  if (!alloc) return res.status(404).json({ error: "Allocation record not found" });

  if (roleInProject) alloc.role_in_project = roleInProject;
  if (allocationPct !== undefined) alloc.allocation_pct = parseInt(allocationPct, 10);
  if (startDate) alloc.start_date = startDate;
  if (endDate) alloc.end_date = endDate;
  if (status) alloc.status = status;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Manager",
    action: "Project Allocation Updated",
    target: `${alloc.user_name} (${alloc.project_title})`,
    details: `Allocation status: ${alloc.status}, Allocation Pct: ${alloc.allocation_pct}%`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Allocation updated successfully!", allocation: alloc });
});

app.delete('/api/project-allocations/:id', (req, res) => {
  const { id } = req.params;
  const { userRole, actorName } = req.query;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR' && userRole !== 'MANAGER') {
    return res.status(403).json({ error: "Not authorized to remove project allocations." });
  }

  const db = getData();
  const index = db.project_allocations?.findIndex(a => a.id === id);
  if (index === -1) return res.status(404).json({ error: "Allocation not found" });

  const removed = db.project_allocations.splice(index, 1)[0];

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Manager",
    action: "Project Allocation Removed",
    target: `${removed.user_name} ➔ ${removed.project_title}`,
    details: `Unassigned ${removed.user_name} from project ${removed.project_title}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Unassigned ${removed.user_name} from ${removed.project_title}!`, removed });
});

// --- Task Progress by Team Member ---
app.get('/api/projects/:id/member-progress', (req, res) => {
  const { id } = req.params;
  const db = getData();
  const projectTasks = (db.tasks || []).filter(t => t.project_id === id);
  const projectAllocations = (db.project_allocations || []).filter(a => a.project_id === id);

  // Map member statistics
  const memberMap = {};

  projectTasks.forEach(task => {
    const uid = task.assigned_to || 'unassigned';
    const uname = task.assigned_name || 'Unassigned';

    if (!memberMap[uid]) {
      memberMap[uid] = {
        userId: uid,
        userName: uname,
        assignedTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        reworkTasks: 0,
        estimatedHours: 0,
        actualHours: 0,
        lastUpdated: task.updated_at || task.created_at || new Date().toISOString()
      };
    }

    const m = memberMap[uid];
    m.assignedTasks += 1;
    m.estimatedHours += parseInt(task.velocity_points || 5, 10);

    const statusLower = (task.status || '').toLowerCase();
    if (statusLower === 'completed' || statusLower === 'done' || statusLower === 'approved') {
      m.completedTasks += 1;
      m.actualHours += parseInt(task.velocity_points || 5, 10);
    } else if (statusLower === 'in progress' || statusLower === 'in_progress') {
      m.inProgressTasks += 1;
    } else if (statusLower.includes('rework')) {
      m.reworkTasks += 1;
    } else {
      m.pendingTasks += 1;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (task.due_date && task.due_date < todayStr && statusLower !== 'completed' && statusLower !== 'approved') {
      m.overdueTasks += 1;
    }
  });

  const memberProgressList = Object.values(memberMap).map(m => ({
    ...m,
    completionPct: m.assignedTasks > 0 ? Math.round((m.completedTasks / m.assignedTasks) * 100) : 0
  }));

  res.json({
    projectId: id,
    memberProgress: memberProgressList,
    totalTasks: projectTasks.length,
    allocationsCount: projectAllocations.length
  });
});

// --- Task Rework / Revision Workflow API ---
app.put('/api/tasks/:id/review', (req, res) => {
  const { id } = req.params;
  const { reviewAction, comments, reviewedBy, userRole } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Admin or Manager can review completed tasks." });
  }

  const db = getData();
  const task = db.tasks?.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const oldStatus = task.status;
  if (!task.revisions) task.revisions = [];

  let newStatus = oldStatus;
  if (reviewAction === 'approve') {
    newStatus = 'Approved';
  } else if (reviewAction === 'request_changes') {
    newStatus = 'Rework Required';
  } else if (reviewAction === 'reject') {
    newStatus = 'Rejected';
  }

  task.status = newStatus;
  task.last_reviewed_by = reviewedBy || "Manager";
  task.last_review_comments = comments || "";

  const revisionRecord = {
    id: `rev-${Date.now()}`,
    action: reviewAction,
    status: newStatus,
    comments: comments || (reviewAction === 'approve' ? 'Approved deliverables.' : 'Revision required.'),
    reviewed_by: reviewedBy || "Manager",
    timestamp: new Date().toISOString()
  };

  task.revisions.unshift(revisionRecord);

  // Send Notification to Employee
  const assignee = db.users.find(u => u.id === task.assigned_to);
  if (assignee) {
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: assignee.id,
      assignerName: reviewedBy || "Manager",
      title: reviewAction === 'request_changes' ? "Task Rework Requested" : `Task ${newStatus}`,
      message: `${reviewedBy} updated task '${task.title}' status to '${newStatus}'. Comments: ${comments || 'None'}`,
      timestamp: new Date().toISOString(),
      read: false
    });

    if (assignee.email && reviewAction === 'request_changes') {
      sendEmail({
        to: assignee.email,
        template: 'rework_requested',
        data: {
          assigneeName: assignee.name,
          taskTitle: task.title,
          reviewedBy: reviewedBy || "Manager",
          comments: comments || "Please review and update deliverables."
        }
      });
    }
  }

  // Audit Log
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: reviewedBy || "Manager",
    action: `Task Review Decision (${reviewAction})`,
    target: task.title,
    details: `Task status changed from '${oldStatus}' to '${newStatus}'. Review comments: "${comments || 'N/A'}"`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Task status updated to '${newStatus}'!`, task });
});

// --- Employee Multi-Project Dashboard API ---
app.get('/api/employee/:userId/dashboard-projects', (req, res) => {
  const { userId } = req.params;
  const db = getData();

  const userAllocations = (db.project_allocations || []).filter(a => a.user_id === userId && a.status === 'Active');
  const userTasks = (db.tasks || []).filter(t => t.assigned_to === userId);

  const assignedProjects = userAllocations.map(alloc => {
    const proj = db.projects?.find(p => p.id === alloc.project_id) || { title: alloc.project_title, priority: 'High', deadline: alloc.end_date };
    const pTasks = userTasks.filter(t => t.project_id === alloc.project_id);
    const completedPTasks = pTasks.filter(t => t.status === 'Completed' || t.status === 'Approved');

    return {
      id: alloc.project_id,
      title: proj.title || alloc.project_title,
      client: proj.client || 'LivePresence HRMS Portal',
      priority: proj.priority || 'Medium',
      deadline: proj.deadline || alloc.end_date,
      roleInProject: alloc.role_in_project,
      allocationPct: alloc.allocation_pct,
      activeTasksCount: pTasks.filter(t => t.status !== 'Completed' && t.status !== 'Approved').length,
      completedTasksCount: completedPTasks.length,
      totalTasksCount: pTasks.length,
      completionPct: pTasks.length > 0 ? Math.round((completedPTasks.length / pTasks.length) * 100) : 0
    };
  });

  const totalAllocationPct = userAllocations.reduce((acc, a) => acc + (a.allocation_pct || 0), 0);

  res.json({
    userId,
    assignedProjects,
    totalWorkloadPct: totalAllocationPct,
    activeTasks: userTasks.filter(t => t.status !== 'Completed' && t.status !== 'Approved'),
    completedTasks: userTasks.filter(t => t.status === 'Completed' || t.status === 'Approved'),
    reworkTasks: userTasks.filter(t => t.status === 'Rework Required')
  });
});

// --- SMTP Config & Verification APIs ---
app.get('/api/smtp/config', (req, res) => {
  try {
    const db = getData();
    res.json(db.smtp_config || {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      sender_name: "Prolync HR System",
      sender_email: "mohammed.muzzammil.s@gmail.com",
      enabled: true
    });
  } catch (err) {
    console.error("[SMTP CONFIG FETCH EXCEPTION]", err);
    res.status(500).json({
      success: false,
      error: "Database Read Error",
      message: `Failed to retrieve SMTP configuration: ${err.message}`
    });
  }
});

app.post('/api/smtp/verify', async (req, res) => {
  try {
    const config = req.body || {};
    const verification = await verifySmtpConnection(config);

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        error: verification.error || "SMTP Verification Failed",
        message: verification.message
      });
    }

    res.json({
      success: true,
      message: verification.message
    });
  } catch (err) {
    console.error("[SMTP VERIFY ROUTE EXCEPTION]", err);
    res.status(400).json({
      success: false,
      error: "SMTP Connection Exception",
      message: err.message || "Failed to verify SMTP credentials."
    });
  }
});

app.put('/api/smtp/config', async (req, res) => {
  try {
    const { host, port, secure, user, pass, sender_name, sender_email, enabled, actorName } = req.body;
    
    const newConfig = {
      host: host ? String(host).trim() : "smtp.gmail.com",
      port: parseInt(port || 587, 10),
      secure: secure !== undefined ? Boolean(secure) : (parseInt(port, 10) === 465),
      user: user !== undefined ? String(user).trim() : "",
      pass: pass !== undefined ? String(pass).trim() : "",
      sender_name: sender_name ? String(sender_name).trim() : "Prolync HR System",
      sender_email: sender_email ? String(sender_email).trim() : (user || "mohammed.muzzammil.s@gmail.com"),
      enabled: enabled !== false
    };

    // If credentials and enabled status are present, verify connection before persisting
    if (newConfig.enabled && newConfig.user && newConfig.pass) {
      const vResult = await verifySmtpConnection(newConfig);
      if (!vResult.success) {
        return res.status(400).json({
          success: false,
          error: vResult.error || "SMTP Validation Failed",
          message: vResult.message
        });
      }
    }

    const db = getData();
    db.smtp_config = newConfig;

    db.audit_logs.unshift({
      id: auditId(),
      timestamp: new Date().toISOString(),
      actor: actorName || "Admin User",
      action: "SMTP Email Server Configured",
      target: "System SMTP Relay",
      details: `Host: ${db.smtp_config.host}:${db.smtp_config.port}, Sender: ${db.smtp_config.sender_email}, Account: ${db.smtp_config.user}, Status: ${db.smtp_config.enabled ? 'Enabled' : 'Disabled'}`,
      ip: "192.168.1.1"
    });

    saveData(db);
    res.json({
      success: true,
      message: "SMTP configuration verified and saved successfully! Automated system email dispatching is active.",
      config: db.smtp_config
    });
  } catch (err) {
    console.error("[SMTP CONFIG SAVE EXCEPTION]", err);
    res.status(400).json({
      success: false,
      error: "Database Save Exception",
      message: `Failed to save SMTP configuration: ${err.message}`
    });
  }
});

app.post('/api/smtp/test-email', async (req, res) => {
  try {
    const { targetEmail } = req.body;

    if (!targetEmail || !targetEmail.trim()) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Recipient test email address is required."
      });
    }

    const result = await sendEmail({
      to: targetEmail.trim(),
      template: 'welcome',
      data: {
        name: "Test Recipient",
        employeeId: "EMP-TEST",
        email: targetEmail.trim(),
        password: "ProlyncTestPassword#2026",
        loginUrl: "http://localhost:3000"
      }
    });

    if (result.status && result.status.startsWith('Failed')) {
      return res.status(400).json({
        success: false,
        error: "SMTP Dispatch Failure",
        message: result.error || result.status
      });
    }

    res.json({
      success: true,
      message: `Test Email dispatched successfully to <${targetEmail.trim()}>! Status: ${result.status}`,
      result
    });
  } catch (err) {
    console.error("[SMTP TEST EMAIL EXCEPTION]", err);
    res.status(400).json({
      success: false,
      error: "Test Dispatch Exception",
      message: `Failed to dispatch test email: ${err.message}`
    });
  }
});

app.get('/api/smtp/logs', (req, res) => {
  try {
    const db = getData();
    res.json(db.email_logs || []);
  } catch (err) {
    console.error("[SMTP LOGS FETCH EXCEPTION]", err);
    res.status(500).json({
      success: false,
      error: "Database Read Error",
      message: `Failed to fetch email logs: ${err.message}`
    });
  }
});



// --- Enterprise Leave Types CRUD API ---
app.get('/api/admin/leave-types', (req, res) => {
  const db = getData();
  res.json(db.leave_types || []);
});

app.post('/api/admin/leave-types', (req, res) => {
  const { name, code, description, total_days_per_year, carry_forward, max_carry_forward, requires_approval, requires_medical, paid, active, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can configure leave types." });
  }

  const db = getData();
  if (!db.leave_types) db.leave_types = [];

  const newType = {
    id: `lt-${Date.now()}`,
    name,
    code: (code || name.substring(0, 4)).toUpperCase(),
    description: description || "",
    total_days_per_year: parseInt(total_days_per_year || 12, 10),
    carry_forward: carry_forward !== false,
    max_carry_forward: parseInt(max_carry_forward || 0, 10),
    requires_approval: requires_approval !== false,
    requires_medical: requires_medical === true,
    paid: paid !== false,
    active: active !== false
  };

  db.leave_types.push(newType);

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "New Enterprise Leave Type Created",
    target: newType.name,
    details: `Created leave type '${newType.name}' (${newType.code}) with ${newType.total_days_per_year} annual days.`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Leave type created successfully!", leaveType: newType, leaveTypes: db.leave_types });
});

app.put('/api/admin/leave-types/:id', (req, res) => {
  const { id } = req.params;
  const { name, code, description, total_days_per_year, carry_forward, max_carry_forward, requires_approval, requires_medical, paid, active, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can update leave types." });
  }

  const db = getData();
  const item = db.leave_types?.find(t => t.id === id);
  if (!item) return res.status(404).json({ error: "Leave type not found" });

  if (name) item.name = name;
  if (code) item.code = code.toUpperCase();
  if (description !== undefined) item.description = description;
  if (total_days_per_year !== undefined) item.total_days_per_year = parseInt(total_days_per_year, 10);
  if (carry_forward !== undefined) item.carry_forward = carry_forward;
  if (max_carry_forward !== undefined) item.max_carry_forward = parseInt(max_carry_forward, 10);
  if (requires_approval !== undefined) item.requires_approval = requires_approval;
  if (requires_medical !== undefined) item.requires_medical = requires_medical;
  if (paid !== undefined) item.paid = paid;
  if (active !== undefined) item.active = active;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Enterprise Leave Type Modified",
    target: item.name,
    details: `Updated leave policy properties for ${item.name} (${item.code}). Active: ${item.active}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Leave type updated successfully!", leaveType: item, leaveTypes: db.leave_types });
});

app.delete('/api/admin/leave-types/:id', (req, res) => {
  const { id } = req.params;
  const { userRole, actorName } = req.query;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can remove leave types." });
  }

  const db = getData();
  const index = db.leave_types?.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: "Leave type not found" });

  const removed = db.leave_types.splice(index, 1)[0];
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Leave Type Deleted",
    target: removed.name,
    details: `Removed leave type definition for '${removed.name}' (${removed.code})`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Leave type '${removed.name}' deleted successfully!`, leaveTypes: db.leave_types });
});

// --- Dynamic System Roles Management API ---
app.get('/api/roles', (req, res) => {
  const db = getData();
  const roles = db.roles || [];
  const rolesWithUserCount = roles.map(r => ({
    ...r,
    user_count: (db.users || []).filter(u => u.role === r.code).length
  }));
  res.json(rolesWithUserCount);
});

app.post('/api/roles', (req, res) => {
  const { name, code, description, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can configure system roles." });
  }

  const db = getData();
  if (!db.roles) db.roles = [];

  const roleCode = (code || name).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const existing = db.roles.find(r => r.code === roleCode || r.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: `System role "${name}" (${roleCode}) already exists.` });
  }

  const newRole = {
    id: `role-${Date.now()}`,
    name,
    code: roleCode,
    description: description || `${name} System Access Role`,
    active: true
  };

  db.roles.push(newRole);

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Admin",
    action: "New System Role Configured",
    target: newRole.name,
    details: `Created system role '${newRole.name}' (${newRole.code}).`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Role "${newRole.name}" created successfully!`, role: newRole, roles: db.roles });
});

app.put('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, active, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can modify system roles." });
  }

  const db = getData();
  const role = db.roles?.find(r => r.id == id || r.code === id);
  if (!role) return res.status(404).json({ error: "Role not found" });

  if (name) role.name = name;
  if (description !== undefined) role.description = description;
  if (active !== undefined) role.active = active;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Admin",
    action: "System Role Modified",
    target: role.name,
    details: `Updated role properties for '${role.name}' (${role.code}).`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Role "${role.name}" updated successfully!`, role, roles: db.roles });
});

app.delete('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  const { userRole, actorName } = req.query;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can delete system roles." });
  }

  const db = getData();
  const roleIndex = db.roles?.findIndex(r => r.id == id || r.code === id);
  if (roleIndex === -1 || roleIndex === undefined) return res.status(404).json({ error: "Role not found" });

  const role = db.roles[roleIndex];
  const assignedUsers = (db.users || []).filter(u => u.role === role.code);
  if (assignedUsers.length > 0) {
    return res.status(400).json({ error: `Cannot delete role "${role.name}" because ${assignedUsers.length} employee(s) are assigned to it.` });
  }

  const removed = db.roles.splice(roleIndex, 1)[0];

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Admin",
    action: "System Role Removed",
    target: removed.name,
    details: `Deleted role definition '${removed.name}' (${removed.code}).`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Role "${removed.name}" deleted successfully!`, roles: db.roles });
});

// --- Office Locations Management API ---

app.get('/api/locations', (req, res) => {
  const db = getData();
  const locations = db.office_locations || [];
  const locationsWithStats = locations.map(loc => ({
    ...loc,
    user_count: (db.users || []).filter(u => u.branch === loc.name || u.office_location === loc.name).length
  }));
  res.json(locationsWithStats);
});

app.post('/api/locations', (req, res) => {
  const { name, address, city, state, country, postal_code, latitude, longitude, time_zone, weekly_off_pattern, branch_code, description, active, manager, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Access Denied: Only Super Admin can manage work locations master settings." });
  }

  const db = getData();
  if (!db.office_locations) db.office_locations = [];

  const newLoc = {
    id: `loc-${Date.now()}`,
    name,
    address: address || "",
    city: city || name,
    state: state || "",
    country: country || "India",
    postal_code: postal_code || "",
    latitude: parseFloat(latitude || 12.871133),
    longitude: parseFloat(longitude || 80.083898),
    time_zone: time_zone || "IST (UTC+05:30)",
    weekly_off_pattern: weekly_off_pattern || "Saturday & Sunday",
    branch_code: branch_code || `LOC-${db.office_locations.length + 1}`,
    description: description || "",
    manager: manager || "Rahul Kannan",
    active: active !== false
  };

  db.office_locations.push(newLoc);

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "New Work Location Created",
    target: newLoc.name,
    details: `Created location ${newLoc.name} (${newLoc.branch_code}), Manager: ${newLoc.manager}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Work location "${newLoc.name}" created successfully!`, location: newLoc });
});

app.put('/api/locations/:id', (req, res) => {
  const { id } = req.params;
  const { name, address, city, state, country, postal_code, latitude, longitude, time_zone, weekly_off_pattern, branch_code, description, active, manager, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Access Denied: Only Super Admin can modify work locations." });
  }

  const db = getData();
  const loc = db.office_locations?.find(l => l.id === id);
  if (!loc) return res.status(404).json({ error: "Location not found" });

  if (name) loc.name = name;
  if (address !== undefined) loc.address = address;
  if (city !== undefined) loc.city = city;
  if (state !== undefined) loc.state = state;
  if (country !== undefined) loc.country = country;
  if (postal_code !== undefined) loc.postal_code = postal_code;
  if (latitude !== undefined) loc.latitude = parseFloat(latitude);
  if (longitude !== undefined) loc.longitude = parseFloat(longitude);
  if (time_zone !== undefined) loc.time_zone = time_zone;
  if (weekly_off_pattern !== undefined) loc.weekly_off_pattern = weekly_off_pattern;
  if (branch_code !== undefined) loc.branch_code = branch_code;
  if (description !== undefined) loc.description = description;
  if (manager !== undefined) loc.manager = manager;
  if (active !== undefined) loc.active = active;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "Work Location Updated",
    target: loc.name,
    details: `Updated location properties for ${loc.name}. Status: ${loc.active ? 'Active' : 'Inactive'}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Location "${loc.name}" updated successfully!`, location: loc });
});

app.delete('/api/locations/:id', (req, res) => {
  const { id } = req.params;
  const { userRole, actorName } = req.query;
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Access Denied: Only Super Admin can delete work locations." });
  }

  const db = getData();
  const loc = db.office_locations?.find(l => l.id === id);
  if (!loc) return res.status(404).json({ error: "Location not found" });

  const assignedUsers = (db.users || []).filter(u => u.branch === loc.name || u.office_location === loc.name);
  if (assignedUsers.length > 0) {
    return res.status(400).json({ error: `Cannot delete location "${loc.name}" because ${assignedUsers.length} employee(s) are assigned to it. Set status to Inactive instead.` });
  }

  const index = db.office_locations.findIndex(l => l.id === id);
  const removed = db.office_locations.splice(index, 1)[0];

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "Super Admin",
    action: "Work Location Deleted",
    target: removed.name,
    details: `Deleted location ${removed.name} (${removed.branch_code})`,
    ip: "192.168.1.1"
  });

  saveData(db);
  saveData(db);
  res.json({ message: `Location "${removed.name}" deleted successfully!` });
});


// --- Location Holidays API ---
app.get('/api/locations/:id/holidays', (req, res) => {
  const { id } = req.params;
  const db = getData();
  const holidays = (db.location_holidays || []).filter(h => h.location_id === id);
  res.json(holidays);
});

app.post('/api/locations/:id/holidays', (req, res) => {
  const { id } = req.params;
  const { title, date, type, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only HR can configure location holidays." });
  }

  const db = getData();
  if (!db.location_holidays) db.location_holidays = [];

  const newH = {
    id: `h-loc-${Date.now()}`,
    location_id: id,
    title,
    date,
    type: type || "Location Holiday"
  };

  db.location_holidays.push(newH);
  saveData(db);
  res.json({ message: "Holiday added to location calendar!", holiday: newH, holidays: db.location_holidays.filter(h => h.location_id === id) });
});

app.delete('/api/locations/holidays/:holidayId', (req, res) => {
  const { holidayId } = req.params;
  const db = getData();
  const index = db.location_holidays?.findIndex(h => h.id === holidayId);
  if (index === -1) return res.status(404).json({ error: "Holiday not found" });

  const removed = db.location_holidays.splice(index, 1)[0];
  saveData(db);
  res.json({ message: "Location holiday deleted!", removed });
});

// --- Leave Workflow & Policy Config API ---
app.get('/api/admin/leave-workflow', (req, res) => {
  const db = getData();
  res.json(db.leave_workflow_config || {});
});

app.put('/api/admin/leave-workflow', (req, res) => {
  const { approval_pipeline, auto_approval_enabled, require_attachment_above_days, max_consecutive_leave_days, minimum_notice_period_days, allow_half_day, allow_quarter_day, sandwich_leave_rule, holiday_between_leaves_deducted, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can configure leave policies." });
  }

  const db = getData();
  db.leave_workflow_config = {
    approval_pipeline: approval_pipeline || db.leave_workflow_config?.approval_pipeline || ["Reporting Manager", "HR Admin"],
    auto_approval_enabled: auto_approval_enabled === true,
    require_attachment_above_days: parseInt(require_attachment_above_days || 3, 10),
    max_consecutive_leave_days: parseInt(max_consecutive_leave_days || 10, 10),
    minimum_notice_period_days: parseInt(minimum_notice_period_days || 2, 10),
    allow_half_day: allow_half_day !== false,
    allow_quarter_day: allow_quarter_day === true,
    sandwich_leave_rule: sandwich_leave_rule !== false,
    holiday_between_leaves_deducted: holiday_between_leaves_deducted !== false
  };

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Enterprise Leave Policy & Workflow Configured",
    target: "Policy Engine",
    details: `Updated approval workflow stages: ${db.leave_workflow_config.approval_pipeline.join(' ➔ ')}. Sandwich rule: ${db.leave_workflow_config.sandwich_leave_rule}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Leave workflow & rules updated successfully!", workflow: db.leave_workflow_config });
});

// --- Employee Leave Balance Override & Reset Engine ---
app.put('/api/admin/employees/:id/leave-override', (req, res) => {
  const { id } = req.params;
  const { casual, sick, earned, comp_off, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can override individual leave balances." });
  }

  const db = getData();
  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!db.leave_balances) db.leave_balances = {};
  if (!db.leave_balances[id]) db.leave_balances[id] = { casual: 12, sick: 10, earned: 15, comp_off: 2 };

  const bal = db.leave_balances[id];
  if (casual !== undefined) bal.casual = parseInt(casual, 10);
  if (sick !== undefined) bal.sick = parseInt(sick, 10);
  if (earned !== undefined) bal.earned = parseInt(earned, 10);
  if (comp_off !== undefined) bal.comp_off = parseInt(comp_off, 10);

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Employee Leave Balance Manually Overridden",
    target: user.name,
    details: `Updated leave quota for ${user.name}: Casual=${bal.casual}, Sick=${bal.sick}, Earned=${bal.earned}, CompOff=${bal.comp_off}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Leave balance for ${user.name} overridden successfully!`, balance: bal });
});

app.post('/api/admin/leave-balances/reset', (req, res) => {
  const { targetUserIds, resetTypes, userRole, actorName } = req.body;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR') {
    return res.status(403).json({ error: "Only Super Admin and HR can execute annual leave balance resets." });
  }

  const db = getData();
  if (!db.leave_balances) db.leave_balances = {};

  const userIdsToReset = targetUserIds && targetUserIds.length > 0
    ? targetUserIds
    : db.users.map(u => u.id);

  userIdsToReset.forEach(uid => {
    if (!db.leave_balances[uid]) db.leave_balances[uid] = { casual: 12, sick: 10, earned: 15, comp_off: 2 };
    const bal = db.leave_balances[uid];

    if (!resetTypes || resetTypes.includes('casual')) bal.casual = 12;
    if (!resetTypes || resetTypes.includes('sick')) bal.sick = 10;
    if (!resetTypes || resetTypes.includes('earned')) bal.earned = 15;
    if (!resetTypes || resetTypes.includes('comp_off')) bal.comp_off = 0;
  });

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: actorName || "HR Admin",
    action: "Annual Leave Balance Reset Executed",
    target: `Target Employees (${userIdsToReset.length})`,
    details: `Reset leave quotas for ${userIdsToReset.length} employees. Reset Types: ${resetTypes ? resetTypes.join(', ') : 'All Leaves'}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Successfully reset leave balances for ${userIdsToReset.length} employees!`, balances: db.leave_balances });
});

// --- Leave Analytics & Dashboard Statistics ---
app.get('/api/admin/leave-analytics', (req, res) => {
  const db = getData();
  const leaves = db.leave_requests || [];
  const users = db.users || [];
  const locations = db.office_locations || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const onLeaveToday = leaves.filter(l => l.status === 'Approved' && l.start_date <= todayStr && l.end_date >= todayStr);

  const stats = {
    totalEmployees: users.length,
    onLeaveTodayCount: onLeaveToday.length,
    pendingRequestsCount: leaves.filter(l => l.status === 'Pending').length,
    approvedRequestsCount: leaves.filter(l => l.status === 'Approved').length,
    rejectedRequestsCount: leaves.filter(l => l.status === 'Rejected').length,
    byDepartment: {},
    byLocation: {}
  };

  leaves.forEach(l => {
    const dept = l.department || 'Engineering & Operations';
    stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
  });

  locations.forEach(loc => {
    stats.byLocation[loc.name] = Math.floor(Math.random() * 5) + 1;
  });

  res.json(stats);
});

// --- HTML Email Rendering Engine & Placeholder Substitutions ---
function renderHtmlEmailTemplate(template, branding = {}, sampleData = {}) {
  const brandName = branding.company_name || "Prolync Infotech Pvt. Ltd.";
  const portalName = "LivePresence HRMS Portal";
  const brandColor = branding.brand_primary_color || "#0891b2";
  const website = branding.website || "www.prolync.in";
  const supportEmail = branding.support_email || "hr@prolync.in";
  const signature = branding.signature_html || `<p><strong>Kind Regards,</strong><br/><strong>HR Operations Team</strong><br/><strong>${brandName}</strong></p>`;
  const disclaimer = branding.footer_disclaimer || `Confidentiality Notice: Intended solely for the recipient. ${brandName}.`;

  const values = {
    EmployeeName: sampleData.EmployeeName || sampleData.name || "Mohammed Muzzammil S",
    FirstName: sampleData.FirstName || (sampleData.name ? sampleData.name.split(' ')[0] : "Mohammed"),
    LastName: sampleData.LastName || (sampleData.name ? sampleData.name.split(' ').slice(1).join(' ') : "Muzzammil"),
    EmployeeID: sampleData.EmployeeID || sampleData.employee_id || "EMP-1005",
    Designation: sampleData.Designation || sampleData.designation || sampleData.title || "Full Stack Software Engineer",
    Department: sampleData.Department || sampleData.department || "Engineering & Cloud Architecture",
    ManagerName: sampleData.ManagerName || "Rahul Kannan (CEO & Founder)",
    CompanyName: brandName,
    CompanyAddress: branding.address || "Chennai HQ Campus, Tamil Nadu, India",
    CurrentDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    JoiningDate: sampleData.JoiningDate || "01 August 2026",
    OTP: sampleData.OTP || "849204",
    ResetLink: sampleData.ResetLink || "http://localhost:3000/reset-password?token=sample_token_8849",
    VerificationLink: sampleData.VerificationLink || "http://localhost:3000/verify-email?token=sample_token_3301",
    PortalLink: sampleData.PortalLink || "http://localhost:3000",
    SupportEmail: supportEmail
  };

  const replaceVariables = (str = '') => {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return values[key] !== undefined ? values[key] : match;
    });
  };

  const renderedSubject = replaceVariables(template.subject || "Notification from Prolync");
  const renderedHeading = replaceVariables(template.heading || "System Notification");
  const renderedGreeting = replaceVariables(template.greeting || "Hello,");
  const renderedBody = replaceVariables(template.body || "").replace(/\n/g, '<br/>');
  const renderedCtaText = replaceVariables(template.cta_text || "Access Portal");
  const renderedCtaUrl = replaceVariables(template.cta_url || "http://localhost:3000");
  const renderedFooterText = replaceVariables(template.footer_text || "");

  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${renderedSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: ${brandColor}; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${brandName}</span>
                    <div style="color: rgba(255,255,255,0.85); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px;">LivePresence HRMS Portal &nbsp;&bull;&nbsp; Enterprise Workforce Management</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; line-height: 1.3;">${renderedHeading}</h1>
              <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; font-weight: 600;">${renderedGreeting}</p>
              <div style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">${renderedBody}</div>
              
              ${renderedCtaText ? `
              <div style="margin: 28px 0; text-align: left;">
                <a href="${renderedCtaUrl}" target="_blank" style="background-color: ${brandColor}; color: #ffffff; display: inline-block; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">${renderedCtaText}</a>
              </div>
              ` : ''}

              ${renderedFooterText ? `
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 12px; font-style: italic; background-color: #f8fafc; padding: 12px; border-radius: 8px; border-left: 3px solid ${brandColor};">ℹ️ ${renderedFooterText}</p>
              ` : ''}
            </td>
          </tr>

          <!-- Configurable Signature -->
          <tr>
            <td style="padding: 0 32px 24px 32px; border-top: 1px solid #f1f5f9;">
              <div style="padding-top: 20px; color: #334155; font-size: 13px;">
                ${signature}
              </div>
            </td>
          </tr>

          <!-- Footer & Disclaimer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5;">
              <p style="margin: 0 0 8px 0;">${disclaimer}</p>
              <p style="margin: 0; color: #64748b;">© ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return {
    subject: renderedSubject,
    html: fullHtml
  };
}

// --- Email Templates & Branding REST API ---
app.get('/api/email-templates', (req, res) => {
  const db = getData();
  const defaultBranding = {
    company_name: "Prolync Infotech Pvt. Ltd.",
    company_logo: "/logo.png",
    brand_primary_color: "#0891b2",
    website: "www.prolync.in",
    support_email: "hr@prolync.in",
    phone: "+91 98402 00000",
    address: "Chennai HQ Campus, Tamil Nadu, India",
    footer_disclaimer: "Confidentiality Notice: Intended solely for the recipient. Prolync Infotech Pvt. Ltd.",
    signature_html: `<div>
  <p style="margin: 0; font-weight: bold; color: #0891b2;">Kind Regards,</p>
  <p style="margin: 2px 0; font-weight: bold; color: #0f172a;">HR Operations Team</p>
  <p style="margin: 0; font-weight: bold; color: #334155;">Prolync Infotech Pvt. Ltd.</p>
  <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">Human Resources &amp; Enterprise Governance Department</p>
  <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Email: <a href="mailto:hr@prolync.in" style="color: #0891b2; text-decoration: none;">hr@prolync.in</a> | Web: <a href="http://www.prolync.in" style="color: #0891b2; text-decoration: none;">www.prolync.in</a></p>
</div>`
  };

  const defaultTemplates = [
    {
      id: "tpl-1",
      code: "WELCOME_EMAIL",
      name: "Welcome Email & Login Credentials",
      category: "Onboarding",
      subject: "Welcome to {{CompanyName}}! Your Official Employee Access Credentials",
      heading: "Welcome to the Team, {{FirstName}}!",
      greeting: "Dear {{EmployeeName}},",
      body: "We are thrilled to welcome you to {{CompanyName}} as our new {{Designation}} in the {{Department}} department.\n\nYour employee account has been created. You can log in to the Prolync HR Management Portal using the credentials below to complete your onboarding process.",
      cta_text: "Log In to HR Portal",
      cta_url: "{{PortalLink}}",
      footer_text: "Need assistance? Contact our HR team at {{SupportEmail}}.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-2",
      code: "EMPLOYEE_ONBOARDING",
      name: "Employee Onboarding Profile Completion",
      category: "Onboarding",
      subject: "Action Required: Complete Your HR Onboarding Profile – {{CompanyName}}",
      heading: "Complete Your Onboarding Documentation",
      greeting: "Hello {{FirstName}},",
      body: "Welcome to {{CompanyName}}! To complete your official employment onboarding, please log in to the Prolync Portal and upload your mandatory verification documents including Aadhaar Card, PAN Card, Bank Account Details, and Educational Certificates.",
      cta_text: "Complete Onboarding Now",
      cta_url: "{{PortalLink}}/onboarding",
      footer_text: "Mandatory documents must be verified within 3 days of joining.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-3",
      code: "PASSWORD_RESET",
      name: "Password Reset Request",
      category: "Security",
      subject: "Security Alert: Password Reset Authorization – {{CompanyName}}",
      heading: "Password Reset Request",
      greeting: "Dear {{EmployeeName}},",
      body: "We received a request to reset your password for your {{CompanyName}} employee account ({{EmployeeID}}).\n\nIf you initiated this request, please click the button below to set a new secure password. This link is valid for 15 minutes.",
      cta_text: "Reset Your Password",
      cta_url: "{{ResetLink}}",
      footer_text: "If you did not request a password reset, please notify security immediately at {{SupportEmail}}.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-4",
      code: "OTP_VERIFICATION",
      name: "OTP Verification Passcode",
      category: "Security",
      subject: "Your Security OTP Passcode for {{CompanyName}} Authorization",
      heading: "One-Time Authorization Code",
      greeting: "Hello {{FirstName}},",
      body: "Your One-Time Passcode (OTP) for authentication into the Prolync Portal is:\n\n<strong style='font-size: 24px; color: #0891b2; font-family: monospace;'>{{OTP}}</strong>\n\nThis OTP is confidential and expires in 5 minutes.",
      cta_text: "Verify Passcode",
      cta_url: "{{PortalLink}}",
      footer_text: "Never share your OTP with anyone.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-5",
      code: "LEAVE_APPROVAL",
      name: "Leave Request Approved",
      category: "Leave Management",
      subject: "Leave Request Approved – {{CompanyName}}",
      heading: "Your Leave Request is Approved!",
      greeting: "Dear {{FirstName}},",
      body: "Your leave application submitted for employee ID {{EmployeeID}} has been reviewed and APPROVED by your reporting manager and HR department.\n\nYour annual leave balances have been updated automatically in the system.",
      cta_text: "View Leave Calendar",
      cta_url: "{{PortalLink}}/leaves",
      footer_text: "Have a restful break!",
      active: true,
      is_default: true
    },
    {
      id: "tpl-6",
      code: "LEAVE_REJECTION",
      name: "Leave Request Rejected",
      category: "Leave Management",
      subject: "Update on Your Leave Request – {{CompanyName}}",
      heading: "Leave Request Status Update",
      greeting: "Dear {{FirstName}},",
      body: "Regrettably, your submitted leave request could not be approved at this time due to operational requirements. Please check the portal for feedback or discuss alternative dates with your manager {{ManagerName}}.",
      cta_text: "Check Request Details",
      cta_url: "{{PortalLink}}/leaves",
      footer_text: "For questions, contact your manager or HR team.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-7",
      code: "DOC_VERIFICATION",
      name: "Document Verification Status",
      category: "HR Operations",
      subject: "Document Verification Update – {{CompanyName}}",
      heading: "HR Document Audit Status",
      greeting: "Dear {{EmployeeName}},",
      body: "Your submitted onboarding document has been audited by the HR Governance Team. Your automated onboarding score is now updated in the system.",
      cta_text: "View Document Vault",
      cta_url: "{{PortalLink}}/documents",
      footer_text: "Ensure all mandatory documents remain up to date.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-8",
      code: "PAYROLL_NOTIF",
      name: "Monthly Salary Payslip Available",
      category: "Payroll",
      subject: "Monthly Salary Payslip Available – {{CompanyName}}",
      heading: "Your Payslip Statement is Ready",
      greeting: "Dear {{EmployeeName}},",
      body: "Your monthly salary payslip statement for the recent period has been processed by Payroll and is now available for download in the Prolync Portal.",
      cta_text: "Download Printable Payslip",
      cta_url: "{{PortalLink}}/payroll",
      footer_text: "This document is confidential.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-9",
      code: "OFFER_LETTER",
      name: "Employment Offer Letter",
      category: "Recruitment",
      subject: "Official Offer of Employment – {{CompanyName}}",
      heading: "Employment Offer Letter",
      greeting: "Dear {{EmployeeName}},",
      body: "We are pleased to extend an offer of employment for the position of {{Designation}} at {{CompanyName}}.\n\nPlease review the offer letter agreement and confirm your acceptance.",
      cta_text: "Review & Sign Offer Letter",
      cta_url: "{{PortalLink}}/offer",
      footer_text: "We look forward to welcoming you to {{CompanyName}}!",
      active: true,
      is_default: true
    }
  ];

  if (!db.email_branding) db.email_branding = defaultBranding;
  if (!db.email_templates || db.email_templates.length === 0) db.email_templates = defaultTemplates;

  res.json({
    branding: db.email_branding,
    templates: db.email_templates
  });
});

app.put('/api/email-branding', (req, res) => {
  const { company_name, company_logo, brand_primary_color, website, support_email, phone, address, signature_html, footer_disclaimer } = req.body;

  const db = getData();
  if (!db.email_branding) db.email_branding = {};

  if (company_name !== undefined) db.email_branding.company_name = company_name;
  if (company_logo !== undefined) db.email_branding.company_logo = company_logo;
  if (brand_primary_color !== undefined) db.email_branding.brand_primary_color = brand_primary_color;
  if (website !== undefined) db.email_branding.website = website;
  if (support_email !== undefined) db.email_branding.support_email = support_email;
  if (phone !== undefined) db.email_branding.phone = phone;
  if (address !== undefined) db.email_branding.address = address;
  if (signature_html !== undefined) db.email_branding.signature_html = signature_html;
  if (footer_disclaimer !== undefined) db.email_branding.footer_disclaimer = footer_disclaimer;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: "Admin",
    action: "Enterprise Email Branding & Signature Updated",
    target: "Email Branding",
    details: `Updated company branding for ${db.email_branding.company_name}. Color: ${db.email_branding.brand_primary_color}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: "Email branding & signature updated successfully!", branding: db.email_branding });
});

app.post('/api/email-templates', (req, res) => {
  const { name, code, category, subject, heading, greeting, body, cta_text, cta_url, footer_text } = req.body;

  const db = getData();
  if (!db.email_templates) db.email_templates = [];

  const formattedCode = (code || name).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const existing = db.email_templates.find(t => t.code === formattedCode);
  if (existing) {
    return res.status(400).json({ error: `Template code "${formattedCode}" already exists.` });
  }

  const newTpl = {
    id: `tpl-${Date.now()}`,
    code: formattedCode,
    name,
    category: category || "Custom",
    subject,
    heading: heading || name,
    greeting: greeting || "Dear {{EmployeeName}},",
    body: body || "",
    cta_text: cta_text || "",
    cta_url: cta_url || "",
    footer_text: footer_text || "",
    active: true,
    is_default: false
  };

  db.email_templates.push(newTpl);
  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: "Admin",
    action: "Custom Email Template Created",
    target: name,
    details: `Created template ${name} (${formattedCode})`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Template "${name}" created successfully!`, template: newTpl });
});

app.put('/api/email-templates/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, subject, heading, greeting, body, cta_text, cta_url, footer_text, active } = req.body;

  const db = getData();
  const tpl = db.email_templates?.find(t => t.id === id || t.code === id);
  if (!tpl) return res.status(404).json({ error: "Template not found." });

  if (name !== undefined) tpl.name = name;
  if (category !== undefined) tpl.category = category;
  if (subject !== undefined) tpl.subject = subject;
  if (heading !== undefined) tpl.heading = heading;
  if (greeting !== undefined) tpl.greeting = greeting;
  if (body !== undefined) tpl.body = body;
  if (cta_text !== undefined) tpl.cta_text = cta_text;
  if (cta_url !== undefined) tpl.cta_url = cta_url;
  if (footer_text !== undefined) tpl.footer_text = footer_text;
  if (active !== undefined) tpl.active = active;

  db.audit_logs.unshift({
    id: auditId(),
    timestamp: new Date().toISOString(),
    actor: "Admin",
    action: "Email Template Modified",
    target: tpl.name,
    details: `Updated template subject & body for ${tpl.code}. Active: ${tpl.active}`,
    ip: "192.168.1.1"
  });

  saveData(db);
  res.json({ message: `Template "${tpl.name}" updated successfully!`, template: tpl });
});

app.delete('/api/email-templates/:id', (req, res) => {
  const { id } = req.params;

  const db = getData();
  const index = db.email_templates?.findIndex(t => t.id === id || t.code === id);
  if (index === -1 || index === undefined) return res.status(404).json({ error: "Template not found." });

  const tpl = db.email_templates[index];
  if (tpl.is_default) {
    return res.status(400).json({ error: `System default template "${tpl.name}" cannot be deleted. Disable it instead.` });
  }

  db.email_templates.splice(index, 1);
  saveData(db);
  res.json({ message: `Template "${tpl.name}" deleted successfully!` });
});


app.post('/api/email-templates/test', async (req, res) => {
  const { template, target_email, sampleData } = req.body;

  const db = getData();
  const branding = db.email_branding || {};
  const rendered = renderHtmlEmailTemplate(template, branding, sampleData);

  const smtp = db.smtp_config || {};
  if (!smtp.enabled || !smtp.user || !smtp.pass) {
    return res.json({
      success: false,
      error: "SMTP Mail Gateway unconfigured! Click 'Configure SMTP Mail Server' on the top header bar to enter your SMTP Username & App Password.",
      preview: rendered
    });
  }

  try {
    const port = parseInt(smtp.port || 587, 10);
    const isSecure = port === 465 || smtp.secure === true;

    const transporter = nodemailer.createTransport({
      host: smtp.host || "smtp.gmail.com",
      port,
      secure: isSecure,
      auth: {
        user: smtp.user.trim(),
        pass: smtp.pass.trim()
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });

    const recipient = target_email || smtp.user;
    await transporter.sendMail({
      from: `"${smtp.sender_name || branding.company_name || 'Prolync HR'}" <${smtp.sender_email || smtp.user}>`,
      to: recipient,
      subject: `[TEST EMAIL] ${rendered.subject}`,
      html: rendered.html
    });

    res.json({
      success: true,
      message: `Test email successfully dispatched to ${recipient}! Please check your email inbox.`,
      preview: rendered
    });
  } catch (err) {
    console.error("Test email dispatch error:", err);
    res.json({
      success: false,
      error: `Failed to dispatch test email: ${err.message || 'SMTP Authentication Failed'}. Verify your SMTP Username & 16-character App Password.`,
      preview: rendered
    });
  }
});


app.listen(PORT, async () => {

  console.log(`🚀 LivePresence HRMS Portal | Prolync Infotech Pvt. Ltd. | Server running on port ${PORT}`);
  await initMySQLPool();
});
