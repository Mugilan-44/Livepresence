import express from 'express';
import { getData, saveData } from '../db.js';

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

// GET /api/attendance/logs
router.get('/logs', (req, res) => {
  const db = getData();
  const { requesterId, requesterRole } = req.query;

  if (requesterRole === 'SUPER_ADMIN' || requesterRole === 'HR') {
    return res.json(db.attendance_logs || []);
  }
  if (requesterId) {
    const userLogs = (db.attendance_logs || []).filter(l => l.user_id === requesterId);
    return res.json(userLogs);
  }
  res.json(db.attendance_logs || []);
});

// POST /api/attendance/check-in
router.post('/check-in', (req, res) => {
  const { userId, latitude, longitude, officeLocation } = req.body;
  const db = getData();

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  const officeConfig = db.company_settings?.office_geofence || {
    latitude: 12.871133,
    longitude: 80.083898,
    radius_meters: 50
  };

  const distance = calculateDistanceMeters(
    latitude || officeConfig.latitude,
    longitude || officeConfig.longitude,
    officeConfig.latitude,
    officeConfig.longitude
  );

  const newLog = {
    id: `att-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    role: user.role,
    department: user.department,
    check_in: new Date().toISOString(),
    check_out: null,
    shift_timing: "09:00 AM - 06:00 PM",
    working_hours: "Active Shift",
    break_hours: "0 hrs",
    on_break: false,
    distance_meters: distance,
    status: distance <= officeConfig.radius_meters ? "Present" : "Remote / WFH",
    verification_type: `Zero-Proxy GPS (${distance}m radius)`,
    created_at: new Date().toISOString()
  };

  if (!db.attendance_logs) db.attendance_logs = [];
  db.attendance_logs.unshift(newLog);
  saveData(db);

  res.json({ message: "Check-in recorded successfully.", log: newLog });
});

// POST /api/attendance/check-out
router.post('/check-out', (req, res) => {
  const { userId } = req.body;
  const db = getData();

  const activeLog = (db.attendance_logs || []).find(l => l.user_id === userId && !l.check_out);
  if (!activeLog) return res.status(400).json({ error: "No active check-in session found." });

  activeLog.check_out = new Date().toISOString();
  saveData(db);

  res.json({ message: "Check-out recorded successfully.", log: activeLog });
});

// GET /api/attendance/geofence
router.get('/geofence', (req, res) => {
  const db = getData();
  const config = db.company_settings?.office_geofence || {
    office_name: "Prolync HQ (Vandalur, Tamil Nadu)",
    latitude: 12.871133,
    longitude: 80.083898,
    radius_meters: 50
  };
  res.json(config);
});

// PUT /api/attendance/geofence
router.put('/geofence', (req, res) => {
  const { office_name, latitude, longitude, radius_meters } = req.body;
  const db = getData();

  if (!db.company_settings) db.company_settings = {};
  db.company_settings.office_geofence = {
    office_name: office_name || "Prolync HQ",
    latitude: parseFloat(latitude || 12.871133),
    longitude: parseFloat(longitude || 80.083898),
    radius_meters: parseInt(radius_meters || 50, 10)
  };

  saveData(db);
  res.json({ message: "Geofence location updated successfully.", geofence: db.company_settings.office_geofence });
});

export default router;
