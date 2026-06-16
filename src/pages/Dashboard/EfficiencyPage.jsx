import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  formatMoney,
  getEfficiencyAnalysisWithOverrides,   // ← Cambiado: usar versión con overrides
  readAccounts,
  findAccountByCode
} from '../../utils/accountsStore'
import AccountSelectorModal from '../../components/AccountSelectorModal'

function formatRatio(value, unit = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/D'
  return `${Number(value).toFixed(2)}${unit ? ' ' + unit : ''}`
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/D'
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(1)}%`
}

function TrendBadge({ trend, variation, isDays = false }) {
  if (!trend) return <span className="text-xs text-on-surface-variant">Sin comparación</span>
  const config = {
    up: { label: 'Incrementó', icon: 'trending_up', className: 'bg-emerald-100 text-emerald-700' },
    down: { label: 'Decreció', icon: 'trending_down', className: 'bg-red-100 text-red-700' },
    stable: { label: 'Sin cambio', icon: 'trending_flat', className: 'bg-surface-container-low text-on-surface-variant' },
  }[trend]
  const unit = isDays ? 'días' : 'veces'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${config.className}`}>
      <span className="material-symbols-outlined text-sm">{config.icon}</span>
      {config.label}
      {variation !== null ? ` (${variation > 0 ? '+' : ''}${formatRatio(variation, unit)})` : ''}
    </span>
  )
}

