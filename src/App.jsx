import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import DashboardPage from './pages/Dashboard/DashboardPage'
import LiquidityPage from './pages/Dashboard/LiquidityPage'
import DebtPage from './pages/Dashboard/DebtPage'
import EfficiencyPage from './pages/Dashboard/EfficiencyPage'
import AccountPage from './pages/Dashboard/AccountPage'
import NewAccountPage from './pages/Dashboard/NewAccountPage'
import LoginPage from './pages/Login/LoginPage'
import RegistrationPage from './pages/Register/RegistrationPage'
import ProfitabilityPage from './pages/Dashboard/ProfitabilityPage'

export default function App() {
  const location = useLocation()
  const state = location.state
  const background = state && state.background

  return (
    <>
      <Routes location={background || location}>
        <Route path="/" element={<RegistrationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/liquidez" element={<LiquidityPage />} />
        <Route path="/deuda" element={<DebtPage />} />
        <Route path="/eficiencia" element={<EfficiencyPage />} />
        <Route path="/nueva-cuenta" element={<NewAccountPage />} />
        <Route path="/mi-cuenta" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/rentabilidad" element={<ProfitabilityPage />} />
      </Routes>

      {background && (
        <Routes>
          <Route path="/nueva-cuenta" element={<NewAccountPage />} />
          <Route path="/mi-cuenta" element={<AccountPage />} />
        </Routes>
      )}
    </>
  )
}
