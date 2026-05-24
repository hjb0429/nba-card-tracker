import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { CardForm } from '../components/CardForm'

interface UserCard {
  id: number
  card_id: number | null
  custom_name: string
  purchase_price: number | null
  purchase_date: string | null
  photo_path: string | null
  notes: string | null
  player_name: string | null
  player_name_cn: string | null
  series_name: string | null
  year: number | null
  card_number: string | null
  parallel: string | null
  created_at: string
}

export function PortfolioPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cards, setCards] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState<UserCard | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const loadCards = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    const res = await fetch('/api/user-cards', {
      headers: { Authorization: `Bearer ${user.token}` },
    })
    if (res.ok) {
      setCards(await res.json())
    }
    setLoading(false)
  }, [user])

  useEffect(() => { loadCards() }, [loadCards])

  async function handleDelete(id: number) {
    if (!confirm('确定删除这张卡吗？')) return
    setDeleting(id)
    await fetch(`/api/user-cards/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user!.token}` },
    })
    setDeleting(null)
    loadCards()
  }

  function handleFormSuccess() {
    setShowForm(false)
    setEditCard(null)
    loadCards()
  }

  if (!user) {
    return (
      <div className="pt-6 md:pt-0 pb-20 md:pb-0 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-xl font-bold text-text mb-2">请先登录</h1>
        <p className="text-text-muted mb-4">登录后可以管理你的球星卡持仓</p>
        <button onClick={() => navigate('/auth')} className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-deep transition-colors">
          去登录
        </button>
      </div>
    )
  }

  if (showForm || editCard) {
    return (
      <div className="pt-6 md:pt-0 pb-20 md:pb-0">
        <h1 className="text-2xl font-bold text-text mb-6">{editCard ? '编辑卡片' : '录入新卡片'}</h1>
        <CardForm onSuccess={handleFormSuccess} onCancel={() => { setShowForm(false); setEditCard(null) }} editData={editCard} />
      </div>
    )
  }

  return (
    <div className="pt-6 md:pt-0 pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">我的持仓</h1>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-deep transition-colors">
          + 录入卡片
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">💎</div>
          <p className="text-text-muted mb-4">还没有录入任何卡片</p>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-deep transition-colors">
            录入第一张卡
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((card) => (
            <div key={card.id} className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              {/* Photo */}
              {card.photo_path ? (
                <div className="h-40 bg-bg flex items-center justify-center overflow-hidden">
                  <img src={card.photo_path} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-40 bg-accent-light flex items-center justify-center">
                  <span className="text-3xl">🏀</span>
                </div>
              )}

              <div className="p-4">
                <div className="font-semibold text-text text-sm mb-1 truncate">{card.custom_name}</div>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-text-muted mb-3">
                  {card.player_name_cn && <span>{card.player_name_cn}</span>}
                  {card.series_name && <span>· {card.series_name}</span>}
                  {card.year && <span>· {card.year}</span>}
                  {card.parallel && <span>· {card.parallel}</span>}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span>
                    {card.purchase_price ? (
                      <span className="font-medium text-text">${card.purchase_price.toFixed(0)}</span>
                    ) : <span className="text-text-muted">-</span>}
                    {card.purchase_date && <span className="text-text-muted ml-2">{card.purchase_date}</span>}
                  </span>
                </div>

                {card.notes && <div className="mt-2 text-xs text-text-muted bg-bg rounded px-2 py-1 truncate">{card.notes}</div>}

                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <button onClick={() => setEditCard(card)}
                    className="flex-1 py-1.5 text-xs font-medium text-primary hover:bg-accent-light rounded-lg transition-colors">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(card.id)} disabled={deleting === card.id}
                    className="flex-1 py-1.5 text-xs font-medium text-down hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                    {deleting === card.id ? '删除中...' : '删除'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
