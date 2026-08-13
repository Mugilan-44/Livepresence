import React, { useState } from 'react';
import { Palette, UserRound } from 'lucide-react';
import EmployeeProfilePage from '../employee/EmployeeProfilePage';
import OnboardingVerificationBanner from '../onboarding/OnboardingVerificationBanner';
import PersonalSettings from './PersonalSettings';
import MonthlyWrap from './MonthlyWrap';

export default function SettingsWorkspace({ activeUser, documents, onUpdateProfile, onChangePassword, onRequestPasswordOtp, onPreferencesChange, onNavigate, attendanceLogs, workLogs, tasks }) {
  const [tab, setTab] = useState('profile');
  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="glass-card flex flex-wrap gap-2 p-2"><button onClick={() => setTab('profile')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'profile' ? 'bg-[var(--accent)] text-white' : 'text-slate-600 dark:text-slate-300'}`}><UserRound className="h-4 w-4" />My profile</button><button onClick={() => setTab('appearance')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'appearance' ? 'bg-[var(--accent)] text-white' : 'text-slate-600 dark:text-slate-300'}`}><Palette className="h-4 w-4" />Appearance & security</button></div>
    {tab === 'profile' ? <><OnboardingVerificationBanner activeUser={activeUser} documents={documents} onNavigateTab={onNavigate} /><EmployeeProfilePage activeUser={activeUser} onUpdateProfile={onUpdateProfile} onChangePassword={onChangePassword} onRequestPasswordOtp={onRequestPasswordOtp} /><MonthlyWrap activeUser={activeUser} attendanceLogs={attendanceLogs} workLogs={workLogs} tasks={tasks} /></> : <PersonalSettings activeUser={activeUser} onPreferencesChange={onPreferencesChange} />}
  </div>;
}
