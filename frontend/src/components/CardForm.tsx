import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getNBAHeadshotUrl } from '../data/nba-headshots'

interface Player { id: number; name: string; name_cn: string; team: string }
interface Series { id: number; name: string; brand: string }
interface MatchedCard { id: number; year: string; card_type: string; parallel: string; numbering: string | null; insert_name: string | null; series_name: string }

interface Props {
  onSuccess: () => void
  onCancel: () => void
  editData?: any
}

const CARD_TYPES = [
  { value: 'base', label: 'Base 普卡' },
  { value: 'parallel', label: '平行卡 (编号限量的折射)' },
  { value: 'insert', label: '特卡 (限定插入款)' },
  { value: 'jersey', label: '球衣卡 (实物切割)' },
  { value: 'auto', label: '签字卡 (亲笔签名)' },
  { value: 'rookie', label: '新秀RC卡' },
]

const PARALLEL_OPTIONS = ['Base', 'Silver', 'Holo', 'Red', 'Blue', 'Purple', 'Gold', 'Green', 'Black', 'Mojo', 'Cracked Ice', '雨夜', 'Wave', 'Disco', 'Fast Break']
const NUMBERING_OPTIONS = ['', '1/1', '/5', '/10', '/25', '/49', '/75', '/99', '/149', '/199', '/299', '/499', '/999']

const seasons = (() => {
  const now = new Date()
  const thisYear = now.getFullYear()
  const result: string[] = []
  for (let i = 0; i < 10; i++) {
    const start = thisYear - i
    result.push(`${start - 1}-${String(start).slice(2)}`)
  }
  return result
})()

