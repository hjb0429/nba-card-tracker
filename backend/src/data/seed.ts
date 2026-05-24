import { Database } from 'sql.js';

export function seedIfEmpty(db: Database): void {
  const playerCount = db.exec('SELECT COUNT(*) as c FROM players')[0].values[0][0] as number;
  if (playerCount > 0) return;

  console.log('Seeding database...');

  // NBA players
  const players = [
    ['LeBron James', '勒布朗·詹姆斯', 'LAL'],
    ['Stephen Curry', '斯蒂芬·库里', 'GSW'],
    ['Kevin Durant', '凯文·杜兰特', 'PHX'],
    ['Giannis Antetokounmpo', '扬尼斯·阿德托昆博', 'MIL'],
    ['Nikola Jokic', '尼古拉·约基奇', 'DEN'],
    ['Luka Doncic', '卢卡·东契奇', 'LAL'],
    ['Jayson Tatum', '杰森·塔图姆', 'BOS'],
    ['Joel Embiid', '乔尔·恩比德', 'PHI'],
    ['Shai Gilgeous-Alexander', '谢伊·吉尔杰斯-亚历山大', 'OKC'],
    ['Anthony Davis', '安东尼·戴维斯', 'DAL'],
    ['Devin Booker', '德文·布克', 'PHX'],
    ['Ja Morant', '贾·莫兰特', 'MEM'],
    ['Anthony Edwards', '安东尼·爱德华兹', 'MIN'],
    ['Victor Wembanyama', '维克托·文班亚马', 'SAS'],
    ['Zion Williamson', '锡安·威廉姆森', 'NOP'],
    ['Trae Young', '特雷·杨', 'ATL'],
    ['Donovan Mitchell', '多诺万·米切尔', 'CLE'],
    ['Bam Adebayo', '巴姆·阿德巴约', 'MIA'],
    ['Tyrese Haliburton', '泰雷塞·哈利伯顿', 'IND'],
    ['Paolo Banchero', '保罗·班凯罗', 'ORL'],
    ['Cade Cunningham', '凯德·康宁汉姆', 'DET'],
    ['LaMelo Ball', '拉梅洛·鲍尔', 'CHA'],
    ['Kawhi Leonard', '科怀·伦纳德', 'LAC'],
    ['Damian Lillard', '达米安·利拉德', 'MIL'],
    ['Jimmy Butler', '吉米·巴特勒', 'GSW'],
    ['Kyrie Irving', '凯里·欧文', 'DAL'],
    ['James Harden', '詹姆斯·哈登', 'LAC'],
    ['Kobe Bryant', '科比·布莱恩特', 'LAL'],
    ['Michael Jordan', '迈克尔·乔丹', 'CHI'],
    ['Shaquille ONeal', '沙奎尔·奥尼尔', 'LAL'],
    ['Derek Fisher', '德里克·费舍尔', 'LAL'],
    ['Dennis Rodman', '丹尼斯·罗德曼', 'CHI'],
    ['Yao Ming', '姚明', 'HOU'],
  ];

  const insertPlayer = 'INSERT INTO players (name, name_cn, team) VALUES (?, ?, ?)';
  for (const p of players) {
    db.run(insertPlayer, p);
  }

  // Card series
  const series = [
    ['Prizm', 'Panini'],
    ['Optic', 'Panini'],
    ['Select', 'Panini'],
    ['Mosaic', 'Panini'],
    ['Donruss', 'Panini'],
    ['Hoops', 'Panini'],
    ['Contenders', 'Panini'],
    ['National Treasures', 'Panini'],
    ['Flawless', 'Panini'],
    ['Revolution', 'Panini'],
    ['Noir', 'Panini'],
    ['Hero Villain', 'Panini'],
    ['Donruss Jersey', 'Panini'],
  ];

  const insertSeries = 'INSERT INTO card_series (name, brand) VALUES (?, ?)';
  for (const s of series) {
    db.run(insertSeries, s);
  }

  console.log(`Seeded ${players.length} players and ${series.length} series.`);
}
