import { Database } from 'sql.js';
import { scrapeEBayWithDelay } from '../scrapers/ebay';
import { scrapeKatouWithDelay } from '../scrapers/katou';

interface ScrapeJob {
  cardId: number
  playerName: string
  seriesName: string
  year: string
}

export async function scrapeCardPrices(db: Database, job: ScrapeJob): Promise<number> {
  const { cardId, playerName, seriesName, year } = job;
  const today = new Date().toISOString().split('T')[0];
  let inserted = 0;

  // --- eBay ---
  try {
    const ebayListings = await scrapeEBayWithDelay(playerName, seriesName, year);
    if (ebayListings.length > 0) {
      for (const listing of ebayListings) {
        if (listing.price > 0 && listing.price < 100000) {
          db.run(
            `INSERT INTO price_records (card_id, price, currency, source, source_market, record_date)
             VALUES (?, ?, 'USD', ?, 'overseas', ?)`,
            [cardId, listing.price, listing.url || 'eBay-scraped', today],
          );
          inserted++;
          if (listing.imageUrl) {
            db.run(`UPDATE cards SET image_url = ? WHERE id = ? AND image_url IS NULL`, [listing.imageUrl, cardId]);
          }
        }
      }
      console.log(`  [eBay] +${inserted} records for card #${cardId}`);
    } else {
      console.log(`  [eBay] No results for card #${cardId} (may be blocked or no listings)`);
    }
  } catch (err) {
    console.error(`  [eBay] Error: ${(err as Error).message}`);
  }

  // --- 卡淘 ---
  try {
    const katouListings = await scrapeKatouWithDelay(playerName, seriesName, year);
    if (katouListings.length > 0) {
      for (const listing of katouListings) {
        if (listing.price > 0 && listing.price < 10000000) {
          db.run(
            `INSERT INTO price_records (card_id, price, currency, source, source_market, record_date)
             VALUES (?, ?, 'CNY', ?, 'domestic', ?)`,
            [cardId, listing.price, listing.url || '卡淘-scraped', today],
          );
          inserted++;
          if (listing.imageUrl) {
            db.run(`UPDATE cards SET image_url = ? WHERE id = ? AND image_url IS NULL`, [listing.imageUrl, cardId]);
          }
        }
      }
      console.log(`  [卡淘] +${katouListings.length} records for card #${cardId}`);
    } else {
      console.log(`  [卡淘] No results for card #${cardId} (may be blocked or no listings)`);
    }
  } catch (err) {
    console.error(`  [卡淘] Error: ${(err as Error).message}`);
  }

  return inserted;
}

export async function runScraperBatch(db: Database, saveFn: () => void, limit = 10): Promise<{ attempted: number; inserted: number }> {
  console.log(`[Scheduler] Starting batch scrape (limit: ${limit})...`);

  const result = db.exec(`
    SELECT c.id, p.name as player_name, s.name as series_name, c.year
    FROM cards c
    JOIN players p ON c.player_id = p.id
    JOIN card_series s ON c.series_id = s.id
    WHERE c.id NOT IN (
      SELECT DISTINCT card_id FROM price_records WHERE source LIKE 'http%' OR source LIKE '%scraped%'
    )
    ORDER BY RANDOM()
    LIMIT ?
  `, [limit]);

  if (!result[0] || result[0].values.length === 0) {
    console.log('[Scheduler] No cards need scraping (all have real data).');
    return { attempted: 0, inserted: 0 };
  }

  const jobs: ScrapeJob[] = result[0].values.map((row) => ({
    cardId: row[0] as number,
    playerName: row[1] as string,
    seriesName: row[2] as string,
    year: row[3] as string,
  }));

  let total = 0;
  for (const job of jobs) {
    const count = await scrapeCardPrices(db, job);
    total += count;
    saveFn();
  }

  console.log(`[Scheduler] Complete. Attempted ${jobs.length}, inserted ${total} records.`);
  return { attempted: jobs.length, inserted: total };
}
