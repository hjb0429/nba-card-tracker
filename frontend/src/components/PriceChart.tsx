import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useExchangeRate } from '../hooks/useExchangeRate'

interface PriceRecord {
  id: number
  card_id: number
  price: number
  currency: string
  source: string
  source_market: string
  record_date: string
}

interface ChartData {
  date: string
  overseas?: number
  domestic?: number
}

const TIME_RANGES = [
  { label: '1周', days: 7 },
  { label: '1月', days: 30 },
  { label: '3月', days: 90 },
  { label: '1年', days: 365 },
]

export function PriceChart({ cardId }: { cardId: number }) {
  const [data, setData] = useState<ChartData[]>([])
  const [days, setDays] = useState(90)
  const [loading, setLoading] = useState(true)
  const [cardInfo, setCardInfo] = useState<any>(null)
  const { usdToCny, formatCny } = useExchangeRate()
  const [stats, setStats] = useState<{ latest: number; change: number; changePercent: number } | null>(null)

  const [liveData, setLiveData] = useState<any>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [cardRes, rateRes] = await Promise.all([
        fetch(`/api/cards/${cardId}`),
        fetch('/api/exchange-rate'),
      ])
      const card = await cardRes.json()
      const { rate } = await rateRes.json()
      setCardInfo(card)

      // Try live eBay data first, fall back to cached prices
      try {
        const liveRes = await fetch(`/api/cards/${cardId}/live-prices`)
        if (liveRes.ok) {
          const live = await liveRes.json()
          setLiveData(live)

          const prices = live.prices || []
          if (prices.length > 0) {
            const chartData: ChartData[] = prices
              .filter((p: any) => p.price > 0)
              .map((p: any, i: number) => ({
                date: `#${i + 1}`,
                overseas: Math.round(p.price * rate * 100) / 100,
              }))
            setData(chartData)

            const cnyPrices = chartData.map((d) => d.overseas!).filter(Boolean)
            if (cnyPrices.length >= 1) {
              const latest = cnyPrices[0]
              const oldest = cnyPrices[cnyPrices.length - 1]
              setStats({ latest, change: latest - oldest, changePercent: cnyPrices.length >= 2 ? ((latest - oldest) / oldest) * 100 : 0 })
            }
            setLoading(false)
            return
          }
        }
      } catch { /* fallback */ }

      // Fallback: load cached prices from DB
      const priceRes = await fetch(`/api/cards/${cardId}/prices?days=${days}`)
      const prices: any[] = await priceRes.json()

      const byDate = new Map<string, number[]>()
      for (const p of prices) {
        if (!byDate.has(p.record_date)) byDate.set(p.record_date, [])
        byDate.get(p.record_date)!.push(p.source_market === 'overseas' ? p.price * rate : p.price)
      }

      const chartData: ChartData[] = []
      for (const [date, vals] of byDate) {
        chartData.push({ date, overseas: Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*100)/100 })
      }
      chartData.sort((a, b) => a.date.localeCompare(b.date))
      setData(chartData)

      if (chartData.length >= 2) {
        const latest = chartData[chartData.length-1].overseas!
        const oldest = chartData[0].overseas!
        setStats({ latest, change: latest-oldest, changePercent: ((latest-oldest)/oldest)*100 })
      }

      setLoading(false)
    }
    load()
  }, [cardId, days])

  const formatDate = (d: string) => {
    if (days <= 7) return d.slice(5)
    if (days <= 90) return d.slice(5)
    return d
  }

  const formatPrice = (v: number) => {
    if (v >= 10000) return `¥${(v / 10000).toFixed(1)}w`
    if (v >= 1000) return `¥${(v / 1000).toFixed(1)}k`
    return `¥${v.toFixed(0)}`
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-4 md:p-6">
      {/* Card info header */}
      {cardInfo && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-accent-light border border-border">
            {cardInfo.image_url ? (
              <img src={cardInfo.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-primary-deep font-bold text-lg">
                {cardInfo.player_name_cn?.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text">{cardInfo.player_name_cn} <span className="text-text-muted font-normal">{cardInfo.player_name}</span></div>
            <div className="text-xs text-text-muted flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{cardInfo.series_name} · {cardInfo.year}</span>
              {cardInfo.card_type && cardInfo.card_type !== 'base' && (
                <span className="text-primary-deep font-medium">{cardInfo.card_type === 'parallel' ? '平行' : cardInfo.card_type === 'insert' ? `特卡·${cardInfo.insert_name || ''}` : cardInfo.card_type === 'jersey' ? '球衣' : cardInfo.card_type === 'auto' ? '签字' : cardInfo.card_type === 'rookie' ? '新秀RC' : cardInfo.card_type}</span>
              )}
              <span>{cardInfo.parallel || 'Base'}</span>
              {cardInfo.numbering && <span className="font-mono text-primary-deep">{cardInfo.numbering}</span>}
            </div>
          </div>
          {stats && (
            <div className={`text-right flex-shrink-0 ${stats.change >= 0 ? 'text-up' : 'text-down'}`}>
              <div className="text-lg font-bold">{formatCny(stats.latest)}</div>
              <div className="text-xs font-medium">
                {stats.change >= 0 ? '↑' : '↓'} {Math.abs(stats.changePercent).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* External price lookup links */}
      {cardInfo && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {liveData && (
            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
              ✓ eBay实时数据 ({liveData.total || 0}条)
            </span>
          )}
          <a
            href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cardInfo.player_name + ' ' + cardInfo.series_name + ' ' + cardInfo.year + ' ' + (cardInfo.parallel || ''))}&LH_Sold=1&LH_Complete=1`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:border-primary/30 transition-colors"
          >
            🔗 查看 eBay 成交价
          </a>
        </div>
      )}

      {/* Time range selector */}
      <div className="flex gap-1 mb-4">
        {TIME_RANGES.map((t) => (
          <button
            key={t.days}
            onClick={() => setDays(t.days)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              days === t.days
                ? 'bg-primary text-white'
                : 'bg-bg text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-text-muted text-sm">
          暂无价格数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid stroke="#E8E6F0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: '#8E8EA0' }}
              axisLine={{ stroke: '#E8E6F0' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: '#8E8EA0' }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #E8E6F0',
                boxShadow: '0 2px 8px rgba(91,74,140,0.1)',
                fontSize: 12,
              }}
              labelFormatter={(d) => `日期: ${d}`}
              formatter={(value, name) => [
                `¥${Number(value).toFixed(2)}`,
                name === 'overseas' ? '海外(eBay折合)' : '国内(卡淘)',
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value: string) => value === 'overseas' ? '海外(eBay折合人民币)' : '国内(卡淘)'}
            />
            <Line
              type="monotone"
              dataKey="overseas"
              stroke="#8B7EC8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#8B7EC8' }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="domestic"
              stroke="#C9A84C"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#C9A84C' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