export function CardForm({ onSuccess, onCancel, editData }: Props) {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])

  // Step state
  const [step, setStep] = useState(1)
  const [playerSearch, setPlayerSearch] = useState('')

  // Card identification
  const [playerId, setPlayerId] = useState(editData?.player_id || '')
  const [seriesId, setSeriesId] = useState(editData?.series_id || '')
  const [season, setSeason] = useState(editData?.year || seasons[0])
  const [cardType, setCardType] = useState(editData?.card_type || 'base')
  const [parallel, setParallel] = useState(editData?.parallel || 'Base')
  const [customParallel, setCustomParallel] = useState('')
  const [numbering, setNumbering] = useState(editData?.numbering || '')
  const [insertName, setInsertName] = useState(editData?.insert_name || '')
  const [cardNumber, setCardNumber] = useState(editData?.card_number || '')

  // Purchase info
  const [customName, setCustomName] = useState(editData?.custom_name || '')
  const [purchasePrice, setPurchasePrice] = useState(editData?.purchase_price || '')
  const [purchaseDate, setPurchaseDate] = useState(editData?.purchase_date || '')
  const [notes, setNotes] = useState(editData?.notes || '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState(editData?.photo_path || '')

  // Matching cards from database
  const [matchedCards, setMatchedCards] = useState<MatchedCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState(editData?.card_id || '')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Auto-generate card name
  const autoName = (() => {
    const player = players.find((p) => p.id === parseInt(playerId))
    const series = seriesList.find((s) => s.id === parseInt(seriesId))
    const pName = player?.name_cn || player?.name || ''
    const sName = series?.name || ''
    const actualParallel = parallel === 'Custom' ? customParallel : parallel
    const typeLabel = CARD_TYPES.find((t) => t.value === cardType)?.label || cardType
    const numStr = numbering ? ` ${numbering}` : ''
    const insertStr = cardType === 'insert' && insertName ? ` ${insertName}` : ''
    return `${pName} ${sName} ${season} ${actualParallel}${insertStr}${numStr} ${typeLabel}`.trim()
  })()

  useEffect(() => {
    Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/series').then((r) => r.json()),
    ]).then(([p, s]) => { setPlayers(p); setSeriesList(s) })
  }, [])

  // Search matching cards when card details change
  useEffect(() => {
    if (!playerId || !seriesId) { setMatchedCards([]); return }
    fetch(`/api/cards?player_id=${playerId}&series_id=${seriesId}`)
      .then((r) => r.json())
      .then((cards: MatchedCard[]) => {
        setMatchedCards(cards.filter((c) => c.year === season))
      })
  }, [playerId, seriesId, season])

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) { setPhoto(file); setPreview(URL.createObjectURL(file)) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!playerId) { setError('请选择球员'); return }
    if (!seriesId) { setError('请选择系列'); return }
    setSubmitting(true)

    const actualParallel = parallel === 'Custom' ? customParallel : parallel

    const formData = new FormData()
    formData.append('custom_name', customName || autoName)
    formData.append('year', season)
    formData.append('card_type', cardType)
    formData.append('parallel', actualParallel)
    if (numbering) formData.append('numbering', numbering)
    if (cardType === 'insert' && insertName) formData.append('insert_name', insertName)
    if (cardNumber) formData.append('card_number', cardNumber)
    formData.append('purchase_price', purchasePrice || '0')
    if (purchaseDate) formData.append('purchase_date', purchaseDate)
    if (notes) formData.append('notes', notes)
    if (photo) formData.append('photo', photo)

    // If user selected a matched card, link to it directly
    if (selectedCardId) {
      formData.append('card_id', selectedCardId)
    } else {
      formData.append('player_id', playerId)
      formData.append('series_id', seriesId)
    }

    const url = editData ? `/api/user-cards/${editData.id}` : '/api/user-cards'
    const method = editData ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${user!.token}` },
      body: formData,
    })

    setSubmitting(false)
    if (res.ok) { onSuccess() } else {
      const err = await res.json()
      setError(err.error || '保存失败')
    }
  }

  const selectedPlayer = players.find((p) => p.id === parseInt(playerId))

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border shadow-sm p-4 md:p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text">{editData ? '编辑卡片' : '录入新卡片'}</h3>
        <div className="flex gap-1 text-xs text-text-muted">
          {[1, 2, 3].map((s) => (
            <span key={s} className={`w-6 h-6 rounded-full flex items-center justify-center font-medium ${step >= s ? 'bg-primary text-white' : 'bg-bg text-text-muted'}`}>{s}</span>
          ))}
        </div>
      </div>

      {error && <div className="text-down text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}

      {/* ==== STEP 1: 球员 + 系列 + 赛季 ==== */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">搜索球员</label>
            <input type="text" value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="输入中英文名搜索..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2" />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {players
                .filter((p) => !playerSearch || p.name_cn.includes(playerSearch) || p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                .slice(0, 12)
                .map((p) => {
                  const isSelected = parseInt(playerId) === p.id
                  return (
                    <button key={p.id} type="button" onClick={() => { setPlayerId(String(p.id)); setPlayerSearch('') }}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-bg'}`}>
                      <img src={getNBAHeadshotUrl(p.id)} alt="" className="w-8 h-8 rounded-full object-cover bg-gray-100"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <span className="font-medium text-text">{p.name_cn}</span>
                      <span className="text-text-muted">{p.name}</span>
                      <span className="text-xs text-text-muted ml-auto">{p.team}</span>
                    </button>
                  )
                })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">系列</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {seriesList.map((s) => {
                const isSelected = parseInt(seriesId) === s.id
                return (
                  <button key={s.id} type="button" onClick={() => setSeriesId(String(s.id))}
                    className={`px-2 py-2 rounded-lg text-xs font-medium text-center transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-bg text-text-muted hover:text-text hover:bg-accent-light'}`}>
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">赛季</label>
            <select value={season} onChange={(e) => setSeason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {seasons.map((s) => <option key={s} value={s}>{s} 赛季</option>)}
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" onClick={() => setStep(2)}
              disabled={!playerId || !seriesId}
              className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-deep transition-colors disabled:opacity-50">
              下一步 → 卡种
            </button>
          </div>
        </div>
      )}

      {/* ==== STEP 2: 卡种 + 平行 ==== */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">卡种类型</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CARD_TYPES.map((t) => {
                const isSelected = cardType === t.value
                return (
                  <button key={t.value} type="button" onClick={() => setCardType(t.value)}
                    className={`p-3 rounded-lg text-xs text-center transition-colors ${isSelected ? 'bg-primary text-white font-medium' : 'bg-bg text-text-muted hover:text-text'}`}>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">平行/折射类型</label>
            <div className="flex flex-wrap gap-1.5">
              {PARALLEL_OPTIONS.map((p) => {
                const isSelected = parallel === p
                return (
                  <button key={p} type="button" onClick={() => setParallel(p)}
                    className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-bg text-text-muted hover:text-text'}`}>
                    {p}
                  </button>
                )
              })}
              <button type="button" onClick={() => setParallel('Custom')}
                className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${parallel === 'Custom' ? 'bg-primary text-white' : 'bg-bg text-text-muted hover:text-text'}`}>
                + 其他
              </button>
            </div>
            {parallel === 'Custom' && (
              <input type="text" value={customParallel} onChange={(e) => setCustomParallel(e.target.value)}
                placeholder="输入平行名称" className="mt-2 w-full px-3 py-1.5 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">限量编号</label>
            <select value={numbering} onChange={(e) => setNumbering(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">无编号</option>
              {NUMBERING_OPTIONS.filter(Boolean).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {cardType === 'insert' && (
            <div>
              <label className="block text-sm font-medium text-text mb-1">特卡名称</label>
              <input type="text" value={insertName} onChange={(e) => setInsertName(e.target.value)}
                placeholder="如：Hero, Villain, 雨夜, Downtown..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">卡片编号（可选）</label>
            <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
              placeholder="如：#23, #HV-45..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(1)}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors">← 上一步</button>
            <button type="button" onClick={() => setStep(3)}
              className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-deep transition-colors">
              下一步 → 购入信息
            </button>
          </div>
        </div>
      )}

      {/* ==== STEP 3: 匹配 + 购入 + 照片 ==== */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Auto-generated card name */}
          <div className="bg-bg rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">自动识别卡名</div>
            <div className="text-sm font-semibold text-text">{autoName || '请先选择球员和系列'}</div>
            <div className="text-xs text-text-muted mt-1">可手动修改</div>
            <input type="text" value={customName || autoName} onChange={(e) => setCustomName(e.target.value)}
              className="mt-1 w-full px-3 py-1.5 rounded border border-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          {/* Matched cards */}
          {matchedCards.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text mb-1">匹配到数据库卡片（可选关联）</label>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-bg rounded-lg p-2">
                {matchedCards.map((c) => (
                  <button key={c.id} type="button" onClick={() => setSelectedCardId(String(c.id))}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${selectedCardId === String(c.id) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-surface'}`}>
                    <span className="font-medium">{c.series_name}</span>
                    <span className="text-text-muted"> · {c.year} · {c.parallel}</span>
                    {c.numbering && <span className="text-primary-deep font-mono"> {c.numbering}</span>}
                    {c.insert_name && <span className="text-primary"> [{c.insert_name}]</span>}
                    <span className="ml-2 text-text-muted">{c.card_type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">购入价格</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-text-muted text-sm">¥</span>
                <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
                  step="0.01" placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">购入日期</label>
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">实物照片</label>
            <input type="file" accept="image/*" onChange={handlePhoto}
              className="w-full text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-accent-light file:text-primary-deep" />
            {preview && <img src={preview} alt="" className="mt-2 w-32 h-32 object-cover rounded-lg border border-border" />}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">备注</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="如：购于卡淘，PSA 10评级..." />
          </div>

          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(2)}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors">← 上一步</button>
            <button type="submit" disabled={submitting}
              className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-deep transition-colors disabled:opacity-50">
              {submitting ? '保存中...' : editData ? '保存修改' : '录入我的持仓'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
