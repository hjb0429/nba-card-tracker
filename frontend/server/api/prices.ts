import { Router } from 'express';
import { Database } from 'sql.js';

export function createPriceRoutes(db: Database): Router {
  const router = Router();

  // GET /api/prices/:cardId — price history for a card
  router.get('/:cardId', (req, res) => {
    const stmt = db.prepare(`
      SELECT * FROM price_records
      WHERE card_id = ?
      ORDER BY record_date DESC
    `);
    stmt.bind([parseInt(req.params.cardId)]);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(rows);
  });

  // GET /api/prices/trend/:cardId — aggregated trend data
  router.get('/trend/:cardId', (req, res) => {
    const periods = [
      { label: '1w', days: 7 },
      { label: '1m', days: 30 },
      { label: '3m', days: 90 },
      { label: '1y', days: 365 },
    ];

    const result: Record<string, { latest: number; oldest: number; change: number; changePercent: number }> = {};

    for (const period of periods) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - period.days);

      const stmt = db.prepare(`
        SELECT price FROM price_records
        WHERE card_id = ? AND record_date >= ?
        ORDER BY record_date ASC
      `);
      stmt.bind([parseInt(req.params.cardId), cutoff.toISOString().split('T')[0]]);

      const prices: number[] = [];
      while (stmt.step()) {
        prices.push(stmt.getAsObject().price as number);
      }
      stmt.free();

      if (prices.length >= 2) {
        const oldest = prices[0];
        const latest = prices[prices.length - 1];
        result[period.label] = {
          latest,
          oldest,
          change: latest - oldest,
          changePercent: ((latest - oldest) / oldest) * 100,
        };
      }
    }

    res.json(result);
  });

  return router;
}
