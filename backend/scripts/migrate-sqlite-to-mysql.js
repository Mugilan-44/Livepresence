import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.resolve(__dirname, '../.prolync-local.sqlite');
const collaborationTables = [
  `CREATE TABLE IF NOT EXISTS channels (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, description VARCHAR(255), is_private TINYINT(1) DEFAULT 0, created_by VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS channel_members (channel_id VARCHAR(50) NOT NULL, user_id VARCHAR(50) NOT NULL, joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (channel_id, user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS messages (id VARCHAR(50) PRIMARY KEY, channel_id VARCHAR(50) NOT NULL, sender_id VARCHAR(50) NOT NULL, content TEXT NOT NULL, parent_id VARCHAR(50) DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS message_reactions (id VARCHAR(50) PRIMARY KEY, message_id VARCHAR(50) NOT NULL, user_id VARCHAR(50) NOT NULL, emoji VARCHAR(20) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS saved_reports (id VARCHAR(50) PRIMARY KEY, user_id VARCHAR(50) NOT NULL, name VARCHAR(150) NOT NULL, filters TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS calendar_events (id VARCHAR(50) PRIMARY KEY, title VARCHAR(255) NOT NULL, event_date DATE NOT NULL, event_time VARCHAR(20), type VARCHAR(50) DEFAULT 'Team event', created_by VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS home_work_sessions (id VARCHAR(50) PRIMARY KEY, user_id VARCHAR(50) NOT NULL, work_date DATE NOT NULL, start_time VARCHAR(20) NOT NULL, end_time VARCHAR(20) NOT NULL, reason TEXT, work_kind VARCHAR(50) DEFAULT 'Remote extension', status VARCHAR(30) DEFAULT 'Pending', reviewed_by VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS job_roles (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS user_preferences (user_id VARCHAR(50) PRIMARY KEY, theme VARCHAR(30) DEFAULT 'paper', accent VARCHAR(30) DEFAULT 'aubergine', density VARCHAR(30) DEFAULT 'comfortable', quiet_hours VARCHAR(100), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];

function rowsFromSqlite(database, table) {
  const result = database.exec(`SELECT * FROM "${table.replaceAll('"', '""')}"`)[0];
  if (!result) return [];
  return result.values.map(values => Object.fromEntries(result.columns.map((column, index) => [column, values[index]])));
}

async function migrateTable(connection, database, table) {
  const rows = rowsFromSqlite(database, table);
  if (!rows.length) return 0;
  const [mysqlColumns] = await connection.query('SHOW COLUMNS FROM ??', [table]);
  const available = new Set(mysqlColumns.map(column => column.Field));
  const primary = new Set(mysqlColumns.filter(column => column.Key === 'PRI').map(column => column.Field));
  const columns = Object.keys(rows[0]).filter(column => available.has(column));
  if (!columns.length) return 0;
  const updateColumns = columns.filter(column => !primary.has(column) && !mysqlColumns.find(item => item.Field === column)?.Extra.includes('auto_increment'));
  const sql = `INSERT INTO ?? (${columns.map(() => '??').join(', ')}) VALUES (${columns.map(() => '?').join(', ')})${updateColumns.length ? ` ON DUPLICATE KEY UPDATE ${updateColumns.map(() => '?? = VALUES(??)').join(', ')}` : ' ON DUPLICATE KEY UPDATE ' + columns[0] + ' = ' + columns[0]}`;
  for (const row of rows) {
    const values = [table, ...columns, ...columns.map(column => row[column])];
    if (updateColumns.length) values.push(...updateColumns.flatMap(column => [column, column]));
    await connection.query(sql, values);
  }
  return rows.length;
}

if (!fs.existsSync(sqlitePath)) throw new Error(`SQLite source was not found: ${sqlitePath}`);
const SQL = await initSqlJs();
const sqlite = new SQL.Database(fs.readFileSync(sqlitePath));
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: false
});

try {
  for (const statement of collaborationTables) await connection.query(statement);
  const tablesResult = sqlite.exec("SELECT name FROM sqlite_master WHERE type='table' AND name <> 'sqlite_sequence'")[0];
  const migrated = {};
  for (const [table] of tablesResult?.values || []) {
    try { migrated[table] = await migrateTable(connection, sqlite, table); }
    catch (error) { console.warn(`Skipped ${table}: ${error.message}`); }
  }
  console.log(JSON.stringify({ database: process.env.DB_NAME, migrated }));
} finally {
  await connection.end();
  sqlite.close();
}
