import express from 'express';
import { querySQL } from '../db.js';

const router = express.Router();

// Haversine Geofence Distance Calculation
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// MySQL DATETIME does not carry a timezone. Presence values are stored in UTC.
const parseStoredUtc = (value) => new Date(`${String(value || '').replace(' ', 'T').replace(/Z$/, '')}Z`);
const isHistoricallyInvalid = (log) => {
  if (!log?.check_out) return false;
  const checkIn = parseStoredUtc(log.check_in);
  const checkOut = parseStoredUtc(log.check_out);
  const durationMinutes = (checkOut - checkIn) / 60000;
  return !Number.isFinite(durationMinutes) || durationMinutes < 0 || durationMinutes > 12 * 60;
};
const indiaLocalToUtc = (date, time) => {
  const [year, month, day] = String(date).split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = String(time || '00:00:00').split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, second));
};
const indiaDate = (value) => {
  const parts = indiaClock(value instanceof Date ? value : parseStoredUtc(value));
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};
const attendanceMinutes = (log) => log?.check_out ? Math.max(0, (parseStoredUtc(log.check_out) - parseStoredUtc(log.check_in)) / 60000) : 0;
const oneShiftPerPersonPerDay = (logs) => Object.values(logs.reduce((selected, log) => {
  const key = `${log.user_id}:${indiaDate(log.check_in)}`;
  const current = selected[key];
  if (!current || (!log.check_out && current.check_out) || (Boolean(log.check_out) === Boolean(current.check_out) && attendanceMinutes(log) > attendanceMinutes(current))) selected[key] = log;
  return selected;
}, {})).sort((left, right) => parseStoredUtc(right.check_in) - parseStoredUtc(left.check_in));
const formatDuration = (minutes) => `${Math.floor(minutes / 60)}h ${Math.max(0, Math.round(minutes % 60))}m`;
const indiaClock = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));
};

// GET /api/attendance/logs
router.get('/logs', async (req, res) => {
  const { requesterId, requesterRole } = req.query;
  try {
    let logs = [];
    if (requesterRole === 'SUPER_ADMIN' || requesterRole === 'HR') {
      logs = await querySQL('SELECT * FROM attendance_logs ORDER BY check_in DESC');
    } else if (requesterId) {
      logs = await querySQL('SELECT * FROM attendance_logs WHERE user_id = ? ORDER BY check_in DESC', [requesterId]);
    } else {
      logs = await querySQL('SELECT * FROM attendance_logs ORDER BY check_in DESC');
    }
    // Preserve historical records in MySQL for audit, but do not show entries
    // whose checkout predates check-in or whose duration is impossible.
    res.json(req.query.includeInvalid === 'true' ? logs : oneShiftPerPersonPerDay(logs.filter(log => !isHistoricallyInvalid(log))));
  } catch (err) {
    console.error('Error fetching attendance logs:', err);
    res.status(500).json({ error: "Failed to retrieve attendance logs." });
  }
});

