/**
 * eBay Browse API integration
 * Free tier: 5,000 API calls/day
 */

interface EbayItemSummary {
  itemId: string
  title: string
  price: { value: string; currency: string }
  image: { imageUrl: string }
  itemWebUrl: string
  buyingOptions: string[]
  soldDate?: string
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[]
  total?: number
}

const EBAY_APP_ID = process.env.EBAY_APP_ID || ''
const EBAY_CERT_ID = process.env.EBAY_CERT_ID || ''

async function getOAuthToken(): Promise<string> {
  const auth = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64')

  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`eBay OAuth failed: ${res.status} - ${errText}`)
  }

  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function searchEbaySoldItems(
  query: string,
  limit = 10,
): Promise<EbayItemSummary[]> {
  try {
    const token = await getOAuthToken()

    const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search')
    url.searchParams.set('q', query)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE|AUCTION|BEST_OFFER}')

    const searchRes = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })

    if (!searchRes.ok) {
      const error = await searchRes.text()
      throw new Error(`eBay search failed: ${searchRes.status} - ${error}`)
    }

    const data = await searchRes.json() as EbaySearchResponse
    console.log(`[eBay API] Found ${data.itemSummaries?.length || 0} results for: ${query}`)
    return data.itemSummaries || []
  } catch (err) {
    console.error(`[eBay API] Error: ${(err as Error).message}`)
    return []
  }
}
