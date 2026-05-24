import { useState, useEffect } from 'react'

let cachedRate = 7.25
let listeners: ((r: number) => void)[] = []
let fetched = false

async function fetchRate() {
  try {
    const res = await fetch('/api/exchange-rate')
    if (res.ok) {
      const data = await res.json()
      cachedRate = data.rate
      listeners.forEach((fn) => fn(cachedRate))
    }
  } catch { /* use cached */ }
  fetched = true
}

export function useExchangeRate() {
  const [rate, setRate] = useState(cachedRate)

  useEffect(() => {
    if (!fetched) fetchRate()
    const handler = (r: number) => setRate(r)
    listeners.push(handler)
    return () => { listeners = listeners.filter((l) => l !== handler) }
  }, [])

  function usdToCny(usd: number) {
    return Math.round(usd * rate * 100) / 100
  }

  function formatCny(value: number) {
    if (value >= 10000) return `¥${(value / 10000).toFixed(1)}万`
    return `¥${value.toFixed(0)}`
  }

  return { rate, usdToCny, formatCny }
}
