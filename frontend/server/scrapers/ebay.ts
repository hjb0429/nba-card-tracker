import * as cheerio from 'cheerio';

interface SoldListing {
  title: string
  price: number
  date: string
  imageUrl: string | null
  url: string
}

const DELAY_MS = 2000; // 2s between requests

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeEbay(playerName: string, seriesName: string, year: string): Promise<SoldListing[]> {
  const query = `${playerName} ${seriesName} ${year} basketball card`;
  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=10&_ipg=60`;

  console.log(`[eBay] Searching: ${query}`);

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Dnt': '1',
      },
    });

    if (!res.ok) {
      console.warn(`[eBay] HTTP ${res.status} for: ${query}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const listings: SoldListing[] = [];

    // eBay search result items
    $('.s-item').each((_i, el) => {
      const $el = $(el);
      const title = $el.find('.s-item__title').text().trim();
      const priceText = $el.find('.s-item__price').text().trim();
      const dateText = $el.find('.s-item__title--tagblock .POSITIVE, .s-item__ended-date').text().trim();
      const imgSrc = $el.find('.s-item__image-img img, .s-item__image-wrapper img').attr('src') || null;
      const url = $el.find('.s-item__link').attr('href') || '';

      if (!title || !priceText) return;

      // Extract numeric price
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (!priceMatch) return;
      const price = parseFloat(priceMatch[0].replace(/,/g, ''));

      listings.push({
        title,
        price,
        date: dateText || '',
        imageUrl: imgSrc,
        url,
      });
    });

    console.log(`[eBay] Found ${listings.length} sold listings for: ${query}`);
    return listings;
  } catch (err) {
    console.error(`[eBay] Error scraping: ${query}`, (err as Error).message);
    return [];
  }
}

export async function scrapeEBayWithDelay(
  playerName: string,
  seriesName: string,
  year: string,
): Promise<SoldListing[]> {
  const results = await scrapeEbay(playerName, seriesName, year);
  await sleep(DELAY_MS);
  return results;
}
