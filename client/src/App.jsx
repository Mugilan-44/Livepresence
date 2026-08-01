import React, { useState, useEffect, useMemo } from 'react';
import LoginPage from './components/LoginPage';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Dashboards
import OperationsDashboard from './components/dashboards/OperationsDashboard';
import SuperAdminView from './components/dashboards/SuperAdminView';
import HRView from './components/dashboards/HRView';
import EmployeeView from './components/dashboards/EmployeeView';

// Modules
import EmployeeDirectory from './components/employee/EmployeeDirectory';
import EmployeeProfileModal from './components/employee/EmployeeProfileModal';
import GeofenceAttendanceWidget from './components/GeofenceAttendanceWidget';
import AttendanceReports from './components/attendance/AttendanceReports';
import LeaveManagementPage from './components/leaves/LeaveManagementPage';
import ProjectVelocityWidget from './components/ProjectVelocityWidget';
import ProjectAllocationModal from './components/projects/ProjectAllocationModal';
import DailyWorkLogForm from './components/projects/DailyWorkLogForm';
import DocumentVerificationWidget from './components/DocumentVerificationWidget';
import WorkloadAllocationWidget from './components/WorkloadAllocationWidget';
import AnnouncementsHub from './components/communication/AnnouncementsHub';
import AnalyticsExportTools from './components/reports/AnalyticsExportTools';
import AuditLogsTable from './components/audit/AuditLogsTable';
import PayslipModal from './components/payroll/PayslipModal';
import ProcessPayrollModal from './components/payroll/ProcessPayrollModal';
import CapabilityMatrixModal from './components/CapabilityMatrixModal';
import ManagePermissionsModal from './components/employee/ManagePermissionsModal';
import CustomizationSettingsModal from './components/admin/CustomizationSettingsModal';
import MenuManagementModal from './components/admin/MenuManagementModal';
import SmtpSettingsModal from './components/admin/SmtpSettingsModal';
import LocationManagementPage from './components/admin/LocationManagementPage';
import RoleManagementModal from './components/admin/RoleManagementModal';
import EmailTemplatesPage from './components/admin/EmailTemplatesPage';
import EmployeeProfilePage from './components/employee/EmployeeProfilePage';
import OnboardingVerificationBanner from './components/onboarding/OnboardingVerificationBanner';
import { ShieldAlert, DollarSign, Printer, Mail, Sliders, Briefcase } from 'lucide-react';




const rolePermissions = {
  SUPER_ADMIN: ['dashboard', 'profile', 'attendance', 'leaves', 'locations', 'email_templates', 'employees', 'documents', 'projects', 'worklogs', 'payroll', 'announcements', 'reports', 'audit'],

  HR: ['dashboard', 'profile', 'attendance', 'leaves', 'employees', 'documents', 'projects', 'worklogs', 'payroll', 'announcements', 'reports'],
  MANAGER: ['dashboard', 'profile', 'attendance', 'leaves', 'employees', 'projects', 'worklogs', 'announcements', 'reports'],
  FULL_TIME: ['dashboard', 'profile', 'attendance', 'leaves', 'projects', 'worklogs', 'payroll', 'announcements'],
  INTERN: ['dashboard', 'profile', 'attendance', 'leaves', 'projects', 'worklogs', 'announcements']
};

// Route Path Mappings for smooth URL navigation (e.g. localhost:3000/attendance, localhost:3000/leaves)
const NAV_TO_PATH = {
  dashboard: '/dashboard',
  profile: '/profile',
  attendance: '/attendance',
  leaves: '/leaves',
  employees: '/directory',
  directory: '/directory',
  documents: '/documents',
  projects: '/projects',
  worklogs: '/worklogs',
  payroll: '/payroll',
  announcements: '/announcements',
  reports: '/reports',
  locations: '/locations',
  email_templates: '/email-templates',
  audit: '/audit'
};

const PATH_TO_NAV = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/profile': 'profile',
  '/attendance': 'attendance',
  '/leaves': 'leaves',
  '/directory': 'employees',
  '/employees': 'employees',
  '/documents': 'documents',
  '/projects': 'projects',
  '/worklogs': 'worklogs',
  '/payroll': 'payroll',
  '/announcements': 'announcements',
  '/communication': 'announcements',
  '/reports': 'reports',
  '/locations': 'locations',
  '/email-templates': 'email_templates',
  '/audit': 'audit'
};

