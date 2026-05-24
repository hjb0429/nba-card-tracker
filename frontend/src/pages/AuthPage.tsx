import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function AuthPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const err = isRegister ? await register(username, password) : await login(username, password)
    setSubmitting(false)
    if (err) { setError(err) } else { navigate('/portfolio') }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 pt-6 pb-20 md:pb-0">
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 md:p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🏀</div>
          <h1 className="text-xl font-bold text-text">{isRegister ? '创建账号' : '欢迎回来'}</h1>
          <p className="text-sm text-text-muted mt-1">{isRegister ? '开始管理你的球星卡' : '登录查看你的持仓'}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">用户名</label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg text-text placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="请输入用户名" required autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">密码</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg text-text placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={isRegister ? '至少4位' : '请输入密码'} required minLength={4}
            />
          </div>

          {error && <div className="text-down text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

          <button
            type="submit" disabled={submitting}
            className="w-full py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-deep transition-colors disabled:opacity-50"
          >
            {submitting ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-4">
          {isRegister ? '已有账号？' : '没有账号？'}
          <button onClick={() => { setIsRegister(!isRegister); setError('') }} className="text-primary font-medium ml-1 hover:underline">
            {isRegister ? '去登录' : '去注册'}
          </button>
        </p>
      </div>
    </div>
  )
}
