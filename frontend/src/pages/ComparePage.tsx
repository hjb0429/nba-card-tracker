import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useExchangeRate } from '../hooks/useExchangeRate'

interface CompareItem {
  id: number
  customName: string
  playerName: string | null
  seriesName: string | null
  year: string | null
  parallel: string | null
  cardType: string | null
  numbering: string | null
  purchasePrice: number | null
  purchaseDate: string | null
  photoPath: string | null
  notes: string | null
  overseasPrice: number | null
  overseasDate: string | null
  domesticPrice: number | null
  domesticDate: string | null
  trend: 'up' | 'down' | null
  trendPercent: number | null
  suggestion: 'sell' | 'watch' | 'hold' | null
  suggestionText: string | null
}

export function ComparePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<CompareItem[]>([])
  const [loading, setLoading] = useState(true)
  const [market, setMarket] = useState<'overseas' | 'domestic'>('overseas')
  const { usdToCny, formatCny } = useExchangeRate()
  const [alertPrices, setAlertPrices] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetch('/api/compare', { headers: { Authorization: `Bearer ${user.token}` } })
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user])

  const marketPrice = (item: CompareItem) => {
    const raw = market === 'overseas' ? item.overseasPrice : item.domesticPrice
    if (!raw) return null
    return market === 'overseas' ? usdToCny(raw) : raw
  }

  const summary = useMemo(() => {
    let totalValue = 0
    let totalCost = 0
    let sellCount = 0
    let watchCount = 0
    let holdCount = 0
    for (const item of items) {
      if (item.purchasePrice) totalCost += item.purchasePrice
      const mp = marketPrice(item)
      if (mp) totalValue += mp
      if (item.suggestion === 'sell') sellCount++
      else if (item.suggestion === 'watch') watchCount++
      else holdCount++
    }
    return { totalValue, totalCost, sellCount, watchCount, holdCount, totalCards: items.length }
  }, [items, market, usdToCny])

  if (!user) {
    return (
      <div className="pt-6 md:pt-0 pb-20 md:pb-0 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-xl font-bold text-text mb-2">请先登录</h1>
        <p className="text-text-muted mb-4">登录后可对比持仓与市场价格</p>
        <button onClick={() => navigate('/auth')} className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-deep transition-colors">
          去登录
        </button>
      </div>
    )
  }

  return (
    <div className="pt-6 md:pt-0 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text">比价分析</h1>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <div className="flex gap-1 bg-surface rounded-lg border border-border p-1">
            <button onClick={() => setMarket('overseas')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${market === 'overseas' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>
              eBay 海外
            </button>
            <button onClick={() => setMarket('domestic')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${market === 'domestic' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>
              卡淘 国内
            </button>
          </div>
          {market === 'overseas' && <span className="text-xs">(实时汇率折合人民币)</span>}
        </div>
      </div>

      {/* Summary bar */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface rounded-xl border border-border p-3 text-center">
            <div className="text-xs text-text-muted">总持仓</div>
            <div className="text-lg font-bold text-text">{summary.totalCards}张</div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-3 text-center">
            <div className="text-xs text-text-muted">持仓成本</div>
            <div className="text-lg font-bold text-text">{formatCny(summary.totalCost)}</div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-3 text-center">
            <div className="text-xs text-text-muted">当前市值</div>
            <div className={`text-lg font-bold ${summary.totalValue >= summary.totalCost ? 'text-up' : 'text-down'}`}>
              {formatCny(summary.totalValue)}
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-3 text-center">
            <div className="text-xs text-text-muted">建议分布</div>
            <div className="text-sm font-bold text-text mt-1">
              {summary.sellCount > 0 && <span className="text-up">卖{summary.sellCount} </span>}
              {summary.watchCount > 0 && <span className="text-accent-deep">观{summary.watchCount} </span>}
              {summary.holdCount > 0 && <span className="text-text-muted">持{summary.holdCount}</span>}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-text-muted mb-2">暂无持仓数据</p>
          <button onClick={() => navigate('/portfolio')} className="text-sm text-primary font-medium hover:underline">
            去录入第一张卡 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const mp = marketPrice(item)
            const purchasePrice = item.purchasePrice || 0
            const diff = mp ? mp - purchasePrice : 0
            const diffPercent = purchasePrice > 0 ? (diff / purchasePrice) * 100 : 0
            const isUp = diff >= 0
            const hasData = !!mp

            const suggestionColor =
              item.suggestion === 'sell' ? 'bg-up/10 text-up border-up/30' :
              item.suggestion === 'watch' ? 'bg-accent-light text-accent-deep border-accent-deep/30' :
              'bg-bg text-text-muted border-border'
            const suggestionBg =
              item.suggestion === 'sell' ? 'border-up/20' :
              item.suggestion === 'watch' ? 'border-accent-deep/20' : ''

            return (
              <div key={item.id} className={`bg-surface rounded-xl border shadow-sm p-4 md:p-5 transition-all ${suggestionBg}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Photo */}
                  <div className="flex items-center gap-3 sm:w-80 flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.photoPath ? (
                        <img src={item.photoPath} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">🏀</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-text text-sm truncate">{item.customName}</div>
                      <div className="text-xs text-text-muted">
                        {item.playerName && <span>{item.playerName}</span>}
                        {item.seriesName && <span> · {item.seriesName}</span>}
                        {item.year && <span> · {item.year}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Price comparison */}
                  <div className="flex items-center gap-3 sm:gap-5 flex-1">
                    <div className="text-center flex-shrink-0">
                      <div className="text-[10px] text-text-muted">成本</div>
                      <div className="text-sm font-semibold text-text">{purchasePrice ? formatCny(purchasePrice) : '-'}</div>
                      <div className="text-[10px] text-text-muted">{item.purchaseDate || ''}</div>
                    </div>
                    <div className="text-text-muted text-sm">→</div>
                    <div className="text-center flex-shrink-0">
                      <div className="text-[10px] text-text-muted">市场价</div>
                      <div className={`text-sm font-bold ${hasData ? (isUp ? 'text-up' : 'text-down') : 'text-text-muted'}`}>
                        {hasData ? formatCny(mp!) : '暂无成交'}
                      </div>
                      <div className="text-[10px] text-text-muted">{item.overseasDate || '—'}</div>
                    </div>
                    {hasData && (
                      <div className={`flex items-center gap-1 text-sm font-bold flex-shrink-0 ${isUp ? 'text-up' : 'text-down'}`}>
                        <span className="text-base">{isUp ? '↑' : '↓'}</span>
                        <div>
                          <div>{isUp ? '+' : ''}{diffPercent.toFixed(1)}%</div>
                          <div className="text-[10px]">{isUp ? '+' : '-'}¥{Math.abs(diff).toFixed(0)}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action area */}
                  <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0">
                    {/* Price alert input */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number" placeholder="心理价位"
                        value={alertPrices[item.id] || ''}
                        onChange={(e) => setAlertPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-20 px-2 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-text"
                      />
                      {alertPrices[item.id] && mp && parseFloat(alertPrices[item.id]) <= mp && (
                        <span className="text-up text-xs font-bold">!</span>
                      )}
                    </div>

                    {/* Suggestion badge */}
                    {item.suggestion && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${suggestionColor}`}>
                        {item.suggestionText}
                      </span>
                    )}

                    {/* eBay/Card Hobby links */}
                    <div className="flex gap-1">
                      <a
                        href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(item.customName)}&LH_Sold=1&LH_Complete=1`}
                        target="_blank" rel="noopener noreferrer"
                        title="查看eBay成交价"
                        className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center text-xs hover:bg-accent-light transition-colors"
                      >
                        🔗
                      </a>
                    </div>
                  </div>
                </div>

                {/* Market depth bar */}
                {hasData && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span>市场深度：<span className="font-medium text-text">{isUp ? '高于' : '低于'}成本 {Math.abs(diffPercent).toFixed(1)}%</span></span>
                    {item.trend && (
                      <span>趋势：<span className={`font-medium ${item.trend === 'up' ? 'text-up' : 'text-down'}`}>{item.trend === 'up' ? '持续上涨' : '持续下跌'} {item.trendPercent != null && `${item.trendPercent > 0 ? '+' : ''}${item.trendPercent}%`}</span></span>
                    )}
                    <span>最后更新：{item.overseasDate || '—'}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