function RatioCard({ title, description, formula, ratio, interpretation, isDays = false }) {
  const unit = isDays ? 'días' : 'veces'
  return (
    <article className="rounded-2xl border border-outline-variant/60 bg-white/70 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label">{title}</p>
          <p className="mt-2 text-3xl font-bold text-on-surface font-headline">{formatRatio(ratio.g2, unit)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Gestión 2 (actual)</p>
        </div>
        <TrendBadge trend={ratio.trend} variation={ratio.variation} isDays={isDays} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-surface-container-low/50 px-3 py-2">
          <p className="text-on-surface-variant">G1 (anterior)</p>
          <p className="font-semibold text-on-surface">{formatRatio(ratio.g1, unit)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low/50 px-3 py-2">
          <p className="text-on-surface-variant">Variación %</p>
          <p className={`font-semibold ${ratio.percentChange > 0 ? 'text-emerald-600' : ratio.percentChange < 0 ? 'text-red-600' : 'text-on-surface'}`}>
            {formatPercent(ratio.percentChange)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-on-surface-variant">{description}</p>
      <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 font-mono text-[11px] text-primary">{formula}</p>
      <p className="mt-3 text-[12px] text-on-surface-variant italic">{interpretation}</p>
    </article>
  )
}

function DataSourceRow({ label, component, codesHint }) {
  const variation = roundVariation(component.g2 - component.g1)
  return (
    <tr className="border-b border-outline-variant/40 last:border-b-0 text-[13px] hover:bg-white/40 transition-colors">
      <td className="px-4 py-3">
        <p className="font-semibold text-on-surface">{label}</p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">{codesHint}</p>
        {component.account ? (
          <p className="text-[11px] text-primary mt-1 font-mono">{component.account.code} · {component.account.name}</p>
        ) : (
          <p className="text-[11px] text-red-600 mt-1">Cuenta no detectada</p>
        )}
      </td>
      <td className="px-4 py-3 text-on-surface-variant">{formatMoney(component.g1)}</td>
      <td className="px-4 py-3 font-medium">{formatMoney(component.g2)}</td>
      <td className={`px-4 py-3 font-bold ${variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
        {variation >= 0 ? '↗' : '↘'} {formatMoney(variation)}
      </td>
    </tr>
  )
}

function roundVariation(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export default function EfficiencyPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Overrides manuales para Eficiencia
  const [manualOverrides, setManualOverrides] = useState(() => {
    const saved = localStorage.getItem('manualOverrides_eficiencia')
    return saved ? JSON.parse(saved) : {}
  })

  const [selectorModal, setSelectorModal] = useState({
    open: false,
    mappingKey: null,
    label: ''
  })

  const setOverride = (mappingKey, accountCode) => {
    const newOverrides = { ...manualOverrides }
    if (accountCode === null) {
      delete newOverrides[mappingKey]
    } else {
      newOverrides[mappingKey] = accountCode
    }
    setManualOverrides(newOverrides)
    localStorage.setItem('manualOverrides_eficiencia', JSON.stringify(newOverrides))
  }

  const getOverrideAccountName = (mappingKey) => {
    const code = manualOverrides[mappingKey]
    if (!code) return null
    const account = findAccountByCode(code)
    return account ? `${account.code} - ${account.name}` : code
  }

  const analysis = getEfficiencyAnalysisWithOverrides(readAccounts(), manualOverrides)
  const { data, ratios, hasData, warnings } = analysis

  return (
    <div className="min-h-screen bg-[#e7e0d6] font-body text-on-surface">
      <div className="grid min-h-screen lg:grid-cols-[320px_1fr]">
        {/* Sidebar (sin cambios) */}
        <aside className="bg-[linear-gradient(180deg,#5f45c0_0%,#3d2a88_100%)] text-white px-6 py-8 md:px-8 md:py-10 flex flex-col justify-between shadow-[0_0_45px_rgba(0,0,0,0.15)] lg:sticky lg:top-0 lg:h-screen z-20">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center border border-white/10 shrink-0">
                <span className="material-symbols-outlined text-2xl">speed</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/70 font-label">Indicadores</p>
                <h1 className="font-headline text-2xl font-bold tracking-tight">Eficiencia</h1>
              </div>
            </div>
            <nav className="space-y-3">
              <Link to="/dashboard" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Resumen / Dashboard</span>
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </Link>
              <Link to="/liquidez" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Análisis de Liquidez</span>
                <span className="material-symbols-outlined text-sm">water_drop</span>
              </Link>
              <Link to="/deuda" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Análisis de Endeudamiento</span>
                <span className="material-symbols-outlined text-sm">balance</span>
              </Link>
              <Link to="/eficiencia" className="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 border border-white/10">
                <span className="font-medium">Análisis de Eficiencia</span>
                <span className="material-symbols-outlined text-sm">analytics</span>
              </Link>
              <Link to="/rentabilidad" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Análisis de Rentabilidad</span>
                <span className="material-symbols-outlined text-sm">trending_up</span>
              </Link>
              <Link to="/nueva-cuenta" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                <span className="font-medium">Nueva Cuenta</span>
                <span className="material-symbols-outlined text-sm">add_circle</span>
              </Link>
            </nav>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 mt-10">
            <p className="text-xs uppercase tracking-[0.24em] text-white/65 font-label mb-2">Fuente de datos</p>
            <p className="text-sm text-white/85 leading-relaxed">
              Los cálculos usan los saldos del Balance General y del Estado de Resultados almacenados en Gestión 1 y Gestión 2.
            </p>
            <button onClick={() => navigate('/mi-cuenta', { state: { background: location } })} className="mt-4 w-full flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 hover:bg-white/15 transition-colors">
              <span className="font-medium">Mi cuenta</span>
              <span className="material-symbols-outlined text-sm">person</span>
            </button>
          </div>
        </aside>

        <main className="bg-[linear-gradient(180deg,#fffdfb_0%,#fbf8f4_100%)] px-6 py-8 md:px-8 md:py-10 xl:px-12 xl:py-12">
          <header className="mb-8">
            <p className="text-sm uppercase tracking-[0.24em] text-on-surface-variant font-label mb-2">Indicadores Financieros</p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Análisis de Eficiencia o Actividad</h2>
            <p className="text-on-surface-variant mt-2 max-w-3xl leading-relaxed text-[15px]">
              Evalúa la rapidez con la que la empresa gestiona sus recursos operativos, tales como la rotación de sus activos totales para generar ventas, y los plazos promedio de cobranza, rotación de stocks y pago a proveedores.
            </p>
          </header>

          {warnings.length > 0 && (
            <section className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">Advertencias de detección</p>
              <ul className="space-y-1 text-sm text-amber-800">
                {warnings.map((warning) => (<li key={warning}>• {warning}</li>))}
              </ul>
            </section>
          )}

          {!hasData ? (
            <section className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-10 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-4 block">inbox</span>
              <h3 className="font-headline text-2xl font-bold text-on-surface">Sin datos operativos de Balance o Resultados</h3>
              <p className="text-on-surface-variant mt-2 max-w-lg mx-auto">
                Importa un plan de cuentas conteniendo Ventas (4.1), Costo de Ventas (5.1), Activo (1), Cuentas por Cobrar (1.1.3), Inventarios (1.1.5) y Deudas Comerciales (2.1.1) para habilitar el análisis de eficiencia.
              </p>
              <Link to="/nueva-cuenta" className="inline-flex mt-6 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-[#e5884a] transition-all">
                Importar cuentas
              </Link>
            </section>
          ) : (
            <>
              <section className="mb-8">
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label mb-4">Indicadores calculados</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <RatioCard title="Rotación del Activo Total" description="Indica cuántas veces se vende el activo total." formula="Ventas Netas ÷ Activo Total" ratio={ratios.assetTurnover} interpretation="Valores más altos reflejan mayor productividad." />
                  <RatioCard title="Período Promedio de Cobro (PPC)" description="Días que toma cobrar las cuentas a crédito." formula="360 ÷ (Ventas Netas ÷ Cuentas por Cobrar)" ratio={ratios.avgCollectionDays} interpretation="Un PPC menor favorece la disponibilidad de efectivo." isDays={true} />
                  <RatioCard title="Período Promedio de Inventario (PPI)" description="Días que el inventario permanece antes de venderse." formula="360 ÷ (Costo de Ventas ÷ Inventarios)" ratio={ratios.avgInventoryDays} interpretation="Valores decrecientes (menos días) indican mejor rotación." isDays={true} />
                  <RatioCard title="Período Promedio de Pago (PPP)" description="Días que tarda en pagar a proveedores." formula="360 ÷ (Costo de Ventas ÷ Deudas Comerciales)" ratio={ratios.avgPaymentDays} interpretation="Plazo más extendido permite autofinanciar la operación." isDays={true} />
                </div>
              </section>

              {/* PANEL DE SELECCIÓN MANUAL */}
              <section className="mb-8 rounded-xl border border-outline-variant bg-white/80 p-5">
                <h3 className="font-semibold text-on-surface mb-3">Selección manual de cuentas</h3>
                <p className="text-sm text-on-surface-variant mb-3">
                  Si alguna cuenta no se detecta automáticamente o deseas usar otra, puedes seleccionarla manualmente:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'sales', label: 'Ventas Netas' },
                    { key: 'cogs', label: 'Costo de Ventas' },
                    { key: 'totalAssets', label: 'Activo Total' },
                    { key: 'receivables', label: 'Cuentas por Cobrar' },
                    { key: 'inventory', label: 'Inventarios' },
                    { key: 'payables', label: 'Deudas Comerciales' }
                  ].map(({ key, label }) => (
                    <div key={key} className="border rounded-lg p-3">
                      <p className="font-medium text-sm">{label}</p>
                      <button
                        onClick={() => setSelectorModal({ open: true, mappingKey: key, label })}
                        className="mt-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary hover:text-white transition-colors"
                      >
                        Seleccionar cuenta
                      </button>
                      {manualOverrides[key] && (
                        <p className="text-xs text-on-surface-variant mt-2">Usando: {getOverrideAccountName(key)}</p>
                      )}
                    </div>
                  ))}
                </div>
                {Object.keys(manualOverrides).length > 0 && (
                  <div className="mt-4 text-right">
                    <button onClick={() => { setManualOverrides({}); localStorage.removeItem('manualOverrides_eficiencia'); }} className="text-xs text-red-600 underline">
                      Restablecer todas las selecciones manuales
                    </button>
                  </div>
                )}
              </section>

              {/* Base de cálculo */}
              <section className="mb-8 rounded-[2rem] border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                <header className="border-b border-outline-variant/70 px-6 py-5 md:px-7 bg-white/80">
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant font-label">Base de cálculo</p>
                  <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Datos Operativos de Balance y Resultados</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Cuentas detectadas por código (4.1, 5.1, 1, 1.1.3, 1.1.5, 2.1.1) o por concordancia en el plan contable.
                  </p>
                </header>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead className="bg-surface-container-low/40">
                      <tr className="text-[10px] uppercase tracking-[0.22em] text-on-surface-variant font-label border-b border-outline-variant/60">
                        <th className="px-4 py-3">Componente</th>
                        <th className="px-4 py-3">G1 (Anterior)</th>
                        <th className="px-4 py-3">G2 (Actual)</th>
                        <th className="px-4 py-3">Variación</th>
                      </tr>
                    </thead>
                    <tbody>
                      <DataSourceRow label="Ventas Netas" component={data.sales} codesHint="Código 4.1 o nombre «ventas»" />
                      <DataSourceRow label="Costo de Ventas" component={data.cogs} codesHint="Código 5.1 o nombre «costo de ventas»" />
                      <DataSourceRow label="Activo Total" component={data.totalAssets} codesHint="Código 1 o nombre «activo»" />
                      <DataSourceRow label="Cuentas por Cobrar" component={data.receivables} codesHint="Código 1.1.3 o nombre «cuentas por cobrar»" />
                      <DataSourceRow label="Inventarios" component={data.inventory} codesHint="Código 1.1.5 o nombre «inventarios»" />
                      <DataSourceRow label="Deudas Comerciales" component={data.payables} codesHint="Código 2.1.1 o nombre «deudas comerciales» o «proveedores»" />
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Análisis horizontal y área de cálculo (sin cambios) */}
              <section className="grid gap-6 xl:grid-cols-2 mb-8">
                <div className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label mb-2">Análisis horizontal</p>
                  <h3 className="font-headline text-xl font-bold text-on-surface mb-4">Comparación entre gestiones</h3>
                  <div className="overflow-hidden rounded-xl border border-outline-variant">
                    <table className="min-w-full text-left text-[13px]">
                      <thead className="bg-surface-container-low/50">
                        <tr className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant font-label">
                          <th className="px-4 py-2">Indicador</th>
                          <th className="px-4 py-2">G1</th>
                          <th className="px-4 py-2">G2</th>
                          <th className="px-4 py-2">Δ Abs.</th>
                          <th className="px-4 py-2">Δ %</th>
                          <th className="px-4 py-2">Tendencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Rotación del Activo', ratio: ratios.assetTurnover, isDays: false },
                          { label: 'Plazo Promedio Cobro', ratio: ratios.avgCollectionDays, isDays: true },
                          { label: 'Plazo Promedio Inventario', ratio: ratios.avgInventoryDays, isDays: true },
                          { label: 'Plazo Promedio Pago', ratio: ratios.avgPaymentDays, isDays: true },
                        ].map((row) => (
                          <tr key={row.label} className="border-t border-outline-variant/40">
                            <td className="px-4 py-2.5 font-medium">{row.label}</td>
                            <td className="px-4 py-2.5">{formatRatio(row.ratio.g1, row.isDays ? 'd' : 'x')}</td>
                            <td className="px-4 py-2.5 font-semibold">{formatRatio(row.ratio.g2, row.isDays ? 'd' : 'x')}</td>
                            <td className="px-4 py-2.5">{row.ratio.variation !== null ? formatRatio(row.ratio.variation, row.isDays ? 'd' : 'x') : 'N/D'}</td>
                            <td className="px-4 py-2.5">{formatPercent(row.ratio.percentChange)}</td>
                            <td className="px-4 py-2.5"><TrendBadge trend={row.ratio.trend} variation={null} isDays={row.isDays} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label mb-2">Área de cálculo</p>
                  <h3 className="font-headline text-xl font-bold text-on-surface mb-4">Desglose de fórmulas (Gestión 2)</h3>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-outline-variant/60 bg-white/60 p-4 font-mono text-xs"><p className="font-semibold mb-2">Rotación del Activo Total</p><p>{formatMoney(data.sales.g2)} ÷ {formatMoney(data.totalAssets.g2)}</p><p className="mt-2 text-primary font-bold">= {formatRatio(ratios.assetTurnover.g2, 'veces')}</p></div>
                    <div className="rounded-xl border border-outline-variant/60 bg-white/60 p-4 font-mono text-xs"><p className="font-semibold mb-2">Período Promedio de Cobro (PPC)</p><p>360 ÷ ({formatMoney(data.sales.g2)} ÷ {formatMoney(data.receivables.g2)})</p><p className="mt-2 text-primary font-bold">= {formatRatio(ratios.avgCollectionDays.g2, 'días')}</p></div>
                    <div className="rounded-xl border border-outline-variant/60 bg-white/60 p-4 font-mono text-xs"><p className="font-semibold mb-2">Período Promedio de Inventario (PPI)</p><p>360 ÷ ({formatMoney(data.cogs.g2)} ÷ {formatMoney(data.inventory.g2)})</p><p className="mt-2 text-primary font-bold">= {formatRatio(ratios.avgInventoryDays.g2, 'días')}</p></div>
                    <div className="rounded-xl border border-outline-variant/60 bg-white/60 p-4 font-mono text-xs"><p className="font-semibold mb-2">Período Promedio de Pago (PPP)</p><p>360 ÷ ({formatMoney(data.cogs.g2)} ÷ {formatMoney(data.payables.g2)})</p><p className="mt-2 text-primary font-bold">= {formatRatio(ratios.avgPaymentDays.g2, 'días')}</p></div>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* Modal de selección de cuentas */}
      <AccountSelectorModal
        isOpen={selectorModal.open}
        onClose={() => setSelectorModal({ open: false, mappingKey: null, label: '' })}
        onSelect={(accountCode) => setOverride(selectorModal.mappingKey, accountCode)}
        mappingKey={selectorModal.mappingKey}
        componentLabel={selectorModal.label}
      />
    </div>
  )
}