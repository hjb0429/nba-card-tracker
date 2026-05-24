import { Router } from 'express';
import { Database } from 'sql.js';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export function createUserCardRoutes(db: Database, saveFn: () => void): Router {
  const router = Router();
  router.use(authMiddleware);

  function save() { saveFn(); }

  // GET /api/user-cards — list my cards
  router.get('/', (req: AuthRequest, res) => {
    const stmt = db.prepare(`
      SELECT uc.*, c.year, c.card_number, c.parallel,
             p.name as player_name, p.name_cn as player_name_cn,
             s.name as series_name
      FROM user_cards uc
      LEFT JOIN cards c ON uc.card_id = c.id
      LEFT JOIN players p ON c.player_id = p.id
      LEFT JOIN card_series s ON c.series_id = s.id
      WHERE uc.user_id = ?
      ORDER BY uc.created_at DESC
    `);
    stmt.bind([req.userId!]);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json(rows);
  });

  // POST /api/user-cards — add a card
  router.post('/', (req: AuthRequest, res) => {
    const { card_id, player_id, series_id, year, card_type, parallel, numbering, insert_name, card_number, custom_name, purchase_price, purchase_date, notes, photo_path } = req.body;

    let resolvedCardId: number | null = card_id ? parseInt(card_id) : null;

    // If no direct card_id but player+series+year given, find or create a card
    if (!resolvedCardId && player_id && series_id) {
      const now = new Date();
      const thisYear = now.getFullYear();
      const defaultSeason = now.getMonth() < 9
        ? `${thisYear - 1}-${String(thisYear).slice(2)}`
        : `${thisYear}-${String(thisYear + 1).slice(2)}`;
      const cardSeason = year || defaultSeason;
      const existing = db.exec(
        'SELECT id FROM cards WHERE player_id = ? AND series_id = ? AND year = ? LIMIT 1',
        [parseInt(player_id), parseInt(series_id), cardSeason],
      );
      if (existing[0] && existing[0].values.length > 0) {
        resolvedCardId = existing[0].values[0][0] as number;
      } else {
        db.run(
          `INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, numbering, insert_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            parseInt(player_id), parseInt(series_id), cardSeason,
            card_type || 'base', card_number || 'N/A', parallel || 'Base',
            numbering || null, insert_name || null,
          ],
        );
        const result = db.exec('SELECT last_insert_rowid() as id');
        resolvedCardId = result[0].values[0][0] as number;
      }
    }

    db.run(
      `INSERT INTO user_cards (user_id, card_id, custom_name, purchase_price, purchase_date, photo_path, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId!,
        resolvedCardId,
        custom_name || null,
        purchase_price ? parseFloat(purchase_price) : null,
        purchase_date || null,
        photo_path || null,
        notes || null,
      ],
    );

    const result = db.exec('SELECT last_insert_rowid() as id');
    const newId = result[0].values[0][0];
    save();
    res.status(201).json({ id: newId });
  });

  // PUT /api/user-cards/:id — update a card
  router.put('/:id', (req: AuthRequest, res) => {
    const { custom_name, purchase_price, purchase_date, notes, photo_path } = req.body;

    db.run(
      `UPDATE user_cards SET custom_name = ?, purchase_price = ?, purchase_date = ?, notes = ?, photo_path = ? WHERE id = ? AND user_id = ?`,
      [
        custom_name || null,
        purchase_price ? parseFloat(purchase_price) : null,
        purchase_date || null,
        notes || null,
        photo_path || null,
        parseInt(req.params.id),
        req.userId!,
      ],
    );
    save();
    res.json({ ok: true });
  });

  // DELETE /api/user-cards/:id
  router.delete('/:id', (req: AuthRequest, res) => {
    db.run('DELETE FROM user_cards WHERE id = ? AND user_id = ?', [
      parseInt(req.params.id),
      req.userId!,
    ]);
    save();
    res.json({ ok: true });
  });

  return router;
}
