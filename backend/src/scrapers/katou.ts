import * as cheerio from 'cheerio';

interface KatouListing {
  title: string
  price: number
  date: string
  imageUrl: string | null
  url: string
}

const DELAY_MS = 3000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeKatou(playerName: string, seriesName: string, year: string): Promise<KatouListing[]> {
  const query = `${playerName} ${seriesName} ${year}`;
  const searchUrl = `https://www.cardhobby.com/market/search?keyword=${encodeURIComponent(query)}&status=3&sort=0`;

  console.log(`[卡淘] Searching: ${query}`);

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });

    if (!res.ok) {
      console.warn(`[卡淘] HTTP ${res.status} for: ${query}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const listings: KatouListing[] = [];

    // Card Hobby listing items (adjust selectors based on actual page structure)
    $('.auction-item, .market-item, .card-item, .product-item, li[class*="item"]').each((_i, el) => {
      const $el = $(el);
      const title = $el.find('.title, .name, h3, h4, a[class*="title"]').first().text().trim();
      const priceText = $el.find('.price, .current-price, .final-price, span[class*="price"]').first().text().trim();
      const dateText = $el.find('.time, .date, .end-time, span[class*="time"]').first().text().trim();
      const imgSrc = $el.find('img').first().attr('src') || null;
      const href = $el.find('a').first().attr('href') || '';

      if (!title && !priceText) return;

      // Extract numeric price (CNY)
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;

      let url = href;
      if (url && !url.startsWith('http')) {
        url = `https://www.cardhobby.com${url}`;
      }

      listings.push({
        title: title || query,
        price,
        date: dateText || '',
        imageUrl: imgSrc,
        url,
      });
    });

    // Fallback: try generic card list structure
    if (listings.length === 0) {
      $('.list-item, .row, .card, .col').each((_i, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        if (text.length < 10) return;

        const priceMatch = text.match(/[¥￥]\s*([\d,]+\.?\d*)/);
        if (!priceMatch) return;

        listings.push({
          title: text.slice(0, 80),
          price: parseFloat(priceMatch[1].replace(/,/g, '')),
          date: '',
          imageUrl: $el.find('img').first().attr('src') || null,
          url: '',
        });
      });
    }

    console.log(`[卡淘] Found ${listings.length} listings for: ${query}`);
    return listings;
  } catch (err) {
    console.error(`[卡淘] Error scraping: ${query}`, (err as Error).message);
    return [];
  }
}

export async function scrapeKatouWithDelay(
  playerName: string,
  seriesName: string,
  year: string,
): Promise<KatouListing[]> {
  const results = await scrapeKatou(playerName, seriesName, year);
  await sleep(DELAY_MS);
  return results;
}
