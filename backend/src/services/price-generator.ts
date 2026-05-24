import { Database } from 'sql.js';

export function generateMockPrices(db: Database): void {
  const priceCount = db.exec('SELECT COUNT(*) as c FROM price_records')[0];
  if (priceCount && (priceCount.values[0][0] as number) > 0) return;

  console.log('Generating mock price data...');

  const allPlayerIds = Array.from({ length: 33 }, (_, i) => i + 1);
  const seasons = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'];

  // Series IDs: 1=Prizm, 2=Optic, 3=Select, 4=Mosaic, 5=Donruss, 6=Hoops, 7=Contenders,
  // 8=National Treasures, 9=Flawless, 10=Revolution, 11=Noir, 12=Hero Villain, 13=Donruss Jersey
  const mainSeriesIds = [1, 2, 3, 4, 11];      // Prizm, Optic, Select, Mosaic, Noir
  const insertSeriesIds = [12];                   // Hero Villain
  const jerseySeriesIds = [13];                   // Donruss Jersey

  // --- Card types and their structures ---

  // BASE cards: every player × main series × season
  for (const playerId of allPlayerIds) {
    for (const seriesId of mainSeriesIds) {
      for (const season of seasons) {
        db.run(
          `INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel)
           VALUES (?, ?, ?, 'base', ?, 'Base')`,
          [playerId, seriesId, season, `#${100 + Math.floor(Math.random() * 300)}`],
        );
      }
    }
  }

  // PARALLEL numbered cards: top players × main series × recent seasons
  const parallelTypes: [string, string][] = [
    ['Red', '/299'], ['Blue', '/99'], ['Purple', '/49'],
    ['Gold', '/10'], ['Green', '/5'], ['Black', '1/1'],
  ];
  const topPlayers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 28, 29, 30, 33];

  for (const playerId of topPlayers) {
    for (const seriesId of [1, 2, 3]) { // Prizm, Optic, Select
      for (const season of seasons.slice(-3)) { // Last 3 seasons only
        const [parallel, numbering] = parallelTypes[Math.floor(Math.random() * parallelTypes.length)];
        db.run(
          `INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, numbering)
           VALUES (?, ?, ?, 'parallel', ?, ?, ?)`,
          [playerId, seriesId, season, `#${10 + Math.floor(Math.random() * 200)}`, parallel, numbering],
        );
      }
    }
  }

  // INSERT cards: Hero Villain series
  const insertNames = ['Hero', 'Villain', 'Dual'];
  for (const playerId of topPlayers.slice(0, 20)) {
    for (const season of seasons.slice(-2)) {
      const insertName = insertNames[Math.floor(Math.random() * insertNames.length)];
      const numberings = ['/99', '/49', '/25', ''];
      const numbering = numberings[Math.floor(Math.random() * numberings.length)];
      db.run(
        `INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, insert_name, numbering)
         VALUES (?, 12, ?, 'insert', ?, 'Insert', ?, ?)`,
        [playerId, season, `#HV-${10 + Math.floor(Math.random() * 90)}`, insertName, numbering],
      );
    }
  }

  // JERSEY/PATCH cards: Donruss Jersey Series
  const jerseyTypes: [string, string][] = [
    ['Jersey', 'Game-Worn'], ['Patch', 'Player-Worn'], ['Prime Patch', 'Logoman'],
  ];
  for (const playerId of topPlayers.slice(0, 15)) {
    for (const season of seasons.slice(-3)) {
      const [parallel, numbering] = jerseyTypes[Math.floor(Math.random() * jerseyTypes.length)];
      const num = ['/25', '/10', '/5', '1/1'][Math.floor(Math.random() * 4)];
      db.run(
        `INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, numbering)
         VALUES (?, 13, ?, 'jersey', ?, ?, ?)`,
        [playerId, season, `#JS-${1 + Math.floor(Math.random() * 50)}`, parallel, num],
      );
    }
  }

  // AUTO cards: top stars only
  const autoSeriesIds = [1, 8, 9]; // Prizm, National Treasures, Flawless
  for (const playerId of topPlayers.slice(0, 10)) {
    for (const seriesId of autoSeriesIds) {
      for (const season of seasons.slice(-2)) {
        const num = ['/49', '/25', '/10', '1/1'][Math.floor(Math.random() * 4)];
        db.run(
          `INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, numbering)
           VALUES (?, ?, ?, 'auto', ?, 'Auto', ?)`,
          [playerId, seriesId, season, `#AU-${1 + Math.floor(Math.random() * 99)}`, num],
        );
      }
    }
  }

  // ROOKIE cards: specific players only (Wembanyama, Zion, Ja, Luka, LaMelo, Ant, Cade, Paolo, Haliburton)
  const rookiePlayerIds = [14, 15, 12, 6, 22, 13, 21, 20, 19];
  for (const playerId of rookiePlayerIds) {
    for (const seriesId of [1, 2, 3, 4]) {
      for (const season of seasons) {
        const num = ['/99', '/49', '/25', ''][Math.floor(Math.random() * 4)];
        db.run(
          `INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, numbering)
           VALUES (?, ?, ?, 'rookie', ?, 'RC', ?)`,
          [playerId, seriesId, season, `#RC-${1 + Math.floor(Math.random() * 50)}`, num],
        );
      }
    }
  }

  // Verify and generate prices
  const cardResult = db.exec('SELECT id FROM cards');
  if (!cardResult[0] || cardResult[0].values.length === 0) {
    console.error('Error: No cards were created!');
    return;
  }

  const cardRows = cardResult[0].values;
  console.log(`Created ${cardRows.length} cards, now generating prices...`);

  const insertPrice = 'INSERT INTO price_records (card_id, price, currency, source, source_market, record_date) VALUES (?, ?, ?, ?, ?, ?)';
  const today = new Date();
  let inserted = 0;

  for (const [cardId] of cardRows) {
    // Base price varies by card type
    const cardInfo = db.exec(`SELECT card_type, numbering FROM cards WHERE id = ?`, [cardId]);
    const type = cardInfo[0]?.values[0]?.[0] as string || 'base';
    const num = cardInfo[0]?.values[0]?.[1] as string || '';

    let basePrice = 10 + ((cardId as number) * 7) % 500 + Math.random() * 200;

    // Price multipliers by card type
    if (type === 'parallel') basePrice *= 2.5;
    else if (type === 'insert') basePrice *= 3;
    else if (type === 'jersey') basePrice *= 5;
    else if (type === 'auto') basePrice *= 8;
    else if (type === 'rookie') basePrice *= 4;

    // Numbering multiplier (rarer = more expensive)
    if (num.includes('1/1')) basePrice *= 15;
    else if (num.includes('/5')) basePrice *= 6;
    else if (num.includes('/10')) basePrice *= 4;
    else if (num.includes('/25')) basePrice *= 2.5;
    else if (num.includes('/49')) basePrice *= 1.8;
    else if (num.includes('/99')) basePrice *= 1.3;

    for (let daysAgo = 365; daysAgo >= 0; daysAgo -= 3) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split('T')[0];

      const trend = Math.sin(daysAgo * 0.05) * basePrice * 0.2;
      const noise = (Math.random() - 0.45) * basePrice * 0.1;
      const price = Math.round((basePrice + trend + noise) * 100) / 100;

      db.run(insertPrice, [cardId, price, 'USD', 'eBay', 'overseas', dateStr]);
      inserted++;

      if (daysAgo % 7 < 3) {
        const domesticPrice = Math.round((price * 7.0 + (Math.random() - 0.5) * 50) * 100) / 100;
        db.run(insertPrice, [cardId, domesticPrice, 'CNY', '卡淘', 'domestic', dateStr]);
        inserted++;
      }
    }
  }

  console.log(`Generated ${inserted} price records.`);
}
