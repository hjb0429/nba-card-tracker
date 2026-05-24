import { useState, useEffect } from 'react'

interface User {
  userId: number
  username: string
  token: string
}

// Module-level auth state (avoids oxc parser issues with Context.Provider)
let listeners: (() => void)[] = []
let currentUser: User | null = null
let authLoading = true

function notifyListeners() {
  listeners.forEach((fn) => fn())
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(currentUser)
  const [loading, setLoading] = useState(authLoading)

  useEffect(() => {
    const listener = () => {
      setUser(currentUser)
      setLoading(authLoading)
    }
    listeners.push(listener)

    if (authLoading) {
      const stored = localStorage.getItem('nba-card-user')
      if (stored) {
        try {
          currentUser = JSON.parse(stored)
        } catch {
          localStorage.removeItem('nba-card-user')
        }
      }
      authLoading = false
      listeners.forEach((fn) => fn())
    }

    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  function saveUser(u: User) {
    localStorage.setItem('nba-card-user', JSON.stringify(u))
    currentUser = u
    notifyListeners()
  }

  async function login(username: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      return err.error || '登录失败'
    }
    const data = await res.json()
    saveUser({ userId: data.userId, username: data.username, token: data.token })
    return null
  }

  async function register(username: string, password: string) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      return err.error || '注册失败'
    }
    const data = await res.json()
    saveUser({ userId: data.userId, username: data.username, token: data.token })
    return null
  }

  function logout() {
    localStorage.removeItem('nba-card-user')
    currentUser = null
    notifyListeners()
  }

  return { user, loading, login, register, logout }
}
