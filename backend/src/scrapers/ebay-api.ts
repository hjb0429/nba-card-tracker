/**
 * eBay Browse API integration
 *
 * Requires a free eBay Developer account:
 * 1. Go to https://developer.ebay.com/
 * 2. Sign up for a developer account (free)
 * 3. Create an app to get App ID (production keyset)
 * 4. Set EBAY_APP_ID environment variable
 *
 * Free tier: 5,000 API calls/day
 */

interface EbayItemSummary {
  itemId: string
  title: string
  price: { value: string; currency: string }
  image: { imageUrl: string }
  itemWebUrl: string
  priceDisplayCondition: string
  buyingOptions: string[]
  soldDate?: string
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[]
  total?: number
}

let EBAY_APP_ID = process.env.EBAY_APP_ID || ''

export function setEbayAppId(id: string) {
  EBAY_APP_ID = id
}

export async function searchEbaySoldItems(
  query: string,
  limit = 10,
): Promise<EbayItemSummary[]> {
  if (!EBAY_APP_ID) {
    throw new Error(
      'eBay App ID not configured.\n' +
      '1. Register at https://developer.ebay.com/ (free)\n' +
      '2. Create app → Get App ID\n' +
      '3. Set env: EBAY_APP_ID=your-id'
    )
  }

  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('filter', 'soldItems:{true}')

  try {
    // Step 1: Get OAuth token
    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${EBAY_APP_ID}:${EBAY_APP_ID}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    })

    if (!tokenRes.ok) {
      throw new Error(`OAuth failed: ${tokenRes.status} - Check your EBAY_APP_ID`)
    }

    const tokenData = await tokenRes.json() as { access_token: string }
    const token = tokenData.access_token

    // Step 2: Search sold items
    const searchRes = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })

    if (!searchRes.ok) {
      const error = await searchRes.text()
      throw new Error(`Search failed: ${searchRes.status} - ${error}`)
    }

    const data = await searchRes.json() as EbaySearchResponse
    return data.itemSummaries || []
  } catch (err) {
    throw err
  }
}
