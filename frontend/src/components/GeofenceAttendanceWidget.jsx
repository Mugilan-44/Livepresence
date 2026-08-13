import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ShieldCheck, AlertCircle, CheckCircle, Settings, Coffee, LogOut, Clock, ShieldAlert } from 'lucide-react';
import { getApiUrl } from '../config/api';

const localPresenceTime = (value) => new Date(`${String(value || '').replace(' ', 'T').replace(/Z$/, '')}Z`).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

const browserName = () => {
  const ua = navigator.userAgent || '';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\//i.test(ua)) return 'Opera';
  if (/Brave/i.test(ua) || navigator.brave) return 'Brave';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua)) return 'Safari';
  return 'your browser';
};

const locationErrorMessage = (error) => {
  const browser = browserName();
  const code = error?.code;
  if (code === 1) return `${browser} denied this location request. In Chrome, open the lock icon beside localhost:3000 → Site settings → Location → Allow. Then check macOS System Settings → Privacy & Security → Location Services and enable ${browser}.`;
  if (code === 2) return `${browser} is allowed, but macOS could not determine a position. Turn on Wi‑Fi and enable ${browser} under macOS System Settings → Privacy & Security → Location Services, then reload this page.`;
  if (code === 3) return `${browser} location lookup timed out. Keep Wi‑Fi on, stay on localhost:3000, and try again.`;
  return `${browser} could not get a usable location. Check the localhost permission and macOS Location Services, then try again.`;
};

// Desktop browsers can return a temporary Core Location "position unknown"
// error even when permission is granted. Retry the normal Wi-Fi location source
// a few times before surfacing the error, then try high accuracy as a last step.
// Keep the whole operation bounded so the action never stays stuck on
// "Verifying location" when macOS does not return a coordinate.
const requestOfficePosition = (onSuccess, onFailure) => {
  if (!('geolocation' in navigator)) return onFailure(new Error('This browser does not support location.'));
  let attempts = 0;
  let lastError = null;
  let settled = false;
  let deadline;

  const fail = (error) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(deadline);
    onFailure(error);
  };

  const succeed = (position) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(deadline);
    onSuccess(position);
  };

  const request = () => {
    if (settled) return;
    attempts += 1;
    const finalAttempt = attempts >= 4;
    navigator.geolocation.getCurrentPosition(
      succeed,
      (error) => {
        if (settled) return;
        lastError = error;
        if (!finalAttempt) return window.setTimeout(request, attempts * 700);
        fail(lastError);
      },
      { enableHighAccuracy: finalAttempt, timeout: finalAttempt ? 6500 : 4000, maximumAge: attempts === 1 ? 300000 : 60000 }
    );
  };

  // Core Location can occasionally fail to invoke a browser callback. This
  // deadline keeps the UI responsive and lets the user try again.
  deadline = window.setTimeout(() => {
    fail(lastError || { code: 2, message: 'Location lookup timed out.' });
  }, 18000);
  request();
};

