import * as SQLite from 'expo-sqlite';
import { Transaction, Category, Settings, IncomeSource, SavingsEntry } from '../types';

const DB_NAME = 'budget.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initDb(db);
  }
  return db;
}

async function initDb(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('expense','income')),
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      budget REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#185FA5',
      icon TEXT NOT NULL DEFAULT '📦',
      type TEXT NOT NULL DEFAULT 'expense'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_txn_type ON transactions(type);

    CREATE TABLE IF NOT EXISTS income_sources (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      name   TEXT    NOT NULL,
      amount REAL    NOT NULL,
      icon   TEXT    NOT NULL DEFAULT '💼',
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS savings_entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      month       TEXT    NOT NULL UNIQUE,
      calculated  REAL    NOT NULL,
      actual      REAL,
      note        TEXT
    );
  `);

  await seedDefaultCategories(db);
  await seedDefaultSettings(db);
}

async function seedDefaultCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );
  if (existing && existing.count > 0) return;

  const defaults: Omit<Category, 'id'>[] = [
    { name: 'Alimentation', budget: 1500, color: '#185FA5', icon: '🛒', type: 'expense' },
    { name: 'Logement',      budget: 2500, color: '#1D9E75', icon: '🏠', type: 'expense' },
    { name: 'Transport',     budget: 600,  color: '#BA7517', icon: '🚗', type: 'expense' },
    { name: 'Loisirs',       budget: 500,  color: '#993556', icon: '🎬', type: 'expense' },
    { name: 'Santé',         budget: 400,  color: '#0F6E56', icon: '💊', type: 'expense' },
    { name: 'Vêtements',     budget: 400,  color: '#7F77DD', icon: '👕', type: 'expense' },
    { name: 'Restaurants',   budget: 500,  color: '#D85A30', icon: '🍽️', type: 'expense' },
    { name: 'Abonnements',   budget: 200,  color: '#3B6D11', icon: '📱', type: 'expense' },
    { name: 'Salaire',       budget: 0,    color: '#1D9E75', icon: '💼', type: 'income' },
    { name: 'Freelance',     budget: 0,    color: '#185FA5', icon: '💻', type: 'income' },
    { name: 'Autre',         budget: 0,    color: '#888780', icon: '📦', type: 'both' },
  ];

  for (const cat of defaults) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (name, budget, color, icon, type) VALUES (?, ?, ?, ?, ?)',
      [cat.name, cat.budget, cat.color, cat.icon, cat.type]
    );
  }
}

async function seedDefaultSettings(db: SQLite.SQLiteDatabase): Promise<void> {
  const defaults = [
    { key: 'monthlyIncome', value: '8000' },
    { key: 'currency', value: 'MAD' },
    { key: 'currencySymbol', value: 'د.م' },
  ];
  for (const s of defaults) {
    await db.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [s.key, s.value]
    );
  }
}

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────

export async function getTransactions(month?: string): Promise<Transaction[]> {
  const db = await getDb();
  if (month) {
    // month = 'YYYY-MM'
    return await db.getAllAsync<Transaction>(
      `SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, createdAt DESC`,
      [`${month}%`]
    );
  }
  return await db.getAllAsync<Transaction>(
    'SELECT * FROM transactions ORDER BY date DESC, createdAt DESC'
  );
}

export async function addTransaction(
  t: Omit<Transaction, 'id' | 'createdAt'>
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO transactions (type, amount, description, category, date)
     VALUES (?, ?, ?, ?, ?)`,
    [t.type, t.amount, t.description, t.category, t.date]
  );
  return result.lastInsertRowId;
}

