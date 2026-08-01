import express from 'express';
import { getData, saveData } from '../db.js';

const router = express.Router();

// GET /api/payroll
router.get('/', (req, res) => {
  const db = getData();
  res.json(db.payroll_records || []);
});

// POST /api/payroll/process
router.post('/process', (req, res) => {
  const { monthYear } = req.body;
  const db = getData();

  const processedList = db.users.map(u => {
    const base = u.salary_base || 65000;
    const basic = Math.round(base * 0.5);
    const hra = Math.round(base * 0.3);
    const bonus = 5000;
    const allowances = base - (basic + hra);
    const gross = basic + hra + bonus + allowances;
    const pf = Math.round(basic * 0.12);
    const esi = Math.round(gross * 0.0075);
    const tds = Math.round(gross * 0.05);
    const net = gross - (pf + esi + tds);

    return {
      id: `pr-${u.id}-${Date.now()}`,
      user_id: u.id,
      user_name: u.name,
      employee_id: u.employee_id,
      role: u.role,
      department: u.department,
      month_year: monthYear || 'August 2026',
      basic,
      hra,
      bonus,
      allowances,
      gross_salary: gross,
      pf_deduction: pf,
      esi_deduction: esi,
      tax_tds: tds,
      net_salary: net,
      payment_status: 'Paid',
      payment_date: new Date().toISOString().split('T')[0]
    };
  });

  if (!db.payroll_records) db.payroll_records = [];
  db.payroll_records = [...processedList, ...db.payroll_records];
  saveData(db);

  res.json({ message: `Payroll processed successfully for ${monthYear || 'current month'}.`, records: processedList });
});

export default router;
