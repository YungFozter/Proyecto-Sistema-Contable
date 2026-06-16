import React, { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ImportGuideModal from '../../components/ImportGuideModal'
import {
  deleteAccount,
  formatMoney,
  getAccountSummary,
  getFinancialStatements,
  readAccounts,
} from '../../utils/accountsStore'

// Helper component for Accordion Items
function AccordionItem({ title, badge, isOpen, onToggle, children }) {
  return (
    <div className="border border-outline-variant/80 rounded-2xl overflow-hidden bg-white/80 transition-all shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-on-surface hover:bg-surface-container-low/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold">{title}</span>
          {badge && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-label text-primary font-bold">
              {badge}
            </span>
          )}
        </div>
        <span className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          keyboard_arrow_down
        </span>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] border-t border-outline-variant/50 p-5' : 'max-h-0 overflow-hidden'
          }`}
      >
        {children}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState(() => readAccounts())
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterType, setFilterType] = useState('all')

  // State for Accordions (open section track)
  const [openSection, setOpenSection] = useState('uso') // default open 'uso'
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [guideModalOpen, setGuideModalOpen] = useState(false)

  const summaryStats = useMemo(() => {
    return getAccountSummary(accounts)
  }, [accounts])

  const financialStatements = useMemo(() => getFinancialStatements(accounts), [accounts])

  // Estados financieros calculados desde el campo `section` del parser inteligente
  const smartFinancials = useMemo(() => {
    const erAccounts = accounts.filter((a) => a.section === 'estado_resultados')
    const bgAccounts = accounts.filter((a) => a.section === 'balance_general')

    // Si no hay cuentas con sección asignada, devolver null para usar el cálculo clásico
    if (erAccounts.length === 0 && bgAccounts.length === 0) return null

    const sumG1 = (list) => list.reduce((acc, a) => acc + (Number(a.management1) || 0), 0)
    const sumG2 = (list) => list.reduce((acc, a) => acc + (Number(a.management2) || 0), 0)

    // Estado de Resultados
    const ingresos = erAccounts.filter((a) => /ingreso/i.test(a.name))
    const costoVentas = erAccounts.filter((a) => /costo.*(venta|ventas)/i.test(a.name))
    const utilidadBruta = erAccounts.filter((a) => /utilidad\s*bruta/i.test(a.name))
    const gastosOp = erAccounts.filter((a) => /gasto/i.test(a.name))
    const utilidadOp = erAccounts.filter((a) => /utilidad\s*operativa/i.test(a.name))
    const otrosIngresos = erAccounts.filter((a) => /otros\s*ingreso/i.test(a.name))
    const costosFinancieros = erAccounts.filter((a) => /costo.*financiero|financiero.*costo/i.test(a.name))
    const antesImpuestos = erAccounts.filter((a) => /antes.*impuesto/i.test(a.name))
    const impuestos = erAccounts.filter((a) => /^impuesto/i.test(a.name))
    const utilidadNeta = erAccounts.filter((a) => /utilidad\s*neta/i.test(a.name))

    // Balance General
    const activo = bgAccounts.filter((a) => /^activo/i.test(a.name))
    const pasivo = bgAccounts.filter((a) => /^pasivo/i.test(a.name))
    const patrimonio = bgAccounts.filter((a) => /^patrimonio|^capital|^reserva|resultado.*acumulado/i.test(a.name))

    const totalActivoG1 = sumG1(activo)
    const totalActivoG2 = sumG2(activo)
    const totalPasivoG1 = sumG1(pasivo)
    const totalPasivoG2 = sumG2(pasivo)
    const totalPatrimonioG1 = sumG1(patrimonio)
    const totalPatrimonioG2 = sumG2(patrimonio)

    return {
      estadoResultados: {
        rows: [
          { label: 'Ingresos', g1: sumG1(ingresos), g2: sumG2(ingresos) },
          { label: 'Costo de Ventas', g1: sumG1(costoVentas), g2: sumG2(costoVentas) },
          { label: 'Utilidad Bruta', g1: sumG1(utilidadBruta), g2: sumG2(utilidadBruta), isSubtotal: true },
          { label: 'Gastos Operativos', g1: sumG1(gastosOp), g2: sumG2(gastosOp) },
          { label: 'Utilidad Operativa', g1: sumG1(utilidadOp), g2: sumG2(utilidadOp), isSubtotal: true },
          { label: 'Otros Ingresos', g1: sumG1(otrosIngresos), g2: sumG2(otrosIngresos) },
          { label: 'Costos Financieros', g1: sumG1(costosFinancieros), g2: sumG2(costosFinancieros) },
          { label: 'Utilidad antes Impuestos', g1: sumG1(antesImpuestos), g2: sumG2(antesImpuestos), isSubtotal: true },
          { label: 'Impuestos', g1: sumG1(impuestos), g2: sumG2(impuestos) },
          { label: 'Utilidad Neta', g1: sumG1(utilidadNeta), g2: sumG2(utilidadNeta), isSubtotal: true },
        ].filter((r) => r.g1 !== 0 || r.g2 !== 0),
      },
      balanceGeneral: {
        rows: [
          { label: 'Activo', g1: totalActivoG1, g2: totalActivoG2 },
          { label: 'Pasivo', g1: totalPasivoG1, g2: totalPasivoG2 },
          { label: 'Patrimonio', g1: totalPatrimonioG1, g2: totalPatrimonioG2 },
          {
            label: 'Diferencia (Cuadre)',
            g1: totalActivoG1 - totalPasivoG1 - totalPatrimonioG1,
            g2: totalActivoG2 - totalPasivoG2 - totalPatrimonioG2,
            isDiff: true,
          },
        ],
      },
    }
  }, [accounts])

  // Get recently active/created accounts (last 4 sorted by updatedAt or createdAt)
  const recentActivity = useMemo(() => {
    return [...accounts]
      .filter((acc) => acc.createdAt || acc.updatedAt)
      .sort((a, b) => {
        const timeA = new Date(b.updatedAt || b.createdAt).getTime()
        const timeB = new Date(a.updatedAt || a.createdAt).getTime()
        return timeA - timeB
      })
      .slice(0, 4)
  }, [accounts])

  const handleRefreshAccounts = () => {
    setAccounts(readAccounts())
  }

  const handleDeleteAccount = (code) => {
    const confirmed = window.confirm(`¿Eliminar la cuenta ${code}?`)

    if (!confirmed) {
      return
    }

    const result = deleteAccount(code)

    if (!result.ok) {
      setFeedbackMessage(result.errors[0] ?? 'No fue posible eliminar la cuenta.')
      return
    }

    setFeedbackMessage(`Cuenta ${code} eliminada correctamente.`)
    handleRefreshAccounts()
  }

  const handleEditAccount = (code) => {
    navigate('/nueva-cuenta', { state: { background: location, accountCode: code } })
  }

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        acc.code.includes(searchTerm) || acc.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesLevel = filterLevel === 'all' || String(acc.level) === filterLevel
      const matchesType = filterType === 'all' || acc.type === filterType
      return matchesSearch && matchesLevel && matchesType
    })
  }, [accounts, searchTerm, filterLevel, filterType])

  return (
    <div className="min-h-screen bg-[#e7e0d6] font-body text-on-surface">
      <div className="grid min-h-screen lg:grid-cols-[320px_1fr]">

        {/* SIDEBAR NAVIGATION */}
        <aside className="bg-[linear-gradient(180deg,#5f45c0_0%,#3d2a88_100%)] text-white px-6 py-8 md:px-8 md:py-10 flex flex-col justify-between shadow-[0_0_45px_rgba(0,0,0,0.15)] lg:sticky lg:top-0 lg:h-screen z-20">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center border border-white/10 shrink-0">
                <span className="material-symbols-outlined text-2xl">account_tree</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/70 font-label">Plan de Cuentas</p>
                <h1 className="font-headline text-2xl font-bold tracking-tight">Sistema Contable</h1>
              </div>
            </div>

            <nav className="space-y-3">
              <Link to="/dashboard" className="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 border border-white/10">
                <span className="font-medium">Resumen / Dashboard</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
              <Link to="/liquidez" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Análisis de Liquidez</span>
                <span className="material-symbols-outlined text-sm">water_drop</span>
              </Link>
              <Link to="/deuda" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Análisis de Endeudamiento</span>
                <span className="material-symbols-outlined text-sm">balance</span>
              </Link>
              <Link to="/eficiencia" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Análisis de Eficiencia</span>
                <span className="material-symbols-outlined text-sm">speed</span>
              </Link>
              <Link to="/rentabilidad" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Análisis de Rentabilidad</span>
                <span className="material-symbols-outlined text-sm">trending_up</span>
              </Link>
              <Link to="/nueva-cuenta" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Nueva Cuenta</span>
                <span className="material-symbols-outlined text-sm">add_circle</span>
              </Link>
              <a href="#plan-completo" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Ver Plan Completo</span>
                <span className="material-symbols-outlined text-sm">table_view</span>
              </a>
            </nav>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 mt-10 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/65 font-label mb-2">Estado local</p>
              <p className="text-sm text-white/85 leading-relaxed">
                La información se mantiene en el navegador mediante una base local con persistencia.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => navigate('/mi-cuenta', { state: { background: location } })}
                className="w-full flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 hover:bg-white/15 transition-colors"
              >
                <span className="font-medium">Mi cuenta</span>
                <span className="material-symbols-outlined text-sm">person</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 hover:bg-white/15 transition-colors"
              >
                <span className="font-medium">Cerrar sesión</span>
                <span className="material-symbols-outlined text-sm">logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="bg-[linear-gradient(180deg,#fffdfb_0%,#fbf8f4_100%)] px-6 py-8 md:px-8 md:py-10 xl:px-12 xl:py-12">

          {/* COMPACT WELCOME HEADER */}
          <header className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between mb-8">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-on-surface-variant font-label mb-2">Resumen Operativo</p>
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Consola de Control Contable</h2>
              <p className="text-on-surface-variant mt-2 max-w-2xl leading-relaxed text-[15px]">
                Administra el catálogo de cuentas, realiza seguimiento financiero de activos y pasivos y consulta variaciones entre periodos.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setGuideModalOpen(true)}
                className="rounded-full border border-outline-variant bg-white/80 px-5 py-3.5 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-colors flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">help_outline</span>
                Guía de importación
              </button>
              <Link to="/nueva-cuenta" className="rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary hover:bg-[#e5884a] shadow-[0_10px_24px_rgba(153,71,0,0.2)] transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm font-bold">add</span> Nueva Cuenta
              </Link>
            </div>

          </header>

          {/* DASHBOARD CORE MODULES (METRICS) */}
          <section className="mb-8">

            {/* METRICS PANEL */}
            <div className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 md:p-7 shadow-[0_14px_30px_rgba(15,23,42,0.06)] flex flex-col justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label mb-4">Métricas Clave</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <article className="rounded-2xl border border-outline-variant/60 bg-white/60 p-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
                    <p className="text-xs text-on-surface-variant font-label uppercase tracking-wider">Total Cuentas</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-3xl font-bold text-on-surface font-headline">{summaryStats.totalAccounts}</p>
                      <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-lg">layers</span></span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-2">Registros en catálogo</p>
                  </article>

                  <article className="rounded-2xl border border-outline-variant/60 bg-white/60 p-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
                    <p className="text-xs text-on-surface-variant font-label uppercase tracking-wider">Total Gestión 1</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-2xl font-bold text-on-surface">{formatMoney(summaryStats.totalManagement1)}</p>
                      <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-lg">calendar_today</span></span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-2">Saldo anterior acumulado</p>
                  </article>

                  <article className="rounded-2xl border border-outline-variant/60 bg-white/60 p-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
                    <p className="text-xs text-on-surface-variant font-label uppercase tracking-wider">Total Gestión 2</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-2xl font-bold text-on-surface">{formatMoney(summaryStats.totalManagement2)}</p>
                      <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-lg">event_available</span></span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-2">Saldo actual acumulado</p>
                  </article>

                  <article className="rounded-2xl border border-outline-variant/60 bg-white/60 p-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
                    <p className="text-xs text-on-surface-variant font-label uppercase tracking-wider">Variación Total</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-2xl font-bold ${summaryStats.variationTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatMoney(summaryStats.variationTotal)}
                      </p>
                      <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${summaryStats.variationTotal >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        <span className="material-symbols-outlined text-lg">{summaryStats.variationTotal >= 0 ? 'trending_up' : 'trending_down'}</span>
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-2">Diferencia de periodos</p>
                  </article>

                </div>
              </div>
            </div>

          </section>

          {/* DYNAMIC FEEDBACK MESSAGE IF ANY */}
          {feedbackMessage ? (
            <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm font-medium text-on-surface-variant flex items-center justify-between">
              <span>{feedbackMessage}</span>
              <button onClick={() => setFeedbackMessage('')} className="text-primary hover:underline text-xs">Cerrar</button>
            </div>
          ) : null}

          {/* FINANCIAL STATEMENT TABLES & ACTIVITY */}
          <section className="grid gap-6 xl:grid-cols-[1.8fr_1.2fr] mb-8 items-stretch">

            {/* BALANCES */}
            <div className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_14px_30px_rgba(15,23,42,0.06)] flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label mb-2">Estados Financieros</p>
                <h3 className="font-headline text-2xl font-bold tracking-tight mb-4 text-on-surface">Balance General & Resultados</h3>

                <div className="space-y-4">

                  {/* TABLA BALANCE GENERAL */}
                  <div className="overflow-hidden rounded-xl border border-outline-variant bg-white/60">
                    <table className="min-w-full text-left">
                      <thead className="bg-surface-container-low/40">
                        <tr className="text-[10px] uppercase tracking-[0.22em] text-on-surface-variant font-label border-b border-outline-variant/60">
                          <th className="px-4 py-2">Balance General</th>
                          <th className="px-4 py-2">G1 (Anterior)</th>
                          <th className="px-4 py-2">G2 (Actual)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(smartFinancials
                          ? smartFinancials.balanceGeneral.rows.map((r) => ({ label: r.label, prev: r.g1, curr: r.g2, isDiff: r.isDiff }))
                          : [
                            { label: 'Activo', prev: financialStatements.balanceGeneral.previous.assets, curr: financialStatements.balanceGeneral.current.assets },
                            { label: 'Pasivo', prev: financialStatements.balanceGeneral.previous.liabilities, curr: financialStatements.balanceGeneral.current.liabilities },
                            { label: 'Patrimonio', prev: financialStatements.balanceGeneral.previous.equity, curr: financialStatements.balanceGeneral.current.equity },
                            { label: 'Diferencia (Cuadre)', prev: financialStatements.balanceGeneral.previous.difference, curr: financialStatements.balanceGeneral.current.difference, isDiff: true },
                          ]
                        ).map((row) => (
                          <tr key={row.label} className="border-b border-outline-variant/40 last:border-b-0 text-[13px] hover:bg-white/30 transition-colors">
                            <td className={`px-4 py-2.5 ${row.isDiff ? 'font-semibold text-primary' : 'text-on-surface'}`}>{row.label}</td>
                            <td className="px-4 py-2.5 text-on-surface-variant">{formatMoney(row.prev)}</td>
                            <td className={`px-4 py-2.5 font-medium ${row.isDiff && row.curr !== 0 ? 'text-red-600 font-bold' : ''}`}>{formatMoney(row.curr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* TABLA ESTADO DE RESULTADOS */}
                  <div className="overflow-hidden rounded-xl border border-outline-variant bg-white/60">
                    <table className="min-w-full text-left">
                      <thead className="bg-surface-container-low/40">
                        <tr className="text-[10px] uppercase tracking-[0.22em] text-on-surface-variant font-label border-b border-outline-variant/60">
                          <th className="px-4 py-2">Estado de Resultados</th>
                          <th className="px-4 py-2">G1 (Anterior)</th>
                          <th className="px-4 py-2">G2 (Actual)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(smartFinancials
                          ? smartFinancials.estadoResultados.rows.map((r) => ({ label: r.label, prev: r.g1, curr: r.g2, isSubtotal: r.isSubtotal }))
                          : [
                            { label: 'Ingresos (4)', prev: financialStatements.statementOfResults.previous.income, curr: financialStatements.statementOfResults.current.income },
                            { label: 'Gastos (5)', prev: financialStatements.statementOfResults.previous.expenses, curr: financialStatements.statementOfResults.current.expenses },
                            { label: 'Resultado del Ejercicio', prev: financialStatements.statementOfResults.previous.result, curr: financialStatements.statementOfResults.current.result, isSubtotal: true },
                          ]
                        ).map((row) => (
                          <tr key={row.label} className={`border-b border-outline-variant/40 last:border-b-0 text-[13px] hover:bg-white/30 transition-colors ${row.isSubtotal ? 'bg-primary/5' : ''}`}>
                            <td className={`px-4 py-2.5 ${row.isSubtotal ? 'font-semibold text-primary' : 'text-on-surface'}`}>{row.label}</td>
                            <td className="px-4 py-2.5 text-on-surface-variant">{formatMoney(row.prev)}</td>
                            <td className={`px-4 py-2.5 font-medium ${row.isSubtotal ? 'text-primary font-bold' : ''}`}>{formatMoney(row.curr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-on-primary transition-all"
                >
                  <span className="material-symbols-outlined text-sm">open_in_full</span>
                  Ver Reporte Detallado
                </button>
              </div>

            </div>

            {/* RECENT ACTIVITY BLOCK */}
            <div className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_14px_30px_rgba(15,23,42,0.06)] flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label mb-2">Registro de Eventos</p>
                <h3 className="font-headline text-2xl font-bold tracking-tight mb-4 text-on-surface">Actividad Reciente</h3>

                {recentActivity.length ? (
                  <div className="space-y-3.5">
                    {recentActivity.map((activity) => {
                      const isUpdated = activity.updatedAt && activity.updatedAt !== activity.createdAt
                      const dateObj = new Date(activity.updatedAt || activity.createdAt)
                      const timeStr = dateObj.toLocaleDateString('es-BO') + ' ' + dateObj.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

                      return (
                        <div key={activity.code} className="flex gap-3 items-start p-3 rounded-xl border border-outline-variant/40 bg-white/50 hover:bg-white transition-colors">
                          <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${isUpdated ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isUpdated ? 'MD' : 'NW'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-xs text-on-surface truncate">{activity.code} · {activity.name}</span>
                              <span className="text-[10px] text-on-surface-variant shrink-0">{timeStr}</span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant mt-0.5">
                              {isUpdated ? 'Cuenta contable editada/saldos actualizados' : 'Nueva cuenta de catálogo registrada'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant text-center py-8">
                    No se registran cambios recientes todavía.
                  </p>
                )}
              </div>
            </div>

          </section>

          {/* DOCUMENTATION & HELP (COMPACTED WITH ACCORDIONS) */}
          <section className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 md:p-7 shadow-[0_14px_30px_rgba(15,23,42,0.06)] mb-8">
            <header className="mb-5">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label mb-1">Centro de Información</p>
              <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Documentación y Reglas del Sistema</h3>
            </header>



            <div className="space-y-3">

              <AccordionItem
                title="Paso a Paso: Cómo usar el sistema"
                badge="Guía"
                isOpen={openSection === 'uso'}
                onToggle={() => setOpenSection(openSection === 'uso' ? null : 'uso')}
              >
                <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/60">
                      <p className="font-semibold text-on-surface text-xs uppercase tracking-wider mb-2">Paso 1: Catálogo y Jerarquía</p>
                      <p className="text-[13px]">Entiende la estructura de 5 niveles. Los códigos se separan con puntos. Las cuentas de nivel 1 a 3 agrupan; nivel 4 y 5 son de detalle.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/60">
                      <p className="font-semibold text-on-surface text-xs uppercase tracking-wider mb-2">Paso 2: Captura o Carga</p>
                      <p className="text-[13px]">Registra cuentas individualmente en <strong>"Nueva Cuenta"</strong>. También puedes hacer cargas masivas desde archivos CSV de forma segura en esa misma pantalla.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/60">
                      <p className="font-semibold text-on-surface text-xs uppercase tracking-wider mb-2">Paso 3: Monitoreo y Balances</p>
                      <p className="text-[13px]">Vuelve al dashboard para visualizar las sumatorias recalculadas automáticamente, y exporta tus cuentas a un nuevo reporte si lo necesitas.</p>
                    </div>
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem
                title="Estructura Jerárquica (Visualización del Árbol)"
                badge="Niveles de Cuenta"
                isOpen={openSection === 'arbol'}
                onToggle={() => setOpenSection(openSection === 'arbol' ? null : 'arbol')}
              >
                <div className="space-y-3 text-sm text-on-surface-variant">
                  <p className="leading-relaxed">
                    A continuación se presenta un bosquejo visual de la estructura jerárquica de niveles. Las ramas muestran cómo se organizan las cuentas agrupadoras y de detalle:
                  </p>

                  <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low/20 p-5 font-mono text-xs text-on-surface space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">1</span>
                      <span className="font-semibold text-on-surface">Nivel 1 (Agrupación)</span> — ej. Activo (Sumatoria automática)
                    </div>
                    <div className="pl-6 border-l-2 border-outline-variant flex items-center gap-2 py-1">
                      <span className="text-outline-variant">└──</span>
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">1.1</span>
                      <span className="font-semibold">Nivel 2 (Agrupación)</span> — ej. Activo Disponible
                    </div>
                    <div className="pl-12 border-l-2 border-outline-variant flex items-center gap-2 py-1">
                      <span className="text-outline-variant">└──</span>
                      <span className="w-6 h-6 rounded-full bg-primary/5 text-primary flex items-center justify-center font-bold">1.1.1</span>
                      <span className="font-semibold">Nivel 3 (Agrupación)</span> — ej. Caja
                    </div>
                    <div className="pl-20 border-l-2 border-outline-variant flex items-center gap-2 py-1">
                      <span className="text-outline-variant">└──</span>
                      <span className="w-5 h-5 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-[10px]">D</span>
                      <span className="font-semibold text-secondary">Nivel 4 (Detalle)</span> — ej. Caja Chica (Ingreso manual de saldos)
                    </div>
                    <div className="pl-[6.5rem] border-l-2 border-outline-variant flex items-center gap-2 py-1">
                      <span className="text-outline-variant">└──</span>
                      <span className="w-5 h-5 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-[10px]">D</span>
                      <span className="font-semibold text-secondary">Nivel 5 (Detalle)</span> — ej. Caja Chica Moneda Nacional
                    </div>
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem
                title="Reglas Técnicas & Validaciones"
                badge="Validación"
                isOpen={openSection === 'reglas'}
                onToggle={() => setOpenSection(openSection === 'reglas' ? null : 'reglas')}
              >
                <ul className="space-y-3.5 text-[13px] text-on-surface-variant leading-relaxed list-none pl-0">
                  <li className="flex gap-2.5 items-start">
                    <span className="text-primary font-bold">✓</span>
                    <span><strong>Formato de Código:</strong> Números enteros separados por puntos. Máximo 5 niveles jerárquicos (ej: `1.1.1.1`).</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className="text-primary font-bold">✓</span>
                    <span><strong>Creación en Cadena:</strong> No se puede registrar un nivel inferior si no existe su correspondiente cuenta padre en la jerarquía (el sistema la creará automáticamente al importar).</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className="text-primary font-bold">✓</span>
                    <span><strong>Saldos y Recálculos:</strong> Los saldos manuales de Gestión 1 (Año Anterior) y Gestión 2 (Año Actual) se capturan exclusivamente en las cuentas de detalle (niveles 4 y 5).</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className="text-primary font-bold">✓</span>
                    <span><strong>Restricción de Borrado:</strong> No es posible eliminar una cuenta agrupadora si tiene subcuentas hijas registradas.</span>
                  </li>
                </ul>
              </AccordionItem>

            </div>
          </section>

          {/* MAIN PLAN TABLE WITH FILTERS, SEARCH AND STICKY HEADER */}
          <section id="plan-completo" className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-[0_14px_30px_rgba(15,23,42,0.06)]">

            {/* Table Header & Interactive Filters */}
            <header className="border-b border-outline-variant/70 px-6 py-5 md:px-7 md:py-6 bg-white/80">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant font-label">Catálogo</p>
                  <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Plan de Cuentas Completo</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Explora, filtra y edita todo el árbol contable.</p>
                </div>

                <span className="rounded-full bg-surface-container-low px-4 py-1.5 text-xs font-label text-on-surface-variant font-bold">
                  {filteredAccounts.length} de {accounts.length} cuentas visibles
                </span>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 mt-6">

                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar código o nombre..."
                    className="w-full h-11 pl-9 pr-3 rounded-full border border-outline-variant bg-white text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-on-surface"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                </div>

                <div>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full h-11 px-4 rounded-full border border-outline-variant bg-white text-xs outline-none focus:border-primary transition-all text-on-surface"
                  >
                    <option value="all">Todos los Niveles</option>
                    <option value="1">Nivel 1 (Agrupación)</option>
                    <option value="2">Nivel 2 (Agrupación)</option>
                    <option value="3">Nivel 3 (Agrupación)</option>
                    <option value="4">Nivel 4 (Detalle)</option>
                    <option value="5">Nivel 5 (Detalle)</option>
                  </select>
                </div>

                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full h-11 px-4 rounded-full border border-outline-variant bg-white text-xs outline-none focus:border-primary transition-all text-on-surface"
                  >
                    <option value="all">Todos los Tipos</option>
                    <option value="group">Solo Agrupación</option>
                    <option value="detail">Solo Detalle</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('')
                      setFilterLevel('all')
                      setFilterType('all')
                    }}
                    className="flex-1 h-11 rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors text-xs font-semibold text-on-surface-variant"
                  >
                    Reestablecer
                  </button>
                </div>

              </div>
            </header>

            {/* TABLE BODY CONTAINER */}
            <div className="max-h-[600px] overflow-y-auto relative">
              {filteredAccounts.length ? (
                <table className="min-w-full text-left border-collapse">

                  {/* Sticky Header */}
                  <thead className="bg-surface-container-low sticky top-0 z-10 shadow-[0_1px_0_rgba(15,23,42,0.08)]">
                    <tr className="text-[10px] uppercase tracking-[0.22em] text-on-surface-variant font-label">
                      <th className="px-4 py-3 bg-surface-container-low">Cód / Nivel</th>
                      <th className="px-4 py-3 bg-surface-container-low">Nombre de Cuenta</th>
                      <th className="px-4 py-3 bg-surface-container-low">G1 (Anterior)</th>
                      <th className="px-4 py-3 bg-surface-container-low">G2 (Actual)</th>
                      <th className="px-4 py-3 bg-surface-container-low">Variación</th>
                      <th className="px-4 py-3 bg-surface-container-low text-right pr-6">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAccounts.map((account) => {
                      const variationTone = account.variation >= 0 ? 'text-emerald-600' : 'text-red-600'
                      const isDetail = account.type === 'detail'

                      return (
                        <tr key={account.code} className="border-t border-outline-variant/50 odd:bg-white/40 hover:bg-white/90 transition-colors">
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full text-[10px] font-bold ${isDetail ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
                                }`}>
                                {account.level}
                              </span>
                              <span className="font-mono text-xs font-bold text-on-surface">{account.code}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="space-y-0.5">
                              <p className={`text-xs font-semibold ${isDetail ? 'text-on-surface-variant' : 'text-on-surface uppercase'}`}>
                                {account.name}
                              </p>
                              <span className="text-[9px] uppercase tracking-[0.1em] text-on-surface-variant/70">
                                {isDetail ? 'Detalle' : 'Agrupación'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-on-surface-variant align-middle">{formatMoney(account.management1)}</td>
                          <td className="px-4 py-3.5 text-xs text-on-surface-variant align-middle">{formatMoney(account.management2)}</td>
                          <td className={`px-4 py-3.5 text-xs font-bold align-middle ${variationTone}`}>
                            {account.variation >= 0 ? '↗' : '↘'} {formatMoney(account.variation)}
                          </td>
                          <td className="px-4 py-3.5 align-middle text-right pr-6">
                            <div className="inline-flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditAccount(account.code)}
                                className="rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white px-3.5 py-1.5 text-xs font-bold transition-all"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(account.code)}
                                className="rounded-full bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-3.5 py-1.5 text-xs font-bold transition-all"
                              >
                                Borrar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-12 text-center text-sm text-on-surface-variant">
                  No se encontraron cuentas que coincidan con la búsqueda o filtros aplicados.
                </div>
              )}
            </div>

          </section>

        </main>
      </div>

      {reportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/45 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_35px_80px_rgba(0,0,0,0.25)] border border-outline-variant flex flex-col">

            <div className="border-b border-outline-variant/70 bg-white/80 px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-3 shrink-0">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-on-surface-variant font-label">Detalle Completo</p>
                <h3 className="mt-1 font-headline text-2xl font-bold tracking-tight text-on-surface">Reporte Financiero</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
              >
                Cerrar
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 space-y-8">

              {/* Helper para determinar si hay datos que mostrar */}
              {(() => {
                const hasResultados = smartFinancials
                  ? smartFinancials.estadoResultados.rows.length > 0
                  : (accounts.some(a => a.section === 'estado_resultados') ||
                    financialStatements.statementOfResults.previous.income !== 0 ||
                    financialStatements.statementOfResults.current.income !== 0);

                const hasBalance = smartFinancials
                  ? smartFinancials.balanceGeneral.rows.length > 0
                  : (accounts.some(a => a.section === 'balance_general') ||
                    financialStatements.balanceGeneral.previous.assets !== 0 ||
                    financialStatements.balanceGeneral.current.assets !== 0);

                return (
                  <>
                    {hasResultados && (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">receipt_long</span>
                          </span>
                          <h4 className="font-headline text-lg font-bold text-on-surface">Estado de Resultados</h4>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-outline-variant">
                          <table className="min-w-full text-left">
                            <thead className="bg-surface-container-low/60">
                              <tr className="text-[10px] uppercase tracking-[0.22em] text-on-surface-variant font-label border-b border-outline-variant/60">
                                <th className="px-5 py-3">Cuenta</th>
                                <th className="px-5 py-3 text-right">G1 (Anterior)</th>
                                <th className="px-5 py-3 text-right">G2 (Actual)</th>
                                <th className="px-5 py-3 text-right">Variación</th>
                              </tr>
                            </thead>
                            <tbody>
                              {smartFinancials
                                ? smartFinancials.estadoResultados.rows.map((row) => {
                                  const variation = row.g2 - row.g1;
                                  return (
                                    <tr key={row.label} className={`border-b border-outline-variant/40 last:border-b-0 text-[13px] transition-colors ${row.isSubtotal ? 'bg-primary/5' : 'hover:bg-white/60'}`}>
                                      <td className={`px-5 py-3 ${row.isSubtotal ? 'font-semibold text-primary' : 'text-on-surface'}`}>{row.label}</td>
                                      <td className="px-5 py-3 text-right text-on-surface-variant">{formatMoney(row.g1)}</td>
                                      <td className={`px-5 py-3 text-right font-medium ${row.isSubtotal ? 'text-primary font-bold' : ''}`}>{formatMoney(row.g2)}</td>
                                      <td className={`px-5 py-3 text-right text-xs font-bold ${variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {variation >= 0 ? '↗' : '↘'} {formatMoney(variation)}
                                      </td>
                                    </tr>
                                  );
                                })
                                : (() => {
                                  const { previous, current } = financialStatements.statementOfResults;
                                  const rows = [
                                    { label: 'Ingresos (4)', g1: previous.income, g2: current.income },
                                    { label: 'Gastos (5)', g1: previous.expenses, g2: current.expenses },
                                    { label: 'Resultado del Ejercicio', g1: previous.result, g2: current.result, isSubtotal: true }
                                  ].filter(r => r.g1 !== 0 || r.g2 !== 0);
                                  return rows.map((row) => {
                                    const variation = row.g2 - row.g1;
                                    return (
                                      <tr key={row.label} className={`border-b border-outline-variant/40 last:border-b-0 text-[13px] transition-colors ${row.isSubtotal ? 'bg-primary/5' : 'hover:bg-white/60'}`}>
                                        <td className={`px-5 py-3 ${row.isSubtotal ? 'font-semibold text-primary' : 'text-on-surface'}`}>{row.label}</td>
                                        <td className="px-5 py-3 text-right text-on-surface-variant">{formatMoney(row.g1)}</td>
                                        <td className={`px-5 py-3 text-right font-medium ${row.isSubtotal ? 'text-primary font-bold' : ''}`}>{formatMoney(row.g2)}</td>
                                        <td className={`px-5 py-3 text-right text-xs font-bold ${variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                          {variation >= 0 ? '↗' : '↘'} {formatMoney(variation)}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {hasBalance && (
                      <div className="mt-8">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="h-8 w-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">account_balance</span>
                          </span>
                          <h4 className="font-headline text-lg font-bold text-on-surface">Balance General</h4>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-outline-variant">
                          <table className="min-w-full text-left">
                            <thead className="bg-surface-container-low/60">
                              <tr className="text-[10px] uppercase tracking-[0.22em] text-on-surface-variant font-label border-b border-outline-variant/60">
                                <th className="px-5 py-3">Cuenta</th>
                                <th className="px-5 py-3 text-right">G1 (Anterior)</th>
                                <th className="px-5 py-3 text-right">G2 (Actual)</th>
                                <th className="px-5 py-3 text-right">Variación</th>
                              </tr>
                            </thead>
                            <tbody>
                              {smartFinancials
                                ? smartFinancials.balanceGeneral.rows.map((row) => {
                                  const variation = row.g2 - row.g1;
                                  return (
                                    <tr key={row.label} className={`border-b border-outline-variant/40 last:border-b-0 text-[13px] transition-colors ${row.isDiff ? 'bg-primary/5' : 'hover:bg-white/60'}`}>
                                      <td className={`px-5 py-3 ${row.isDiff ? 'font-semibold text-primary' : 'text-on-surface'}`}>{row.label}</td>
                                      <td className="px-5 py-3 text-right text-on-surface-variant">{formatMoney(row.g1)}</td>
                                      <td className={`px-5 py-3 text-right font-medium ${row.isDiff && row.g2 !== 0 ? 'text-red-600 font-bold' : ''}`}>{formatMoney(row.g2)}</td>
                                      <td className="px-5 py-3 text-right text-xs font-bold text-on-surface-variant">
                                        {row.isDiff ? '—' : `${variation >= 0 ? '↗' : '↘'} ${formatMoney(variation)}`}
                                      </td>
                                    </tr>
                                  );
                                })
                                : (() => {
                                  const { previous, current } = financialStatements.balanceGeneral;
                                  const rows = [
                                    { label: 'Activo', g1: previous.assets, g2: current.assets },
                                    { label: 'Pasivo', g1: previous.liabilities, g2: current.liabilities },
                                    { label: 'Patrimonio', g1: previous.equity, g2: current.equity },
                                    { label: 'Diferencia (Cuadre)', g1: previous.difference, g2: current.difference, isDiff: true }
                                  ];
                                  return rows.map((row) => {
                                    const variation = row.g2 - row.g1;
                                    return (
                                      <tr key={row.label} className={`border-b border-outline-variant/40 last:border-b-0 text-[13px] transition-colors ${row.isDiff ? 'bg-primary/5' : 'hover:bg-white/60'}`}>
                                        <td className={`px-5 py-3 ${row.isDiff ? 'font-semibold text-primary' : 'text-on-surface'}`}>{row.label}</td>
                                        <td className="px-5 py-3 text-right text-on-surface-variant">{formatMoney(row.g1)}</td>
                                        <td className={`px-5 py-3 text-right font-medium ${row.isDiff && row.g2 !== 0 ? 'text-red-600 font-bold' : ''}`}>{formatMoney(row.g2)}</td>
                                        <td className="px-5 py-3 text-right text-xs font-bold text-on-surface-variant">
                                          {row.isDiff ? '—' : `${variation >= 0 ? '↗' : '↘'} ${formatMoney(variation)}`}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {!hasResultados && !hasBalance && (
                      <div className="text-center py-12 text-on-surface-variant text-sm">
                        <span className="material-symbols-outlined text-4xl mb-3 block text-outline-variant">inbox</span>
                        No hay datos financieros para mostrar. Importa un CSV con cuentas o registra cuentas de nivel 1 (1,2,3,4,5).
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}
      <ImportGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </div>
  )
}