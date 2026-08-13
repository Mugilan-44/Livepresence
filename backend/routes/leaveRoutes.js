import express from 'express';
import { querySQL } from '../db.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();
const policyNumber = (value, fallback) => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? fallback : Number(value));

// GET /api/leaves/policy
router.get('/policy', async (req, res) => {
  try {
    const rows = await querySQL('SELECT * FROM leave_policy LIMIT 1');
    const policy = (rows && rows.length > 0) ? {
      yearly_allocation: {
        casual: policyNumber(rows[0].yearly_casual, 12),
        sick: policyNumber(rows[0].yearly_sick, 10),
        earned: policyNumber(rows[0].yearly_earned, 15),
        comp_off: policyNumber(rows[0].yearly_comp_off, 2)
      },
      carry_forward_limit: policyNumber(rows[0].carry_forward_limit, 5),
      auto_approve_days: policyNumber(rows[0].auto_approve_days, 1),
      require_medical_proof_days: policyNumber(rows[0].require_medical_proof_days, 3),
      notice_period_days: policyNumber(rows[0].notice_period_days, 2)
    } : {
      yearly_allocation: { casual: 12, sick: 10, earned: 15, comp_off: 2 },
      carry_forward_limit: 5,
      auto_approve_days: 1,
      require_medical_proof_days: 3,
      notice_period_days: 2
    };
    res.json(policy);
  } catch (err) {
    console.error('Error fetching leave policy:', err);
    res.status(500).json({ error: "Failed to fetch leave policy." });
  }
});

