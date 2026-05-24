import { Router } from 'express';
import { Database } from 'sql.js';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export function createCompareRoutes(db: Database): Router {
  const router = Router();
  router.use(authMiddleware);

  // GET /api/compare — get comparison data for all user cards
  router.get('/', (req: AuthRequest, res) => {
    const stmt = db.prepare(`
      SELECT uc.*, c.year, c.card_number, c.parallel, c.card_type, c.numbering, c.insert_name,
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
    const cards: any[] = [];
    while (stmt.step()) cards.push(stmt.getAsObject());
    stmt.free();

    const result: any[] = [];

    for (const card of cards) {
      const item: any = {
        id: card.id,
        customName: card.custom_name,
        playerName: card.player_name_cn || card.player_name,
        seriesName: card.series_name,
        year: card.year,
        parallel: card.parallel,
        cardType: card.card_type,
        numbering: card.numbering,
        insertName: card.insert_name,
        purchasePrice: card.purchase_price,
        purchaseDate: card.purchase_date,
        photoPath: card.photo_path,
        notes: card.notes,
      };

      if (card.card_id) {
        // Get latest overseas price
        const overseasStmt = db.prepare(
          'SELECT price, record_date FROM price_records WHERE card_id = ? AND source_market = ? ORDER BY record_date DESC LIMIT 1',
        );
        overseasStmt.bind([card.card_id, 'overseas']);
        if (overseasStmt.step()) {
          const row = overseasStmt.getAsObject();
          item.overseasPrice = row.price;
          item.overseasDate = row.record_date;
        }
        overseasStmt.free();

        // Get latest domestic price
        const domesticStmt = db.prepare(
          'SELECT price, record_date FROM price_records WHERE card_id = ? AND source_market = ? ORDER BY record_date DESC LIMIT 1',
        );
        domesticStmt.bind([card.card_id, 'domestic']);
        if (domesticStmt.step()) {
          const row = domesticStmt.getAsObject();
          item.domesticPrice = row.price;
          item.domesticDate = row.record_date;
        }
        domesticStmt.free();

        // Get trend (30-day change)
        const trendStmt = db.prepare(`
          SELECT price FROM price_records
          WHERE card_id = ? AND source_market = 'overseas'
          ORDER BY record_date ASC
        `);
        trendStmt.bind([card.card_id]);
        const prices: number[] = [];
        while (trendStmt.step()) {
          prices.push(trendStmt.getAsObject().price as number);
        }
        trendStmt.free();

        if (prices.length >= 2) {
          const recentPrices = prices.slice(-10);
          const avg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
          const firstPrice = prices[0];
          item.trend = avg >= firstPrice ? 'up' : 'down';
          item.trendPercent = prices.length >= 2
            ? Math.round(((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 * 100) / 100
            : 0;
        }

        // Suggestion logic
        if (item.overseasPrice && card.purchase_price) {
          const diff = item.overseasPrice - card.purchase_price;
          const diffPercent = (diff / card.purchase_price) * 100;

          if (diffPercent >= 30 || (diffPercent >= 15 && item.trend === 'down')) {
            item.suggestion = 'sell';
            item.suggestionText = '建议出手';
          } else if (diffPercent >= 10) {
            item.suggestion = 'watch';
            item.suggestionText = '关注高点';
          } else if (diffPercent <= -20) {
            item.suggestion = 'hold';
            item.suggestionText = '暂持观望';
          } else {
            item.suggestion = 'hold';
            item.suggestionText = '继续持有';
          }
        }
      }

      result.push(item);
    }

    res.json(result);
  });

  return router;
}
