// NBA.com official headshot IDs mapped to our player database IDs
// URL pattern: https://cdn.nba.com/headshots/nba/latest/260x190/NBA_ID.png

const headshotMap: Record<number, number> = {
  1: 2544,      // LeBron James
  2: 201939,    // Stephen Curry
  3: 201142,    // Kevin Durant
  4: 203507,    // Giannis Antetokounmpo
  5: 203999,    // Nikola Jokic
  6: 1629029,   // Luka Doncic
  7: 1628369,   // Jayson Tatum
  8: 203954,    // Joel Embiid
  9: 1628983,   // Shai Gilgeous-Alexander
  10: 203076,   // Anthony Davis
  11: 1626164,  // Devin Booker
  12: 1629630,  // Ja Morant
  13: 1630162,  // Anthony Edwards
  14: 1641705,  // Victor Wembanyama
  15: 1629627,  // Zion Williamson
  16: 1629027,  // Trae Young
  17: 1628378,  // Donovan Mitchell
  18: 1628389,  // Bam Adebayo
  19: 1630169,  // Tyrese Haliburton
  20: 1631094,  // Paolo Banchero
  21: 1628367,  // Cade Cunningham
  22: 1630163,  // LaMelo Ball
  23: 202695,   // Kawhi Leonard
  24: 203081,   // Damian Lillard
  25: 202710,   // Jimmy Butler
  26: 202681,   // Kyrie Irving
  27: 201935,   // James Harden
  28: 977,      // Kobe Bryant
  29: 893,      // Michael Jordan
  30: 406,      // Shaquille O'Neal
  31: 965,      // Derek Fisher
  32: 23,       // Dennis Rodman
  33: 2397,     // Yao Ming
}

export function getNBAHeadshotUrl(playerDbId: number): string {
  const nbaId = headshotMap[playerDbId]
  if (!nbaId) return ''
  return `https://cdn.nba.com/headshots/nba/latest/260x190/${nbaId}.png`
}
