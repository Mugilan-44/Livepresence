-- =========================================================================
-- PROLYNC MANAGEMENT SUITE - PRODUCTION MYSQL DATABASE SCHEMA
-- Database: railway (or prolync_hrms)
-- =========================================================================

-- 1. COMPANY SETTINGS
CREATE TABLE IF NOT EXISTS company_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL DEFAULT 'Prolync Infotech Pvt. Ltd.',
  tax_id VARCHAR(100) DEFAULT 'GSTIN33AAACN1298E1Z4',
  headquarters TEXT,
  currency VARCHAR(20) DEFAULT 'INR (₹)',
  fiscal_year VARCHAR(50) DEFAULT '2026-2027',
  office_name VARCHAR(255) DEFAULT 'Prolync HQ (Vandalur, Tamil Nadu)',
  latitude DECIMAL(10, 8) DEFAULT 12.871133,
  longitude DECIMAL(11, 8) DEFAULT 80.083898,
  radius_meters INT DEFAULT 200,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  employees_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  `lead` VARCHAR(255) DEFAULT NULL,
  budget VARCHAR(100) DEFAULT '₹15,00,000',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_code VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. OFFICE LOCATIONS
CREATE TABLE IF NOT EXISTS office_locations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  time_zone VARCHAR(100) DEFAULT 'IST (UTC+05:30)',
  weekly_off_pattern VARCHAR(100) DEFAULT 'Saturday & Sunday',
  branch_code VARCHAR(50),
  description TEXT,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. USERS (EMPLOYEES)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  department VARCHAR(255),
  manager_id VARCHAR(50) DEFAULT NULL,
  branch VARCHAR(255),
  office_location VARCHAR(255),
  gender VARCHAR(20),
  dob DATE,
  blood_group VARCHAR(10),
  mobile VARCHAR(50),
  emergency_contact VARCHAR(255),
  address TEXT,
  joining_date DATE,
  employment_status VARCHAR(50) DEFAULT 'Active',
  salary_base INT DEFAULT 65000,
  pay_type VARCHAR(20) DEFAULT 'PAID',
  internship_months INT DEFAULT NULL,
  shift_timing VARCHAR(100) DEFAULT 'General shift (09:00 AM - 07:00 PM)',
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  ifsc_swift VARCHAR(50),
  aadhaar_number VARCHAR(20),
  pan_number VARCHAR(20),
  profile_score INT DEFAULT 100,
  verified_employee TINYINT(1) DEFAULT 1,
  password VARCHAR(255) NOT NULL DEFAULT 'Prolync',
  avatar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_employee_id (employee_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. ATTENDANCE LOGS
CREATE TABLE IF NOT EXISTS attendance_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  role VARCHAR(50),
  department VARCHAR(255),
  check_in DATETIME NOT NULL,
  check_out DATETIME DEFAULT NULL,
  shift_timing VARCHAR(100) DEFAULT '09:00 AM - 07:00 PM',
  working_hours VARCHAR(50) DEFAULT 'Active Shift',
  break_hours VARCHAR(50) DEFAULT '0 hrs',
  on_break TINYINT(1) DEFAULT 0,
  break_start_time DATETIME DEFAULT NULL,
  break_duration_mins INT DEFAULT 0,
  late_arrival TINYINT(1) DEFAULT 0,
  early_exit TINYINT(1) DEFAULT 0,
  overtime VARCHAR(50) DEFAULT '0 hrs',
  check_in_location TEXT,
  check_out_location TEXT,
  office_location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_meters INT DEFAULT 0,
  status VARCHAR(100) DEFAULT 'Present',
  verification_type VARCHAR(255) DEFAULT 'Zero-Proxy GPS (50m Office Location)',
  ip_address VARCHAR(50) DEFAULT '192.168.1.45',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_check_in (check_in),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. LEAVE TYPES
CREATE TABLE IF NOT EXISTS leave_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  total_days_per_year INT DEFAULT 12,
  carry_forward TINYINT(1) DEFAULT 0,
  max_carry_forward INT DEFAULT 0,
  requires_approval TINYINT(1) DEFAULT 1,
  requires_medical TINYINT(1) DEFAULT 0,
  paid TINYINT(1) DEFAULT 1,
  active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  role VARCHAR(50),
  department VARCHAR(255),
  leave_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INT DEFAULT 1,
  reason TEXT,
  attachment TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  reviewed_by VARCHAR(255) DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leave_user (user_id),
  INDEX idx_leave_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. LEAVE BALANCES
CREATE TABLE IF NOT EXISTS leave_balances (
  user_id VARCHAR(50) PRIMARY KEY,
  casual INT DEFAULT 12,
  sick INT DEFAULT 10,
  earned INT DEFAULT 15,
  comp_off INT DEFAULT 2,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. LEAVE POLICY
CREATE TABLE IF NOT EXISTS leave_policy (
  id INT AUTO_INCREMENT PRIMARY KEY,
  yearly_casual INT DEFAULT 12,
  yearly_sick INT DEFAULT 10,
  yearly_earned INT DEFAULT 15,
  yearly_comp_off INT DEFAULT 2,
  carry_forward_limit INT DEFAULT 5,
  auto_approve_days INT DEFAULT 1,
  require_medical_proof_days INT DEFAULT 3,
  notice_period_days INT DEFAULT 2,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) DEFAULT 'Super Admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. HOLIDAYS
CREATE TABLE IF NOT EXISTS holidays (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  day VARCHAR(20) DEFAULT 'Monday',
  type VARCHAR(50) DEFAULT 'National Holiday',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  client VARCHAR(255) DEFAULT 'Prolync Global',
  department VARCHAR(100),
  budget VARCHAR(100) DEFAULT '₹10,00,000',
  status VARCHAR(50) DEFAULT 'Active',
  progress_pct INT DEFAULT 0,
  deadline DATE,
  `lead` VARCHAR(255) DEFAULT 'Mugilan S',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. PROJECT MEMBERS
CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  role_in_project VARCHAR(50) DEFAULT 'Member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(50) PRIMARY KEY,
  project_id VARCHAR(50),
  project_title VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  assigned_to VARCHAR(50),
  assigned_to_name VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'Medium',
  status VARCHAR(50) DEFAULT 'To Do',
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_project (project_id),
  INDEX idx_task_assignee (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DAILY TASKS (standalone work outside project delivery)
CREATE TABLE IF NOT EXISTS daily_tasks (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  assigned_to VARCHAR(50) NOT NULL,
  assigned_to_name VARCHAR(255) NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_by_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_daily_task_assignee (assigned_to),
  INDEX idx_daily_task_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_task_completions (
  task_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Completed',
  completed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (task_id, user_id),
  INDEX idx_daily_task_completion_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. WORK LOGS
CREATE TABLE IF NOT EXISTS work_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  project_title VARCHAR(255),
  task_title VARCHAR(255),
  hours_spent DECIMAL(5, 2) DEFAULT 8.00,
  summary TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. PAYROLL RECORDS
CREATE TABLE IF NOT EXISTS payroll_records (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  employee_id VARCHAR(50),
  role VARCHAR(50),
  department VARCHAR(255),
  month_year VARCHAR(50) NOT NULL,
  basic INT NOT NULL,
  hra INT NOT NULL,
  bonus INT DEFAULT 0,
  allowances INT DEFAULT 0,
  pf_deduction INT DEFAULT 0,
  esi_deduction INT DEFAULT 0,
  tax_tds INT DEFAULT 0,
  gross_salary INT NOT NULL,
  net_salary INT NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'Paid',
  payment_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. USER DOCUMENTS
CREATE TABLE IF NOT EXISTS user_documents (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  role VARCHAR(50),
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size VARCHAR(50) DEFAULT '500 KB',
  file_url LONGTEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  is_encrypted TINYINT(1) DEFAULT 1,
  encryption_algorithm VARCHAR(100) DEFAULT 'AES-256-GCM-SHA256',
  security_clearance VARCHAR(100) DEFAULT 'PRIVATE_RESTRICTED',
  feedback_notes TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  priority VARCHAR(50) DEFAULT 'Normal',
  author VARCHAR(255) DEFAULT 'HR Team',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. COMPANY EVENTS / MEETINGS
CREATE TABLE IF NOT EXISTS company_events (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100) DEFAULT 'Holiday',
  date DATE NOT NULL,
  time VARCHAR(50) DEFAULT '10:00 AM',
  location VARCHAR(255) DEFAULT 'Main Conference Room / Online',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. PASSWORD RESETS / OTP RECORDS
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  token_hash CHAR(64) NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_code (email, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 24. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  actor VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  target VARCHAR(255),
  details TEXT,
  ip VARCHAR(50) DEFAULT '192.168.1.1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 25. EMAIL LOGS
CREATE TABLE IF NOT EXISTS email_logs (
  id VARCHAR(50) PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL,
  template VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at DATETIME NOT NULL,
  details TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 26. SMTP CONFIG
CREATE TABLE IF NOT EXISTS smtp_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  host VARCHAR(255) DEFAULT 'smtp.hostinger.com',
  port INT DEFAULT 465,
  secure TINYINT(1) DEFAULT 1,
  user VARCHAR(255) DEFAULT 'careers@prolync.in',
  pass VARCHAR(255) DEFAULT '',
  sender_name VARCHAR(255) DEFAULT 'Prolync LiveSpace',
  sender_email VARCHAR(255) DEFAULT 'careers@prolync.in',
  enabled TINYINT(1) DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 27. MENUS
CREATE TABLE IF NOT EXISTS menus (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  icon VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  roles JSON NOT NULL,
  enabled TINYINT(1) DEFAULT 1,
  menu_order INT DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 28. PORTAL CUSTOMIZATIONS
CREATE TABLE IF NOT EXISTS customizations (
  id INT PRIMARY KEY DEFAULT 1,
  theme VARCHAR(50) DEFAULT 'dark',
  primary_color VARCHAR(50) DEFAULT '#4F46E5',
  logo_url TEXT,
  portal_title VARCHAR(255) DEFAULT 'Prolync LivePresence',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 29. COLLABORATION CHANNELS AND MESSAGES
CREATE TABLE IF NOT EXISTS channels (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'channel',
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS channel_members (
  channel_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(50) PRIMARY KEY,
  channel_id VARCHAR(50) NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  parent_id VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS message_reactions (
  id VARCHAR(50) PRIMARY KEY,
  message_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  emoji VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 30. SAVED REPORTS, CALENDAR AND APPROVED HOME WORK
CREATE TABLE IF NOT EXISTS saved_reports (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  filters TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time VARCHAR(20),
  type VARCHAR(50) DEFAULT 'Team event',
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS home_work_sessions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  work_date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  reason TEXT,
  work_kind VARCHAR(50) DEFAULT 'Remote extension',
  status VARCHAR(30) DEFAULT 'Pending',
  reviewed_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job_roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(50) PRIMARY KEY,
  theme VARCHAR(30) DEFAULT 'paper',
  accent VARCHAR(30) DEFAULT 'blue',
  density VARCHAR(30) DEFAULT 'comfortable',
  quiet_hours VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
