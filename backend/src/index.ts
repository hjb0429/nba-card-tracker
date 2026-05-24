import express from 'express';
import cors from 'cors';
import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { seedIfEmpty } from './data/seed';
import { generateMockPrices } from './services/price-generator';
import { createPlayerRoutes } from './api/players';
import { createSeriesRoutes } from './api/series';
import { createPriceRoutes } from './api/prices';
import { createCardRoutes } from './api/cards';
import { createAuthRoutes } from './api/auth';
import { createUserCardRoutes } from './api/userCards';
import { createCompareRoutes } from './api/compare';
import { createOpportunityRoutes } from './api/opportunities';
import { getExchangeRate } from './services/exchange-rate';
import { runScraperBatch } from './services/scraper-scheduler';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
let db: Database;

async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_cn TEXT,
      team TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS card_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      series_id INTEGER NOT NULL,
      year TEXT NOT NULL,
      card_type TEXT NOT NULL DEFAULT 'base',
      card_number TEXT,
      parallel TEXT,
      insert_name TEXT,
      numbering TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (series_id) REFERENCES card_series(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS price_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      source TEXT NOT NULL,
      source_market TEXT NOT NULL DEFAULT 'overseas',
      record_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES cards(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      card_id INTEGER,
      custom_name TEXT,
      purchase_price REAL,
      purchase_date TEXT,
      photo_path TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (card_id) REFERENCES cards(id)
    )
  `);

  saveDatabase();

  seedIfEmpty(db);
  generateMockPrices(db);
  saveDatabase();

  return db;
}

function saveDatabase(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data = db.export();
  const buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  fs.writeFileSync(DB_PATH, buffer);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Exchange rate endpoint
app.get('/api/exchange-rate', async (_req, res) => {
  const rate = await getExchangeRate();
  res.json({ rate, from: 'USD', to: 'CNY' });
});

// Trigger scraper manually (for testing)
app.post('/api/scrape', async (req, res) => {
  const limit = req.body?.limit || 5;
  res.json({ status: 'started', limit });
  runScraperBatch(db, saveDatabase, limit).catch((err) => {
    console.error('[Scraper] Batch failed:', err.message);
  });
});

// Add real price data manually or via import
app.post('/api/prices/manual', (req, res) => {
  const { card_id, price, currency, source, source_market, record_date } = req.body;
  if (!card_id || !price) {
    res.status(400).json({ error: 'card_id and price required' });
    return;
  }
  db.run(
    `INSERT INTO price_records (card_id, price, currency, source, source_market, record_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      card_id, price, currency || 'USD', source || 'manual', source_market || 'overseas',
      record_date || new Date().toISOString().split('T')[0],
    ],
  );
  saveDatabase();
  res.status(201).json({ ok: true });
});

// Set eBay API key
app.post('/api/config/ebay-key', (req, res) => {
  const { appId } = req.body;
  if (!appId) { res.status(400).json({ error: 'appId required' }); return; }
  process.env.EBAY_APP_ID = appId;
  const { setEbayAppId } = require('./scrapers/ebay-api');
  setEbayAppId(appId);
  res.json({ ok: true, message: 'eBay API key configured' });
});

initDatabase().then((database) => {
  app.use('/api/auth', createAuthRoutes(database, saveDatabase));
  app.use('/api/players', createPlayerRoutes(database));
  app.use('/api/series', createSeriesRoutes(database));
  app.use('/api/prices', createPriceRoutes(database));
  app.use('/api/cards', createCardRoutes(database));
  app.use('/api/user-cards', createUserCardRoutes(database, saveDatabase));
  app.use('/api/compare', createCompareRoutes(database));
  app.use('/api/opportunities', createOpportunityRoutes(database));

  // Serve uploaded photos
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // Scheduled scraping: every 6 hours, scrape 10 cards
  cron.schedule('0 */6 * * *', () => {
    console.log('[cron] Scraper tick at', new Date().toISOString());
    runScraperBatch(database, saveDatabase, 10).catch((err) => {
      console.error('[cron] Scraper error:', err.message);
    });
  });

  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
});

export { db, saveDatabase };
