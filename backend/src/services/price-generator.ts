import { Database } from 'sql.js';

export function generateMockPrices(db: Database): void {
  const cardCount = db.exec('SELECT COUNT(*) as c FROM cards')[0];
  if (cardCount && (cardCount.values[0][0] as number) > 0) return;

  console.log('Creating card structures (no mock prices)...');

  const allPlayerIds = Array.from({ length: 33 }, (_, i) => i + 1);
  const seasons = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'];

  const mainSeriesIds = [1, 2, 3, 4, 11];
  const parallels = ['Base', 'Silver', 'Red /299', 'Blue /99', 'Gold /10', '雨夜', 'Mojo', 'Cracked Ice'];
  const parallelTypes: [string, string][] = [
    ['Red', '/299'], ['Blue', '/99'], ['Purple', '/49'],
    ['Gold', '/10'], ['Green', '/5'], ['Black', '1/1'],
  ];
  const topPlayers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 28, 29, 30, 33];

  // BASE cards
  for (const playerId of allPlayerIds) {
    for (const seriesId of mainSeriesIds) {
      for (const season of seasons) {
        db.run(
          'INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel) VALUES (?, ?, ?, ?, ?, ?)',
          [playerId, seriesId, season, 'base', `#${100 + Math.floor(Math.random() * 300)}`, 'Base'],
        );
      }
    }
  }

  // PARALLEL numbered cards
  for (const playerId of topPlayers) {
    for (const seriesId of [1, 2, 3]) {
      for (const season of seasons.slice(-3)) {
        const [parallel, numbering] = parallelTypes[Math.floor(Math.random() * parallelTypes.length)];
        db.run(
          'INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, numbering) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [playerId, seriesId, season, 'parallel', `#${10 + Math.floor(Math.random() * 200)}`, parallel, numbering],
        );
      }
    }
  }

  // INSERT cards (Hero Villain)
  const insertNames = ['Hero', 'Villain', 'Dual'];
  for (const playerId of topPlayers.slice(0, 20)) {
    for (const season of seasons.slice(-2)) {
      const insertName = insertNames[Math.floor(Math.random() * insertNames.length)];
      const num = ['/99', '/49', '/25', ''][Math.floor(Math.random() * 4)];
      db.run(
        'INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, insert_name, numbering) VALUES (?, 12, ?, ?, ?, ?, ?, ?)',
        [playerId, season, 'insert', `#HV-${10 + Math.floor(Math.random() * 90)}`, 'Insert', insertName, num],
      );
    }
  }

  // JERSEY cards
  const jerseyTypes = ['Jersey', 'Patch', 'Prime Patch'];
  for (const playerId of topPlayers.slice(0, 15)) {
    for (const season of seasons.slice(-3)) {
      const num = ['/25', '/10', '/5', '1/1'][Math.floor(Math.random() * 4)];
      db.run(
        'INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, numbering) VALUES (?, 13, ?, ?, ?, ?, ?)',
        [playerId, season, 'jersey', `#JS-${1 + Math.floor(Math.random() * 50)}`, jerseyTypes[Math.floor(Math.random() * 3)], num],
      );
    }
  }

  // AUTO cards
  for (const playerId of topPlayers.slice(0, 10)) {
    for (const seriesId of [1, 8, 9]) {
      for (const season of seasons.slice(-2)) {
        const num = ['/49', '/25', '/10', '1/1'][Math.floor(Math.random() * 4)];
        db.run(
          'INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, numbering) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [playerId, seriesId, season, 'auto', `#AU-${1 + Math.floor(Math.random() * 99)}`, 'Auto', num],
        );
      }
    }
  }

  // ROOKIE cards
  const rookieIds = [14, 15, 12, 6, 22, 13, 21, 20, 19];
  for (const playerId of rookieIds) {
    for (const seriesId of [1, 2, 3, 4]) {
      for (const season of seasons) {
        db.run(
          'INSERT INTO cards (player_id, series_id, year, card_type, card_number, parallel, numbering) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [playerId, seriesId, season, 'rookie', `#RC-${1 + Math.floor(Math.random() * 50)}`, 'RC', '/99'],
        );
      }
    }
  }

  const finalCount = db.exec('SELECT COUNT(*) as c FROM cards')[0].values[0][0] as number;
  console.log(`Created ${finalCount} cards (prices from eBay API).`);
}
