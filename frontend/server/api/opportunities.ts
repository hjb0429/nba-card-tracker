import { Router } from 'express';
import { Database } from 'sql.js';

export function createOpportunityRoutes(db: Database): Router {
  const router = Router();

  // GET /api/opportunities — find undervalued cards
  router.get('/', (_req, res) => {
    const stmt = db.prepare(`
      SELECT c.id as card_id, c.year, c.card_type, c.parallel, c.numbering, c.insert_name,
             p.name as player_name, p.name_cn as player_name_cn, p.team,
             s.name as series_name
      FROM cards c
      JOIN players p ON c.player_id = p.id
      JOIN card_series s ON c.series_id = s.id
    `);

    const cards: any[] = [];
    while (stmt.step()) cards.push(stmt.getAsObject());
    stmt.free();

    const opportunities: any[] = [];

    for (const card of cards) {
      // Get price stats for last 90 days
      const priceStmt = db.prepare(`
        SELECT price, record_date, source_market
        FROM price_records
        WHERE card_id = ? AND source_market = 'overseas'
        ORDER BY record_date ASC
      `);
      priceStmt.bind([card.card_id]);
      const prices: { price: number; date: string }[] = [];
      while (priceStmt.step()) {
        const row = priceStmt.getAsObject();
        prices.push({ price: row.price as number, date: row.record_date as string });
      }
      priceStmt.free();

      if (prices.length < 20) continue;

      // Calculate stats
      const allPrices = prices.map((p) => p.price);
      const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
      const latestPrice = allPrices[allPrices.length - 1];
      const maxPrice = Math.max(...allPrices);
      const minPrice = Math.min(...allPrices);

      // Last 30 days average
      const recent30 = allPrices.slice(-10);
      const recentAvg = recent30.reduce((a, b) => a + b, 0) / recent30.length;

      // Percentage from peak
      const dropFromPeak = ((maxPrice - latestPrice) / maxPrice) * 100;
      const dropFromAvg = ((avgPrice - latestPrice) / avgPrice) * 100;

      // Only show significant drops (at least 10% below peak or average)
      if (dropFromPeak < 10 && dropFromAvg < 10) continue;

      // Trend: compare recent vs overall average
      const trend = recentAvg < avgPrice ? 'down' : 'up';

      // Score: higher = better buy opportunity
      const score = Math.round(dropFromPeak * 2 + dropFromAvg * 1.5);

      opportunities.push({
        cardId: card.card_id,
        playerName: card.player_name_cn || card.player_name,
        playerNameEn: card.player_name,
        team: card.team,
        seriesName: card.series_name,
        year: card.year,
        cardType: card.card_type,
        parallel: card.parallel,
        numbering: card.numbering,
        insertName: card.insert_name,
        latestPrice: Math.round(latestPrice * 100) / 100,
        avgPrice: Math.round(avgPrice * 100) / 100,
        maxPrice: Math.round(maxPrice * 100) / 100,
        dropFromPeak: Math.round(dropFromPeak * 10) / 10,
        dropFromAvg: Math.round(dropFromAvg * 10) / 10,
        trend,
        score,
      });
    }

    // Sort by score (best opportunities first), take top 30
    opportunities.sort((a, b) => b.score - a.score);
    const top30 = opportunities.slice(0, 30);

    // Group by player for clarity
    const byPlayer: Record<string, any[]> = {};
    for (const opp of top30) {
      const key = opp.playerName;
      if (!byPlayer[key]) byPlayer[key] = [];
      if (byPlayer[key].length < 5) byPlayer[key].push(opp);
    }

    res.json({
      total: top30.length,
      byPlayer: Object.entries(byPlayer).map(([player, cards]) => ({
        player,
        team: cards[0].team,
        count: cards.length,
        cards: cards.sort((a, b) => b.score - a.score),
      })),
      topCards: top30,
    });
  });

  return router;
}