function getNavFromPath() {
  const rawPath = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  return PATH_TO_NAV[rawPath] || localStorage.getItem('prolync_nav') || 'dashboard';
}

export default function App() {
  const [theme, setTheme] = useState('light');
  const [token, setToken] = useState(() => localStorage.getItem('prolync_token'));
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(() => {
    const saved = localStorage.getItem('prolync_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [geofence, setGeofence] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [companySettings, setCompanySettings] = useState(null);
  const [workloadStats, setWorkloadStats] = useState(null);
  const [statCounts, setStatCounts] = useState(null);
  const [birthdays, setBirthdays] = useState([]);
  const [anniversaries, setAnniversaries] = useState([]);
  const [customizations, setCustomizations] = useState(null);
  const [notificationsList, setNotificationsList] = useState([]);
  const [menus, setMenus] = useState([]);

  // UI Navigation & Modals State (URL Synced Router)
  const [activeNav, setActiveNav] = useState(getNavFromPath);

  const handleSetNav = (nav) => {
    setActiveNav(nav);
    localStorage.setItem('prolync_nav', nav);
    const targetPath = NAV_TO_PATH[nav] || `/${nav}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ nav }, '', targetPath);
    }
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMatrixModal, setShowMatrixModal] = useState(false);

  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState(null);
  const [selectedPayslipRecord, setSelectedPayslipRecord] = useState(null);
  const [showProcessPayrollModal, setShowProcessPayrollModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showCustomizationsModal, setShowCustomizationsModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showProjectAllocationModal, setShowProjectAllocationModal] = useState(false);
  const [showSmtpModal, setShowSmtpModal] = useState(false);

  const handleUpdatePermissions = async (userId, permissions) => {
    await fetch(`/api/employees/${userId}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissions,
        actorRole: activeUser.role,
        actorName: activeUser.name
      })
    });
    fetch('/api/users').then(r => r.json()).then(setUsers);
  };

  // Toggle Theme (Dark / Light)
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('prolync_theme', nextTheme);
  };

  // Sync Theme class on HTML document root for Tailwind dark: selector
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Browser History & URL Route Path Listener (Back/Forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const nav = getNavFromPath();
      setActiveNav(nav);
    };
    window.addEventListener('popstate', handlePopState);

    // Sync initial URL path
    const initialNav = getNavFromPath();
    const targetPath = NAV_TO_PATH[initialNav] || '/dashboard';
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({ nav: initialNav }, '', targetPath);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Role-Based Access Control (RBAC) Navigation Guard
  useEffect(() => {
    const allowed = rolePermissions[activeUser?.role];
    if (activeUser?.role && allowed && !allowed.includes(activeNav)) {
      handleSetNav('dashboard');
    }
  }, [activeUser?.role, activeNav]);

  // Fetch backend APIs
  useEffect(() => {
    if (token && activeUser) {
      fetchData();
    }
  }, [token, activeUser?.id]);

  const fetchData = async () => {
    try {
      const [uRes, gRes, aRes, asSummary, wRes, pRes, tRes, wlLogs, dRes, prRes, ancRes, evRes, audRes, compRes, wlStats, stRes, bRes, annRes, custRes, notifRes, menuRes] = await Promise.all([
        fetch('/api/employees').then(r => r.json()),
        fetch('/api/geofence').then(r => r.json()),
        fetch('/api/attendance/logs').then(r => r.json()),
        fetch('/api/attendance/reports').then(r => r.json()),
        fetch('/api/leaves').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/work-logs').then(r => r.json()),
        fetch('/api/documents').then(r => r.json()),
        fetch('/api/payroll').then(r => r.json()),
        fetch('/api/announcements').then(r => r.json()),
        fetch('/api/events').then(r => r.json()),
        fetch('/api/audit-logs').then(r => r.json()),
        fetch('/api/company/settings').then(r => r.json()),
        fetch('/api/workload').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/birthdays').then(r => r.json()),
        fetch('/api/anniversaries').then(r => r.json()),
        fetch('/api/customizations').then(r => r.json()),
        fetch(`/api/notifications?userId=${activeUser?.id || ''}`).then(r => r.json()),
        fetch('/api/menus').then(r => r.json()).catch(() => [])
      ]);

      setUsers(uRes);
      setGeofence(gRes);
      setAttendanceLogs(aRes);
      setAttendanceSummary(asSummary);
      setWfhRequests(wRes);
      setProjects(pRes);
      setTasks(tRes);
      setWorkLogs(wlLogs);
      setDocuments(dRes);
      setPayrollRecords(prRes);
      setAnnouncements(ancRes);
      setEvents(evRes);
      setAuditLogs(audRes);
      setCompanySettings(compRes);
      setWorkloadStats(wlStats);
      setStatCounts(stRes);
      setBirthdays(bRes);
      setAnniversaries(annRes);
      setCustomizations(custRes);
      setNotificationsList(notifRes);
      if (Array.isArray(menuRes)) setMenus(menuRes);
    } catch (e) {
      console.error("Failed to fetch initial application data", e);
    }
  };


  const handleSaveCustomizations = async (newCustomizations) => {
    const res = await fetch('/api/customizations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newCustomizations,
        userRole: activeUser?.role,
        actorName: activeUser?.name
      })
    });
    const data = await res.json();
    if (res.ok) {
      setCustomizations(data.customizations);
    } else {
      throw new Error(data.error || 'Failed to update customizations');
    }
  };

  const handleLoginSuccess = (newToken, userObj) => {
    setToken(newToken);
    setActiveUser(userObj);
    localStorage.setItem('prolync_token', newToken);
    localStorage.setItem('prolync_user', JSON.stringify(userObj));
    setActiveNav('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setActiveUser(null);
    localStorage.removeItem('prolync_token');
    localStorage.removeItem('prolync_user');
  };

  const handleRoleSelect = (newUser) => {
    setActiveUser(newUser);
    localStorage.setItem('prolync_user', JSON.stringify(newUser));
  };

  const handleCheckIn = () => {
    fetch('/api/attendance/logs').then(r => r.json()).then(setAttendanceLogs);
  };

  const handleUpdateGeofence = async (newGeofence) => {
    const res = await fetch('/api/geofence', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newGeofence, userRole: activeUser.role, actorName: activeUser.name })
    });
    const data = await res.json();
    if (res.ok) {
      setGeofence(data.geofence);
      fetch('/api/audit-logs').then(r => r.json()).then(setAuditLogs);
    }
  };

  const handleWfhSubmitted = () => {
    fetch('/api/leaves').then(r => r.json()).then(setWfhRequests);
  };

  const handleReviewWfh = async (id, status, reviewedBy, notes) => {
    await fetch(`/api/leaves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewedBy, reviewNotes: notes, userRole: activeUser.role })
    });
    fetch('/api/leaves').then(r => r.json()).then(setWfhRequests);
  };

  const handleCreateTask = async (taskData) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...taskData, userRole: activeUser.role })
    });
    fetch('/api/tasks').then(r => r.json()).then(setTasks);
    fetch('/api/projects').then(r => r.json()).then(setProjects);
  };

  const handleCreateProject = async (projData) => {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...projData, userRole: activeUser.role })
    });
    fetch('/api/projects').then(r => r.json()).then(setProjects);
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetch('/api/tasks').then(r => r.json()).then(setTasks);
    fetch('/api/projects').then(r => r.json()).then(setProjects);
  };

  const handleSubmitWorkLog = async (logData) => {
    await fetch('/api/work-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });
    fetch('/api/work-logs').then(r => r.json()).then(setWorkLogs);
  };

  const handleUploadDoc = async (docData) => {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    
    if (!res.ok) {
      const errText = await res.text();
      let msg = 'Upload failed';
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error || msg;
      } catch (e) {
        msg = `Server Error (${res.status}): File size too large`;
      }
      throw new Error(msg);
    }

    const result = await res.json();
    if (result.document) {
      setDocuments(prev => [result.document, ...(prev || [])]);
    }
  };



  const handleReviewDoc = async (id, status, feedbackNotes) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status, feedback_notes: feedbackNotes || (status === 'Approved' ? 'Verified by HR.' : 'Rejected by HR.') } : d));
    await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, feedbackNotes, userRole: activeUser.role })
    });
    fetch('/api/documents').then(r => r.json()).then(setDocuments);
    fetch('/api/employees').then(r => r.json()).then(u => {
      setUsers(u);
      if (activeUser) {
        const updated = u.find(x => x.id === activeUser.id);
        if (updated) setActiveUser(updated);
      }
    });
  };


  const [newEmployeeCredentials, setNewEmployeeCredentials] = useState(null);

  const handleAddEmployee = async (empData) => {
    // null is passed by handleRemoveEmployee to trigger a re-fetch after deletion
    if (empData === null) {
      fetch('/api/employees').then(r => r.json()).then(setUsers);
      return;
    }
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...empData,
        actorName: activeUser?.name || 'Super Admin',
        userRole: activeUser?.role || 'SUPER_ADMIN'
      })
    });
    const data = await res.json();
    if (data.invitation) {
      setNewEmployeeCredentials(data.invitation);
    }
    fetch('/api/employees').then(r => r.json()).then(setUsers);
  };



  const handlePublishAnnouncement = async (ancData) => {
    await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ancData)
    });
    fetch('/api/announcements').then(r => r.json()).then(setAnnouncements);
  };

  const handleProcessPayroll = async (payrollData) => {
    await fetch('/api/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payrollData)
    });
    fetch('/api/payroll').then(r => r.json()).then(setPayrollRecords);
  };

  const handleRegularizeAttendance = async (data) => {
    await fetch('/api/attendance/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    fetch('/api/attendance/logs').then(r => r.json()).then(setAttendanceLogs);
  };

  const handleClearAttendanceLogs = async () => {
    await fetch('/api/attendance/clear', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userRole: activeUser.role, actorName: activeUser.name })
    });
    fetch('/api/attendance/logs').then(r => r.json()).then(setAttendanceLogs);
  };

  const handleUpdateProfile = async (id, updatedData) => {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
    const result = await res.json();
    if (result.employee) {
      setActiveUser(result.employee);
      localStorage.setItem('prolync_user', JSON.stringify(result.employee));
      setUsers(prev => prev.map(u => u.id === id ? result.employee : u));
    }
  };

  const dynamicStatCounts = useMemo(() => {
    const totalUsers = users.length || 7;
    const checkedInUserIds = new Set(attendanceLogs.map(l => l.user_id));
    const presentCount = checkedInUserIds.size;
    const leaveCount = wfhRequests.filter(r => r.status === 'Approved').length;
    const notInCount = Math.max(0, totalUsers - presentCount - leaveCount);

    return {
      all: totalUsers,
      present: presentCount,
      not_in: notInCount,
      leave: leaveCount,
      weekoff: 0,
      public_holiday: 0
    };
  }, [users, attendanceLogs, wfhRequests]);

  if (!token || !activeUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderMainView = () => {
    switch (activeNav) {
      case 'dashboard':
        if (activeUser?.role === 'SUPER_ADMIN') {
          return (
            <SuperAdminView
              activeUser={activeUser}
              attendanceLogs={attendanceLogs}
              auditLogs={auditLogs}
              documents={documents}
              leaveRequests={wfhRequests}
              onOpenCustomizations={() => setShowCustomizationsModal(true)}
              users={users}
            />
          );
        }
        return (
          <OperationsDashboard
            activeUser={activeUser}
            statCounts={dynamicStatCounts}
            birthdays={birthdays}
            anniversaries={anniversaries}
            onNavigateTab={handleSetNav}
            onCheckIn={handleCheckIn}
            geofence={geofence}
          />
        );


      case 'profile':
        return (
          <EmployeeProfilePage
            activeUser={activeUser}
            onUpdateProfile={handleUpdateProfile}
          />
        );



      case 'attendance':
        const canViewAudit = ['SUPER_ADMIN', 'HR'].includes(activeUser?.role) || activeUser?.custom_permissions?.includes('view_attendance_audit');

        return (
          <div className="space-y-6">
            <GeofenceAttendanceWidget
              geofence={geofence}
              activeUser={activeUser}
              logs={attendanceLogs}
              onCheckIn={handleCheckIn}
              onUpdateGeofence={handleUpdateGeofence}
            />
            {canViewAudit && (
              <AttendanceReports
                logs={attendanceLogs}
                employees={users}
                activeUser={activeUser}
                onRefreshLogs={() => fetch('/api/attendance/logs').then(r => r.json()).then(setAttendanceLogs)}
                onRegularizeAttendance={handleRegularizeAttendance}
                onClearLogs={handleClearAttendanceLogs}
              />
            )}
          </div>
        );




      case 'leaves':
        return (
          <LeaveManagementPage
            activeUser={activeUser}
            users={users}
            onRefreshLeaves={fetchData}
          />
        );


      case 'employees':
        return (
          <EmployeeDirectory
            employees={users}
            onSelectEmployee={setSelectedEmployeeProfile}
            onAddEmployee={handleAddEmployee}
            activeUser={activeUser}
          />
        );

      case 'documents':
        return (
          <DocumentVerificationWidget
            activeUser={activeUser}
            documents={documents}
            onUploadDoc={handleUploadDoc}
            onReviewDoc={handleReviewDoc}
          />
        );

      case 'projects':
        return (
          <ProjectVelocityWidget
            activeUser={activeUser}
            projects={projects}
            tasks={tasks}
            users={users}
            customizations={customizations}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onCreateTask={handleCreateTask}
            onCreateProject={handleCreateProject}
            onOpenAllocation={() => setShowProjectAllocationModal(true)}
          />
        );

      case 'worklogs':
        return (
          <DailyWorkLogForm
            activeUser={activeUser}
            onSubmitLog={handleSubmitWorkLog}
            logs={workLogs}
            users={users}
            projects={projects}
            attendanceLogs={attendanceLogs}
          />
        );

      case 'payroll':
        return (
          <div className="glass-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Enterprise Payroll & Payslips</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Salary component breakdown and printable payslip generator (INR ₹)</p>
              </div>

              {['SUPER_ADMIN', 'HR'].includes(activeUser?.role) && (
                <button
                  onClick={() => setShowProcessPayrollModal(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Process Monthly Payroll
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 font-medium">
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Month / Year</th>
                    <th className="py-2.5 px-3">Gross Earnings</th>
                    <th className="py-2.5 px-3">Deductions</th>
                    <th className="py-2.5 px-3">Net Salary</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {payrollRecords?.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{rec.user_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">{rec.month_year}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">₹{rec.gross_salary?.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">₹{(rec.pf_deduction + rec.esi_deduction + rec.tax_tds)?.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">₹{rec.net_salary?.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {rec.payment_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedPayslipRecord(rec)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center gap-1 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" /> Printable Payslip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'announcements':
        return (
          <AnnouncementsHub
            announcements={announcements}
            events={events}
            onPublishAnnouncement={handlePublishAnnouncement}
            activeUser={activeUser}
          />
        );


      case 'roles':
        return (
          <RoleManagementModal
            isOpen={true}
            onClose={() => setActiveNav('dashboard')}
            activeUser={activeUser}
            onRolesUpdated={() => {
              fetch('/api/employees').then(r => r.json()).then(setUsers);
            }}
          />
        );

      case 'locations':
        return <LocationManagementPage activeUser={activeUser} />;

      case 'email_templates':
        return <EmailTemplatesPage activeUser={activeUser} />;

      case 'reports':
        return <AnalyticsExportTools />;


      case 'audit':
        return <AuditLogsTable logs={auditLogs} />;

      default:
        return null;
    }
  };

  const pageDetails = {
    dashboard: ['Overview', 'Your people operations at a glance'],
    profile: ['My profile', 'Manage your personal and employment details'],
    attendance: ['Attendance', 'Review daily attendance and time records'],
    leaves: ['Leave management', 'Plan leave and manage requests'],
    roles: ['Role management', 'Dynamic Role-Based Access Control (RBAC) & system roles governance'],
    locations: ['Work locations', 'Enterprise branch offices, active status & workforce distribution'],
    email_templates: ['Email templates', 'Enterprise HTML email templates, company branding & signature settings'],
    employees: ['Employees', 'Manage your workforce directory'],
    documents: ['Documents', 'Review and manage employee documents'],
    payroll: ['Payroll', 'Process payroll and access payslips'],
    announcements: ['Announcements', 'Keep the organisation informed'],
    reports: ['Reports', 'Explore workforce reports and analytics'],
    audit: ['Audit log', 'Review administrative activity']
  };



  const [pageTitle, pageDescription] = pageDetails[activeNav] || pageDetails.dashboard;

  return (
    <div className={theme}>
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
        
        {/* 1. Left Sidebar Navigation */}
        <Sidebar
          activeNav={activeNav}
          onSelectNav={handleSetNav}
          activeUser={activeUser}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          menus={menus}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* 2. Main Content Layout */}
        <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen overflow-x-hidden">
          
          {/* Top Header */}
          <Header
            activeUser={activeUser}
            users={users}
            onSelectUser={handleRoleSelect}
            onOpenMatrix={() => setShowMatrixModal(true)}
            onOpenPermissionsModal={() => setShowPermissionsModal(true)}
            onOpenCustomizations={() => setShowCustomizationsModal(true)}
            onOpenMenuModal={() => setShowMenuModal(true)}
            onOpenSmtpModal={() => setShowSmtpModal(true)}
            onOpenAllocationModal={() => setShowProjectAllocationModal(true)}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            notificationsList={notificationsList}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />


          {/* Main Body */}
          <main className="flex-1 w-full px-3 sm:px-5 lg:px-8 py-5 lg:py-7 flex flex-col overflow-x-hidden">
            <div className="mb-7 flex flex-col gap-1">
              <p className="page-eyebrow">Prolync LivePresence</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{pageTitle}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{pageDescription}</p>
            </div>
            <OnboardingVerificationBanner
              activeUser={activeUser}
              documents={documents}
              onNavigateTab={handleSetNav}
            />
            <div className="flex-1 flex flex-col">
              {renderMainView()}
            </div>
          </main>


          <footer className="border-t border-slate-200 dark:border-slate-800/80 py-5 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Prolync Infotech Pvt. Ltd. &nbsp;·&nbsp; Prolync LivePresence &nbsp;·&nbsp; All Rights Reserved
          </footer>
        </div>

        {/* Modals */}
        {showMenuModal && (
          <MenuManagementModal
            isOpen={showMenuModal}
            onClose={() => setShowMenuModal(false)}
            menus={menus}
            onSaveMenus={setMenus}
            activeUser={activeUser}
          />
        )}

        {showSmtpModal && (
          <SmtpSettingsModal
            isOpen={showSmtpModal}
            onClose={() => setShowSmtpModal(false)}
            activeUser={activeUser}
          />
        )}

        {showProjectAllocationModal && (
          <ProjectAllocationModal
            isOpen={showProjectAllocationModal}
            onClose={() => setShowProjectAllocationModal(false)}
            activeUser={activeUser}
            employees={users}
            projects={projects}
            onAllocationUpdated={fetchData}
          />
        )}

        {showMatrixModal && (
          <CapabilityMatrixModal onClose={() => setShowMatrixModal(false)} />
        )}


        {showPermissionsModal && (
          <ManagePermissionsModal
            onClose={() => setShowPermissionsModal(false)}
            employees={users}
            activeUser={activeUser}
            onUpdatePermissions={handleUpdatePermissions}
          />
        )}

        {showCustomizationsModal && (
          <CustomizationSettingsModal
            onClose={() => setShowCustomizationsModal(false)}
            customizations={customizations}
            onSaveCustomizations={handleSaveCustomizations}
            activeUser={activeUser}
          />
        )}


        {selectedEmployeeProfile && (
          <EmployeeProfileModal
            employee={selectedEmployeeProfile}
            activeUser={activeUser}
            onClose={() => setSelectedEmployeeProfile(null)}
          />
        )}


        {selectedPayslipRecord && (
          <PayslipModal
            record={selectedPayslipRecord}
            user={users.find(u => u.id === selectedPayslipRecord.user_id) || users[3]}
            company={companySettings}
            onClose={() => setSelectedPayslipRecord(null)}
          />
        )}

        {showProcessPayrollModal && (
          <ProcessPayrollModal
            onClose={() => setShowProcessPayrollModal(false)}
            onProcessPayroll={handleProcessPayroll}
            employees={users}
            activeUser={activeUser}
          />
        )}


        {/* New Employee Credentials Modal */}
        {newEmployeeCredentials && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Employee Invitation Sent</h3>
                  <p className="text-xs text-slate-500">The employee will create their own password with an email OTP.</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 text-sm font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs uppercase tracking-wider">Employee ID</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">{newEmployeeCredentials.employeeId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs uppercase tracking-wider">Login Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{newEmployeeCredentials.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs uppercase tracking-wider">Portal URL</span>
                  <span className="text-slate-600 dark:text-slate-400">{newEmployeeCredentials.loginUrl}</span>
                </div>
              </div>

              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                No password was created, displayed, or shared with the administrator.
              </p>

              <button
                onClick={() => setNewEmployeeCredentials(null)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
