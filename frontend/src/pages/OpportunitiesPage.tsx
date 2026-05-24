import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExchangeRate } from '../hooks/useExchangeRate'
import { getNBAHeadshotUrl } from '../data/nba-headshots'
import { PriceChart } from '../components/PriceChart'

interface OppCard {
  cardId: number
  playerName: string
  playerNameEn: string
  team: string
  seriesName: string
  year: string
  cardType: string
  parallel: string
  numbering: string | null
  insertName: string | null
  latestPrice: number
  avgPrice: number
  maxPrice: number
  dropFromPeak: number
  dropFromAvg: number
  trend: string
  score: number
}

interface PlayerGroup {
  player: string
  team: string
  count: number
  cards: OppCard[]
}

export function OpportunitiesPage() {
  const [topCards, setTopCards] = useState<OppCard[]>([])
  const [playerGroups, setPlayerGroups] = useState<PlayerGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  const [players, setPlayers] = useState<any[]>([])
  const { usdToCny, formatCny } = useExchangeRate()

  useEffect(() => {
    Promise.all([
      fetch('/api/opportunities').then((r) => r.json()),
      fetch('/api/players').then((r) => r.json()),
    ]).then(([data, p]) => {
      setTopCards(data.topCards || [])
      setPlayerGroups(data.byPlayer || [])
      setPlayers(p)
      setLoading(false)
    })
  }, [])

  const getPlayerId = (name: string) => {
    const found = players.find((p) => p.name_cn === name || p.name === name)
    return found?.id
  }

  if (selectedCardId) {
    return (
      <div className="pt-6 md:pt-0 pb-20 md:pb-0">
        <button onClick={() => setSelectedCardId(null)} className="text-text-muted hover:text-text text-sm flex items-center gap-1 mb-4">
          <span className="text-lg leading-none">&larr;</span> 返回机会列表
        </button>
        <PriceChart cardId={selectedCardId} />
      </div>
    )
  }

  return (
    <div className="pt-6 md:pt-0 pb-20 md:pb-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">市场机会</h1>
        <p className="text-sm text-text-muted mt-1">自动发现当前价格低于历史水平的卡片，挖掘买入机会</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : topCards.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-text-muted">当前未发现明显低估机会</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary banner */}
          <div className="bg-gradient-to-r from-up/5 to-accent-light/5 rounded-xl border border-border p-4">
            <div className="text-sm font-medium text-text mb-1">发现 {topCards.length} 个潜在机会</div>
            <div className="text-xs text-text-muted">基于与历史峰值及均价的偏离度自动筛选，仅供参考</div>
          </div>

          {/* By player groups */}
          {playerGroups.slice(0, 5).map((group) => (
            <div key={group.player} className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-bg border-b border-border flex items-center gap-3">
                {getPlayerId(group.player) && (
                  <img src={getNBAHeadshotUrl(getPlayerId(group.player)!)} alt="" className="w-9 h-9 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
                <div>
                  <div className="font-semibold text-text">{group.player}</div>
                  <div className="text-xs text-text-muted">{group.team} · {group.count}款卡被低估</div>
                </div>
              </div>
              <div className="divide-y divide-border">
                {group.cards.slice(0, 5).map((card) => {
                  const cnyLatest = usdToCny(card.latestPrice)
                  const cnyAvg = usdToCny(card.avgPrice)
                  const cnyMax = usdToCny(card.maxPrice)
                  const savings = cnyAvg - cnyLatest

                  return (
                    <button key={card.cardId} onClick={() => setSelectedCardId(card.cardId)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg/50 transition-colors text-left">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                        card.score >= 40 ? 'bg-down' : card.score >= 25 ? 'bg-orange-400' : 'bg-accent-deep'
                      }`}>
                        {card.score >= 40 ? '!' : card.score >= 25 ? '↓' : '~'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text truncate">
                          {card.seriesName} · {card.year}
                          <span className="text-text-muted font-normal"> {card.parallel}</span>
                          {card.numbering && <span className="text-primary-deep font-mono text-xs ml-1">{card.numbering}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className="text-text-muted">
                            当前 <span className="font-semibold text-text">{formatCny(cnyLatest)}</span>
                          </span>
                          <span className="text-text-muted">
                            均价 <span className="text-text">{formatCny(cnyAvg)}</span>
                          </span>
                          <span className="text-text-muted">
                            峰值 <span className="text-text">{formatCny(cnyMax)}</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-down">-{card.dropFromPeak}%</div>
                        <div className="text-[10px] text-text-muted">
                          低于均价{savings > 0 ? formatCny(savings) : ''}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Top cards rank list */}
          <div className="bg-surface rounded-xl border border-border shadow-sm p-4">
            <h3 className="font-semibold text-text mb-3">机会排行 Top 20</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-text-muted border-b border-border">
                    <th className="text-left py-2 font-medium">#</th>
                    <th className="text-left py-2 font-medium">球员</th>
                    <th className="text-left py-2 font-medium">卡片</th>
                    <th className="text-right py-2 font-medium">当前</th>
                    <th className="text-right py-2 font-medium">均价</th>
                    <th className="text-right py-2 font-medium">跌幅</th>
                  </tr>
                </thead>
                <tbody>
                  {topCards.slice(0, 20).map((card, i) => (
                    <tr key={card.cardId} className="border-b border-border hover:bg-bg/30 cursor-pointer"
                      onClick={() => setSelectedCardId(card.cardId)}>
                      <td className="py-2 text-text-muted">{i + 1}</td>
                      <td className="py-2">
                        <div className="font-medium text-text">{card.playerName}</div>
                        <div className="text-xs text-text-muted">{card.team}</div>
                      </td>
                      <td className="py-2">
                        <div className="text-text">{card.seriesName} {card.year}</div>
                        <div className="text-xs text-text-muted">{card.parallel}{card.numbering ? ` ${card.numbering}` : ''}</div>
                      </td>
                      <td className="py-2 text-right font-medium text-text">{formatCny(usdToCny(card.latestPrice))}</td>
                      <td className="py-2 text-right text-text-muted">{formatCny(usdToCny(card.avgPrice))}</td>
                      <td className="py-2 text-right font-bold text-down">-{card.dropFromPeak}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