export default function GeofenceAttendanceWidget({ geofence, activeUser, logs, onCheckIn, onUpdateGeofence }) {
  const [isMarking, setIsMarking] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [checkInError, setCheckInError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const lastVerifiedPosition = useRef(null);
  const autoCheckoutInFlight = useRef(false);
  const checkoutInFlight = useRef(false);

  // Active Check-in Record for current user
  const activeLog = logs?.find(l => l.user_id === activeUser?.id && !l.check_out);

  // Super Admin Config State
  const [configLat, setConfigLat] = useState(geofence?.latitude || 12.871133);
  const [configLng, setConfigLng] = useState(geofence?.longitude || 80.083898);
  const [configRadius, setConfigRadius] = useState(geofence?.radius_meters || 200);

  useEffect(() => {
    if (!geofence) return;
    setConfigLat(geofence.latitude ?? 12.871133);
    setConfigLng(geofence.longitude ?? 80.083898);
    setConfigRadius(geofence.radius_meters ?? 200);
  }, [geofence?.latitude, geofence?.longitude, geofence?.radius_meters]);

  // Perform Check-In (Must be within the configured office boundary)
  const handleMarkCheckIn = async () => {
    setActionMsg(null);
    setCheckInError(null);
    setIsMarking(true);

    const performCheckIn = async (position) => {
      try {
        const res = await fetch(getApiUrl('/api/attendance/check-in'), {
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
          setCheckInError({ message: data.error || data.message || 'Your current location is outside the office verification area.' });
        }
      } catch (err) {
        setCheckInError({ message: `Location could not be verified. Please try again from within ${geofence?.radius_meters || 200}m of the office.` });
      } finally {
        setIsMarking(false);
      }
    };


    requestOfficePosition(
      (position) => { lastVerifiedPosition.current = position; performCheckIn(position); },
      (error) => { setIsMarking(false); setCheckInError({ message: locationErrorMessage(error) }); }
    );
  };

  const submitCheckout = async (position, manualFallback = false) => {
    try {
      const res = await fetch(getApiUrl('/api/attendance/check-out'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          latitude: position?.coords?.latitude,
          longitude: position?.coords?.longitude,
          accuracy: position?.coords?.accuracy,
          manualFallback
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: 'success', text: data.message || 'Check-out recorded.' });
        onCheckIn();
      } else {
        setCheckInError({ message: data.error || 'Could not check out.' });
      }
    } catch {
      setCheckInError({ message: 'Failed to process check-out.' });
    } finally {
      setIsMarking(false);
      autoCheckoutInFlight.current = false;
      checkoutInFlight.current = false;
    }
  };

  // Checkout is intentionally single-click. During an active office shift the
  // live geofence watch normally keeps a verified position in memory; use it
  // immediately. If it has not arrived, make one short Wi-Fi location request,
  // then finish a labelled manual checkout rather than making the user retry.
  const handleCheckOut = async () => {
    if (checkoutInFlight.current || isMarking) return;
    checkoutInFlight.current = true;
    setActionMsg(null);
    setCheckInError(null);
    setIsMarking(true);
    if (lastVerifiedPosition.current) return submitCheckout(lastVerifiedPosition.current);
    if (!('geolocation' in navigator)) return submitCheckout(null, true);
    navigator.geolocation.getCurrentPosition(
      (position) => { lastVerifiedPosition.current = position; submitCheckout(position); },
      () => submitCheckout(null, true),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
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
          setCheckInError({ message: data.error || data.message || 'Could not update your presence status.' });
      }
    } catch (err) {
      setCheckInError({ message: 'Failed to toggle break status.' });
    } finally {
      setIsMarking(false);
    }
  };

  // Continuous geofence monitoring: while this app is open, leaving the office
  // boundary automatically closes an active shift. Browsers cannot guarantee
  // location tracking after the app/browser has been closed by the device.
  useEffect(() => {
    if (!activeLog || activeLog.on_break) return;
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        lastVerifiedPosition.current = position;
        if (autoCheckoutInFlight.current) return;
        try {
          const res = await fetch(getApiUrl('/api/attendance/verify-boundary'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: activeUser.id, latitude: position.coords.latitude, longitude: position.coords.longitude })
          });
          const data = await res.json().catch(() => ({}));
          if (data.status === 'AUTO_CHECKED_OUT') {
            autoCheckoutInFlight.current = true;
            setActionMsg({ type: 'success', text: data.message });
            onCheckIn();
          }
        } catch { /* retry on the next location event */ }
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeLog?.id, activeLog?.on_break, activeUser?.id]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setCheckInError(null);
    try {
      await onUpdateGeofence({
        latitude: configLat,
        longitude: configLng,
        radius_meters: configRadius,
        office_name: geofence?.office_name
      });
      setActionMsg({ type: 'success', text: 'Geofence settings saved.' });
      setShowConfig(false);
    } catch (error) {
      setCheckInError({ message: error.message || 'Could not save geofence settings.' });
    }
  };

  return (
    <div className="glass-card p-5 space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Office presence</h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Shift: 09:00 AM - 07:00 PM (10 hrs)</span>
            <span>•</span>
            <span>Office-only verification within {geofence?.radius_meters || 200}m of the location.</span>
          </div>
        </div>

        {activeUser.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Settings className="w-3.5 h-3.5" /> Geofence Settings ({geofence?.radius_meters || 200}m)
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
                {!activeLog ? 'Check in from the office. Entries between 9:00 and 9:25 AM are recorded as 9:00 AM.' :
                 activeLog.on_break ? 'Break active — outside boundary check paused.' :
                 `On Duty — ${geofence?.radius_meters || 200}m geofence active.`}
              </p>

            </div>
          </div>

          {activeLog && (
            <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400">
              Checked in at: <span className="font-semibold text-slate-900 dark:text-white">
                {localPresenceTime(activeLog.check_in)}
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
              {isMarking ? 'Checking Location…' : 'Mark Check-In at Office'}
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
                    {localPresenceTime(log.check_in)}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                    {log.check_out ? (
                      localPresenceTime(log.check_out)
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active Shift</span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                    {log.working_hours}
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {log.status?.includes('Remote') || log.status?.includes('WFH') ? 'Office' : log.status}
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