// PUT /api/leaves/policy
router.put('/policy', async (req, res) => {
  const { yearly_allocation, carry_forward_limit, auto_approve_days, require_medical_proof_days, notice_period_days, updatedBy } = req.body;
  const inputAllocation = yearly_allocation || {};
  const alloc = {
    casual: policyNumber(inputAllocation.casual, 12),
    sick: policyNumber(inputAllocation.sick, 10),
    earned: policyNumber(inputAllocation.earned, 15),
    comp_off: policyNumber(inputAllocation.comp_off, 2)
  };

  try {
    await querySQL(
      `INSERT INTO leave_policy (id, yearly_casual, yearly_sick, yearly_earned, yearly_comp_off, carry_forward_limit, auto_approve_days, require_medical_proof_days, notice_period_days, updated_by)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE yearly_casual=VALUES(yearly_casual), yearly_sick=VALUES(yearly_sick), yearly_earned=VALUES(yearly_earned), yearly_comp_off=VALUES(yearly_comp_off), carry_forward_limit=VALUES(carry_forward_limit), auto_approve_days=VALUES(auto_approve_days), require_medical_proof_days=VALUES(require_medical_proof_days), notice_period_days=VALUES(notice_period_days), updated_by=VALUES(updated_by)`,
      [
        alloc.casual, alloc.sick, alloc.earned, alloc.comp_off,
        policyNumber(carry_forward_limit, 5),
        policyNumber(auto_approve_days, 1),
        policyNumber(require_medical_proof_days, 3),
        policyNumber(notice_period_days, 2),
        updatedBy || 'Super Admin'
      ]
    );

    // Policy changes are company-wide: refresh every employee's yearly balance
    // so their leave portal reflects the founder/HR update immediately.
    const users = await querySQL('SELECT id FROM users');
    for (const user of users) {
      await querySQL(
        `INSERT INTO leave_balances (user_id, casual, sick, earned, comp_off)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE casual=VALUES(casual), sick=VALUES(sick), earned=VALUES(earned), comp_off=VALUES(comp_off)`,
        [user.id, alloc.casual, alloc.sick, alloc.earned, alloc.comp_off]
      );
    }

    await querySQL(
      'INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES (?, NULL, ?, ?, ?, 0)',
      [`policy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, 'Leave policy updated', `${updatedBy || 'The founder'} updated the company leave policy. Review the latest rules before applying for leave.`, 'policy']
    );

    res.json({ message: "Leave policy rules updated for every employee." });
  } catch (err) {
    console.error('Error updating leave policy:', err);
    res.status(500).json({ error: "Failed to update leave policy." });
  }
});

// GET /api/leaves/balance/:userId
router.get('/balance/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const users = await querySQL('SELECT * FROM users WHERE id = ? OR employee_id = ? LIMIT 1', [userId, userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    const balanceRows = await querySQL('SELECT * FROM leave_balances WHERE user_id = ? LIMIT 1', [user.id]);
    const userBalance = (balanceRows && balanceRows.length > 0) ? balanceRows[0] : { casual: 12, sick: 10, earned: 15, comp_off: 2 };

    const approvedLeaves = await querySQL(
      `SELECT leave_type, days_count FROM leave_requests WHERE user_id = ? AND LOWER(status) LIKE '%approve%'`,
      [user.id]
    );

    const used = { casual: 0, sick: 0, earned: 0, comp_off: 0 };
    approvedLeaves.forEach(l => {
      const t = (l.leave_type || '').toLowerCase();
      const days = parseInt(l.days_count || 1, 10);
      if (t.includes('casual')) used.casual += days;
      else if (t.includes('sick')) used.sick += days;
      else if (t.includes('earned') || t.includes('privilege')) used.earned += days;
      else if (t.includes('comp')) used.comp_off += days;
    });

    const allocated = {
      casual: policyNumber(userBalance.casual, 12),
      sick: policyNumber(userBalance.sick, 10),
      earned: policyNumber(userBalance.earned, 15),
      comp_off: policyNumber(userBalance.comp_off, 2),
      total: policyNumber(userBalance.casual, 12) + policyNumber(userBalance.sick, 10) + policyNumber(userBalance.earned, 15) + policyNumber(userBalance.comp_off, 2)
    };

    const remaining = {
      casual: Math.max(0, allocated.casual - used.casual),
      sick: Math.max(0, allocated.sick - used.sick),
      earned: Math.max(0, allocated.earned - used.earned),
      comp_off: Math.max(0, allocated.comp_off - used.comp_off)
    };
    const totalRemaining = remaining.casual + remaining.sick + remaining.earned + remaining.comp_off;

    res.json({
      userId: user.id,
      employeeId: user.employee_id,
      name: user.name,
      allocated,
      used,
      remaining: { ...remaining, total: totalRemaining }
    });
  } catch (err) {
    console.error('Error fetching leave balance:', err);
    res.status(500).json({ error: "Failed to fetch leave balance." });
  }
});

// PUT /api/leaves/balance/:userId (Admin override)
router.put('/balance/:userId', async (req, res) => {
  const { userId } = req.params;
  const { casual, sick, earned, comp_off } = req.body;

  try {
    const users = await querySQL('SELECT * FROM users WHERE id = ? OR employee_id = ? LIMIT 1', [userId, userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    const c = policyNumber(casual, 12);
    const s = policyNumber(sick, 10);
    const e = policyNumber(earned, 15);
    const co = policyNumber(comp_off, 2);

    await querySQL(
      `INSERT INTO leave_balances (user_id, casual, sick, earned, comp_off)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE casual=VALUES(casual), sick=VALUES(sick), earned=VALUES(earned), comp_off=VALUES(comp_off)`,
      [user.id, c, s, e, co]
    );

    res.json({ message: `Leave balance updated for ${user.name}.` });
  } catch (err) {
    console.error('Error updating leave balance:', err);
    res.status(500).json({ error: "Failed to update leave balance." });
  }
});

// GET /api/leaves/requests
router.get('/requests', async (req, res) => {
  const { requesterId, requesterRole } = req.query;

  try {
    let requests = [];
    if (['SUPER_ADMIN', 'HR', 'MANAGER'].includes(requesterRole)) {
      requests = await querySQL('SELECT * FROM leave_requests ORDER BY created_at DESC');
    } else if (requesterId) {
      requests = await querySQL('SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC', [requesterId]);
    } else {
      requests = await querySQL('SELECT * FROM leave_requests ORDER BY created_at DESC');
    }
    res.json(requests);
  } catch (err) {
    console.error('Error fetching leave requests:', err);
    res.status(500).json({ error: "Failed to fetch leave requests." });
  }
});

// GET /api/leaves/time-permissions
router.get('/time-permissions', async (req, res) => {
  const { requesterId, requesterRole } = req.query;
  try {
    const rows = ['SUPER_ADMIN', 'HR', 'MANAGER'].includes(requesterRole)
      ? await querySQL('SELECT * FROM time_permissions ORDER BY permission_date DESC, created_at DESC')
      : await querySQL('SELECT * FROM time_permissions WHERE user_id = ? ORDER BY permission_date DESC, created_at DESC', [requesterId || '']);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching time permissions:', err);
    res.status(500).json({ error: 'Failed to fetch time permissions.' });
  }
});

// POST /api/leaves/time-permissions
router.post('/time-permissions', async (req, res) => {
  const { userId, permissionDate, permissionType, requestedTime, reason } = req.body;
  if (!userId || !permissionDate || !permissionType || !requestedTime || !reason?.trim()) {
    return res.status(400).json({ error: 'Date, permission type, time, and reason are required.' });
  }
  if (!['Late arrival', 'Early exit'].includes(permissionType)) {
    return res.status(400).json({ error: 'Choose either late arrival or early exit.' });
  }
  try {
    const users = await querySQL('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!users?.length) return res.status(404).json({ error: 'User not found.' });
    const user = users[0];
    const permission = {
      id: `tpr-${Date.now()}`,
      user_id: user.id,
      user_name: user.name,
      role: user.role,
      department: user.department,
      permission_date: permissionDate,
      permission_type: permissionType,
      requested_time: requestedTime,
      reason: reason.trim()
    };
    await querySQL(
      `INSERT INTO time_permissions (id, user_id, user_name, role, department, permission_date, permission_type, requested_time, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.values(permission)
    );
    const created = await querySQL('SELECT * FROM time_permissions WHERE id = ?', [permission.id]);
    res.status(201).json({ message: 'Time permission sent to the founder for approval.', permission: created[0] });
  } catch (err) {
    console.error('Error creating time permission:', err);
    res.status(500).json({ error: 'Failed to request time permission.' });
  }
});

// PUT /api/leaves/time-permissions/:id
router.put('/time-permissions/:id', async (req, res) => {
  const { status, reviewedBy, reviewNote, reviewerRole } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Choose Approved or Rejected.' });
  if (!['SUPER_ADMIN', 'HR', 'MANAGER'].includes(reviewerRole)) return res.status(403).json({ error: 'Only the founder, HR, or a manager can review time permissions.' });
  try {
    const existing = await querySQL('SELECT * FROM time_permissions WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing?.length) return res.status(404).json({ error: 'Time permission not found.' });
    await querySQL('UPDATE time_permissions SET status = ?, reviewed_by = ?, review_note = ? WHERE id = ?', [status, reviewedBy || 'Founder', reviewNote || null, req.params.id]);
    const updated = await querySQL('SELECT * FROM time_permissions WHERE id = ?', [req.params.id]);
    res.json({ message: `Time permission ${status.toLowerCase()}.`, permission: updated[0] });
  } catch (err) {
    console.error('Error reviewing time permission:', err);
    res.status(500).json({ error: 'Failed to review time permission.' });
  }
});

// POST /api/leaves/requests
router.post('/requests', async (req, res) => {
  const { userId, leaveType, startDate, endDate, daysCount, reason, attachment } = req.body;

  try {
    const users = await querySQL('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!startDate || !endDate || !leaveType || !reason?.trim()) {
      return res.status(400).json({ error: 'Leave type, dates, and reason are required.' });
    }
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ error: 'Please provide a valid leave date range.' });
    }

    const policyRows = await querySQL('SELECT * FROM leave_policy LIMIT 1');
    const policy = policyRows?.[0] || {
      yearly_casual: 12, yearly_sick: 10, yearly_earned: 15, yearly_comp_off: 2,
      auto_approve_days: 1, require_medical_proof_days: 3
    };
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    const normalizedType = leaveType.toLowerCase();
    const allocation = normalizedType.includes('casual') ? policy.yearly_casual
      : normalizedType.includes('sick') ? policy.yearly_sick
        : normalizedType.includes('earned') || normalizedType.includes('privilege') ? policy.yearly_earned
          : normalizedType.includes('comp') ? policy.yearly_comp_off : 0;
    if (Number(allocation || 0) <= 0) {
      return res.status(400).json({ error: `${leaveType} is not available under the current HR leave policy.` });
    }
    const usedRows = await querySQL(
      `SELECT COALESCE(SUM(days_count), 0) AS used_days FROM leave_requests
       WHERE user_id = ? AND LOWER(leave_type) = LOWER(?) AND LOWER(status) LIKE '%approve%'
         AND YEAR(start_date) = YEAR(?)`,
      [userId, leaveType, startDate]
    );
    const alreadyUsed = Number(usedRows?.[0]?.used_days || 0);
    if (alreadyUsed + days > Number(allocation)) {
      return res.status(400).json({ error: `${leaveType} exceeds the ${allocation}-day yearly allowance set in HR settings.` });
    }

    const user = users[0];
    const requestId = `lve-${Date.now()}`;
    const status = 'Pending';

    await querySQL(
      `INSERT INTO leave_requests (id, user_id, user_name, role, department, leave_type, start_date, end_date, days_count, reason, attachment, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, user.id, user.name, user.role, user.department, leaveType, startDate, endDate, parseInt(daysCount || days, 10), reason.trim(), attachment || null, status]
    );

    const created = await querySQL('SELECT * FROM leave_requests WHERE id = ?', [requestId]);

    await sendEmail({
      to: user.email,
      template: 'leave_submitted',
      data: { userName: user.name, leaveType, startDate, endDate, reason }
    });
    await sendEmail({
      to: process.env.CAREERS_EMAIL || 'careers@prolync.in',
      replyTo: user.email,
      template: 'leave_submitted',
      data: { userName: user.name, leaveType, startDate, endDate, reason }
    });

    res.json({ message: 'Leave application submitted and sent to the founder for review.', leave: created[0] });
  } catch (err) {
    console.error('Error submitting leave request:', err);
    res.status(500).json({ error: "Failed to submit leave application." });
  }
});

// PUT /api/leaves/requests/:id
router.put('/requests/:id', async (req, res) => {
  const { id } = req.params;
  const { status, reviewedBy, rejectionReason, reviewNotes, userRole, reviewerRole } = req.body;
  if (!['SUPER_ADMIN', 'HR', 'MANAGER'].includes(reviewerRole || userRole)) {
    return res.status(403).json({ error: 'Only the founder, HR, or a manager can review leave requests.' });
  }

  try {
    const existing = await querySQL('SELECT * FROM leave_requests WHERE id = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    const reqObj = existing[0];
    const reviewer = reviewedBy || 'HR Admin';

    await querySQL(
      `UPDATE leave_requests SET status = ?, reviewed_by = ?, rejection_reason = ? WHERE id = ?`,
      [status, reviewer, rejectionReason || reviewNotes || null, id]
    );

    const users = await querySQL('SELECT * FROM users WHERE id = ? LIMIT 1', [reqObj.user_id]);
    if (users && users.length > 0) {
      const user = users[0];
      const template = status === 'Approved' ? 'leave_approved' : (status === 'Cancelled' ? 'leave_cancelled' : 'leave_rejected');
      await sendEmail({
        to: user.email,
        template,
        data: { userName: user.name, leaveType: reqObj.leave_type, startDate: reqObj.start_date, endDate: reqObj.end_date, reviewedBy: reviewer, reviewNotes: rejectionReason || reviewNotes }
      });
    }

    const updated = await querySQL('SELECT * FROM leave_requests WHERE id = ?', [id]);
    res.json({ message: `Leave request ${status}.`, leave: updated[0] });
  } catch (err) {
    console.error('Error updating leave request:', err);
    res.status(500).json({ error: "Failed to update leave request." });
  }
});

// GET /api/leaves/holidays
router.get('/holidays', async (req, res) => {
  try {
    const holidays = await querySQL('SELECT * FROM holidays ORDER BY date ASC');
    res.json(holidays);
  } catch (err) {
    console.error('Error fetching holidays:', err);
    res.status(500).json({ error: "Failed to fetch holidays." });
  }
});

// POST /api/leaves/holidays
router.post('/holidays', async (req, res) => {
  const { title, date, day, type } = req.body;

  try {
    const holidayId = `hol-${Date.now()}`;
    await querySQL(
      `INSERT INTO holidays (id, title, date, day, type) VALUES (?, ?, ?, ?, ?)`,
      [holidayId, title, date, day || 'Monday', type || 'National Holiday']
    );

    const created = await querySQL('SELECT * FROM holidays WHERE id = ?', [holidayId]);
    res.json({ message: "Holiday added successfully.", holiday: created[0] });
  } catch (err) {
    console.error('Error adding holiday:', err);
    res.status(500).json({ error: "Failed to add holiday." });
  }
});

// DELETE /api/leaves/holidays/:id
router.delete('/holidays/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await querySQL('DELETE FROM holidays WHERE id = ?', [id]);
    res.json({ message: "Holiday removed successfully." });
  } catch (err) {
    console.error('Error deleting holiday:', err);
    res.status(500).json({ error: "Failed to delete holiday." });
  }
});

export default router;
