import { useState, useEffect, useMemo } from 'react'
import { PriceChart } from '../components/PriceChart'
import { getNBAHeadshotUrl } from '../data/nba-headshots'

interface Player { id: number; name: string; name_cn: string; team: string }
interface Series { id: number; name: string; brand: string }
interface Card {
  id: number; player_id: number; series_id: number; year: string
  card_type: string; card_number: string; parallel: string
  insert_name: string | null; numbering: string | null; image_url: string | null
  player_name: string; player_name_cn: string; team: string
  series_name: string
}

const teamColors: Record<string, { bg: string; text: string }> = {
  LAL: { bg: '#F5EDD6', text: '#552583' }, GSW: { bg: '#E8F0FE', text: '#1D428A' },
  PHX: { bg: '#FDE8E0', text: '#E56020' }, MIL: { bg: '#E8F5E8', text: '#00471B' },
  DEN: { bg: '#E8F0FE', text: '#0E2240' }, BOS: { bg: '#E8F5E8', text: '#007A33' },
  PHI: { bg: '#E8F0FE', text: '#006BB6' }, OKC: { bg: '#E8F0FE', text: '#007AC1' },
  DAL: { bg: '#E8F0FE', text: '#00538C' }, MEM: { bg: '#E8F0FE', text: '#5D76A9' },
  MIN: { bg: '#E8F0FE', text: '#0C2340' }, SAS: { bg: '#F0F0F0', text: '#000000' },
  NOP: { bg: '#E8F0FE', text: '#0C2340' }, ATL: { bg: '#FDE8E0', text: '#C8102E' },
  CLE: { bg: '#FDE8E0', text: '#860038' }, MIA: { bg: '#FDE8E0', text: '#98002E' },
  IND: { bg: '#E8F5E8', text: '#002D62' }, ORL: { bg: '#E8F0FE', text: '#0077C0' },
  DET: { bg: '#E8F0FE', text: '#C8102E' }, CHA: { bg: '#E8F0FE', text: '#1D1160' },
  LAC: { bg: '#E8F0FE', text: '#C8102E' }, CHI: { bg: '#FDE8E0', text: '#CE1141' },
  HOU: { bg: '#FDE8E0', text: '#CE1141' },
}

const cardTypeBadge: Record<string, { icon: string; label: string; bg: string }> = {
  base: { icon: '', label: 'Base', bg: 'bg-white/80' },
  parallel: { icon: '◆', label: '平行', bg: 'bg-blue-50' },
  insert: { icon: '◆', label: '特卡', bg: 'bg-purple-50' },
  jersey: { icon: '◆', label: '球衣', bg: 'bg-amber-50' },
  auto: { icon: '◆', label: '签字', bg: 'bg-red-50' },
  rookie: { icon: '◆', label: 'RC', bg: 'bg-green-50' },
}

function PlayerAvatar({ playerId, name, team }: { playerId: number; name: string; team: string }) {
  const url = getNBAHeadshotUrl(playerId)
  const c = teamColors[team] || { bg: '#F5EDD6', text: '#5B4A8C' }
  return (
    <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 ring-2 ring-offset-1 flex-shrink-0"
      style={{ ['--tw-ring-color' as any]: c.text }}>
      <img src={url} alt={name} className="w-full h-full object-cover"
        onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; t.parentElement!.style.backgroundColor = c.bg; t.parentElement!.innerHTML = `<span style="color:${c.text};font-size:1.25rem;font-weight:700">${name.charAt(0)}</span>` }} />
    </div>
  )
}

