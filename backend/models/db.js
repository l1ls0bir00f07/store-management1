const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../database');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH     = path.join(DATA_DIR, 'store.db');
const SCHEMA_PATH = path.join(__dirname, '../database/schema.sql');

let _db    = null;
let _dirty = false;
let _inTx  = false;

function saveDb() {
  if (!_db || !_dirty) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
  _dirty = false;
}

function lastId() {
  const r = _db.exec('SELECT last_insert_rowid()');
  return r[0]?.values[0]?.[0] ?? null;
}

async function initDb() {
  const SQL = await initSqlJs();
  _db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  _db.run(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  // Migration: add discount column if missing (for existing databases)
  try {
    _db.run('ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0');
    _dirty = true;
    console.log('✅ Migration: added discount column');
  } catch (e) {
    // Column already exists — that's fine
  }

  const has = _db.exec("SELECT id FROM users WHERE username='admin'");
  if (!has.length || !has[0].values.length) {
    _db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)',
            ['admin', bcrypt.hashSync('admin123', 10)]);
    _dirty = true;
    console.log('✅ Default admin: admin / admin123');
  }

  const hasCashier = _db.exec("SELECT id FROM users WHERE username='cashier'");
  if (!hasCashier.length || !hasCashier[0].values.length) {
    _db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            ['cashier', bcrypt.hashSync('cashier123', 10), 'cashier']);
    _dirty = true;
    console.log('✅ Default cashier: cashier / cashier123');
  }

  saveDb();
  setInterval(saveDb, 2000);
  console.log(`✅ DB ready at ${DB_PATH}`);
}

const db = {
  prepare(sql) {
    return {
      run(...args) {
        _db.run(sql, args.flat());
        _dirty = true;
        if (!_inTx) saveDb();
        return { lastInsertRowid: lastId() };
      },
      get(...args) {
        const s = _db.prepare(sql);
        s.bind(args.flat());
        const row = s.step() ? s.getAsObject() : undefined;
        s.free();
        return row;
      },
      all(...args) {
        const s = _db.prepare(sql);
        s.bind(args.flat());
        const rows = [];
        while (s.step()) rows.push(s.getAsObject());
        s.free();
        return rows;
      }
    };
  },

  transaction(fn) {
    return function (...args) {
      _db.run('BEGIN');
      _inTx = true;
      try {
        const result = fn(...args);
        _db.run('COMMIT');
        _dirty = true;
        saveDb();
        return result;
      } catch (e) {
        try { _db.run('ROLLBACK'); } catch {}
        throw e;
      } finally {
        _inTx = false;
      }
    };
  }
};

module.exports = { initDb, wrapper: db };
