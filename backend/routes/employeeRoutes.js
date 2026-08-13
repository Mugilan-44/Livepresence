import express from 'express';
import crypto from 'crypto';
import { querySQL } from '../db.js';

const router = express.Router();

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const users = await querySQL('SELECT * FROM users ORDER BY created_at DESC');
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: "Failed to retrieve employee directory." });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const users = await querySQL(
      'SELECT * FROM users WHERE id = ? OR employee_id = ? LIMIT 1',
      [id, id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const { password, ...safeUser } = users[0];
    res.json(safeUser);
  } catch (err) {
    console.error('Error fetching employee:', err);
    res.status(500).json({ error: "Failed to retrieve employee details." });
  }
});

// POST /api/employees (Onboarding - Admin adds employee, system dispatches OTP invitation)
router.post('/', async (req, res) => {
  const { name, email, role, department, designation, branch, baseSalary, payType, internshipMonths, shift, userRole, password } = req.body;

  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Only the founder can add new employee records." });
  }

  if (!name || !email) {
    return res.status(400).json({ error: "Full Name and Email are required." });
  }
  if (!password || String(password).length < 8) return res.status(400).json({ error: 'Set an initial password with at least 8 characters.' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email address format. Email must contain '@' and a valid domain." });
  }

  const rawPhone = (req.body.phone || '').replace(/[^0-9]/g, '');
  if (req.body.phone && rawPhone.length !== 10) {
    return res.status(400).json({ error: "Phone number must contain exactly 10 digits (0-9)." });
  }

  try {
    const existing = await querySQL('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [email.trim().toLowerCase()]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "An employee with this email already exists." });
    }

    const employeeIds = await querySQL('SELECT employee_id FROM users');
    const empIdNum = employeeIds.reduce((highest, row) => {
      const numeric = Number(String(row.employee_id || '').match(/\d+$/)?.[0] || 1000);
      return Math.max(highest, numeric);
    }, 1000) + 1;
    const employeeId = `EMP-${empIdNum.toString().padStart(4, '0')}`;
    const userId = `usr-${Date.now()}`;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const empRole = role || 'FULL_TIME';
    const empDept = department === 'Both' ? 'Product and Service' : (department || 'Product');
    const empTitle = designation || 'Software Engineer';
    const empBranch = branch || 'Chennai HQ';
    const salary = payType === 'UNPAID' ? 0 : parseInt(baseSalary || 0, 10);
    const paymentType = payType === 'UNPAID' ? 'UNPAID' : 'PAID';
    const internMonths = empRole === 'INTERN' ? parseInt(internshipMonths || 3, 10) : null;
    const joiningDate = new Date().toISOString().split('T')[0];
    const storedPassword = password ? crypto.scryptSync(String(password), 'prolync_salt_2026', 64).toString('hex') : 'Prolync';

    await querySQL(
      `INSERT INTO users (id, employee_id, name, email, role, title, department, branch, office_location, salary_base, pay_type, internship_months, shift_timing, joining_date, verified_employee, profile_score, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 60, ?)`,
      [userId, employeeId, cleanName, cleanEmail, empRole, empTitle, empDept, empBranch, empBranch, salary, paymentType, internMonths, shift || 'General shift (09:00 AM - 07:00 PM)', joiningDate, storedPassword]
    );
    try {
      await querySQL(
        `INSERT INTO leave_balances (user_id, casual, sick, earned, comp_off)
         VALUES (?, 12, 10, 15, 2)
         ON DUPLICATE KEY UPDATE casual=VALUES(casual)`,
        [userId]
      );
    } catch (balanceError) {
      console.warn('Employee created without leave balance seed:', balanceError.message);
    }

    const newEmp = {
      id: userId,
      employee_id: employeeId,
      name: cleanName,
      email: cleanEmail,
      role: empRole,
      title: empTitle,
      department: empDept,
      branch: empBranch,
      joining_date: joiningDate,
      salary_base: salary,
      pay_type: paymentType,
      internship_months: internMonths,
      shift_timing: shift,
      verified_employee: false
    };

    res.json({
      message: 'New employee account created. Share the credentials privately with the employee.',
      employee: newEmp,
      invitation: {
        employeeId: employeeId,
        email: cleanEmail,
        passwordConfigured: true
      }
    });
  } catch (err) {
    console.error('Error adding employee:', err);
    const duplicate = err?.code === 'ER_DUP_ENTRY';
    res.status(duplicate ? 409 : 500).json({ error: duplicate ? 'This employee email or employee ID already exists.' : `Could not create employee: ${err.message || 'database error'}` });
  }
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const existing = await querySQL('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const current = existing[0];
    const isFounder = updates.actorRole === 'SUPER_ADMIN';
    const isSelf = updates.actorId && updates.actorId === id;
    if (!isFounder && !isSelf) {
      return res.status(403).json({ error: 'Only the founder can edit another employee profile.' });
    }
    if (!isFounder && ['role', 'title', 'department', 'branch', 'office_location', 'salary_base', 'pay_type', 'internship_months', 'email'].some((field) => updates[field] !== undefined)) {
      return res.status(403).json({ error: 'Only the founder can change employment and access details.' });
    }
    if (updates.newPassword !== undefined && !isFounder) {
      return res.status(403).json({ error: 'Only the founder can reset employee passwords.' });
    }
    if (updates.newPassword !== undefined && String(updates.newPassword).trim().length < 8) {
      return res.status(400).json({ error: 'The new password must contain at least 8 characters.' });
    }
    const updatedName = updates.name !== undefined ? updates.name : current.name;
    const updatedRole = updates.role !== undefined ? updates.role : current.role;
    const updatedTitle = updates.title !== undefined ? updates.title : current.title;
    const updatedDept = updates.department !== undefined ? (updates.department === 'Both' ? 'Product and Service' : updates.department) : current.department;
    const updatedBranch = updates.branch !== undefined ? updates.branch : current.branch;
    const updatedMobile = updates.mobile !== undefined ? updates.mobile : current.mobile;
    const updatedAddress = updates.address !== undefined ? updates.address : current.address;
    const updatedSalary = updates.salary_base !== undefined ? updates.salary_base : current.salary_base;
    const updatedEmail = updates.email !== undefined ? updates.email : current.email;
    const updatedDob = updates.dob !== undefined ? updates.dob || null : current.dob;
    const updatedBloodGroup = updates.blood_group !== undefined ? updates.blood_group : current.blood_group;
    const updatedGender = updates.gender !== undefined ? updates.gender : current.gender;
    const updatedEmergencyContact = updates.emergency_contact !== undefined ? updates.emergency_contact : current.emergency_contact;
    const updatedBankName = updates.bank_name !== undefined ? updates.bank_name : current.bank_name;
    const updatedBankAccount = updates.bank_account !== undefined ? updates.bank_account : current.bank_account;
    const updatedIfscSwift = updates.ifsc_swift !== undefined ? updates.ifsc_swift : current.ifsc_swift;
    const updatedAadhaar = updates.aadhaar_number !== undefined ? updates.aadhaar_number : current.aadhaar_number;
    const updatedPan = updates.pan_number !== undefined ? updates.pan_number : current.pan_number;
    const updatedOfficeLocation = updates.office_location !== undefined ? updates.office_location : current.office_location;
    const updatedAvatar = updates.avatar !== undefined ? updates.avatar : current.avatar;
    const passwordWasReset = updates.newPassword !== undefined;
    const updatedPassword = passwordWasReset
      ? crypto.scryptSync(String(updates.newPassword), 'prolync_salt_2026', 64).toString('hex')
      : current.password;
    const verifiedEmployee = passwordWasReset ? 1 : current.verified_employee;

    await querySQL(
      `UPDATE users SET name=?, email=?, role=?, title=?, department=?, branch=?, office_location=?, mobile=?, address=?, dob=?, blood_group=?, gender=?, emergency_contact=?, bank_name=?, bank_account=?, ifsc_swift=?, aadhaar_number=?, pan_number=?, avatar=?, salary_base=?, password=?, verified_employee=?, updated_at=NOW() WHERE id=?`,
      [updatedName, updatedEmail, updatedRole, updatedTitle, updatedDept, updatedBranch, updatedOfficeLocation, updatedMobile, updatedAddress, updatedDob, updatedBloodGroup, updatedGender, updatedEmergencyContact, updatedBankName, updatedBankAccount, updatedIfscSwift, updatedAadhaar, updatedPan, updatedAvatar, updatedSalary, updatedPassword, verifiedEmployee, id]
    );

    const resultRows = await querySQL('SELECT * FROM users WHERE id = ?', [id]);
    const { password, ...safeUser } = resultRows[0];
    res.json({ message: "Employee profile updated.", employee: safeUser });
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ error: "Database error updating employee profile." });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { actorRole, actorId } = req.body || {};
  if (actorRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only the founder can delete employee profiles.' });
  }
  try {
    const existing = await querySQL('SELECT id, name, role FROM users WHERE id = ? LIMIT 1', [id]);
    if (!existing?.length) return res.status(404).json({ error: 'Employee not found.' });
    if (existing[0].id === actorId || existing[0].role === 'SUPER_ADMIN') {
      return res.status(400).json({ error: 'The founder account cannot be deleted from People.' });
    }
    await querySQL('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: `${existing[0].name}'s employee profile was deleted successfully.` });
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: "Database error deleting employee record." });
  }
});

export default router;
