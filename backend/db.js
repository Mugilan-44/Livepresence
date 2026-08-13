import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let localDb = null;
const localDatabaseFile = path.join(__dirname, '.prolync-local.sqlite');

// Resolve Database Connection Details dynamically from environment variables
function getDbConfig() {
  const uri = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
  // If URI is available and does NOT use internal railway domain outside railway, use URI
  if (uri && (!uri.includes('.railway.internal') || process.env.RAILWAY_ENVIRONMENT)) {
    return {
      uri: uri,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true
    };
  }

  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST_PUBLIC || process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT_PUBLIC || process.env.MYSQLPORT || '3306', 10),
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
  };
}

let pool = null;
let isConnected = false;

/**
 * Initialize MySQL Connection Pool and ensure required database & tables exist.
 */
export async function initMySQLPool() {
  if (process.env.LOCAL_DB === 'true') return initLocalDatabase();
  const config = getDbConfig();

  try {
    if (config.uri) {
      pool = mysql.createPool(config.uri);
    } else {
      try {
        const tempConn = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password
        });
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await tempConn.end();
      } catch (dbCreateErr) {
        // Ignore if user lacks permissions to create DB directly
      }

      pool = mysql.createPool(config);
    }

    // Test connection
    const conn = await pool.getConnection();
    conn.release();

    isConnected = true;
    const hostInfo = config.uri ? 'Connection URI' : `${config.host}:${config.port}/${config.database}`;
    console.log(`✅ [MySQL DB]: Successfully connected to MySQL database at ${hostInfo}`);

    await setupTables();
    return true;
  } catch (error) {
    isConnected = false;
    console.error(`❌ [MySQL DB Connection Failure]: Unable to connect to MySQL at ${config.host || 'URI'}:${config.port || ''} (${error.message}).`);
    if (error.message.includes('ENOTFOUND') && (config.host || '').includes('.railway.internal')) {
      console.error(`💡 [CONFIG TIP]: "mysql.railway.internal" is only accessible INSIDE Railway. Since backend is on Render, use Railway's Public Networking Host (e.g. *.proxy.rlwy.net) & Port.`);
    }
    return false;
  }
}

/**
 * Execute Parameterized SQL Query with Prepared Statements
 */
export async function querySQL(sql, params = []) {
  if (localDb) return queryLocal(sql, params);
  if (!pool) {
    throw new Error('MySQL Database Pool is not initialized. Check DB_HOST and DB_PORT settings.');
  }
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (err) {
    console.error('❌ [MySQL Query Execution Error]:', err.message, '| SQL:', sql);
    throw err;
  }
}

/**
 * Execute Database Transaction
 */
export async function executeTransaction(callback) {
  if (localDb) {
    localDb.run('BEGIN');
    try {
      const result = await callback({ query: async (sql, params = []) => [queryLocal(sql, params)] });
      localDb.run('COMMIT');
      return result;
    } catch (err) {
      localDb.run('ROLLBACK');
      throw err;
    }
  }
  if (!pool) throw new Error('MySQL Database Pool is not initialized.');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    console.error('❌ [MySQL Transaction Rollback Error]:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

export function isMySQLConnected() {
  return isConnected;
}

function toSQLite(sql) {
  return sql
    .replace(/ON DUPLICATE KEY UPDATE[\s\S]*$/i, '')
    .replace(/\bCURDATE\(\)/gi, "date('now')")
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    .replace(/\bJSON\b/gi, 'TEXT');
}

function queryLocal(sql, params = []) {
  const statement = toSQLite(sql).trim();
  if (/^SELECT/i.test(statement)) {
    const prepared = localDb.prepare(statement);
    prepared.bind(params);
    const rows = [];
    while (prepared.step()) rows.push(prepared.getAsObject());
    prepared.free();
    return rows;
  }
  localDb.run(statement, params);
  saveLocalDatabase();
  return [];
}

function saveLocalDatabase() {
  if (localDb) fs.writeFileSync(localDatabaseFile, Buffer.from(localDb.export()));
}

async function initLocalDatabase() {
  const SQL = await initSqlJs();
  localDb = fs.existsSync(localDatabaseFile) ? new SQL.Database(fs.readFileSync(localDatabaseFile)) : new SQL.Database();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    .replace(/--[^\n]*/g, '')
    .replace(/,\s*INDEX\s+\w+\s*\([^)]*\)/gi, '')
    .replace(/\bINT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\bAUTO_INCREMENT\b/gi, 'AUTOINCREMENT')
    .replace(/\s+ON UPDATE CURRENT_TIMESTAMP/gi, '')
    .replace(/\)\s*ENGINE=[^;]+;/gi, ');');
  localDb.run(schema);
  try { localDb.run("ALTER TABLE home_work_sessions ADD COLUMN work_kind VARCHAR(50) DEFAULT 'Remote extension'"); } catch { /* existing local database already migrated */ }
  for (const column of [
    "ALTER TABLE users ADD COLUMN pay_type VARCHAR(20) DEFAULT 'PAID'",
    'ALTER TABLE users ADD COLUMN internship_months INT DEFAULT NULL',
    "ALTER TABLE users ADD COLUMN shift_timing VARCHAR(100) DEFAULT 'General shift (09:00 AM - 07:00 PM)'",
    'ALTER TABLE users ADD COLUMN aadhaar_number VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN pan_number VARCHAR(20) DEFAULT NULL'
  ]) { try { localDb.run(column); } catch { /* existing local database already migrated */ } }
  localDb.run(`CREATE TABLE IF NOT EXISTS daily_task_completions (
    task_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Completed',
    completed_at DATETIME DEFAULT NULL,
    PRIMARY KEY (task_id, user_id)
  )`);
  seedLocalDatabase();
  isConnected = true;
  console.log('✅ [Local DB]: SQLite-compatible project database is ready.');
  saveLocalDatabase();
  process.on('exit', saveLocalDatabase);
  return true;
}

