import { Router } from 'express';
import { Database } from 'sql.js';

export function createSeriesRoutes(db: Database): Router {
  const router = Router();

  // GET /api/series — list all series
  router.get('/', (_req, res) => {
    const stmt = db.prepare('SELECT * FROM card_series ORDER BY name');
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(rows);
  });

  return router;
}
