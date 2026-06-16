import React from 'react'

export default function ImportGuideModal({ isOpen, onClose }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/45 backdrop-blur-sm">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_35px_80px_rgba(0,0,0,0.25)] border border-outline-variant flex flex-col">

                {/* Header */}
                <div className="border-b border-outline-variant/70 bg-white/80 px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-3 shrink-0">
                    <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-on-surface-variant font-label">Guía de Importación</p>
                        <h3 className="mt-1 font-headline text-2xl font-bold tracking-tight text-on-surface">Requisitos para obtener indicadores financieros</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                    >
                        Cerrar
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 space-y-8 text-on-surface-variant">

                    {/* 1. Estructura jerárquica */}
                    <section>
                        <h4 className="font-headline text-lg font-bold text-on-surface mb-3">📌 Estructura jerárquica de cuentas</h4>
                        <p className="text-sm leading-relaxed mb-2">
                            El sistema utiliza una jerarquía de <strong>5 niveles</strong> separados por puntos.
                            Los niveles <strong>1, 2 y 3</strong> son <strong>agrupadores</strong>: sus saldos se calculan automáticamente sumando las cuentas hijas.
                            Los niveles <strong>4 y 5</strong> son <strong>de detalle</strong>: allí debes ingresar los saldos manuales (<code>gestion1</code> y <code>gestion2</code>).
                        </p>
                        <div className="rounded-xl bg-primary/5 p-4 font-mono text-xs">
                            <div>1   → ACTIVO (agrupador, nivel 1)</div>
                            <div className="pl-4">1.1 → ACTIVO CORRIENTE (agrupador, nivel 2)</div>
                            <div className="pl-8">1.1.1 → DISPONIBILIDADES (agrupador, nivel 3)</div>
                            <div className="pl-12">1.1.1.1 → CAJA Y BANCOS (detalle, nivel 4) ← aquí pones los saldos</div>
                            <div className="pl-12">1.1.1.2 → INVERSIONES TEMPORALES (detalle, nivel 4)</div>
                            <div className="pl-8">1.1.3 → CUENTAS POR COBRAR COMERCIALES (agrupador, nivel 3)</div>
                            <div className="pl-12">1.1.3.1 → CLIENTES (detalle, nivel 4)</div>
                        </div>
                    </section>

                    {/* 2. Cuentas mínimas necesarias por análisis */}
                    <section>
                        <h4 className="font-headline text-lg font-bold text-on-surface mb-3">📋 Cuentas mínimas necesarias</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border border-outline-variant/60 rounded-xl">
                                <thead className="bg-surface-container-low/60">
                                    <tr className="text-left text-[11px] uppercase tracking-wider">
                                        <th className="px-3 py-2">Análisis</th>
                                        <th className="px-3 py-2">Cuentas requeridas (código o nombre)</th>
                                        <th className="px-3 py-2">Tipo de cuenta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/40">
                                    <tr><td className="px-3 py-2 font-semibold">Liquidez</td><td className="px-3 py-2"><code>1.1</code> (Activo Corriente), <code>2.1</code> (Pasivo Corriente), <code>1.1.1</code> (Disponibilidades), <code>1.1.5</code> (Inventarios)</td><td className="px-3 py-2">Agrupadores (2 y 3) + detalles (4)</td></tr>
                                    <tr><td className="px-3 py-2 font-semibold">Deuda</td><td className="px-3 py-2"><code>1</code> (Activo Total), <code>2</code> (Pasivo Total), <code>2.1</code> (Pasivo Corriente), <code>RESULTADO OPERATIVO</code> (nombre), <code>5.4</code> o <code>GASTOS FINANCIEROS</code></td><td className="px-3 py-2">Agrupadores + cuentas de resultado (detalle)</td></tr>
                                    <tr><td className="px-3 py-2 font-semibold">Eficiencia</td><td className="px-3 py-2"><code>4.1</code> (Ventas Netas), <code>5.1</code> (Costo de Ventas), <code>1.1.3</code> (Cuentas por Cobrar), <code>1.1.5</code> (Inventarios), <code>2.1.1</code> (Deudas Comerciales)</td><td className="px-3 py-2">Detalle (4) y agrupadores</td></tr>
                                    <tr><td className="px-3 py-2 font-semibold">Rentabilidad</td><td className="px-3 py-2"><code>4.1</code>, <code>5.1</code>, <code>RESULTADO OPERATIVO</code>, <code>UTILIDAD NETA</code>, <code>1</code>, <code>3</code></td><td className="px-3 py-2">Detalle (4) + agrupadores</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs mt-3">
                            ⚠️ <strong>Importante:</strong> Las cuentas agrupadoras (nivel 1-3) deben tener <code>gestion1=0</code> y <code>gestion2=0</code>; sus saldos se calculan automáticamente.
                            Las cuentas de detalle (nivel 4-5) deben contener los valores numéricos.
                        </p>
                    </section>

                    {/* 3. Formato del CSV */}
                    <section>
                        <h4 className="font-headline text-lg font-bold text-on-surface mb-3">📄 Formato correcto del CSV</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Delimitador: <strong>coma (,)</strong> (el sistema también detecta punto y coma, pero se recomienda coma)</li>
                            <li>Codificación: <strong>UTF-8</strong> (sin BOM)</li>
                            <li>Columnas obligatorias: <code>codigo</code>, <code>nombre</code>, <code>gestion1</code>, <code>gestion2</code> (pueden estar en cualquier orden)</li>
                            <li>Los códigos deben usar puntos: <code>1.1.1.1</code>, no usar códigos concatenados como <code>1010101</code>.</li>
                            <li>Los valores numéricos no deben incluir comas de miles (usar punto decimal si es necesario).</li>
                        </ul>
                        <div className="mt-3 rounded-xl bg-surface-container-low/60 p-3 font-mono text-xs overflow-x-auto">
                            <pre className="whitespace-pre-wrap break-all">
                                {`codigo,nombre,gestion1,gestion2
1,ACTIVO TOTAL,0,0
1.1,ACTIVO CORRIENTE,0,0
1.1.1,DISPONIBILIDADES,0,0
1.1.1.1,CAJA Y BANCOS,189314286,116138957
1.1.3,CUENTAS POR COBRAR,0,0
1.1.3.1,CLIENTES,155012353,130005950
1.1.5,INVENTARIOS,0,0
1.1.5.1,MERCANCÍAS,245714352,266990453
2,PASIVO TOTAL,0,0
2.1,PASIVO CORRIENTE,0,0
2.1.1,DEUDAS COMERCIALES,0,0
2.1.1.1,PROVEEDORES,100024306,92496321
4.1,VENTAS NETAS,0,0
4.1.1.1,VENTAS NETAS,718318478,805678961
5.1,COSTO DE VENTAS,0,0
5.1.1.1,COSTO DE VENTAS,309297403,315102139
RESULTADO OPERATIVO,UTILIDAD OPERATIVA,46115979,88971582
UTILIDAD NETA,RESULTADO NETO DEL EJERCICIO,28501901,65744636`}
                            </pre>
                        </div>
                        <p className="text-xs mt-2">
                            ✅ Las cuentas <code>RESULTADO OPERATIVO</code> y <code>UTILIDAD NETA</code> no necesitan código numérico (se detectan por nombre).
                            Se recomienda darles un código como <code>4.8</code> y <code>4.9</code> para evitar confusiones.
                        </p>
                    </section>

                    {/* 4. Pasos para importar */}
                    <section>
                        <h4 className="font-headline text-lg font-bold text-on-surface mb-3">🚀 Pasos para una importación exitosa</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li><strong>Prepara tu CSV</strong> siguiendo el formato anterior (puedes usar el ejemplo como plantilla).</li>
                            <li><strong>Elimina cuentas existentes</strong> (si es necesario) desde "Nueva Cuenta" → botón "Eliminar todas las cuentas".</li>
                            <li><strong>Ve a "Nueva Cuenta"</strong> y haz clic en "Importar CSV".</li>
                            <li><strong>Selecciona tu archivo</strong> (debe tener extensión .csv).</li>
                            <li>Espera el mensaje de éxito: debería decir cuántas cuentas se importaron.</li>
                            <li><strong>Recarga la página</strong> (o navega a otra sección y vuelve) para que el sistema recalcule los totales de las cuentas agrupadoras.</li>
                            <li><strong>Verifica los análisis</strong> en las páginas de Liquidez, Deuda, Eficiencia y Rentabilidad.</li>
                        </ol>
                    </section>

                    {/* 5. Solución de problemas */}
                    <section>
                        <h4 className="font-headline text-lg font-bold text-on-surface mb-3">⚠️ Solución de problemas comunes</h4>
                        <div className="space-y-2 text-sm">
                            <div><span className="font-semibold">❌ "No se encontró la cuenta de Activo Corriente"</span><br />- Asegúrate de tener una cuenta con código exacto <code>1.1</code> o nombre "Activo Corriente".</div>
                            <div><span className="font-semibold">❌ "Cuentas agrupadoras muestran 0 aunque tienen hijos"</span><br />- Recarga la página; el sistema recalcula automáticamente al leer las cuentas.</div>
                            <div><span className="font-semibold">❌ "Los saldos no aparecen después de importar"</span><br />- Verifica que los saldos estén en cuentas de nivel 4 o 5 (detalle), no en agrupadoras.</div>
                            <div><span className="font-semibold">❌ "Resultado Operativo no detectado"</span><br />- La cuenta debe llamarse exactamente <code>RESULTADO OPERATIVO</code> o <code>UTILIDAD OPERATIVA</code> (sin acentos, mayúsculas como en el patrón).</div>
                            <div><span className="font-semibold">❌ "El CSV no se importa o da error de formato"</span><br />- Asegúrate de que el delimitador sea coma (<code>,</code>) y la codificación UTF-8 (sin BOM).</div>
                        </div>
                    </section>

                    {/* 6. Enlace a CSV de ejemplo */}
                    <section className="bg-primary/5 rounded-xl p-4">
                        <p className="text-sm font-semibold mb-2">📎 ¿Necesitas un archivo de ejemplo?</p>
                        <p className="text-sm">Haz clic en el botón para descargar un CSV de prueba con los datos de Droguería Inti S.A. (2020 vs 2024).</p>
                        <button
                            type="button"
                            onClick={() => {
                                const csvContent = `codigo,nombre,gestion1,gestion2
1,ACTIVO TOTAL,0,0
1.1,ACTIVO CORRIENTE,0,0
1.1.1,DISPONIBILIDADES,0,0
1.1.1.1,CAJA Y BANCOS,189314286,116138957
1.1.3,CUENTAS POR COBRAR,0,0
1.1.3.1,CLIENTES,155012353,130005950
1.1.5,INVENTARIOS,0,0
1.1.5.1,MERCANCÍAS,245714352,266990453
1.2,ACTIVO NO CORRIENTE,0,0
1.2.1,ACTIVO FIJO NETO,232616033,397659375
2,PASIVO TOTAL,0,0
2.1,PASIVO CORRIENTE,0,0
2.1.1,DEUDAS COMERCIALES,0,0
2.1.1.1,PROVEEDORES,100024306,92496321
2.2,PASIVO NO CORRIENTE,0,0
2.2.1,OBLIGACIONES FINANCIERAS NO CORRIENTES,18786827,124948263
3,PATRIMONIO TOTAL,0,0
3.1,PATRIMONIO NETO,559501104,783799303
4.1,VENTAS NETAS,0,0
4.1.1.1,VENTAS NETAS,718318478,805678961
5.1,COSTO DE VENTAS,0,0
5.1.1.1,COSTO DE VENTAS,309297403,315102139
5.4,GASTOS FINANCIEROS,0,0
5.4.1.1,GASTOS FINANCIEROS,12499279,29530033
4.8,RESULTADO OPERATIVO,46115979,88971582
4.9,UTILIDAD NETA,28501901,65744636`
                                const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
                                const link = document.createElement("a")
                                const url = URL.createObjectURL(blob)
                                link.href = url
                                link.setAttribute("download", "plantilla_cuentas.csv")
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                URL.revokeObjectURL(url)
                            }}
                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-[#e5884a] transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Descargar CSV de ejemplo
                        </button>
                    </section>
                </div>
            </div>
        </div>
    )
}