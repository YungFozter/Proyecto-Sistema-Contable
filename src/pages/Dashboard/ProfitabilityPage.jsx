import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    formatMoney,
    getProfitabilityAnalysisWithOverrides,   // ← Versión con overrides
    readAccounts,
    findAccountByCode
} from '../../utils/accountsStore'
import AccountSelectorModal from '../../components/AccountSelectorModal'

function formatRatio(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return 'N/D'
    return Number(value).toFixed(2)
}

function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return 'N/D'
    const sign = value > 0 ? '+' : ''
    return `${sign}${Number(value).toFixed(1)}%`
}

function TrendBadge({ trend, variation }) {
    if (!trend) return <span className="text-xs text-on-surface-variant">Sin comparación</span>
    const config = {
        up: { label: 'Incrementó', icon: 'trending_up', className: 'bg-emerald-100 text-emerald-700' },
        down: { label: 'Decreció', icon: 'trending_down', className: 'bg-red-100 text-red-700' },
        stable: { label: 'Sin cambio', icon: 'trending_flat', className: 'bg-surface-container-low text-on-surface-variant' },
    }[trend]
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${config.className}`}>
            <span className="material-symbols-outlined text-sm">{config.icon}</span>
            {config.label}
            {variation !== null ? ` (${variation > 0 ? '+' : ''}${formatRatio(variation)})` : ''}
        </span>
    )
}

function RatioCard({ title, description, formula, ratio, interpretation, isPercent = true }) {
    const displayValue = isPercent ? `${formatRatio(ratio.g2)}%` : formatRatio(ratio.g2)
    return (
        <article className="rounded-2xl border border-outline-variant/60 bg-white/70 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-on-surface font-headline">{displayValue}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Gestión 2 (actual)</p>
                </div>
                <TrendBadge trend={ratio.trend} variation={ratio.variation} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-surface-container-low/50 px-3 py-2">
                    <p className="text-on-surface-variant">G1 (anterior)</p>
                    <p className="font-semibold text-on-surface">{isPercent ? `${formatRatio(ratio.g1)}%` : formatRatio(ratio.g1)}</p>
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
    const variation = (component.g2 - component.g1)
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

export default function ProfitabilityPage() {
    const navigate = useNavigate()
    const location = useLocation()

    // Overrides manuales para Rentabilidad
    const [manualOverrides, setManualOverrides] = useState(() => {
        const saved = localStorage.getItem('manualOverrides_rentabilidad')
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
        localStorage.setItem('manualOverrides_rentabilidad', JSON.stringify(newOverrides))
    }

    const getOverrideAccountName = (mappingKey) => {
        const code = manualOverrides[mappingKey]
        if (!code) return null
        const account = findAccountByCode(code)
        return account ? `${account.code} - ${account.name}` : code
    }

    const analysis = getProfitabilityAnalysisWithOverrides(readAccounts(), manualOverrides)
    const { data, ratios, hasData, warnings } = analysis

    return (
        <div className="min-h-screen bg-[#e7e0d6] font-body text-on-surface">
            <div className="grid min-h-screen lg:grid-cols-[320px_1fr]">
                {/* Sidebar (igual que antes) */}
                <aside className="bg-[linear-gradient(180deg,#5f45c0_0%,#3d2a88_100%)] text-white px-6 py-8 md:px-8 md:py-10 flex flex-col justify-between shadow-[0_0_45px_rgba(0,0,0,0.15)] lg:sticky lg:top-0 lg:h-screen z-20">
                    <div>
                        <div className="flex items-center gap-3 mb-10">
                            <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center border border-white/10 shrink-0">
                                <span className="material-symbols-outlined text-2xl">trending_up</span>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.24em] text-white/70 font-label">Indicadores</p>
                                <h1 className="font-headline text-2xl font-bold tracking-tight">Rentabilidad</h1>
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
                            <Link to="/eficiencia" className="flex items-center justify-between rounded-2xl px-4 py-3 text-white/80 hover:bg-white/10 transition-colors">
                                <span className="font-medium">Análisis de Eficiencia</span>
                                <span className="material-symbols-outlined text-sm">speed</span>
                            </Link>
                            <Link to="/rentabilidad" className="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 border border-white/10">
                                <span className="font-medium">Análisis de Rentabilidad</span>
                                <span className="material-symbols-outlined text-sm">analytics</span>
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
                            Los cálculos usan saldos del Balance General y Estado de Resultados (Gestión 1 y Gestión 2).
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
                        <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Análisis de Rentabilidad</h2>
                        <p className="text-on-surface-variant mt-2 max-w-3xl leading-relaxed text-[15px]">
                            Mide la capacidad de generar beneficios en relación con las ventas, los activos y el patrimonio.
                        </p>
                    </header>

                    {warnings.length > 0 && (
                        <section className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4">
                            <p className="text-sm font-semibold text-amber-900 mb-2">Advertencias de detección</p>
                            <ul className="space-y-1 text-sm text-amber-800">
                                {warnings.map(w => <li key={w}>• {w}</li>)}
                            </ul>
                        </section>
                    )}

                    {!hasData ? (
                        <section className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-10 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                            <span className="material-symbols-outlined text-5xl text-outline-variant mb-4 block">inbox</span>
                            <h3 className="font-headline text-2xl font-bold text-on-surface">Sin datos de Estado de Resultados o Balance</h3>
                            <p className="text-on-surface-variant mt-2 max-w-lg mx-auto">
                                Importa un plan de cuentas que incluya Ventas (4.1), Costo de Ventas (5.1), Utilidad Neta, Activo Total (1) y Patrimonio (3) para habilitar el análisis de rentabilidad.
                            </p>
                            <Link to="/nueva-cuenta" className="inline-flex mt-6 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-[#e5884a] transition-all">
                                Importar cuentas
                            </Link>
                        </section>
                    ) : (
                        <>
                            <section className="mb-8">
                                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-label mb-4">Indicadores calculados</p>
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <RatioCard title="Margen Bruto" description="Utilidad Bruta / Ventas Netas" formula="(Ventas − Costo de Ventas) ÷ Ventas" ratio={ratios.grossMargin} interpretation="Indica el porcentaje de ganancia después de costos directos." />
                                    <RatioCard title="Margen Operativo" description="Resultado Operativo / Ventas Netas" formula="Resultado Operativo ÷ Ventas" ratio={ratios.operatingMargin} interpretation="Refleja la eficiencia operativa antes de intereses e impuestos." />
                                    <RatioCard title="Margen Neto" description="Utilidad Neta / Ventas Netas" formula="Utilidad Neta ÷ Ventas" ratio={ratios.netMargin} interpretation="Lo que realmente queda para los accionistas por cada unidad vendida." />
                                    <RatioCard title="ROA (Return on Assets)" description="Utilidad Neta / Activo Total" formula="Utilidad Neta ÷ Activo Total" ratio={ratios.roa} interpretation="Rentabilidad sobre el total de recursos invertidos." />
                                    <RatioCard title="ROE (Return on Equity)" description="Utilidad Neta / Patrimonio" formula="Utilidad Neta ÷ Patrimonio" ratio={ratios.roe} interpretation="Rentabilidad del capital aportado por los accionistas." />
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
                                        { key: 'operatingIncome', label: 'Resultado Operativo' },
                                        { key: 'netIncome', label: 'Utilidad Neta' },
                                        { key: 'totalAssets', label: 'Activo Total' },
                                        { key: 'totalEquity', label: 'Patrimonio Total' }
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
                                        <button onClick={() => { setManualOverrides({}); localStorage.removeItem('manualOverrides_rentabilidad'); }} className="text-xs text-red-600 underline">
                                            Restablecer todas las selecciones manuales
                                        </button>
                                    </div>
                                )}
                            </section>

                            {/* Análisis DuPont */}
                            <section className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_14px_30px_rgba(15,23,42,0.06)] mb-8">
                                <h3 className="font-headline text-xl font-bold mb-2">Análisis DuPont</h3>
                                <p className="text-sm text-on-surface-variant mb-4">Descomposición del ROE = Margen Neto × Rotación del Activo × Apalancamiento Financiero</p>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                                    <div className="p-3 bg-primary/5 rounded-xl">
                                        <p className="text-xs text-on-surface-variant">Margen Neto</p>
                                        <p className="text-xl font-bold text-on-surface">{ratios.dupont.netMargin != null ? `${(ratios.dupont.netMargin * 100).toFixed(1)}%` : 'N/D'}</p>
                                    </div>
                                    <div className="p-3 bg-primary/5 rounded-xl">
                                        <p className="text-xs text-on-surface-variant">Rotación del Activo</p>
                                        <p className="text-xl font-bold text-on-surface">{ratios.dupont.assetTurnover != null ? ratios.dupont.assetTurnover.toFixed(2) : 'N/D'}</p>
                                    </div>
                                    <div className="p-3 bg-primary/5 rounded-xl">
                                        <p className="text-xs text-on-surface-variant">Apalancamiento</p>
                                        <p className="text-xl font-bold text-on-surface">{ratios.dupont.financialLeverage != null ? ratios.dupont.financialLeverage.toFixed(2) : 'N/D'}</p>
                                    </div>
                                    <div className="p-3 bg-primary/10 rounded-xl">
                                        <p className="text-xs text-primary font-semibold">ROE (DuPont)</p>
                                        <p className="text-xl font-bold text-primary">{ratios.dupont.roe != null ? `${(ratios.dupont.roe * 100).toFixed(1)}%` : 'N/D'}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Base de cálculo */}
                            <section className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                                <header className="border-b border-outline-variant/70 px-6 py-5 md:px-7 bg-white/80">
                                    <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant font-label">Base de cálculo</p>
                                    <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Datos de Balance y Estado de Resultados</h3>
                                    <p className="text-xs text-on-surface-variant mt-1">Cuentas detectadas por código o nombre.</p>
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
                                            <DataSourceRow label="Resultado Operativo" component={data.operatingIncome} codesHint="Nombre contiene «resultado operativo» o «utilidad operativa»" />
                                            <DataSourceRow label="Utilidad Neta" component={data.netIncome} codesHint="Nombre contiene «utilidad neta», «resultado neto», «ganancia neta»" />
                                            <DataSourceRow label="Activo Total" component={data.totalAssets} codesHint="Código 1 o nombre «activo»" />
                                            <DataSourceRow label="Patrimonio Total" component={data.totalEquity} codesHint="Código 3 o nombre «patrimonio», «capital»" />
                                        </tbody>
                                    </table>
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