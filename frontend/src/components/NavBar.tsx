import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const tabs = [
  { to: '/', label: '市场行情', icon: '📊' },
  { to: '/opportunities', label: '市场机会', icon: '🔍' },
  { to: '/portfolio', label: '我的持仓', icon: '💎' },
  { to: '/compare', label: '比价分析', icon: '📈' },
]

export function NavBar() {
  const { user, logout } = useAuth()

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between h-14 px-6 bg-surface border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏀</span>
          <span className="font-bold text-primary-deep text-lg">NBA Card Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:bg-accent-light hover:text-text'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-3 pl-3 border-l border-border flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-text-muted">{user.username}</span>
                <button onClick={logout} className="text-xs text-text-muted hover:text-down transition-colors">
                  退出
                </button>
              </>
            ) : (
              <NavLink to="/auth" className="text-sm text-primary font-medium hover:underline">
                登录
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-10">
        <div className="flex">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-text-muted hover:text-text'
                }`
              }
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/auth"
            className="flex-1 flex flex-col items-center py-2 text-xs font-medium text-text-muted"
          >
            <span className="text-lg">{user ? '👤' : '🔑'}</span>
            <span>{user ? user.username : '登录'}</span>
          </NavLink>
        </div>
      </nav>
    </>
  )
}
