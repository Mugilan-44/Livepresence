-- =========================================================================
-- PROLYNC MANAGEMENT SUITE - ENTERPRISE MYSQL DATABASE SCHEMA
-- Database: prolync_hrms
-- =========================================================================

CREATE DATABASE IF NOT EXISTS prolync_hrms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE prolync_hrms;

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
  radius_meters INT DEFAULT 50,
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
  lead VARCHAR(255) DEFAULT NULL,
  budget VARCHAR(100) DEFAULT '₹15,00,000',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. OFFICE LOCATIONS
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

-- 6. USERS (EMPLOYEES)
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
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  ifsc_swift VARCHAR(50),
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

-- 7. ATTENDANCE LOGS
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
  INDEX idx_check_in (check_in)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. LEAVE TYPES
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

-- 9. LEAVE REQUESTS
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
  status VARCHAR(50) DEFAULT 'Pending',
  reviewed_by VARCHAR(255) DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leave_user (user_id),
  INDEX idx_leave_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. LEAVE BALANCES
CREATE TABLE IF NOT EXISTS leave_balances (
  user_id VARCHAR(50) PRIMARY KEY,
  casual INT DEFAULT 12,
  sick INT DEFAULT 10,
  earned INT DEFAULT 15,
  comp_off INT DEFAULT 2,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. PAYROLL RECORDS
CREATE TABLE IF NOT EXISTS payroll_records (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  role VARCHAR(50),
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. PROJECTS & TASKS
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  client VARCHAR(255),
  department VARCHAR(100),
  budget VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Active',
  progress_pct INT DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(50) PRIMARY KEY,
  project_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  assigned_to VARCHAR(50),
  assigned_to_name VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'Medium',
  status VARCHAR(50) DEFAULT 'In Progress',
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  actor VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  target VARCHAR(255),
  details TEXT,
  ip VARCHAR(50) DEFAULT '192.168.1.1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. SMTP CONFIG
CREATE TABLE IF NOT EXISTS smtp_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  host VARCHAR(255) DEFAULT 'smtp.gmail.com',
  port INT DEFAULT 587,
  secure TINYINT(1) DEFAULT 0,
  user VARCHAR(255) DEFAULT 'notifications@prolync.in',
  pass VARCHAR(255) DEFAULT '',
  sender_name VARCHAR(255) DEFAULT 'Prolync HR System',
  sender_email VARCHAR(255) DEFAULT 'notifications@prolync.in',
  enabled TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================================
-- SEED INITIAL CORE TEAM (6 REAL USERS)
-- =========================================================================

INSERT INTO company_settings (id, company_name, tax_id, headquarters, currency, fiscal_year, office_name, latitude, longitude, radius_meters)
VALUES (1, 'Prolync Infotech Pvt. Ltd.', 'GSTIN33AAACN1298E1Z4', 'Kilambakkam, Vandalur, Tamil Nadu - 603210, India', 'INR (₹)', '2026-2027', 'Prolync HQ (Vandalur, Tamil Nadu)', 12.871133, 80.083898, 50)
ON DUPLICATE KEY UPDATE company_name=VALUES(company_name);

INSERT INTO users (id, employee_id, name, email, role, title, department, branch, office_location, gender, dob, blood_group, mobile, emergency_contact, address, joining_date, employment_status, salary_base, bank_name, bank_account, ifsc_swift, profile_score, verified_employee, password)
VALUES 
('u-1', 'EMP-1001', 'Rahul Kannan', 'rahul@prolync.in', 'SUPER_ADMIN', 'CEO & Founder', 'Executive & Leadership', 'Chennai HQ', 'Chennai HQ', 'Male', '1988-04-12', 'O+', '+91 98402 91823', '+91 98402 99999 (Spouse)', 'Kilambakkam, Vandalur, Chennai, Tamil Nadu - 603210', '2020-01-01', 'Active', 180000, 'HDFC Bank Ltd.', '•••• •••• 8842', 'HDFC0001928', 100, 1, 'Prolync'),
('u-2', 'EMP-1002', 'Sarah Jenkins', 'hr@prolync.com', 'HR', 'Head of HR & Operations', 'Human Resources', 'Chennai HQ', 'Chennai HQ', 'Female', '1991-08-23', 'A+', '+91 98401 88422', '+91 98401 88888 (Father)', 'Prolync Hub, Chennai, Tamil Nadu', '2021-03-15', 'Active', 85000, 'ICICI Bank Ltd.', '•••• •••• 1928', 'ICIC0000492', 100, 1, 'Prolync'),
('u-3', 'EMP-1003', 'Mugilan S', 'mugilan@prolync.com', 'MANAGER', 'Principal Engineering Lead', 'Engineering & Operations', 'Bengaluru Tech Park', 'Bengaluru Tech Park', 'Male', '1990-11-05', 'B+', '+91 98400 77311', '+91 98400 77777 (Spouse)', 'Silicon Valley Hub, Bengaluru, Karnataka', '2021-06-01', 'Active', 110000, 'State Bank of India (SBI)', '•••• •••• 5519', 'SBIN0004412', 98, 1, 'Prolync'),
('u-4', 'EMP-1004', 'Balakrishnan (Bala)', 'bala@prolync.com', 'FULL_TIME', 'Senior Full-Stack Developer', 'Engineering & Operations', 'Bengaluru Tech Park', 'Bengaluru Tech Park', 'Male', '1993-02-17', 'O-', '+91 98399 66900', '+91 98399 11111 (Mother)', 'Bengaluru Tech Hub, Karnataka', '2022-09-10', 'Active', 75000, 'Axis Bank Ltd.', '•••• •••• 4402', 'UTIB0000109', 95, 1, 'Prolync'),
('u-5', 'EMP-1005', 'Mohammed Muzzammil S', 'muzzammil@prolync.in', 'INTERN', 'Software Engineer Intern', 'Engineering & Operations', 'Chennai HQ', 'Chennai HQ', 'Male', '2002-09-30', 'AB+', '+91 98398 55844', '+91 98398 22222 (Father)', 'Vandalur, Chennai, Tamil Nadu - 603210', '2026-01-15', 'Active', 35000, 'Kotak Mahindra Bank', '•••• •••• 7712', 'KKBK0000881', 100, 1, 'Prolync'),
('u-6', 'EMP-1006', 'Sivathanu (Sivath)', 'sivath@prolync.com', 'FULL_TIME', 'Software Development Engineer', 'Engineering & Operations', 'Chennai HQ', 'Chennai HQ', 'Male', '1997-06-14', 'B+', '+91 98397 44321', '+91 98397 33333 (Father)', 'Chennai Vandalur Hub, Tamil Nadu', '2023-04-01', 'Active', 65000, 'HDFC Bank Ltd.', '•••• •••• 9921', 'HDFC0001882', 92, 1, 'Prolync')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO leave_balances (user_id, casual, sick, earned, comp_off)
VALUES 
('u-1', 12, 10, 15, 2),
('u-2', 12, 10, 15, 2),
('u-3', 12, 10, 15, 2),
('u-4', 12, 10, 15, 2),
('u-5', 12, 10, 15, 2),
('u-6', 12, 10, 15, 2)
ON DUPLICATE KEY UPDATE casual=VALUES(casual);
