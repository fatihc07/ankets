import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import pg from 'pg';

let dbInstance = null;

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const pgConnectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
  const isPg = !!pgConnectionString && (pgConnectionString.startsWith('postgres://') || pgConnectionString.startsWith('postgresql://'));

  if (isPg) {
    try {
      console.log('Database: Connecting to PostgreSQL...');
      const pool = new pg.Pool({
        connectionString: pgConnectionString,
        ssl: pgConnectionString.includes('localhost') ? false : { rejectUnauthorized: false }
      });

      const formatPgQuery = (query) => {
        let index = 1;
        return query.replace(/\?/g, () => `$${index++}`);
      };

      dbInstance = {
        all: async (query, params = []) => {
          const pgQuery = formatPgQuery(query);
          const res = await pool.query(pgQuery, params);
          return res.rows;
        },
        get: async (query, params = []) => {
          const pgQuery = formatPgQuery(query);
          const res = await pool.query(pgQuery, params);
          return res.rows[0] || null;
        },
        run: async (query, params = []) => {
          const upperQuery = query.trim().toUpperCase();
          if (upperQuery.startsWith('BEGIN')) {
            await pool.query('BEGIN');
            return { lastID: null, changes: 0 };
          }
          if (upperQuery.startsWith('COMMIT')) {
            await pool.query('COMMIT');
            return { lastID: null, changes: 0 };
          }
          if (upperQuery.startsWith('ROLLBACK')) {
            await pool.query('ROLLBACK');
            return { lastID: null, changes: 0 };
          }

          let pgQuery = formatPgQuery(query);
          if (upperQuery.startsWith('INSERT') && !upperQuery.includes('RETURNING')) {
            pgQuery += ' RETURNING id';
          }

          try {
            const res = await pool.query(pgQuery, params);
            return {
              lastID: res.rows[0]?.id || null,
              changes: res.rowCount || 0
            };
          } catch (err) {
            const fallbackQuery = formatPgQuery(query);
            const res = await pool.query(fallbackQuery, params);
            return {
              lastID: null,
              changes: res.rowCount || 0
            };
          }
        },
        exec: async (query) => {
          await pool.query(query);
          return { lastID: null, changes: 0 };
        }
      };

      // Create Tables in PostgreSQL
      await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS instructors (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS courses (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(255) NOT NULL,
          instructor_id INT NOT NULL,
          archived INT DEFAULT 0,
          custom_qr_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS course_questions (
          id SERIAL PRIMARY KEY,
          course_id INT NOT NULL,
          question_text TEXT NOT NULL,
          question_type VARCHAR(50) DEFAULT 'rating',
          image_url TEXT,
          options TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS surveys (
          id SERIAL PRIMARY KEY,
          course_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          active_date VARCHAR(50),
          custom_qr_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS submissions (
          id SERIAL PRIMARY KEY,
          survey_id INT NOT NULL,
          session_date VARCHAR(50),
          open_ended_text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(survey_id) REFERENCES surveys(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS answers (
          id SERIAL PRIMARY KEY,
          submission_id INT NOT NULL,
          question_id INT NOT NULL,
          rating INT,
          choice_answer TEXT,
          FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
          FOREIGN KEY(question_id) REFERENCES course_questions(id) ON DELETE CASCADE
        );
      `);

      // Seed default instructors if table is empty
      const instructorsCount = await dbInstance.get('SELECT COUNT(*) as count FROM instructors');
      if (parseInt(instructorsCount?.count || 0) === 0) {
        const seedInstructors = [
          { name: 'Dr. fc07', username: 'fc07', password: '123' },
          { name: 'Dr. Ahmet Yilmaz', username: 'ahmet', password: '123' },
          { name: 'Dr. Mehmet Demir', username: 'mehmet', password: '123' }
        ];

        for (const hoca of seedInstructors) {
          const pHash = hashPassword(hoca.password);
          await dbInstance.run(
            'INSERT INTO instructors (name, username, password_hash) VALUES (?, ?, ?)',
            [hoca.name, hoca.username, pHash]
          );
        }
        console.log('PostgreSQL Database seeded with instructors');
      }

      console.log('Database: PostgreSQL connection successfully configured.');
      return dbInstance;
    } catch (pgError) {
      console.error('PostgreSQL connection failed, falling back:', pgError);
    }
  }

  const isMySql = !!process.env.DB_HOST;

  if (isMySql) {
    try {
      console.log('Database: Connecting to MySQL...');
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        multipleStatements: true
      });

      // Wrap MySQL connection to mimic SQLite client methods
      dbInstance = {
        all: async (query, params = []) => {
          const [rows] = await connection.execute(query, params);
          return rows;
        },
        get: async (query, params = []) => {
          const [rows] = await connection.execute(query, params);
          return rows[0] || null;
        },
        run: async (query, params = []) => {
          const upperQuery = query.trim().toUpperCase();
          if (upperQuery.startsWith('BEGIN')) {
            await connection.beginTransaction();
            return { lastID: null, changes: 0 };
          }
          if (upperQuery.startsWith('COMMIT')) {
            await connection.commit();
            return { lastID: null, changes: 0 };
          }
          if (upperQuery.startsWith('ROLLBACK')) {
            await connection.rollback();
            return { lastID: null, changes: 0 };
          }

          const [result] = await connection.execute(query, params);
          return {
            lastID: result.insertId || null,
            changes: result.affectedRows || 0
          };
        },
        exec: async (query) => {
          await connection.query(query);
          return { lastID: null, changes: 0 };
        }
      };

      // Create Tables in MySQL using VARCHAR and INT types
      await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS instructors (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL
        );
      `);

      await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS courses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(255) NOT NULL,
          instructor_id INT NOT NULL,
          archived INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
        );
      `);

      await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS course_questions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          course_id INT NOT NULL,
          question_text TEXT NOT NULL,
          question_type VARCHAR(50) DEFAULT 'rating',
          image_url TEXT,
          options TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
        );
      `);

      await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS surveys (
          id INT AUTO_INCREMENT PRIMARY KEY,
          course_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          active_date VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
        );
      `);

      await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS submissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          survey_id INT NOT NULL,
          session_date VARCHAR(50),
          open_ended_text TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(survey_id) REFERENCES surveys(id) ON DELETE CASCADE
        );
      `);

      await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS answers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          submission_id INT NOT NULL,
          question_id INT NOT NULL,
          rating INT,
          choice_answer TEXT,
          FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
          FOREIGN KEY(question_id) REFERENCES course_questions(id) ON DELETE CASCADE
        );
      `);

      // Seed default instructors if table is empty
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM instructors');
      const instructorsCount = rows[0]?.count || 0;
      if (instructorsCount === 0) {
        const seedInstructors = [
          { name: 'Dr. fc07', username: 'fc07', password: '123' },
          { name: 'Dr. Ahmet Yilmaz', username: 'ahmet', password: '123' },
          { name: 'Dr. Mehmet Demir', username: 'mehmet', password: '123' }
        ];

        for (const hoca of seedInstructors) {
          const pHash = hashPassword(hoca.password);
          await connection.execute(
            'INSERT INTO instructors (name, username, password_hash) VALUES (?, ?, ?)',
            [hoca.name, hoca.username, pHash]
          );
        }
        console.log('MySQL Database seeded with instructors');
      }

      console.log('Database: MySQL connection successfully configured.');
      return dbInstance;
    } catch (mysqlError) {
      console.error('MySQL connection failed, falling back to SQLite:', mysqlError);
    }
  }

  // --- SQLite Fallback ---
  const dbPath = process.env.VERCEL
    ? path.join('/tmp', 'charts.db')
    : path.join(process.cwd(), 'charts.db');
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Create tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS instructors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      instructor_id INTEGER NOT NULL,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS course_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'rating',
      image_url TEXT,
      options TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      active_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      session_date TEXT,
      open_ended_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      rating INTEGER,
      choice_answer TEXT,
      FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY(question_id) REFERENCES course_questions(id) ON DELETE CASCADE
    );
  `);

  // Migration: In case they have an old database without the 'archived' column
  try {
    await dbInstance.run('ALTER TABLE courses ADD COLUMN archived INTEGER DEFAULT 0');
  } catch (err) {}

  try {
    await dbInstance.run('ALTER TABLE courses ADD COLUMN custom_qr_url TEXT');
  } catch (err) {}

  // Migration: Add question_type, image_url, and options to course_questions
  try {
    await dbInstance.run("ALTER TABLE course_questions ADD COLUMN question_type TEXT DEFAULT 'rating'");
  } catch (err) {}

  try {
    await dbInstance.run('ALTER TABLE course_questions ADD COLUMN image_url TEXT');
  } catch (err) {}

  try {
    await dbInstance.run('ALTER TABLE course_questions ADD COLUMN options TEXT');
  } catch (err) {}

  // Migration: Add choice_answer to answers, make rating nullable
  try {
    await dbInstance.run('ALTER TABLE answers ADD COLUMN choice_answer TEXT');
  } catch (err) {}

  // Migration: Rebuild answers table to make rating nullable if it is NOT NULL
  try {
    const answersCols = await dbInstance.all("PRAGMA table_info(answers)");
    const ratingCol = answersCols.find(c => c.name === 'rating');
    if (ratingCol && ratingCol.notnull === 1) {
      await dbInstance.run('PRAGMA foreign_keys = OFF');
      await dbInstance.run('BEGIN TRANSACTION');
      try {
        await dbInstance.run('ALTER TABLE answers RENAME TO answers_old');
        await dbInstance.run(`
          CREATE TABLE answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            rating INTEGER,
            choice_answer TEXT,
            FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
            FOREIGN KEY(question_id) REFERENCES course_questions(id) ON DELETE CASCADE
          )
        `);
        await dbInstance.run(`
          INSERT INTO answers (id, submission_id, question_id, rating, choice_answer)
          SELECT id, submission_id, question_id, rating, choice_answer FROM answers_old
        `);
        await dbInstance.run('DROP TABLE answers_old');
        await dbInstance.run('COMMIT');
      } catch (transactionErr) {
        await dbInstance.run('ROLLBACK');
      } finally {
        await dbInstance.run('PRAGMA foreign_keys = ON');
      }
    }
  } catch (err) {}

  // Migration: Add active_date to surveys
  try {
    await dbInstance.run('ALTER TABLE surveys ADD COLUMN active_date TEXT');
  } catch (err) {}

  // Migration: Add custom_qr_url to surveys
  try {
    await dbInstance.run('ALTER TABLE surveys ADD COLUMN custom_qr_url TEXT');
  } catch (err) {}

  // Migration: Add session_date to submissions
  try {
    await dbInstance.run('ALTER TABLE submissions ADD COLUMN session_date TEXT');
  } catch (err) {}

  // Migration: Convert surveys table to dynamic multi-survey table
  try {
    const columns = await dbInstance.all("PRAGMA table_info(surveys)");
    const hasTypeColumn = columns.some(c => c.name === 'type');
    if (hasTypeColumn) {
      await dbInstance.run('BEGIN TRANSACTION');
      try {
        await dbInstance.run('ALTER TABLE surveys RENAME TO surveys_old');
        await dbInstance.run(`
          CREATE TABLE surveys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            active_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
          )
        `);
        await dbInstance.run(`
          INSERT INTO surveys (id, course_id, title, active_date, created_at)
          SELECT id, course_id, 
                 CASE WHEN type = 'pre' THEN 'Dönem Başı Beklentiler'
                      WHEN type = 'post' THEN 'Dönem Sonu Memnuniyet'
                      ELSE type END, 
                 active_date, created_at
          FROM surveys_old
        `);
        await dbInstance.run('DROP TABLE surveys_old');
        await dbInstance.run('COMMIT');
      } catch (err) {
        await dbInstance.run('ROLLBACK');
        throw err;
      }
    }
  } catch (err) {}

  // Migration: Rebuild submissions table if it references surveys_old
  try {
    const schema = await dbInstance.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='submissions'");
    if (schema && schema.sql.includes('surveys_old')) {
      await dbInstance.run('BEGIN TRANSACTION');
      try {
        await dbInstance.run('ALTER TABLE submissions RENAME TO submissions_old');
        await dbInstance.run(`
          CREATE TABLE submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            survey_id INTEGER NOT NULL,
            session_date TEXT,
            open_ended_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(survey_id) REFERENCES surveys(id) ON DELETE CASCADE
          )
        `);
        await dbInstance.run(`
          INSERT INTO submissions (id, survey_id, session_date, open_ended_text, created_at)
          SELECT id, survey_id, session_date, open_ended_text, created_at
          FROM submissions_old
        `);
        await dbInstance.run('DROP TABLE submissions_old');
        await dbInstance.run('COMMIT');
      } catch (err) {
        await dbInstance.run('ROLLBACK');
        throw err;
      }
    }
  } catch (err) {}

  // Seed default instructors if table is empty
  const instructorsCount = await dbInstance.get('SELECT COUNT(*) as count FROM instructors');
  if (instructorsCount.count === 0) {
    const seedInstructors = [
      { name: 'Dr. fc07', username: 'fc07', password: '123' },
      { name: 'Dr. Ahmet Yilmaz', username: 'ahmet', password: '123' },
      { name: 'Dr. Mehmet Demir', username: 'mehmet', password: '123' }
    ];

    for (const hoca of seedInstructors) {
      const pHash = hashPassword(hoca.password);
      await dbInstance.run(
        'INSERT INTO instructors (name, username, password_hash) VALUES (?, ?, ?)',
        [hoca.name, hoca.username, pHash]
      );
    }
  }

  return dbInstance;
}
