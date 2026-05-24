let cachedRate: number | null = null
let lastFetch = 0
const CACHE_TTL = 3600000 // 1 hour

export async function getExchangeRate(): Promise<number> {
  const now = Date.now()
  if (cachedRate && (now - lastFetch) < CACHE_TTL) {
    return cachedRate
  }

  try {
    // Free API from frankfurter.app, no key required
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=CNY')
    if (res.ok) {
      const data = await res.json() as any
      cachedRate = data.rates.CNY as number
      lastFetch = now
      console.log(`Exchange rate updated: 1 USD = ${cachedRate} CNY`)
      return cachedRate!
    }
  } catch (e) {
    console.warn('Failed to fetch exchange rate, using cached/default')
  }

  // Fallback to cached or default
  return cachedRate || 7.25
}
