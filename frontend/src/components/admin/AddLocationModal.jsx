import React, { useState, useEffect } from 'react';
import { X, MapPin, Building, Globe, Clock, Calendar, CheckCircle2 } from 'lucide-react';

export default function AddLocationModal({ isOpen, onClose, locationToEdit, activeUser, onLocationSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    latitude: '12.871133',
    longitude: '80.083898',
    time_zone: 'IST (UTC+05:30)',
    weekly_off_pattern: 'Saturday & Sunday',
    branch_code: '',
    description: '',
    active: true
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (locationToEdit) {
      setFormData({
        name: locationToEdit.name || '',
        address: locationToEdit.address || '',
        city: locationToEdit.city || '',
        state: locationToEdit.state || '',
        country: locationToEdit.country || 'India',
        postal_code: locationToEdit.postal_code || '',
        latitude: locationToEdit.latitude !== undefined ? String(locationToEdit.latitude) : '12.871133',
        longitude: locationToEdit.longitude !== undefined ? String(locationToEdit.longitude) : '80.083898',
        time_zone: locationToEdit.time_zone || 'IST (UTC+05:30)',
        weekly_off_pattern: locationToEdit.weekly_off_pattern || 'Saturday & Sunday',
        branch_code: locationToEdit.branch_code || '',
        description: locationToEdit.description || '',
        active: locationToEdit.active !== false
      });
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        postal_code: '',
        latitude: '12.871133',
        longitude: '80.083898',
        time_zone: 'IST (UTC+05:30)',
        weekly_off_pattern: 'Saturday & Sunday',
        branch_code: `LOC-${Math.floor(100 + Math.random() * 900)}`,
        description: '',
        active: true
      });
    }
  }, [locationToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setSubmitting(true);
      const url = locationToEdit ? `/api/locations/${locationToEdit.id}` : '/api/locations';
      const method = locationToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (onLocationSaved) onLocationSaved(data.location || formData);
        onClose();
      }

    } catch (err) {
      console.error("Failed to save location", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {locationToEdit ? 'Edit Office Location' : 'New Office Location Creation'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure location geofence, time zones, weekly off pattern, and branch code</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 max-h-[75vh]">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Location Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Delhi NCR Headquarters"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Company Branch Code</label>
              <input
                type="text"
                required
                value={formData.branch_code}
                onChange={e => setFormData({ ...formData, branch_code: e.target.value })}
                placeholder="DEL-01"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Prolync Tower, Sector 44"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="Gurugram"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">State / Province</label>
              <input
                type="text"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                placeholder="Delhi NCR / Haryana"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                placeholder="India"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Postal Code</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="122003"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">GPS Latitude</label>
              <input
                type="text"
                value={formData.latitude}
                onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="28.613939"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">GPS Longitude</label>
              <input
                type="text"
                value={formData.longitude}
                onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="77.209021"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Time Zone</label>
              <select
                value={formData.time_zone}
                onChange={e => setFormData({ ...formData, time_zone: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="IST (UTC+05:30)">IST (UTC+05:30) - India</option>
                <option value="EST (UTC-05:00)">EST (UTC-05:00) - US East</option>
                <option value="PST (UTC-08:00)">PST (UTC-08:00) - US West</option>
                <option value="GMT (UTC+00:00)">GMT (UTC+00:00) - London</option>
                <option value="SGT (UTC+08:00)">SGT (UTC+08:00) - Singapore</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Weekly Off Pattern</label>
              <select
                value={formData.weekly_off_pattern}
                onChange={e => setFormData({ ...formData, weekly_off_pattern: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Saturday & Sunday">Saturday & Sunday (5-Day Week)</option>
                <option value="Sunday Only">Sunday Only (6-Day Week)</option>
                <option value="Alternate Saturdays">Alternate Saturdays & Sunday</option>
                <option value="Custom Shift Pattern">Custom Shift Pattern</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Location Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Primary headquarters location notes..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="locActive"
              checked={formData.active}
              onChange={e => setFormData({ ...formData, active: e.target.checked })}
              className="rounded text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="locActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Active Location (Enables location policy & geofence rules)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              {submitting ? 'Saving...' : locationToEdit ? 'Save Location Changes' : 'Create Location'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
