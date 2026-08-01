import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'prolync_hrms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
};

let pool = null;
let isConnected = false;

// Initialize Connection Pool & Test
export async function initMySQLPool() {
  try {
    // 1. Check if MySQL server is reachable (connect without DB name to create DB if needed)
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConnection.end();

    // 2. Initialize Pool with database target
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    connection.release();

    isConnected = true;
    console.log(`✅ [MySQL DB]: Successfully connected to MySQL database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    await setupTables();
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`⚠️ [MySQL DB]: Could not connect to MySQL at ${dbConfig.host}:${dbConfig.port} (${error.message}).`);
    console.warn(`ℹ️ [Fallback Engine]: Application will operate seamlessly using structured JSON storage.`);
    return false;
  }
}

// Auto-create MySQL Tables and Seed Initial 6 Core Team Members
async function setupTables() {
  if (!pool || !isConnected) return;

  try {
    // Company Settings Table
    await pool.query(`
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
        radius_meters INT DEFAULT 50
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Users (Employees) Table
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Attendance Logs Table
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Check if Users table is empty; if so, seed core 6 team members
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      const seedUsers = [
        ['u-1', 'EMP-1001', 'Rahul Kannan', 'rahul@prolync.in', 'SUPER_ADMIN', 'CEO & Founder', 'Executive & Leadership', 'Chennai HQ', 'Chennai HQ', 180000],
        ['u-2', 'EMP-1002', 'Sarah Jenkins', 'hr@prolync.com', 'HR', 'Head of HR & Operations', 'Human Resources', 'Chennai HQ', 'Chennai HQ', 85000],
        ['u-3', 'EMP-1003', 'Mugilan S', 'mugilan@prolync.com', 'MANAGER', 'Principal Engineering Lead', 'Engineering & Operations', 'Bengaluru Tech Park', 'Bengaluru Tech Park', 110000],
        ['u-4', 'EMP-1004', 'Balakrishnan (Bala)', 'bala@prolync.com', 'FULL_TIME', 'Senior Full-Stack Developer', 'Engineering & Operations', 'Bengaluru Tech Park', 'Bengaluru Tech Park', 75000],
        ['u-5', 'EMP-1005', 'Mohammed Muzzammil S', 'muzzammil@prolync.in', 'INTERN', 'Software Engineer Intern', 'Engineering & Operations', 'Chennai HQ', 'Chennai HQ', 35000],
        ['u-6', 'EMP-1006', 'Sivathanu (Sivath)', 'sivath@prolync.com', 'FULL_TIME', 'Software Development Engineer', 'Engineering & Operations', 'Chennai HQ', 'Chennai HQ', 65000]
      ];

      for (const u of seedUsers) {
        await pool.query(
          `INSERT INTO users (id, employee_id, name, email, role, title, department, branch, office_location, salary_base, password)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Prolync')
           ON DUPLICATE KEY UPDATE name=VALUES(name)`,
          u
        );
      }
      console.log('✅ [MySQL DB]: Seeded initial 6 core team members into MySQL "users" table.');
    }

  } catch (err) {
    console.error('❌ [MySQL DB]: Error creating tables:', err.message);
  }
}

// Execute Raw SQL Query
export async function querySQL(sql, params = []) {
  if (!pool || !isConnected) return null;
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (err) {
    console.error('❌ [MySQL DB Query Error]:', err.message);
    throw err;
  }
}

export function isMySQLConnected() {
  return isConnected;
}