export async function updateTransaction(
  id: number,
  t: Omit<Transaction, 'id' | 'createdAt'>
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE transactions SET type=?, amount=?, description=?, category=?, date=? WHERE id=?`,
    [t.type, t.amount, t.description, t.category, t.date, id]
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id=?', [id]);
}

export async function getMonthSummary(month: string) {
  const db = await getDb();
  const rows = await db.getAllAsync<{ type: string; category: string; total: number }>(
    `SELECT type, category, SUM(amount) as total
     FROM transactions WHERE date LIKE ? GROUP BY type, category`,
    [`${month}%`]
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  const byCategory: Record<string, number> = {};

  for (const row of rows) {
    if (row.type === 'income') totalIncome += row.total;
    else {
      totalExpenses += row.total;
      byCategory[row.category] = (byCategory[row.category] || 0) + row.total;
    }
  }

  return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, byCategory };
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name');
}

export async function addCategory(c: Omit<Category, 'id'>): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO categories (name, budget, color, icon, type) VALUES (?, ?, ?, ?, ?)',
    [c.name, c.budget, c.color, c.icon, c.type]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(id: number, c: Partial<Omit<Category, 'id'>>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(c).map(k => `${k}=?`).join(', ');
  await db.runAsync(
    `UPDATE categories SET ${fields} WHERE id=?`,
    [...Object.values(c), id]
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id=?', [id]);
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
  const map: Record<string, string> = {};
  rows.forEach(r => (map[r.key] = r.value));
  return {
    monthlyIncome: parseFloat(map.monthlyIncome || '0'),
    currency: map.currency || 'MAD',
    currencySymbol: map.currencySymbol || 'د.م',
  };
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// ─── INCOME SOURCES ──────────────────────────────────────────────────────────

export async function getIncomeSources(): Promise<IncomeSource[]> {
  const db = await getDb();
  return await db.getAllAsync<IncomeSource>(
    'SELECT * FROM income_sources ORDER BY name'
  );
}

export async function addIncomeSource(s: Omit<IncomeSource, 'id'>): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO income_sources (name, amount, icon, active) VALUES (?, ?, ?, ?)',
    [s.name, s.amount, s.icon, s.active]
  );
  return result.lastInsertRowId;
}

export async function updateIncomeSource(id: number, s: Partial<Omit<IncomeSource, 'id'>>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(s).map(k => `${k}=?`).join(', ');
  await db.runAsync(
    `UPDATE income_sources SET ${fields} WHERE id=?`,
    [...Object.values(s), id]
  );
}

export async function deleteIncomeSource(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM income_sources WHERE id=?', [id]);
}

export async function computeRealIncome(month: string): Promise<number> {
  const db = await getDb();

  // Sum of active income_sources (recurring)
  const sourceRow = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM income_sources WHERE active = 1'
  );
  const sourcesTotal = sourceRow?.total ?? 0;

  // Sum of income transactions for the month
  const txnRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date LIKE ?`,
    [`${month}%`]
  );
  const txnTotal = txnRow?.total ?? 0;

  return sourcesTotal + txnTotal;
}

// ─── SAVINGS ENTRIES ─────────────────────────────────────────────────────────

export async function getSavingsEntries(): Promise<SavingsEntry[]> {
  const db = await getDb();
  return await db.getAllAsync<SavingsEntry>(
    'SELECT * FROM savings_entries ORDER BY month DESC'
  );
}

export async function getSavingsEntry(month: string): Promise<SavingsEntry | null> {
  const db = await getDb();
  return await db.getFirstAsync<SavingsEntry>(
    'SELECT * FROM savings_entries WHERE month = ?',
    [month]
  ) ?? null;
}

export async function upsertSavingsEntry(entry: Omit<SavingsEntry, 'id'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO savings_entries (month, calculated, actual, note)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET
       calculated = excluded.calculated,
       actual     = excluded.actual,
       note       = excluded.note`,
    [entry.month, entry.calculated, entry.actual ?? null, entry.note ?? null]
  );
}

// ─── EXPORT / IMPORT ─────────────────────────────────────────────────────────

export async function exportAllData(): Promise<string> {
  const db = await getDb();
  const transactions = await db.getAllAsync('SELECT * FROM transactions');
  const categories = await db.getAllAsync('SELECT * FROM categories');
  const settings = await db.getAllAsync('SELECT * FROM settings');
  const incomeSources = await db.getAllAsync('SELECT * FROM income_sources');
  const savingsEntries = await db.getAllAsync('SELECT * FROM savings_entries');
  return JSON.stringify(
    { transactions, categories, settings, incomeSources, savingsEntries, exportedAt: new Date().toISOString() },
    null,
    2
  );
}

export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json);
  const db = await getDb();

  await db.execAsync(
    'DELETE FROM transactions; DELETE FROM categories; DELETE FROM settings; DELETE FROM income_sources; DELETE FROM savings_entries;'
  );

  for (const t of data.transactions || []) {
    await db.runAsync(
      'INSERT INTO transactions (id, type, amount, description, category, date, createdAt) VALUES (?,?,?,?,?,?,?)',
      [t.id, t.type, t.amount, t.description, t.category, t.date, t.createdAt]
    );
  }
  for (const c of data.categories || []) {
    await db.runAsync(
      'INSERT INTO categories (id, name, budget, color, icon, type) VALUES (?,?,?,?,?,?)',
      [c.id, c.name, c.budget, c.color, c.icon, c.type]
    );
  }
  for (const s of data.settings || []) {
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?,?)', [s.key, s.value]);
  }
  for (const s of data.incomeSources || []) {
    await db.runAsync(
      'INSERT INTO income_sources (id, name, amount, icon, active) VALUES (?,?,?,?,?)',
      [s.id, s.name, s.amount, s.icon, s.active]
    );
  }
  for (const e of data.savingsEntries || []) {
    await db.runAsync(
      'INSERT INTO savings_entries (id, month, calculated, actual, note) VALUES (?,?,?,?,?)',
      [e.id, e.month, e.calculated, e.actual ?? null, e.note ?? null]
    );
  }
}
