import express from 'express';
import { getData, saveData } from '../db.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// GET /api/leaves/policy
router.get('/policy', (req, res) => {
  const db = getData();
  const policy = db.leave_policy || {
    yearly_allocation: { casual: 12, sick: 10, earned: 15, comp_off: 2 },
    carry_forward_limit: 5,
    auto_approve_days: 1,
    require_medical_proof_days: 3,
    notice_period_days: 2
  };
  res.json(policy);
});

// PUT /api/leaves/policy
router.put('/policy', (req, res) => {
  const db = getData();
  const { yearly_allocation, carry_forward_limit, auto_approve_days, require_medical_proof_days, notice_period_days, updatedBy } = req.body;

  db.leave_policy = {
    yearly_allocation: yearly_allocation || { casual: 12, sick: 10, earned: 15, comp_off: 2 },
    carry_forward_limit: parseInt(carry_forward_limit || 5, 10),
    auto_approve_days: parseInt(auto_approve_days || 1, 10),
    require_medical_proof_days: parseInt(require_medical_proof_days || 3, 10),
    notice_period_days: parseInt(notice_period_days || 2, 10),
    updated_at: new Date().toISOString(),
    updated_by: updatedBy || 'Super Admin'
  };

  saveData(db);
  res.json({ message: "Leave policy rules updated successfully.", policy: db.leave_policy });
});

// GET /api/leaves/balance/:userId
router.get('/balance/:userId', (req, res) => {
  const { userId } = req.params;
  const db = getData();

  const user = db.users.find(u => u.id === userId || u.employee_id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const policy = db.leave_policy?.yearly_allocation || { casual: 12, sick: 10, earned: 15, comp_off: 2 };
  
  let userBalance = {
    casual: policy.casual,
    sick: policy.sick,
    earned: policy.earned,
    comp_off: policy.comp_off
  };

  if (Array.isArray(db.leave_balances)) {
    const found = db.leave_balances.find(b => b.user_id === user.id);
    if (found) userBalance = found;
  } else if (db.leave_balances && typeof db.leave_balances === 'object') {
    if (db.leave_balances[user.id]) userBalance = db.leave_balances[user.id];
  }

  const approvedLeaves = (db.leave_requests || []).filter(l =>
    l.user_id === user.id && (l.status || '').toLowerCase().includes('approve')
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

  const totalAllocated = policy.casual + policy.sick + policy.earned + policy.comp_off;
  const remaining = {
    casual: Math.max(0, userBalance.casual - used.casual),
    sick: Math.max(0, userBalance.sick - used.sick),
    earned: Math.max(0, userBalance.earned - used.earned),
    comp_off: Math.max(0, userBalance.comp_off - used.comp_off)
  };
  const totalRemaining = remaining.casual + remaining.sick + remaining.earned + remaining.comp_off;

  res.json({
    userId: user.id,
    employeeId: user.employee_id,
    name: user.name,
    allocated: { casual: policy.casual, sick: policy.sick, earned: policy.earned, comp_off: policy.comp_off, total: totalAllocated },
    used,
    remaining: { ...remaining, total: totalRemaining }
  });
});

// PUT /api/leaves/balance/:userId (Admin override)
router.put('/balance/:userId', (req, res) => {
  const { userId } = req.params;
  const { casual, sick, earned, comp_off, adminId, reason } = req.body;
  const db = getData();

  const user = db.users.find(u => u.id === userId || u.employee_id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!db.leave_balances) db.leave_balances = [];
  let index = db.leave_balances.findIndex(b => b.user_id === user.id);

  const updatedBalance = {
    user_id: user.id,
    casual: parseInt(casual, 10),
    sick: parseInt(sick, 10),
    earned: parseInt(earned, 10),
    comp_off: parseInt(comp_off, 10),
    updated_at: new Date().toISOString(),
    updated_by: adminId || 'Admin'
  };

  if (index >= 0) db.leave_balances[index] = updatedBalance;
  else db.leave_balances.push(updatedBalance);

  saveData(db);
  res.json({ message: `Leave balance updated for ${user.name}.`, balance: updatedBalance });
});

// GET /api/leaves/requests
router.get('/requests', (req, res) => {
  const db = getData();
  const { requesterId, requesterRole } = req.query;

  if (requesterRole === 'SUPER_ADMIN' || requesterRole === 'HR') {
    return res.json(db.leave_requests || []);
  }

  if (requesterId) {
    const userLeaves = (db.leave_requests || []).filter(l => l.user_id === requesterId);
    return res.json(userLeaves);
  }

  res.json(db.leave_requests || []);
});

// POST /api/leaves/requests
router.post('/requests', async (req, res) => {
  const { userId, leaveType, startDate, endDate, daysCount, reason, attachment } = req.body;
  const db = getData();

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const newRequest = {
    id: `lve-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    role: user.role,
    department: user.department,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    days_count: parseInt(daysCount || 1, 10),
    reason,
    attachment: attachment || null,
    status: "Pending",
    created_at: new Date().toISOString()
  };

  if (!db.leave_requests) db.leave_requests = [];
  db.leave_requests.unshift(newRequest);
  saveData(db);

  await sendEmail({
    to: user.email,
    template: 'leave_submitted',
    data: { userName: user.name, leaveType, startDate, endDate, reason }
  });

  res.json({ message: "Leave application submitted successfully.", leave: newRequest });
});

// PUT /api/leaves/requests/:id
router.put('/requests/:id', async (req, res) => {
  const { id } = req.params;
  const { status, reviewedBy, rejectionReason } = req.body;
  const db = getData();

  const index = (db.leave_requests || []).findIndex(l => l.id === id);
  if (index === -1) return res.status(404).json({ error: "Leave request not found." });

  const reqObj = db.leave_requests[index];
  const oldStatus = reqObj.status;
  reqObj.status = status;
  reqObj.reviewed_by = reviewedBy || 'HR Admin';
  if (rejectionReason) reqObj.rejection_reason = rejectionReason;

  saveData(db);

  const user = db.users.find(u => u.id === reqObj.user_id);
  if (user) {
    const template = status === 'Approved' ? 'leave_approved' : (status === 'Cancelled' ? 'leave_cancelled' : 'leave_rejected');
    await sendEmail({
      to: user.email,
      template,
      data: { userName: user.name, leaveType: reqObj.leave_type, startDate: reqObj.start_date, endDate: reqObj.end_date, reviewedBy: reqObj.reviewed_by, reviewNotes: rejectionReason }
    });
  }

  res.json({ message: `Leave request ${status}.`, leave: reqObj });
});

// GET /api/leaves/holidays
router.get('/holidays', (req, res) => {
  const db = getData();
  res.json(db.holidays || []);
});

// POST /api/leaves/holidays
router.post('/holidays', (req, res) => {
  const { title, date, day, type } = req.body;
  const db = getData();

  const newHoliday = {
    id: `hol-${Date.now()}`,
    title,
    date,
    day: day || 'Monday',
    type: type || 'National Holiday'
  };

  if (!db.holidays) db.holidays = [];
  db.holidays.push(newHoliday);
  saveData(db);

  res.json({ message: "Holiday added successfully.", holiday: newHoliday });
});

// DELETE /api/leaves/holidays/:id
router.delete('/holidays/:id', (req, res) => {
  const { id } = req.params;
  const db = getData();
  db.holidays = (db.holidays || []).filter(h => h.id !== id);
  saveData(db);
  res.json({ message: "Holiday removed successfully." });
});

export default router;
