import express from 'express';
import { querySQL, executeTransaction } from '../db.js';

const router = express.Router();

// GET /api/payroll
router.get('/', async (req, res) => {
  try {
    const records = await querySQL('SELECT * FROM payroll_records ORDER BY created_at DESC');
    res.json(records);
  } catch (err) {
    console.error('Error fetching payroll records:', err);
    res.status(500).json({ error: "Failed to fetch payroll records." });
  }
});

// POST /api/payroll/process
router.post('/process', async (req, res) => {
  const { monthYear } = req.body;
  const targetMonth = monthYear || 'August 2026';
  const paymentDate = new Date().toISOString().split('T')[0];

  try {
    const users = await querySQL('SELECT * FROM users');
    if (!users || users.length === 0) {
      return res.status(400).json({ error: "No users found to process payroll." });
    }

    const processedList = [];

    await executeTransaction(async (conn) => {
      for (const u of users) {
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
        const recordId = `pr-${u.id}-${Date.now()}`;

        await conn.query(
          `INSERT INTO payroll_records 
           (id, user_id, user_name, employee_id, role, department, month_year, basic, hra, bonus, allowances, gross_salary, pf_deduction, esi_deduction, tax_tds, net_salary, payment_status, payment_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paid', ?)`,
          [
            recordId, u.id, u.name, u.employee_id, u.role, u.department,
            targetMonth, basic, hra, bonus, allowances, gross, pf, esi, tds, net, paymentDate
          ]
        );

        processedList.push({
          id: recordId,
          user_id: u.id,
          user_name: u.name,
          employee_id: u.employee_id,
          role: u.role,
          department: u.department,
          month_year: targetMonth,
          basic, hra, bonus, allowances,
          gross_salary: gross,
          pf_deduction: pf,
          esi_deduction: esi,
          tax_tds: tds,
          net_salary: net,
          payment_status: 'Paid',
          payment_date: paymentDate
        });
      }
    });

    res.json({ message: `Payroll processed successfully for ${targetMonth}.`, records: processedList });
  } catch (err) {
    console.error('Error processing payroll:', err);
    res.status(500).json({ error: "Failed to process payroll in database." });
  }
});

export default router;
