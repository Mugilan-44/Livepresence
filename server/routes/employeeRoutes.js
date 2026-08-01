import express from 'express';
import { getData, saveData } from '../db.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// GET /api/employees
router.get('/', (req, res) => {
  const db = getData();
  const safeUsers = db.users.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

// GET /api/employees/:id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getData();
  const user = db.users.find(u => u.id === id || u.employee_id === id);
  if (!user) return res.status(404).json({ error: "Employee not found." });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

// POST /api/employees (Onboarding - Admin adds employee, system dispatches OTP invitation)
router.post('/', async (req, res) => {
  const { name, email, role, department, designation, branch, baseSalary, userRole } = req.body;
  const db = getData();

  if (userRole && !['SUPER_ADMIN', 'HR'].includes(userRole)) {
    return res.status(403).json({ error: "Only Super Admin and HR can add new employee records." });
  }

  if (!name || !email) {
    return res.status(400).json({ error: "Full Name and Email are required." });
  }

  // Email format validation (Must contain @ and domain)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email address format. Email must contain '@' and a valid domain." });
  }

  // Phone validation if provided (Must be 10 digits 0-9)
  const rawPhone = (req.body.phone || '').replace(/[^0-9]/g, '');
  if (req.body.phone && rawPhone.length !== 10) {
    return res.status(400).json({ error: "Phone number must contain exactly 10 digits (0-9)." });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "An employee with this email already exists." });
  }

  const empIdNum = db.users.length + 101;
  const employeeId = `EMP-${empIdNum.toString().padStart(4, '0')}`;
  const activationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const newEmployee = {
    id: `usr-${Date.now()}`,
    employee_id: employeeId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    active: false,
    role: role || 'FULL_TIME',
    department: department || 'Engineering & Operations',
    designation: designation || 'Software Engineer',
    branch: branch || 'Headquarters (Delhi NCR)',
    shift_timing: 'General (09:00 AM - 06:00 PM)',
    base_salary: parseInt(baseSalary || 60000, 10),
    joining_date: new Date().toISOString().split('T')[0],
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    verified_employee: false,
    profile_score: 60,
    emergency_contact: '+91 98765 00000',
    activation_code: activationCode
  };

  db.users.unshift(newEmployee);
  saveData(db);

  await sendEmail({
    to: newEmployee.email,
    template: 'invitation',
    data: {
      name: newEmployee.name,
      employeeId: newEmployee.employee_id,
      code: activationCode,
      loginUrl: 'http://localhost:3000'
    }
  });

  const { password: _, activation_code: __, ...safeEmp } = newEmployee;
  res.json({
    message: "New Employee onboarded successfully. An activation invitation was sent to their work email.",
    employee: safeEmp,
    invitation: {
      employeeId: newEmployee.employee_id,
      email: newEmployee.email,
      loginUrl: 'http://localhost:3000'
    }
  });
});

// PUT /api/employees/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const db = getData();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: "Employee not found." });

  db.users[index] = { ...db.users[index], ...req.body, updated_at: new Date().toISOString() };
  saveData(db);
  const { password: _, ...safeUser } = db.users[index];
  res.json({ message: "Employee profile updated.", employee: safeUser });
});

// DELETE /api/employees/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getData();
  db.users = db.users.filter(u => u.id !== id);
  saveData(db);
  res.json({ message: "Employee deleted successfully." });
});

export default router;
