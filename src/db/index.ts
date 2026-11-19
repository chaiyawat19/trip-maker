import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export function createDb(dbPath = process.env.DATABASE_URL || './data/promptpai.db') {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      group_id TEXT PRIMARY KEY,
      active_trip_id INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLANNING',
      locked_start_date TEXT,
      locked_end_date TEXT,
      created_by_user_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trip_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      line_user_id TEXT,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      is_guest INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS date_polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS availabilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      payer_member_id INTEGER NOT NULL,
      split_mode TEXT NOT NULL,
      vat_percent REAL NOT NULL DEFAULT 0,
      service_charge_percent REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      is_addon INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bill_item_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_item_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      exact_amount REAL,
      weight REAL NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      from_member_id INTEGER NOT NULL,
      to_member_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trip_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      reminder_key TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_payment_profiles (
      line_user_id TEXT PRIMARY KEY,
      promptpay_id TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return { db: drizzle(sqlite, { schema }), sqlite };
}

export type AppDatabase = ReturnType<typeof createDb>['db'];