function CardImage({ card, player, fetchedImage }: { card: Card; player: Player; fetchedImage?: string }) {
  const nbaUrl = getNBAHeadshotUrl(player.id)
  const c = teamColors[player.team] || { bg: '#F5EDD6', text: '#5B4A8C' }
  const badge = cardTypeBadge[card.card_type] || cardTypeBadge.base
  const imgSrc = fetchedImage || card.image_url || nbaUrl

  return (
    <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-border bg-gray-100 group">
      {/* Card image - real card photo or NBA headshot fallback */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img src={imgSrc} alt="" className="w-full h-full object-cover group-hover:opacity-100 transition-opacity"
          style={{ opacity: card.image_url ? 1 : 0.85 }}
          onError={(e) => {
            const t = e.currentTarget as HTMLImageElement
            if (t.src === nbaUrl) {
              t.style.display = 'none'
              const parent = t.parentElement!
              parent.style.backgroundColor = c.bg
              parent.innerHTML = `<span style="color:${c.text};font-size:3rem;font-weight:900;opacity:0.3">${player.name_cn.charAt(0)}</span>`
            }
          }} />
      </div>

      {/* Source badge - indicate real vs mock data */}
      {card.image_url && (
        <div className="absolute top-10 left-2 bg-green-500 text-white text-[8px] px-1 rounded">
          实拍
        </div>
      )}

      {/* Top badge */}
      <div className="absolute top-2 left-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${badge.bg}`}>
          {badge.icon} {badge.label}
        </span>
      </div>

      {/* Numbering (bottom-right) */}
      {card.numbering && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
          {card.numbering}
        </div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-1.5">
        <div className="text-white text-[11px] font-semibold truncate">{card.series_name}</div>
        <div className="text-white/80 text-[9px] truncate">
          {card.insert_name ? `${card.insert_name} · ` : ''}{card.parallel} · {card.year}
        </div>
      </div>
    </div>
  )
}

export function MarketPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [search, setSearch] = useState('')
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Drill-down state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerCards, setPlayerCards] = useState<Card[]>([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [cardImages, setCardImages] = useState<Record<number, string>>({})
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [pRes, sRes] = await Promise.all([fetch('/api/players'), fetch('/api/series')])
      setPlayers(await pRes.json())
      setSeries(await sRes.json())
      setLoading(false)
    }
    load()
  }, [])

  function selectPlayer(player: Player) {
    setSelectedPlayer(player)
    setSelectedCardId(null)
    setSelectedSeriesId(null)
    setCardsLoading(true)
    const sid = selectedSeries ? `&series_id=${selectedSeries}` : ''
    fetch(`/api/cards?player_id=${player.id}${sid}`)
      .then((r) => r.json())
      .then((data) => { setPlayerCards(data); setCardsLoading(false) })
  }

  function back() {
    if (selectedCardId) { setSelectedCardId(null); return }
    if (selectedSeriesId) { setSelectedSeriesId(null); return }
    setSelectedPlayer(null)
    setPlayerCards([])
  }

  // Group cards by series
  const cardsBySeries = useMemo(() => {
    const map = new Map<number, { series: Series; cards: Card[] }>()
    for (const card of playerCards) {
      if (!map.has(card.series_id)) {
        const s = series.find((x) => x.id === card.series_id) || { id: card.series_id, name: card.series_name, brand: '' }
        map.set(card.series_id, { series: s, cards: [] })
      }
      map.get(card.series_id)!.cards.push(card)
    }
    return Array.from(map.values())
  }, [playerCards, series])

  // Fetch eBay images for visible cards
  useEffect(() => {
    if (!selectedSeriesId || filteredCards.length === 0) return
    const idsWithoutImage = filteredCards.filter((c) => !c.image_url).map((c) => c.id)
    if (idsWithoutImage.length === 0) return
    fetch('/api/cards/batch-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardIds: idsWithoutImage.slice(0, 10) }),
    })
      .then((r) => r.json())
      .then((images: Record<number, string | null>) => {
        setCardImages((prev) => {
          const next = { ...prev }
          for (const [id, url] of Object.entries(images)) {
            if (url) next[Number(id)] = url
          }
          return next
        })
      })
      .catch(() => {})
  }, [selectedSeriesId, filteredCards.length])

  // Filter by selected series
  const filteredCards = selectedSeriesId
    ? playerCards.filter((c) => c.series_id === selectedSeriesId)
    : []

  const filtered = players.filter((p) => {
    if (search) {
      const kw = search.toLowerCase()
      if (!p.name.toLowerCase().includes(kw) && !p.name_cn.includes(kw)) return false
    }
    return true
  })

  const pageTitle = selectedCardId
    ? '价格走势'
    : selectedSeriesId
    ? series.find((s) => s.id === selectedSeriesId)?.name || '卡片列表'
    : selectedPlayer
    ? selectedPlayer.name_cn
    : '市场行情'

  return (
    <div className="pt-6 md:pt-0 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {(selectedPlayer || selectedCardId) && (
            <button onClick={back} className="text-text-muted hover:text-text text-sm flex items-center gap-1">
              <span className="text-lg leading-none">&larr;</span> 返回
            </button>
          )}
          <h1 className="text-2xl font-bold text-text">{pageTitle}</h1>
        </div>
        {!selectedPlayer && (
          <input type="text" placeholder="搜索球员..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-text placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-64" />
        )}
      </div>

      {/* Series filter chips (Level 1 only) */}
      {!selectedPlayer && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setSelectedSeries(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedSeries === null ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:text-text border border-border'}`}>
            全部系列
          </button>
          {series.map((s) => (
            <button key={s.id} onClick={() => setSelectedSeries(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedSeries === s.id ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:text-text border border-border'}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* === LEVEL 3: Price Chart === */}
      {selectedCardId ? (
        <PriceChart cardId={selectedCardId} />

      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>

      ) : !selectedPlayer ? (
        /* === LEVEL 1: Player Grid === */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => selectPlayer(p)}
              className="bg-surface rounded-xl p-5 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-center group">
              <PlayerAvatar playerId={p.id} name={p.name_cn} team={p.team} />
              <div className="text-sm font-semibold text-text group-hover:text-primary transition-colors truncate">{p.name_cn}</div>
              <div className="text-xs text-text-muted truncate mb-2">{p.name}</div>
              <span className="inline-block text-xs bg-bg text-text-muted px-2.5 py-0.5 rounded-full font-medium">{p.team}</span>
            </button>
          ))}
        </div>

      ) : selectedSeriesId ? (
        /* === LEVEL 3b: Cards within a selected series === */
        cardsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <div className="text-4xl mb-3">📦</div>
            <p>该系列暂无卡片</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredCards.map((card) => (
              <button key={card.id} onClick={() => setSelectedCardId(card.id)}
                className="text-left transition-transform hover:scale-105 active:scale-95">
                <CardImage card={card} player={selectedPlayer} fetchedImage={cardImages[card.id]} />
              </button>
            ))}
          </div>
        )

      ) : (
        /* === LEVEL 2: Series groups for selected player === */
        cardsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : cardsBySeries.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <div className="text-4xl mb-3">📦</div>
            <p>该球员暂无卡片数据</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cardsBySeries.map(({ series: s, cards }) => {
              const typeCounts: Record<string, number> = {}
              for (const c of cards) {
                typeCounts[c.card_type] = (typeCounts[c.card_type] || 0) + 1
              }
              return (
                <button key={s.id} onClick={() => setSelectedSeriesId(s.id)}
                  className="w-full bg-surface rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all p-4 md:p-5 text-left">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary-deep font-bold text-sm">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-text">{s.name}</div>
                        <div className="text-xs text-text-muted">{cards.length} 款卡片</div>
                      </div>
                    </div>
                    <span className="text-text-muted text-lg">&rarr;</span>
                  </div>

                  {/* Card type breakdown */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(typeCounts).map(([type, count]) => {
                      const badge = cardTypeBadge[type] || cardTypeBadge.base
                      return (
                        <span key={type} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.bg}`}>
                          {badge.icon} {badge.label} ×{count}
                        </span>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
