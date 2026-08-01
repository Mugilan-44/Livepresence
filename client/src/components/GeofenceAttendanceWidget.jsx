import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, AlertCircle, CheckCircle, Settings, Coffee, LogOut, Clock, ShieldAlert } from 'lucide-react';

export default function GeofenceAttendanceWidget({ geofence, activeUser, logs, onCheckIn, onUpdateGeofence }) {
  const [isMarking, setIsMarking] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [checkInError, setCheckInError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  // Active Check-in Record for current user
  const activeLog = logs?.find(l => l.user_id === activeUser?.id && !l.check_out);

  // Super Admin Config State
  const [configLat, setConfigLat] = useState(geofence?.latitude || 12.871133);
  const [configLng, setConfigLng] = useState(geofence?.longitude || 80.083898);
  const [configRadius, setConfigRadius] = useState(geofence?.radius_meters || 50);

  // Perform Check-In (Must be within 50m of Office Location)
  const handleMarkCheckIn = async () => {
    setActionMsg(null);
    setCheckInError(null);
    setIsMarking(true);

    const performCheckIn = async (position) => {
      try {
        const res = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: activeUser.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        });
        const data = await res.json();
        if (res.ok) {
          setActionMsg({ type: 'success', text: data.message });
          onCheckIn();
        } else {
          setCheckInError(data);
        }
      } catch (err) {
        setCheckInError({ message: 'Get inside working area of Prolync for Check-In (Allowed: 50m)' });
      } finally {
        setIsMarking(false);
      }
    };


    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        performCheckIn,
        (error) => {
          setIsMarking(false);
          setCheckInError({ message: `Location access is required to check in at the office. ${error.message}` });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setIsMarking(false);
      setCheckInError({ message: 'This browser does not support GPS location. Check-in is unavailable.' });
    }
  };

  // Perform Check-Out (Must also be within 150m of Office Location)
  const handleCheckOut = async () => {
    if (!window.confirm('Confirm check-out? Your working time will be recorded now.')) return;
    setActionMsg(null);
    setCheckInError(null);
    setIsMarking(true);

    const performCheckOut = async (position) => {
      try {
        const res = await fetch('/api/attendance/check-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: activeUser.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        });
        const data = await res.json();
        if (res.ok) {
          setActionMsg({ type: 'success', text: 'Check-Out Verified at Office Location! Work duration recorded.' });
          onCheckIn();
        } else {
          setCheckInError(data);
        }
      } catch (err) {
        setCheckInError({ message: 'Failed to process Check-Out.' });
      } finally {
        setIsMarking(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        performCheckOut,
        (error) => {
          setIsMarking(false);
          setCheckInError({ message: `Location access is required to check out at the office. ${error.message}` });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setIsMarking(false);
      setCheckInError({ message: 'This browser does not support GPS location. Check-out is unavailable.' });
    }
  };


  // Toggle Break Mode (Start Break / End Break)
  const handleToggleBreak = async (onBreak) => {
    setActionMsg(null);
    setCheckInError(null);
    setIsMarking(true);

    try {
      const res = await fetch('/api/attendance/toggle-break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          onBreak
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: 'success', text: data.message });
        onCheckIn();
      } else {
        setCheckInError(data);
      }
    } catch (err) {
      setCheckInError({ message: 'Failed to toggle break status.' });
    } finally {
      setIsMarking(false);
    }
  };

  // Background Geofence Boundary Check (Auto Check-Out if outside 150m WITHOUT Break Mode)
  useEffect(() => {
    if (!activeLog || activeLog.on_break) return;

    const checkBoundary = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            try {
              const res = await fetch('/api/attendance/verify-boundary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUser.id, latitude: lat, longitude: lng })
              });
              const data = await res.json();
              if (data.status === 'AUTO_CHECKED_OUT') {
                setCheckInError({ message: data.message });
                onCheckIn();
              }
            } catch (e) {
              console.error(e);
            }
          },
          () => {},
          { timeout: 5000, maximumAge: 0 }
        );
      }
    };

    const interval = setInterval(checkBoundary, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [activeLog?.id, activeLog?.on_break]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    await onUpdateGeofence({
      latitude: configLat,
      longitude: configLng,
      radius_meters: configRadius,
      office_name: geofence?.office_name
    });
    setShowConfig(false);
  };

  return (
    <div className="glass-card p-5 space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Attendance Check-In & Control</h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Shift: 09:00 AM - 07:00 PM (10 hrs)</span>
            <span>•</span>
            {activeLog?.status?.includes('WFH') ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">WFH Approved - Remote Location</span>
            ) : (
              <span>{geofence?.radius_meters || 50}m Office Geofence</span>
            )}
          </div>
        </div>

        {activeUser.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Settings className="w-3.5 h-3.5" /> Geofence Settings ({geofence?.radius_meters || 50}m)
          </button>
        )}
      </div>

      {/* Super Admin Settings Panel */}
      {showConfig && (
        <form onSubmit={handleSaveConfig} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-500" /> Geofence GPS Location Settings
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Office Latitude</label>
              <input
                type="number"
                step="any"
                value={configLat}
                onChange={(e) => setConfigLat(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Office Longitude</label>
              <input
                type="number"
                step="any"
                value={configLng}
                onChange={(e) => setConfigLng(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Geofence Radius (m)</label>
              <input
                type="number"
                value={configRadius}
                onChange={(e) => setConfigRadius(parseInt(e.target.value, 10))}
                min="10"
                max="1000"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs px-3.5 py-1.5 rounded-lg font-medium bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs"
            >
              Save Settings
            </button>
          </div>
        </form>
      )}

      {/* Main Interactive Check-In / Check-Out / Break Panel */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-4">
        
        {/* Status Indicator */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${
              !activeLog ? 'bg-slate-400' :
              activeLog.on_break ? 'bg-amber-500' :
              'bg-emerald-500'
            }`} />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                {!activeLog ? 'Not Checked In' : activeLog.on_break ? 'On Authorized Break' : 'Checked In (On Duty)'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {!activeLog ? 'Mark check-in to begin your shift.' :
                 activeLog.on_break ? 'Break active — outside boundary check paused.' :
                 `On Duty — ${geofence?.radius_meters || 50}m geofence active.`}
              </p>

            </div>
          </div>

          {activeLog && (
            <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400">
              Checked in at: <span className="font-semibold text-slate-900 dark:text-white">
                {new Date(activeLog.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {!activeLog ? (
            <button
              onClick={handleMarkCheckIn}
              disabled={isMarking}
              className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white shadow-xs flex items-center justify-center gap-2 transition"
            >
              <CheckCircle className={`w-4 h-4 ${isMarking ? 'animate-spin' : ''}`} />
              {isMarking ? 'Verifying Location...' : 'Mark Check-In at Office'}
            </button>
          ) : (
            <>
              {activeLog.on_break ? (
                <button
                  onClick={() => handleToggleBreak(false)}
                  disabled={isMarking}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white shadow-xs flex items-center gap-1.5 transition"
                >
                  <Coffee className="w-4 h-4" /> Resume Shift
                </button>
              ) : (
                <button
                  onClick={() => handleToggleBreak(true)}
                  disabled={isMarking}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5"
                >
                  <Coffee className="w-4 h-4" /> Take a Break
                </button>
              )}

              <button
                onClick={handleCheckOut}
                disabled={isMarking}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-xs flex items-center gap-1.5 transition"
              >
                <LogOut className="w-4 h-4" /> Check-Out
              </button>
            </>
          )}
        </div>

        {/* Feedback Messages */}
        {actionMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-center gap-2 max-w-md mx-auto">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{actionMsg.text}</span>
          </div>
        )}

        {checkInError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-center gap-2 max-w-md mx-auto">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{checkInError.message}</span>
          </div>
        )}
      </div>

      {/* Recent Records Table */}
      <div>
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
          Recent Shift Logs ({logs?.length || 0})
        </h3>
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 font-medium">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Check-In</th>
                <th className="py-2.5 px-3">Check-Out</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {logs?.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">{log.user_name}</td>
                  <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                    {new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                    {log.check_out ? (
                      new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active Shift</span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                    {log.working_hours}
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
