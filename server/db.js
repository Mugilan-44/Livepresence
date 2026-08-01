import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');

const initialData = {
  company_settings: {
    company_name: "Prolync Infotech Pvt. Ltd.",
    tax_id: "GSTIN33AAACN1298E1Z4",
    headquarters: "Kilambakkam, Vandalur, Tamil Nadu - 603210, India",
    currency: "INR (₹)",
    fiscal_year: "2026-2027",
    office_geofence: {
      office_name: "Prolync HQ (Vandalur, Tamil Nadu)",
      latitude: 12.871133,
      longitude: 80.083898,
      radius_meters: 50
    }
  },
  stat_counts: {
    all: 6,
    present: 6,
    not_in: 0,
    leave: 0,
    weekoff: 0,
    public_holiday: 0
  },
  branches: [
    { id: "br-1", name: "Chennai HQ", city: "Chennai", code: "MAA-01", employees_count: 4 },
    { id: "br-2", name: "Bengaluru Tech Park", city: "Bengaluru", code: "BLR-02", employees_count: 2 }
  ],
  departments: [
    { id: "dept-1", name: "Engineering & Operations", code: "ENG", lead: "Mugilan S", budget: "₹15,00,000" },
    { id: "dept-2", name: "Human Resources", code: "HR", lead: "Sarah Jenkins", budget: "₹4,50,000" },
    { id: "dept-3", name: "Executive & Leadership", code: "EXEC", lead: "Rahul Kannan", budget: "₹20,00,000" }
  ],
  roles: [
    { id: 1, name: "Super Admin", code: "SUPER_ADMIN" },
    { id: 2, name: "HR Manager", code: "HR" },
    { id: 3, name: "Project Lead", code: "MANAGER" },
    { id: 4, name: "Full-Time Staff", code: "FULL_TIME" },
    { id: 5, name: "Intern / Trainee", code: "INTERN" }
  ],
  users: [
    {
      id: "u-1",
      employee_id: "EMP-1001",
      name: "Rahul Kannan",
      email: "rahul@prolync.in",
      role: "SUPER_ADMIN",
      title: "CEO & Founder",
      department: "Executive & Leadership",
      branch: "Chennai HQ",
      office_location: "Chennai HQ",
      gender: "Male",
      dob: "1988-04-12",
      blood_group: "O+",
      mobile: "+91 98402 91823",
      emergency_contact: "+91 98402 99999 (Spouse)",
      address: "Kilambakkam, Vandalur, Chennai, Tamil Nadu - 603210",
      joining_date: "2020-01-01",
      employment_status: "Active",
      salary_base: 180000,
      bank_name: "HDFC Bank Ltd.",
      bank_account: "•••• •••• 8842",
      ifsc_swift: "HDFC0001928",
      profile_score: 100,
      verified_employee: true,
      password: "Prolync",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "u-2",
      employee_id: "EMP-1002",
      name: "Sarah Jenkins",
      email: "hr@prolync.com",
      role: "HR",
      title: "Head of HR & Operations",
      department: "Human Resources",
      branch: "Chennai HQ",
      office_location: "Chennai HQ",
      gender: "Female",
      dob: "1991-08-23",
      blood_group: "A+",
      mobile: "+91 98401 88422",
      emergency_contact: "+91 98401 88888 (Father)",
      address: "Prolync Hub, Chennai, Tamil Nadu",
      joining_date: "2021-03-15",
      employment_status: "Active",
      salary_base: 85000,
      bank_name: "ICICI Bank Ltd.",
      bank_account: "•••• •••• 1928",
      ifsc_swift: "ICIC0000492",
      profile_score: 100,
      verified_employee: true,
      password: "Prolync",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "u-3",
      employee_id: "EMP-1003",
      name: "Mugilan S",
      email: "mugilan@prolync.com",
      role: "MANAGER",
      title: "Principal Engineering Lead",
      department: "Engineering & Operations",
      branch: "Bengaluru Tech Park",
      office_location: "Bengaluru Tech Park",
      gender: "Male",
      dob: "1990-11-05",
      blood_group: "B+",
      mobile: "+91 98400 77311",
      emergency_contact: "+91 98400 77777 (Spouse)",
      address: "Silicon Valley Hub, Bengaluru, Karnataka",
      joining_date: "2021-06-01",
      employment_status: "Active",
      salary_base: 110000,
      bank_name: "State Bank of India (SBI)",
      bank_account: "•••• •••• 5519",
      ifsc_swift: "SBIN0004412",
      profile_score: 98,
      verified_employee: true,
      password: "Prolync",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "u-4",
      employee_id: "EMP-1004",
      name: "Balakrishnan (Bala)",
      email: "bala@prolync.com",
      role: "FULL_TIME",
      title: "Senior Full-Stack Developer",
      department: "Engineering & Operations",
      manager_id: "u-3",
      branch: "Bengaluru Tech Park",
      office_location: "Bengaluru Tech Park",
      gender: "Male",
      dob: "1993-02-17",
      blood_group: "O-",
      mobile: "+91 98399 66900",
      emergency_contact: "+91 98399 11111 (Mother)",
      address: "Bengaluru Tech Hub, Karnataka",
      joining_date: "2022-09-10",
      employment_status: "Active",
      salary_base: 75000,
      bank_name: "Axis Bank Ltd.",
      bank_account: "•••• •••• 4402",
      ifsc_swift: "UTIB0000109",
      profile_score: 95,
      verified_employee: true,
      password: "Prolync",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "u-5",
      employee_id: "EMP-1005",
      name: "Mohammed Muzzammil S",
      email: "mohammed.muzzammil.s@gmail.com",
      role: "INTERN",

      title: "Software Engineer Intern",
      department: "Engineering & Operations",
      manager_id: "u-3",
      branch: "Chennai HQ",
      office_location: "Chennai HQ",
      gender: "Male",
      dob: "2002-09-30",
      blood_group: "AB+",
      mobile: "+91 98398 55844",
      emergency_contact: "+91 98398 22222 (Father)",
      address: "Vandalur, Chennai, Tamil Nadu - 603210",
      joining_date: "2026-01-15",
      employment_status: "Active",
      salary_base: 35000,
      bank_name: "Kotak Mahindra Bank",
      bank_account: "•••• •••• 7712",
      ifsc_swift: "KKBK0000881",
      profile_score: 100,
      verified_employee: true,
      password: "Prolync",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "u-6",
      employee_id: "EMP-1006",
      name: "Sivathanu (Sivath)",
      email: "sivath@prolync.com",
      role: "FULL_TIME",
      title: "Software Development Engineer",
      department: "Engineering & Operations",
      manager_id: "u-3",
      branch: "Chennai HQ",
      office_location: "Chennai HQ",
      gender: "Male",
      dob: "1997-06-14",
      blood_group: "B+",
      mobile: "+91 98397 44321",
      emergency_contact: "+91 98397 33333 (Father)",
      address: "Chennai Vandalur Hub, Tamil Nadu",
      joining_date: "2023-04-01",
      employment_status: "Active",
      salary_base: 65000,
      bank_name: "HDFC Bank Ltd.",
      bank_account: "•••• •••• 9921",
      ifsc_swift: "HDFC0001882",
      profile_score: 92,
      verified_employee: true,
      password: "Prolync",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    }
  ],
  birthdays: [],
  anniversaries: [],
  attendance_logs: [],

  attendance_reports_summary: {
    daily: { present: 6, absent: 0, leave: 0, late: 0, avg_hours: "8.5 hrs", attendance_pct: 100.0 },
    weekly: { present: 30, absent: 0, leave: 0, late: 0, avg_hours: "8.5 hrs", attendance_pct: 100.0 },
    monthly: { present: 120, absent: 0, leave: 0, late: 0, avg_hours: "8.5 hrs", attendance_pct: 100.0 },
    yearly: { present: 1440, absent: 0, leave: 0, late: 0, avg_hours: "8.5 hrs", attendance_pct: 100.0 }
  },
  leave_requests: [],
  payroll_records: [],
  projects: [],
  tasks: [],
  daily_work_logs: [],
  user_documents: [],
  announcements: [],
  company_events: [
    { id: "ev-1", title: "Independence Day Holiday", type: "Holiday", date: "2026-08-15" }
  ],
  audit_logs: [],
  workload_stats: {
    full_time_staff: { count: 2, active_deliverables: 0, label: "Full-Time Senior Devs (Bala & Sivath)" },
    interns: { count: 1, active_deliverables: 0, label: "Software Engineer Intern (Muzzammil)" },
    ceo: { count: 1, active_deliverables: 0, label: "CEO & Founder (Rahul)" },
    hr_admins: { count: 1, active_deliverables: 0, label: "HR Operations (Sarah)" }
  },

  menus: [
    { id: 'dashboard', label: 'Dashboard Overview', icon: 'LayoutDashboard', category: 'Core Operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 1 },
    { id: 'profile', label: 'My Profile', icon: 'UserCheck', category: 'Core Operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 2 },
    { id: 'attendance', label: 'Attendance', icon: 'CalendarCheck', category: 'Core Operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 3 },
    { id: 'leaves', label: 'Leaves & Calendar', icon: 'Home', category: 'Core Operations', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 4 },
    { id: 'employees', label: 'Employee Directory', icon: 'Users', category: 'Workforce Governance', roles: ['SUPER_ADMIN', 'HR', 'MANAGER'], enabled: true, order: 5 },
    { id: 'documents', label: 'Document Verification', icon: 'FileText', category: 'Workforce Governance', roles: ['SUPER_ADMIN', 'HR'], enabled: true, order: 6 },
    { id: 'projects', label: 'Projects & Tasks', icon: 'Briefcase', category: 'Delivery & Velocity', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 7 },
    { id: 'worklogs', label: 'Daily Work Logs', icon: 'FileText', category: 'Delivery & Velocity', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 8 },
    { id: 'payroll', label: 'Payroll & Payslips', icon: 'DollarSign', category: 'Finance & Operations', roles: ['SUPER_ADMIN', 'HR', 'FULL_TIME'], enabled: true, order: 9 },
    { id: 'announcements', label: 'Company Hub', icon: 'Bell', category: 'Communication', roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'FULL_TIME', 'INTERN'], enabled: true, order: 10 },
    { id: 'reports', label: 'Reports & Analytics', icon: 'BarChart3', category: 'Management & Audit', roles: ['SUPER_ADMIN', 'HR', 'MANAGER'], enabled: true, order: 11 },
    { id: 'leave_settings', label: 'Leave & Location Settings', icon: 'Sliders', category: 'Management & Audit', roles: ['SUPER_ADMIN', 'HR'], enabled: true, order: 12 },
    { id: 'audit', label: 'Security & Audit Logs', icon: 'Shield', category: 'Management & Audit', roles: ['SUPER_ADMIN'], enabled: true, order: 13 }
  ],

  leave_balances: {
    "u-1": { casual: 12, sick: 10, earned: 15, comp_off: 2 },
    "u-2": { casual: 12, sick: 10, earned: 15, comp_off: 2 },
    "u-3": { casual: 12, sick: 10, earned: 15, comp_off: 2 },
    "u-4": { casual: 12, sick: 10, earned: 15, comp_off: 2 },
    "u-5": { casual: 12, sick: 10, earned: 15, comp_off: 2 },
    "u-6": { casual: 12, sick: 10, earned: 15, comp_off: 2 }
  },

  leave_types: [
    { id: "lt-1", name: "Casual Leave", code: "CL", description: "Short planned personal time off", total_days_per_year: 12, carry_forward: false, max_carry_forward: 0, requires_approval: true, requires_medical: false, paid: true, active: true },
    { id: "lt-2", name: "Sick Leave", code: "SL", description: "Health & medical recovery leave", total_days_per_year: 10, carry_forward: true, max_carry_forward: 5, requires_approval: true, requires_medical: true, paid: true, active: true },
    { id: "lt-3", name: "Earned Leave", code: "EL", description: "Privilege leave accrued annually", total_days_per_year: 15, carry_forward: true, max_carry_forward: 10, requires_approval: true, requires_medical: false, paid: true, active: true },
    { id: "lt-4", name: "Compensatory Off", code: "COMP_OFF", description: "Overtime weekend work credit", total_days_per_year: 5, carry_forward: false, max_carry_forward: 0, requires_approval: true, requires_medical: false, paid: true, active: true },
    { id: "lt-5", name: "Maternity Leave", code: "MATERNITY", description: "Paid maternity & child care leave", total_days_per_year: 180, carry_forward: false, max_carry_forward: 0, requires_approval: true, requires_medical: true, paid: true, active: true },
    { id: "lt-6", name: "Paternity Leave", code: "PATERNITY", description: "Paternity leave for new fathers", total_days_per_year: 15, carry_forward: false, max_carry_forward: 0, requires_approval: true, requires_medical: false, paid: true, active: true },
    { id: "lt-7", name: "Marriage Leave", code: "MARRIAGE", description: "Special leave for employee marriage", total_days_per_year: 5, carry_forward: false, max_carry_forward: 0, requires_approval: true, requires_medical: false, paid: true, active: true },
    { id: "lt-8", name: "Bereavement Leave", code: "BEREAVEMENT", description: "Compassionate leave for family loss", total_days_per_year: 5, carry_forward: false, max_carry_forward: 0, requires_approval: true, requires_medical: false, paid: true, active: true },
    { id: "lt-9", name: "Work From Home Pass", code: "WFH", description: "Remote work location authorization", total_days_per_year: 36, carry_forward: false, max_carry_forward: 0, requires_approval: true, requires_medical: false, paid: true, active: true },
    { id: "lt-10", name: "Optional Holiday", code: "OPTIONAL", description: "Restricted festival holiday pass", total_days_per_year: 3, carry_forward: false, max_carry_forward: 0, requires_approval: true, requires_medical: false, paid: true, active: true }
  ],

  office_locations: [
    {
      id: "loc-1",
      name: "Chennai HQ",
      address: "Prolync Enterprise Hub, Kilambakkam",
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India",
      postal_code: "603210",
      latitude: 12.871133,
      longitude: 80.083898,
      time_zone: "IST (UTC+05:30)",
      weekly_off_pattern: "Sunday Only",
      branch_code: "MAA-01",
      description: "Primary head office and geofenced hub",
      active: true
    },
    {
      id: "loc-2",
      name: "Bengaluru Tech Park",
      address: "Outer Ring Road, Bellandur",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      postal_code: "560103",
      latitude: 12.935242,
      longitude: 77.694602,
      time_zone: "IST (UTC+05:30)",
      weekly_off_pattern: "Saturday & Sunday",
      branch_code: "BLR-02",
      description: "Engineering & R&D center",
      active: true
    }
  ],

  location_holidays: [
    { id: "h-maa-1", location_id: "loc-1", title: "Pongal Festival", date: "2026-01-14", type: "State Holiday" },
    { id: "h-maa-2", location_id: "loc-1", title: "Independence Day", date: "2026-08-15", type: "National Holiday" }
  ],

  leave_workflow_config: {
    approval_pipeline: ["Reporting Manager", "HR Admin", "Final Approval"],
    auto_approval_enabled: false,
    require_attachment_above_days: 3,
    max_consecutive_leave_days: 10,
    minimum_notice_period_days: 2,
    allow_half_day: true,
    allow_quarter_day: false,
    sandwich_leave_rule: true,
    holiday_between_leaves_deducted: true
  },

  project_allocations: [],

  smtp_config: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "notifications@prolync.in",
    pass: "",
    sender_name: "Prolync HR System",
    sender_email: "notifications@prolync.in",
    enabled: true
  },

  email_logs: [],

  email_branding: {
    company_name: "Prolync Infotech Pvt. Ltd.",
    company_logo: "/logo.png",
    brand_primary_color: "#0891b2",
    website: "www.prolync.in",
    support_email: "hr@prolync.in",
    phone: "+91 98402 00000",
    address: "Chennai HQ Campus, Tamil Nadu, India",
    footer_disclaimer: "Confidentiality Notice: This communication contains confidential information intended solely for the addressee. Prolync Infotech Pvt. Ltd.",
    signature_html: `<div>
  <p style="margin: 0; font-weight: bold; color: #0891b2;">Kind Regards,</p>
  <p style="margin: 2px 0; font-weight: bold; color: #0f172a;">HR Operations Team</p>
  <p style="margin: 0; font-weight: bold; color: #334155;">Prolync Infotech Pvt. Ltd.</p>
  <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">Human Resources &amp; Enterprise Governance Department</p>
  <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Email: <a href="mailto:hr@prolync.in" style="color: #0891b2; text-decoration: none;">hr@prolync.in</a> | Web: <a href="http://www.prolync.in" style="color: #0891b2; text-decoration: none;">www.prolync.in</a></p>
</div>`
  },

  email_templates: [
    {
      id: "tpl-1",
      code: "WELCOME_EMAIL",
      name: "Welcome Email & Login Credentials",
      category: "Onboarding",
      subject: "Welcome to {{CompanyName}}! Your Official Employee Access Credentials",
      heading: "Welcome to the Team, {{FirstName}}!",
      greeting: "Dear {{EmployeeName}},",
      body: "We are thrilled to welcome you to {{CompanyName}} as our new {{Designation}} in the {{Department}} department.\n\nYour employee account has been created. You can log in to the Prolync HR Management Portal using the credentials below to complete your onboarding process.",
      cta_text: "Log In to HR Portal",
      cta_url: "{{PortalLink}}",
      footer_text: "Need assistance? Contact our HR team at {{SupportEmail}}.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-2",
      code: "EMPLOYEE_ONBOARDING",
      name: "Employee Onboarding Profile Completion",
      category: "Onboarding",
      subject: "Action Required: Complete Your HR Onboarding Profile – {{CompanyName}}",
      heading: "Complete Your Onboarding Documentation",
      greeting: "Hello {{FirstName}},",
      body: "Welcome to {{CompanyName}}! To complete your official employment onboarding, please log in to the Prolync Portal and upload your mandatory verification documents including Aadhaar Card, PAN Card, Bank Account Details, and Educational Certificates.",
      cta_text: "Complete Onboarding Now",
      cta_url: "{{PortalLink}}/onboarding",
      footer_text: "Mandatory documents must be verified within 3 days of joining.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-3",
      code: "PASSWORD_RESET",
      name: "Password Reset Request",
      category: "Security",
      subject: "Security Alert: Password Reset Authorization – {{CompanyName}}",
      heading: "Password Reset Request",
      greeting: "Dear {{EmployeeName}},",
      body: "We received a request to reset your password for your {{CompanyName}} employee account ({{EmployeeID}}).\n\nIf you initiated this request, please click the button below to set a new secure password. This link is valid for 15 minutes.",
      cta_text: "Reset Your Password",
      cta_url: "{{ResetLink}}",
      footer_text: "If you did not request a password reset, please notify security immediately at {{SupportEmail}}.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-4",
      code: "OTP_VERIFICATION",
      name: "OTP Verification Passcode",
      category: "Security",
      subject: "Your Security OTP Passcode for {{CompanyName}} Authorization",
      heading: "One-Time Authorization Code",
      greeting: "Hello {{FirstName}},",
      body: "Your One-Time Passcode (OTP) for authentication into the Prolync Portal is:\n\n<strong style='font-size: 24px; color: #0891b2; font-family: monospace;'>{{OTP}}</strong>\n\nThis OTP is confidential and expires in 5 minutes.",
      cta_text: "Verify Passcode",
      cta_url: "{{PortalLink}}",
      footer_text: "Never share your OTP with anyone.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-5",
      code: "LEAVE_APPROVAL",
      name: "Leave Request Approved",
      category: "Leave Management",
      subject: "Leave Request Approved – {{CompanyName}}",
      heading: "Your Leave Request is Approved!",
      greeting: "Dear {{FirstName}},",
      body: "Your leave application submitted for employee ID {{EmployeeID}} has been reviewed and APPROVED by your reporting manager and HR department.\n\nYour annual leave balances have been updated automatically in the system.",
      cta_text: "View Leave Calendar",
      cta_url: "{{PortalLink}}/leaves",
      footer_text: "Have a restful break!",
      active: true,
      is_default: true
    },
    {
      id: "tpl-6",
      code: "LEAVE_REJECTION",
      name: "Leave Request Rejected",
      category: "Leave Management",
      subject: "Update on Your Leave Request – {{CompanyName}}",
      heading: "Leave Request Status Update",
      greeting: "Dear {{FirstName}},",
      body: "Regrettably, your submitted leave request could not be approved at this time due to operational requirements. Please check the portal for feedback or discuss alternative dates with your manager {{ManagerName}}.",
      cta_text: "Check Request Details",
      cta_url: "{{PortalLink}}/leaves",
      footer_text: "For questions, contact your manager or HR team.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-7",
      code: "DOC_VERIFICATION",
      name: "Document Verification Status",
      category: "HR Operations",
      subject: "Document Verification Update – {{CompanyName}}",
      heading: "HR Document Audit Status",
      greeting: "Dear {{EmployeeName}},",
      body: "Your submitted onboarding document has been audited by the HR Governance Team. Your automated onboarding score is now updated in the system.",
      cta_text: "View Document Vault",
      cta_url: "{{PortalLink}}/documents",
      footer_text: "Ensure all mandatory documents remain up to date.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-8",
      code: "PAYROLL_NOTIF",
      name: "Monthly Salary Payslip Available",
      category: "Payroll",
      subject: "Monthly Salary Payslip Available – {{CompanyName}}",
      heading: "Your Payslip Statement is Ready",
      greeting: "Dear {{EmployeeName}},",
      body: "Your monthly salary payslip statement for the recent period has been processed by Payroll and is now available for download in the Prolync Portal.",
      cta_text: "Download Printable Payslip",
      cta_url: "{{PortalLink}}/payroll",
      footer_text: "This document is confidential.",
      active: true,
      is_default: true
    },
    {
      id: "tpl-9",
      code: "OFFER_LETTER",
      name: "Employment Offer Letter",
      category: "Recruitment",
      subject: "Official Offer of Employment – {{CompanyName}}",
      heading: "Employment Offer Letter",
      greeting: "Dear {{EmployeeName}},",
      body: "We are pleased to extend an offer of employment for the position of {{Designation}} at {{CompanyName}}.\n\nPlease review the offer letter agreement and confirm your acceptance.",
      cta_text: "Review & Sign Offer Letter",
      cta_url: "{{PortalLink}}/offer",
      footer_text: "We look forward to welcoming you to {{CompanyName}}!",
      active: true,
      is_default: true
    }
  ]

};

export function getData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) {
      console.error("Error parsing data.json, falling back to initial data:", e);
    }
  }
  saveData(initialData);
  return initialData;
}

export function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
