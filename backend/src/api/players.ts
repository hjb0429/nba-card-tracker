import { Router } from 'express';
import { Database } from 'sql.js';

export function createPlayerRoutes(db: Database): Router {
  const router = Router();

  // GET /api/players — list all players
  router.get('/', (_req, res) => {
    const stmt = db.prepare('SELECT * FROM players ORDER BY name_cn');
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(rows);
  });

  // GET /api/players/:id
  router.get('/:id', (req, res) => {
    const stmt = db.prepare('SELECT * FROM players WHERE id = ?');
    stmt.bind([parseInt(req.params.id)]);
    if (stmt.step()) {
      res.json(stmt.getAsObject());
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
    stmt.free();
  });

  return router;
}
