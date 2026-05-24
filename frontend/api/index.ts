import express from 'express';
import cors from 'cors';
import initSqlJs, { Database } from 'sql.js';
import { seedIfEmpty } from '../server/data/seed';
import { generateMockPrices } from '../server/services/price-generator';
import { createPlayerRoutes } from '../server/api/players';
import { createSeriesRoutes } from '../server/api/series';
import { createPriceRoutes } from '../server/api/prices';
import { createCardRoutes } from '../server/api/cards';
import { createAuthRoutes } from '../server/api/auth';
import { createUserCardRoutes } from '../server/api/userCards';
import { createCompareRoutes } from '../server/api/compare';
import { createOpportunityRoutes } from '../server/api/opportunities';
import { getExchangeRate } from '../server/services/exchange-rate';

const app = express();
app.use(cors());
app.use(express.json());

let db: Database;

async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_cn TEXT, team TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS card_series (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, brand TEXT NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER NOT NULL, series_id INTEGER NOT NULL, year TEXT NOT NULL, card_type TEXT NOT NULL DEFAULT 'base', card_number TEXT, parallel TEXT, insert_name TEXT, numbering TEXT, image_url TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS price_records (id INTEGER PRIMARY KEY AUTOINCREMENT, card_id INTEGER NOT NULL, price REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', source TEXT NOT NULL, source_market TEXT NOT NULL DEFAULT 'overseas', record_date TEXT NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS user_cards (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, card_id INTEGER, custom_name TEXT, purchase_price REAL, purchase_date TEXT, photo_path TEXT, notes TEXT)`);

  seedIfEmpty(db);
  generateMockPrices(db);

  // Mount routes after DB is ready
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/exchange-rate', async (_req, res) => {
    const rate = await getExchangeRate();
    res.json({ rate, from: 'USD', to: 'CNY' });
  });
  app.use('/api/players', createPlayerRoutes(db));
  app.use('/api/series', createSeriesRoutes(db));
  app.use('/api/prices', createPriceRoutes(db));
  app.use('/api/cards', createCardRoutes(db));
  app.use('/api/auth', createAuthRoutes(db, () => {}));
  app.use('/api/user-cards', createUserCardRoutes(db, () => {}));
  app.use('/api/compare', createCompareRoutes(db));
  app.use('/api/opportunities', createOpportunityRoutes(db));

  return db;
}

// Initialize DB on first request
let initPromise: Promise<Database> | null = null;
app.use(async (_req, _res, next) => {
  if (!initPromise) initPromise = initDb();
  await initPromise;
  next();
});

export default app;