function seedLocalDatabase() {
  if (queryLocal('SELECT COUNT(*) AS count FROM users')[0].count) return;
  const users = [
    ['u-1', 'EMP-1001', 'Rahul Kannan', 'rahul@prolync.in', 'SUPER_ADMIN', 'CEO & Founder', 'Executive & Leadership'],
    ['u-2', 'EMP-1002', 'Sarah Jenkins', 'hr@prolync.com', 'HR', 'Head of HR & Operations', 'Human Resources'],
    ['u-3', 'EMP-1003', 'Mugilan S', 'mugilan@prolync.in', 'MANAGER', 'Principal Engineering Lead', 'Engineering & Operations'],
    ['u-4', 'EMP-1004', 'Balakrishnan (Bala)', 'bala@prolync.com', 'FULL_TIME', 'Senior Full-Stack Developer', 'Engineering & Operations'],
    ['u-5', 'EMP-1005', 'Mohammed Muzzammil S', 'muzzammil@prolync.in', 'INTERN', 'Software Engineer Intern', 'Engineering & Operations'],
    ['u-6', 'EMP-1006', 'Sivathanu (Sivath)', 'sivath@prolync.com', 'FULL_TIME', 'Software Development Engineer', 'Engineering & Operations']
  ];
  for (const user of users) {
    queryLocal('INSERT INTO users (id, employee_id, name, email, role, title, department, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [...user, 'Prolync']);
    queryLocal('INSERT INTO leave_balances (user_id, casual, sick, earned, comp_off) VALUES (?, 12, 10, 15, 2)', [user[0]]);
  }
  queryLocal("INSERT INTO company_settings (id, company_name, headquarters) VALUES (1, 'Prolync Infotech Pvt. Ltd.', 'Kilambakkam, Vandalur, Tamil Nadu - 603210, India')");
  queryLocal("INSERT INTO leave_policy (id, yearly_casual, yearly_sick, yearly_earned, yearly_comp_off) VALUES (1, 12, 10, 15, 2)");
}

/**
 * Auto-create required database tables and seed initial default data safely if tables are empty.
 */
async function setupTables() {
  if (!pool) return;

  try {
    // 1. Company Settings
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
        radius_meters INT DEFAULT 200,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Branches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        employees_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Departments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        \`lead\` VARCHAR(255) DEFAULT NULL,
        budget VARCHAR(100) DEFAULT '₹15,00,000',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Roles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Office Locations
    await pool.query(`
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
    `);

    // 6. Users (Employees)
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
    `);

    // 7. Attendance Logs
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_check_in (check_in)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 8. Leave Types
    await pool.query(`
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
    `);

    // 9. Leave Requests
    await pool.query(`
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
        INDEX idx_leave_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 10. Leave Balances
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        user_id VARCHAR(50) PRIMARY KEY,
        casual INT DEFAULT 12,
        sick INT DEFAULT 10,
        earned INT DEFAULT 15,
        comp_off INT DEFAULT 2,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 11. Leave Policy
    await pool.query(`
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
    `);

    // 12. Holidays
    await pool.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        day VARCHAR(20) DEFAULT 'Monday',
        type VARCHAR(50) DEFAULT 'National Holiday',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 13. Projects
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        client VARCHAR(255) DEFAULT 'Prolync Global',
        department VARCHAR(100),
        budget VARCHAR(100) DEFAULT '₹10,00,000',
        status VARCHAR(50) DEFAULT 'Active',
        progress_pct INT DEFAULT 0,
        deadline DATE,
        \`lead\` VARCHAR(255) DEFAULT 'Mugilan S',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 14. Tasks
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
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
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_task_completions (
        task_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Completed',
        completed_at DATETIME DEFAULT NULL,
        PRIMARY KEY (task_id, user_id),
        INDEX idx_daily_task_completion_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 15. Work Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_logs (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(255),
        project_title VARCHAR(255),
        task_title VARCHAR(255),
        hours_spent DECIMAL(5, 2) DEFAULT 8.00,
        summary TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 16. Payroll Records
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 17. User Documents
    await pool.query(`
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
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 18. Announcements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        priority VARCHAR(50) DEFAULT 'Normal',
        author VARCHAR(255) DEFAULT 'HR Team',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 19. Company Events / Meetings
    await pool.query(`
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
    `);

    // 20. Notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 21. Password Resets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        token_hash CHAR(64) NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try { await pool.query('ALTER TABLE password_resets ADD COLUMN token_hash CHAR(64) NULL'); } catch { /* existing database already migrated */ }

    // 22. Audit Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        actor VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        target VARCHAR(255),
        details TEXT,
        ip VARCHAR(50) DEFAULT '192.168.1.1'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 23. Email Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id VARCHAR(50) PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        template VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        sent_at DATETIME NOT NULL,
        details TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 24. SMTP Config
    await pool.query(`
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
    `);

    // 25. Menus
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menus (
        id VARCHAR(50) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        icon VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        roles JSON NOT NULL,
        enabled TINYINT(1) DEFAULT 1,
        menu_order INT DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 26. Customizations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customizations (
        id INT PRIMARY KEY DEFAULT 1,
        theme VARCHAR(50) DEFAULT 'dark',
        primary_color VARCHAR(50) DEFAULT '#4F46E5',
        logo_url TEXT,
        portal_title VARCHAR(255) DEFAULT 'Prolync LivePresence',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 27. Collaboration tables (channels, messaging, reports and personal preferences)
    const collaborationTables = [
      `CREATE TABLE IF NOT EXISTS channels (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, description VARCHAR(255), type VARCHAR(20) DEFAULT 'channel', is_private TINYINT(1) DEFAULT 0, created_by VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS channel_members (channel_id VARCHAR(50) NOT NULL, user_id VARCHAR(50) NOT NULL, joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (channel_id, user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS messages (id VARCHAR(50) PRIMARY KEY, channel_id VARCHAR(50) NOT NULL, sender_id VARCHAR(50) NOT NULL, content TEXT NOT NULL, parent_id VARCHAR(50) DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS message_reactions (id VARCHAR(50) PRIMARY KEY, message_id VARCHAR(50) NOT NULL, user_id VARCHAR(50) NOT NULL, emoji VARCHAR(20) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS saved_reports (id VARCHAR(50) PRIMARY KEY, user_id VARCHAR(50) NOT NULL, name VARCHAR(150) NOT NULL, filters TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS calendar_events (id VARCHAR(50) PRIMARY KEY, title VARCHAR(255) NOT NULL, event_date DATE NOT NULL, event_time VARCHAR(20), type VARCHAR(50) DEFAULT 'Team event', created_by VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS home_work_sessions (id VARCHAR(50) PRIMARY KEY, user_id VARCHAR(50) NOT NULL, work_date DATE NOT NULL, start_time VARCHAR(20) NOT NULL, end_time VARCHAR(20) NOT NULL, reason TEXT, work_kind VARCHAR(50) DEFAULT 'Remote extension', status VARCHAR(30) DEFAULT 'Pending', reviewed_by VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS time_permissions (id VARCHAR(50) PRIMARY KEY, user_id VARCHAR(50) NOT NULL, user_name VARCHAR(255) NOT NULL, role VARCHAR(80), department VARCHAR(255), permission_date DATE NOT NULL, permission_type VARCHAR(50) NOT NULL, requested_time VARCHAR(20) NOT NULL, reason TEXT NOT NULL, status VARCHAR(30) DEFAULT 'Pending', reviewed_by VARCHAR(255), review_note TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS job_roles (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS user_preferences (user_id VARCHAR(50) PRIMARY KEY, theme VARCHAR(30) DEFAULT 'paper', accent VARCHAR(30) DEFAULT 'aubergine', density VARCHAR(30) DEFAULT 'comfortable', quiet_hours VARCHAR(100), push_enabled TINYINT(1) DEFAULT 0, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];
    for (const statement of collaborationTables) await pool.query(statement);
    try { await pool.query('ALTER TABLE customizations ADD COLUMN leave_types JSON NULL'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE customizations ADD COLUMN task_statuses JSON NULL'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE projects ADD COLUMN created_by VARCHAR(50) NULL'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE projects ADD COLUMN created_by_name VARCHAR(255) NULL'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE tasks ADD COLUMN created_by VARCHAR(50) NULL'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE tasks ADD COLUMN created_by_name VARCHAR(255) NULL'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE work_logs ADD COLUMN founder_seen TINYINT(1) DEFAULT 0'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE work_logs ADD COLUMN founder_seen_by VARCHAR(255) NULL'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE work_logs ADD COLUMN founder_seen_at DATETIME NULL'); } catch { /* column already exists */ }
    await pool.query(`CREATE TABLE IF NOT EXISTS task_activity (id VARCHAR(50) PRIMARY KEY, task_id VARCHAR(50) NOT NULL, actor_id VARCHAR(50), actor_name VARCHAR(255), from_status VARCHAR(100), to_status VARCHAR(100), action VARCHAR(50) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    try { await pool.query("ALTER TABLE channels ADD COLUMN type VARCHAR(20) DEFAULT 'channel'"); } catch { /* column already exists */ }
    // Direct messages created before the type column existed are identified by
    // their deterministic `dm-...` name. Keep them available after migration.
    try { await pool.query("UPDATE channels SET type = 'dm' WHERE name LIKE 'dm-%' AND (type IS NULL OR type <> 'dm')"); } catch { /* no legacy channels to migrate */ }
    try { await pool.query('ALTER TABLE user_preferences ADD COLUMN push_enabled TINYINT(1) DEFAULT 0'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE users ADD COLUMN aadhaar_number VARCHAR(20) NULL'); } catch { /* column already exists */ }
    try { await pool.query('ALTER TABLE users ADD COLUMN pan_number VARCHAR(20) NULL'); } catch { /* column already exists */ }

    // Seed Data Safely (Only if users table is empty)
    const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('📦 [MySQL Seed]: Seeding default core data into empty database tables...');
      
      // Seed Company Settings
      await pool.query(`
        INSERT INTO company_settings (id, company_name, tax_id, headquarters, currency, fiscal_year, office_name, latitude, longitude, radius_meters)
        VALUES (1, 'Prolync Infotech Pvt. Ltd.', 'GSTIN33AAACN1298E1Z4', 'Kilambakkam, Vandalur, Tamil Nadu - 603210, India', 'INR (₹)', '2026-2027', 'Prolync HQ (Vandalur, Tamil Nadu)', 12.871133, 80.083898, 200)
        ON DUPLICATE KEY UPDATE company_name=VALUES(company_name);
      `);

      // Seed Users
      const seedUsers = [
        ['u-1', 'EMP-1001', 'Rahul Kannan', 'rahul@prolync.in', 'SUPER_ADMIN', 'CEO & Founder', 'Executive & Leadership', null, 'Chennai HQ', 'Chennai HQ', 'Male', '1988-04-12', 'O+', '+91 98402 91823', '+91 98402 99999 (Spouse)', 'Kilambakkam, Vandalur, Chennai, Tamil Nadu - 603210', '2020-01-01', 'Active', 180000, 'HDFC Bank Ltd.', '•••• •••• 8842', 'HDFC0001928', 100, 1, 'Prolync', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'],
        ['u-2', 'EMP-1002', 'Sarah Jenkins', 'hr@prolync.com', 'HR', 'Head of HR & Operations', 'Human Resources', null, 'Chennai HQ', 'Chennai HQ', 'Female', '1991-08-23', 'A+', '+91 98401 88422', '+91 98401 88888 (Father)', 'Prolync Hub, Chennai, Tamil Nadu', '2021-03-15', 'Active', 85000, 'ICICI Bank Ltd.', '•••• •••• 1928', 'ICIC0000492', 100, 1, 'Prolync', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'],
        ['u-3', 'EMP-1003', 'Mugilan S', 'mugilan@prolync.com', 'MANAGER', 'Principal Engineering Lead', 'Engineering & Operations', null, 'Bengaluru Tech Park', 'Bengaluru Tech Park', 'Male', '1990-11-05', 'B+', '+91 98400 77311', '+91 98400 77777 (Spouse)', 'Silicon Valley Hub, Bengaluru, Karnataka', '2021-06-01', 'Active', 110000, 'State Bank of India (SBI)', '•••• •••• 5519', 'SBIN0004412', 98, 1, 'Prolync', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'],
        ['u-4', 'EMP-1004', 'Balakrishnan (Bala)', 'bala@prolync.com', 'FULL_TIME', 'Senior Full-Stack Developer', 'Engineering & Operations', 'u-3', 'Bengaluru Tech Park', 'Bengaluru Tech Park', 'Male', '1993-02-17', 'O-', '+91 98399 66900', '+91 98399 11111 (Mother)', 'Bengaluru Tech Hub, Karnataka', '2022-09-10', 'Active', 75000, 'Axis Bank Ltd.', '•••• •••• 4402', 'UTIB0000109', 95, 1, 'Prolync', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'],
        ['u-5', 'EMP-1005', 'Mohammed Muzzammil S', 'muzzammil@prolync.in', 'INTERN', 'Software Engineer Intern', 'Engineering & Operations', 'u-3', 'Chennai HQ', 'Chennai HQ', 'Male', '2002-09-30', 'AB+', '+91 98398 55844', '+91 98398 22222 (Father)', 'Vandalur, Chennai, Tamil Nadu - 603210', '2026-01-15', 'Active', 35000, 'Kotak Mahindra Bank', '•••• •••• 7712', 'KKBK0000881', 100, 1, 'Prolync', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'],
        ['u-6', 'EMP-1006', 'Sivathanu (Sivath)', 'sivath@prolync.com', 'FULL_TIME', 'Software Development Engineer', 'Engineering & Operations', 'u-3', 'Chennai HQ', 'Chennai HQ', 'Male', '1997-06-14', 'B+', '+91 98397 44321', '+91 98397 33333 (Father)', 'Chennai Vandalur Hub, Tamil Nadu', '2023-04-01', 'Active', 65000, 'HDFC Bank Ltd.', '•••• •••• 9921', 'HDFC0001882', 92, 1, 'Prolync', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80']
      ];

      for (const u of seedUsers) {
        await pool.query(
          `INSERT INTO users (id, employee_id, name, email, role, title, department, manager_id, branch, office_location, gender, dob, blood_group, mobile, emergency_contact, address, joining_date, employment_status, salary_base, bank_name, bank_account, ifsc_swift, profile_score, verified_employee, password, avatar)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name)`,
          u
        );

        await pool.query(
          `INSERT INTO leave_balances (user_id, casual, sick, earned, comp_off)
           VALUES (?, 12, 10, 15, 2)
           ON DUPLICATE KEY UPDATE casual=VALUES(casual)`,
          [u[0]]
        );
      }

      await pool.query(`INSERT INTO branches (id, name, city, code, employees_count) VALUES ('br-1', 'Chennai HQ', 'Chennai', 'MAA-01', 4), ('br-2', 'Bengaluru Tech Park', 'Bengaluru', 'BLR-02', 2) ON DUPLICATE KEY UPDATE name=VALUES(name)`);
      await pool.query(`INSERT INTO departments (id, name, code, \`lead\`, budget) VALUES ('dept-1', 'Engineering & Operations', 'ENG', 'Mugilan S', '₹15,00,000'), ('dept-2', 'Human Resources', 'HR', 'Sarah Jenkins', '₹4,50,000'), ('dept-3', 'Executive & Leadership', 'EXEC', 'Rahul Kannan', '₹20,00,000') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
      await pool.query(`INSERT INTO leave_policy (id, yearly_casual, yearly_sick, yearly_earned, yearly_comp_off) VALUES (1, 12, 10, 15, 2) ON DUPLICATE KEY UPDATE yearly_casual=VALUES(yearly_casual)`);

      console.log('✅ [MySQL Seed]: Seeding completed successfully.');
    }
  } catch (err) {
    console.error('❌ [MySQL DB]: Error creating tables or seeding:', err.message);
  }
}