// GET /api/attendance/reports
router.get('/reports', async (req, res) => {
  try {
    const totalUsersRows = await querySQL('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersRows[0]?.count || 6;

    const todayPresentRows = await querySQL(
      `SELECT COUNT(DISTINCT user_id) as count FROM attendance_logs WHERE DATE(check_in) = CURDATE()`
    );
    const presentToday = todayPresentRows[0]?.count || 0;
    const absentToday = Math.max(0, totalUsers - presentToday);
    const pct = totalUsers > 0 ? Math.round((presentToday / totalUsers) * 100) : 100;

    res.json({
      daily: { present: presentToday, absent: absentToday, leave: 0, late: 0, avg_hours: "8.5 hrs", attendance_pct: pct },
      weekly: { present: presentToday * 5, absent: absentToday * 5, leave: 0, late: 0, avg_hours: "8.5 hrs", attendance_pct: pct },
      monthly: { present: presentToday * 20, absent: absentToday * 20, leave: 0, late: 0, avg_hours: "8.5 hrs", attendance_pct: pct },
      yearly: { present: presentToday * 240, absent: absentToday * 240, leave: 0, late: 0, avg_hours: "8.5 hrs", attendance_pct: pct }
    });
  } catch (err) {
    console.error('Error computing attendance reports:', err);
    res.status(500).json({ error: "Failed to compute attendance report metrics." });
  }
});

// POST /api/attendance/check-in
router.post('/check-in', async (req, res) => {
  const { userId, latitude, longitude, officeLocation } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required for check-in." });
  }
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return res.status(400).json({ error: 'Live location permission is required to mark office presence.' });
  }

  try {
    const users = await querySQL('SELECT * FROM users WHERE id = ? OR employee_id = ? LIMIT 1', [userId, userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const user = users[0];

    const todayInIndia = indiaDate(new Date());
    const alreadyMarkedToday = await querySQL(
      'SELECT * FROM attendance_logs WHERE user_id = ? AND DATE(DATE_ADD(check_in, INTERVAL 330 MINUTE)) = ? ORDER BY check_in DESC LIMIT 1',
      [user.id, todayInIndia]
    );
    if (alreadyMarkedToday.length) return res.status(400).json({ error: 'You already have a presence record for today. Your completed shift remains available in Recent shift logs.' });

    // Check if user already has an active check-in session today
    const active = await querySQL(
      'SELECT * FROM attendance_logs WHERE user_id = ? AND check_out IS NULL LIMIT 1',
      [user.id]
    );

    if (active && active.length > 0) {
      return res.status(400).json({ error: "You are already checked in. Please check out before initiating a new shift." });
    }

    const settings = await querySQL('SELECT * FROM company_settings LIMIT 1');
    const officeConfig = (settings && settings.length > 0) ? settings[0] : {
      office_name: "Prolync HQ (Vandalur, Tamil Nadu)",
      latitude: 12.871133,
      longitude: 80.083898,
      radius_meters: 200
    };

    const targetLat = officeConfig.latitude || 12.871133;
    const targetLng = officeConfig.longitude || 80.083898;
    const radiusMeters = officeConfig.radius_meters || 200;

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    const distance = calculateDistanceMeters(userLat, userLng, parseFloat(targetLat), parseFloat(targetLng));

    if (distance > radiusMeters) {
      return res.status(403).json({ error: `Check-in is only available from the office. You are ${distance}m away; the allowed radius is ${radiusMeters}m.` });
    }

    const logId = `att-${Date.now()}`;
    const now = new Date();
    const indiaNow = indiaClock(now);
    const bufferedStart = indiaNow.hour === 9 && indiaNow.minute <= 25;
    // Store the normalized 09:00 IST instant as UTC. This avoids relying on
    // the machine timezone when the backend runs outside India.
    const checkInInstant = bufferedStart
      ? new Date(Date.UTC(indiaNow.year, indiaNow.month - 1, indiaNow.day, 3, 30, 0))
      : now;
    const checkInTime = checkInInstant.toISOString().slice(0, 19).replace('T', ' ');
    const status = "Present";
    const verificationType = `Zero-Proxy GPS (${distance}m radius)`;
    const officeLoc = officeLocation || officeConfig.office_name || "Prolync HQ";

    await querySQL(
      `INSERT INTO attendance_logs 
       (id, user_id, user_name, role, department, check_in, shift_timing, working_hours, break_hours, on_break, distance_meters, status, verification_type, office_location, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [
        logId, user.id, user.name, user.role, user.department,
        checkInTime, "09:00 AM - 07:00 PM", "Active Shift", "0 hrs",
        distance, status, verificationType, officeLoc,
        userLat, userLng
      ]
    );

    const created = await querySQL('SELECT * FROM attendance_logs WHERE id = ?', [logId]);
    res.json({ message: bufferedStart ? "Check-in recorded as 9:00 AM (morning buffer applied)." : "Office check-in recorded successfully.", log: created[0] });
  } catch (err) {
    console.error('Error during check-in:', err);
    res.status(500).json({ error: "Failed to record check-in in MySQL database." });
  }
});

// POST /api/attendance/check-out
router.post('/check-out', async (req, res) => {
  const { userId, latitude, longitude, manualFallback = false } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required for check-out." });
  }

  try {
    const activeLogs = await querySQL(
      'SELECT * FROM attendance_logs WHERE user_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1',
      [userId]
    );

    if (!activeLogs || activeLogs.length === 0) {
      return res.status(400).json({ error: "No active check-in session found." });
    }

    const activeLog = activeLogs[0];
    const settings = await querySQL('SELECT * FROM company_settings LIMIT 1');
    const officeConfig = settings?.[0] || { latitude: 12.871133, longitude: 80.083898, radius_meters: 200 };
    const hasLiveLocation = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
    const distance = hasLiveLocation
      ? calculateDistanceMeters(parseFloat(latitude), parseFloat(longitude), parseFloat(officeConfig.latitude), parseFloat(officeConfig.longitude))
      : Number(activeLog.distance_meters || 0);
    if (hasLiveLocation && distance > Number(officeConfig.radius_meters || 200)) {
      return res.status(403).json({ error: `Check-out must be completed from the office location (within ${officeConfig.radius_meters || 200}m).` });
    }
    if (!hasLiveLocation && !manualFallback) {
      return res.status(400).json({ error: 'Live location is unavailable. Please allow location access, or use the manual checkout option.' });
    }
    const checkOutTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Calculate working hours
    const checkInDate = parseStoredUtc(activeLog.check_in);
    const now = new Date();
    const diffMinutes = Math.round(Math.max(0, now - checkInDate) / 60000);
    const workingHoursStr = formatDuration(diffMinutes);
    const extraMinutes = Math.max(0, diffMinutes - 10 * 60);

    await querySQL(
      'UPDATE attendance_logs SET check_out = ?, working_hours = ?, overtime = ?, distance_meters = ?, verification_type = ?, on_break = 0 WHERE id = ?',
      [checkOutTime, workingHoursStr, formatDuration(extraMinutes), distance, hasLiveLocation ? `Office GPS checkout (${distance}m)` : 'Manual checkout — live GPS unavailable', activeLog.id]
    );

    const updated = await querySQL('SELECT * FROM attendance_logs WHERE id = ?', [activeLog.id]);
    res.json({ message: hasLiveLocation ? 'Office check-out recorded successfully.' : 'Manual check-out recorded. Your earlier office check-in remains on the shift record.', log: updated[0] });
  } catch (err) {
    console.error('Error during check-out:', err);
    res.status(500).json({ error: "Failed to record check-out in database." });
  }
});

// POST /api/attendance/toggle-break
router.post('/toggle-break', async (req, res) => {
  const { userId, onBreak } = req.body;

  try {
    const activeLogs = await querySQL(
      'SELECT * FROM attendance_logs WHERE user_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1',
      [userId]
    );

    if (!activeLogs || activeLogs.length === 0) {
      return res.status(400).json({ error: "No active check-in session found to pause/resume." });
    }

    const activeLog = activeLogs[0];
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (onBreak) {
      await querySQL(
        'UPDATE attendance_logs SET on_break = 1, break_start_time = ? WHERE id = ?',
        [nowStr, activeLog.id]
      );
    } else {
      let addMins = 0;
      if (activeLog.break_start_time) {
        const breakStart = parseStoredUtc(activeLog.break_start_time);
        const now = new Date();
        addMins = Math.round(Math.max(0, now - breakStart) / 60000);
      }
      const totalMins = (activeLog.break_duration_mins || 0) + addMins;
      const breakHoursStr = `${(totalMins / 60).toFixed(1)} hrs`;

      await querySQL(
        'UPDATE attendance_logs SET on_break = 0, break_start_time = NULL, break_duration_mins = ?, break_hours = ? WHERE id = ?',
        [totalMins, breakHoursStr, activeLog.id]
      );
    }

    const updated = await querySQL('SELECT * FROM attendance_logs WHERE id = ?', [activeLog.id]);
    res.json({
      message: onBreak ? "Break mode activated." : "Break ended. Resumed active shift.",
      log: updated[0]
    });
  } catch (err) {
    console.error('Error toggling break:', err);
    res.status(500).json({ error: "Failed to update break status." });
  }
});

// POST /api/attendance/verify-boundary
router.post('/verify-boundary', async (req, res) => {
  const { userId, latitude, longitude } = req.body;

  try {
    const activeLogs = await querySQL(
      'SELECT * FROM attendance_logs WHERE user_id = ? AND check_out IS NULL LIMIT 1',
      [userId]
    );

    if (!activeLogs || activeLogs.length === 0) {
      return res.json({ status: "No Active Session" });
    }

    const activeLog = activeLogs[0];
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({ error: 'Live location is required to verify the office boundary.' });
    }
    if (activeLog.on_break) {
      return res.json({ status: "On Break Exemption" });
    }

    const settings = await querySQL('SELECT * FROM company_settings LIMIT 1');
    const officeConfig = (settings && settings.length > 0) ? settings[0] : {
      latitude: 12.871133,
      longitude: 80.083898,
      radius_meters: 200
    };

    const distance = calculateDistanceMeters(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(officeConfig.latitude),
      parseFloat(officeConfig.longitude)
    );

    const radiusMeters = Number(officeConfig.radius_meters || 200);
    if (distance > radiusMeters) {
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const durationMinutes = Math.round(Math.max(0, new Date() - parseStoredUtc(activeLog.check_in)) / 60000);
      const extraMinutes = Math.max(0, durationMinutes - 10 * 60);
      await querySQL(
        'UPDATE attendance_logs SET check_out = ?, working_hours = ?, overtime = ?, status = "Auto Check-Out", verification_type = ? WHERE id = ?',
        [nowStr, formatDuration(durationMinutes), formatDuration(extraMinutes), `Automatic checkout — left ${radiusMeters}m office boundary (${distance}m)`, activeLog.id]
      );
      return res.json({ status: "AUTO_CHECKED_OUT", message: `You left the office boundary (${distance}m > ${radiusMeters}m). Your shift was checked out automatically.` });
    }

    res.json({ status: "Inside Boundary", distance_meters: distance });
  } catch (err) {
    res.status(500).json({ error: "Boundary check failed." });
  }
});

// POST /api/attendance/manual
router.post('/manual', async (req, res) => {
  const { userId, date, checkIn, checkOut, status, reason } = req.body;

  try {
    const users = await querySQL('SELECT * FROM users WHERE id = ? OR employee_id = ? LIMIT 1', [userId, userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = users[0];
    const logId = `att-man-${Date.now()}`;
    const datePrefix = date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const checkInInstant = indiaLocalToUtc(datePrefix, checkIn || '09:00:00');
    const checkOutInstant = checkOut ? indiaLocalToUtc(datePrefix, checkOut) : null;
    if (Number.isNaN(checkInInstant.getTime()) || (checkOutInstant && Number.isNaN(checkOutInstant.getTime()))) return res.status(400).json({ error: 'Enter valid check-in and check-out times.' });
    if (checkOutInstant && checkOutInstant <= checkInInstant) return res.status(400).json({ error: 'Check-out time must be after check-in time on the selected date.' });
    const checkInDateTime = checkInInstant.toISOString().slice(0, 19).replace('T', ' ');
    const checkOutDateTime = checkOutInstant ? checkOutInstant.toISOString().slice(0, 19).replace('T', ' ') : null;
    const durationMinutes = checkOutInstant ? Math.round((checkOutInstant - checkInInstant) / 60000) : 0;

    await querySQL(
      `INSERT INTO attendance_logs 
       (id, user_id, user_name, role, department, check_in, check_out, shift_timing, working_hours, break_hours, on_break, distance_meters, status, verification_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '0 hrs', 0, 0, ?, ?)`,
      [
        logId, user.id, user.name, user.role, user.department,
        checkInDateTime, checkOutDateTime, "09:00 AM - 06:00 PM",
        checkOut ? formatDuration(durationMinutes) : "Active Shift",
        status || "Present", `Manual Regularization (${reason || 'Admin Audit Override'})`
      ]
    );

    const created = await querySQL('SELECT * FROM attendance_logs WHERE id = ?', [logId]);
    res.json({ message: "Attendance regularized successfully.", log: created[0] });
  } catch (err) {
    console.error('Error in manual attendance:', err);
    res.status(500).json({ error: "Failed to regularize attendance." });
  }
});

// DELETE /api/attendance/clear
router.delete('/clear', async (req, res) => {
  try {
    await querySQL('DELETE FROM attendance_logs');
    res.json({ message: "All historical attendance records cleared successfully." });
  } catch (err) {
    console.error('Error clearing attendance logs:', err);
    res.status(500).json({ error: "Failed to clear attendance logs." });
  }
});

// GET /api/attendance/geofence
router.get('/geofence', async (req, res) => {
  try {
    const settings = await querySQL('SELECT * FROM company_settings LIMIT 1');
    const config = (settings && settings.length > 0) ? {
      office_name: settings[0].office_name,
      latitude: settings[0].latitude,
      longitude: settings[0].longitude,
      radius_meters: settings[0].radius_meters
    } : {
      office_name: "Prolync HQ (Vandalur, Tamil Nadu)",
      latitude: 12.871133,
      longitude: 80.083898,
      radius_meters: 200
    };
    res.json(config);
  } catch (err) {
    console.error('Error fetching geofence config:', err);
    res.status(500).json({ error: "Failed to fetch geofence configuration." });
  }
});

// PUT /api/attendance/geofence
router.put('/geofence', async (req, res) => {
  const { office_name, latitude, longitude, radius_meters } = req.body;

  try {
    const name = office_name || "Prolync HQ";
    const lat = parseFloat(latitude || 12.871133);
    const lng = parseFloat(longitude || 80.083898);
    const rad = parseInt(radius_meters || 200, 10);

    await querySQL(
      `INSERT INTO company_settings (id, office_name, latitude, longitude, radius_meters)
       VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE office_name=VALUES(office_name), latitude=VALUES(latitude), longitude=VALUES(longitude), radius_meters=VALUES(radius_meters)`,
      [name, lat, lng, rad]
    );

    res.json({ message: "Geofence location updated successfully.", geofence: { office_name: name, latitude: lat, longitude: lng, radius_meters: rad } });
  } catch (err) {
    console.error('Error updating geofence:', err);
    res.status(500).json({ error: "Failed to update geofence." });
  }
});

export default router;
