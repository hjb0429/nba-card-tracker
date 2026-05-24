import { Routes, Route } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { MarketPage } from './pages/MarketPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { ComparePage } from './pages/ComparePage'
import { AuthPage } from './pages/AuthPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'

export default function App() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <NavBar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-6 md:pb-8 md:pt-6">
        <Routes>
          <Route path="/" element={<MarketPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
        </Routes>
      </main>
    </div>
  )
}
