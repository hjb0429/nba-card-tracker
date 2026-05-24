import { Router } from 'express';
import { Database } from 'sql.js';

export function createCardRoutes(db: Database): Router {
  const router = Router();

  // GET /api/cards — search cards with optional filters
  router.get('/', (req, res) => {
    const { player_id, series_id, year } = req.query;

    let sql = `
      SELECT c.*, p.name as player_name, p.name_cn as player_name_cn, p.team,
             s.name as series_name
      FROM cards c
      JOIN players p ON c.player_id = p.id
      JOIN card_series s ON c.series_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (player_id) {
      sql += ' AND c.player_id = ?';
      params.push(parseInt(player_id as string));
    }
    if (series_id) {
      sql += ' AND c.series_id = ?';
      params.push(parseInt(series_id as string));
    }
    if (year) {
      sql += ' AND c.year = ?';
      params.push(parseInt(year as string));
    }

    sql += ' ORDER BY c.year DESC LIMIT 50';

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(rows);
  });

  // GET /api/cards/:id
  router.get('/:id', (req, res) => {
    const stmt = db.prepare(`
      SELECT c.*, p.name as player_name, p.name_cn as player_name_cn, p.team,
             s.name as series_name
      FROM cards c
      JOIN players p ON c.player_id = p.id
      JOIN card_series s ON c.series_id = s.id
      WHERE c.id = ?
    `);
    stmt.bind([parseInt(req.params.id)]);
    if (stmt.step()) {
      res.json(stmt.getAsObject());
    } else {
      res.status(404).json({ error: 'Card not found' });
    }
    stmt.free();
  });

  // GET /api/cards/:id/prices — price history
  router.get('/:id/prices', (req, res) => {
    const { market, days } = req.query;
    let sql = 'SELECT * FROM price_records WHERE card_id = ?';
    const params: any[] = [parseInt(req.params.id)];

    if (market) {
      sql += ' AND source_market = ?';
      params.push(market);
    }
    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(days as string));
      sql += ' AND record_date >= ?';
      params.push(cutoff.toISOString().split('T')[0]);
    }

    sql += ' ORDER BY record_date ASC';

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(rows);
  });

  return router;
}
