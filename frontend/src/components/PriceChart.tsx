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

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [cardRes, priceRes, rateRes] = await Promise.all([
        fetch(`/api/cards/${cardId}`),
        fetch(`/api/cards/${cardId}/prices?days=${days}`),
        fetch('/api/exchange-rate'),
      ])
      const card = await cardRes.json()
      const prices: PriceRecord[] = await priceRes.json()
      const { rate } = await rateRes.json()
      setCardInfo(card)

      // Aggregate by date, convert USD to CNY
      const byDate = new Map<string, { overseas: number[]; domestic: number[] }>()
      for (const p of prices) {
        if (!byDate.has(p.record_date)) {
          byDate.set(p.record_date, { overseas: [], domestic: [] })
        }
        const entry = byDate.get(p.record_date)!
        if (p.source_market === 'overseas') entry.overseas.push(p.price * rate)
        else entry.domestic.push(p.price)
      }

      const chartData: ChartData[] = []
      for (const [date, d] of byDate) {
        const point: ChartData = { date }
        if (d.overseas.length) point.overseas = Math.round(d.overseas.reduce((a, b) => a + b, 0) / d.overseas.length * 100) / 100
        if (d.domestic.length) point.domestic = Math.round(d.domestic.reduce((a, b) => a + b, 0) / d.domestic.length * 100) / 100
        chartData.push(point)
      }
      chartData.sort((a, b) => a.date.localeCompare(b.date))
      setData(chartData)

      // Calculate stats in CNY
      const overseasPrices = chartData.filter((d) => d.overseas).map((d) => d.overseas!)
      if (overseasPrices.length >= 2) {
        const latest = overseasPrices[overseasPrices.length - 1]
        const oldest = overseasPrices[0]
        setStats({ latest, change: latest - oldest, changePercent: ((latest - oldest) / oldest) * 100 })
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
          <div className="w-11 h-11 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
            <span className="text-primary-deep font-bold">{cardInfo.player_name_cn?.charAt(0)}</span>
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
        <div className="flex flex-wrap gap-2 mb-4">
          <a
            href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cardInfo.player_name + ' ' + cardInfo.series_name + ' ' + cardInfo.year + ' ' + (cardInfo.parallel || ''))}&LH_Sold=1&LH_Complete=1`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:border-primary/30 transition-colors"
          >
            🔗 查看 eBay 成交价
          </a>
          <a
            href={`https://www.cardhobby.com/market/search?keyword=${encodeURIComponent(cardInfo.player_name_cn || cardInfo.player_name)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:border-primary/30 transition-colors"
          >
            🔗 查看 卡淘 成交价
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
              formatter={(value: number, name: string) => [
                `¥${value.toFixed(2)}`,
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
