import { Router } from 'express';
import { Database } from 'sql.js';
import { searchEbaySoldItems } from '../scrapers/ebay-api';

export function createLivePriceRoutes(db: Database): Router {
  const router = Router();

  // GET /api/cards/:id/live-prices — real-time eBay search + cache to DB
  router.get('/cards/:id/live-prices', async (req, res) => {
    const cardId = parseInt(req.params.id);

    // Get card info
    const cardStmt = db.prepare(`
      SELECT c.*, p.name as player_name, s.name as series_name
      FROM cards c
      JOIN players p ON c.player_id = p.id
      JOIN card_series s ON c.series_id = s.id
      WHERE c.id = ?
    `);
    cardStmt.bind([cardId]);
    if (!cardStmt.step()) {
      cardStmt.free();
      return res.status(404).json({ error: 'Card not found' });
    }
    const card = cardStmt.getAsObject() as any;
    cardStmt.free();

    // Build search query — keep it simple for eBay
    const query = `${card.player_name} ${card.series_name}`;

    try {
      const hasCreds = !!(process.env.EBAY_APP_ID && process.env.EBAY_CERT_ID);
      console.log(`[Live] Search: "${query}" | Has creds: ${hasCreds}`);
      const items = await searchEbaySoldItems(query, 20);

      const today = new Date().toISOString().split('T')[0];
      const prices: any[] = [];
      const images: string[] = [];

      for (const item of items) {
        const price = parseFloat(item.price?.value || '0');
        if (price <= 0 || price > 1000000) continue;

        // Save to DB for caching
        const existCheck = db.exec(
          'SELECT id FROM price_records WHERE card_id = ? AND source = ?',
          [cardId, item.itemWebUrl],
        );
        if (!existCheck[0]?.values?.length) {
          db.run(
            `INSERT INTO price_records (card_id, price, currency, source, source_market, record_date)
             VALUES (?, ?, ?, ?, 'overseas', ?)`,
            [cardId, price, item.price?.currency || 'USD', item.itemWebUrl, today],
          );
        }

        prices.push({
          price,
          currency: item.price?.currency || 'USD',
          title: item.title,
          url: item.itemWebUrl,
        });

        if (item.image?.imageUrl) {
          images.push(item.image.imageUrl);
        }
      }

      // Save first image to card
      if (images.length > 0) {
        db.run('UPDATE cards SET image_url = ? WHERE id = ? AND image_url IS NULL', [images[0], cardId]);
      }

      // Also try the domestic angle (search same card in domestic context)
      res.json({
        cardId,
        query,
        total: items.length,
        prices,
        images: images.slice(0, 5),
        searchUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`,
      });
    } catch (err: any) {
      console.error(`[Live Prices] Error for card #${cardId}:`, err.message);
      res.json({
        cardId,
        query,
        error: err.message,
        prices: [],
        images: [],
        searchUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`,
      });
    }
  });

  return router;
}
