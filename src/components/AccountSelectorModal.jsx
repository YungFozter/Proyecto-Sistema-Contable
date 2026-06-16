import React, { useState, useEffect } from 'react'
import { readAccounts, saveAccount, formatMoney, findAccountByCode } from '../utils/accountsStore'

export default function AccountSelectorModal({ isOpen, onClose, onSelect, mappingKey, componentLabel }) {
    const [accounts, setAccounts] = useState([])
    const [editingAccount, setEditingAccount] = useState(null)
    const [editForm, setEditForm] = useState({ code: '', name: '', management1: '', management2: '' })
    const [loading, setLoading] = useState(false)

    const loadAccounts = () => {
        setAccounts(readAccounts())
    }

    useEffect(() => {
        if (isOpen) {
            loadAccounts()
        }
    }, [isOpen])

    const handleEdit = (account) => {
        setEditingAccount(account)
        setEditForm({
            code: account.code,
            name: account.name,
            management1: account.manualManagement1?.toString() || '0',
            management2: account.manualManagement2?.toString() || '0',
        })
    }

    const handleSaveEdit = async () => {
        setLoading(true)
        const result = saveAccount({
            code: editForm.code,
            name: editForm.name,
            management1: editForm.management1,
            management2: editForm.management2,
            currentCode: editingAccount.code,
            _allowGroupManual: true, // permitir editar agrupadoras también
        })
        if (result.ok) {
            loadAccounts()
            setEditingAccount(null)
        } else {
            alert('Error al guardar: ' + result.errors.join(', '))
        }
        setLoading(false)
    }

    const handleSelect = (accountCode) => {
        onSelect(accountCode)
        onClose()
    }

    const handleClearOverride = () => {
        onSelect(null)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/45 backdrop-blur-sm">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_35px_80px_rgba(0,0,0,0.25)] border border-outline-variant flex flex-col">
                {/* Header */}
                <div className="border-b border-outline-variant/70 bg-white/80 px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-3 shrink-0">
                    <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-on-surface-variant font-label">Selección manual</p>
                        <h3 className="mt-1 font-headline text-2xl font-bold tracking-tight text-on-surface">
                            Seleccionar cuenta para: {componentLabel}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                    >
                        Cerrar
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
                    <div className="mb-4 flex justify-between items-center">
                        <p className="text-sm text-on-surface-variant">Selecciona una cuenta de la lista para usarla en el cálculo de <strong>{componentLabel}</strong>. También puedes editar cualquier cuenta.</p>
                        <button
                            onClick={handleClearOverride}
                            className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
                        >
                            Restablecer detección automática
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                            <thead className="bg-surface-container-low sticky top-0">
                                <tr className="text-[10px] uppercase tracking-[0.22em] text-on-surface-variant font-label">
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Gestión 1</th>
                                    <th className="px-4 py-3">Gestión 2</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map((account) => (
                                    <tr key={account.code} className="border-t border-outline-variant/50 hover:bg-white/40 transition-colors">
                                        <td className="px-4 py-3 font-mono text-sm">{account.code}</td>
                                        <td className="px-4 py-3">{account.name}</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(account.management1)}</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(account.management2)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full ${account.type === 'detail' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                                                {account.type === 'detail' ? 'Detalle' : 'Agrupación'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(account)}
                                                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleSelect(account.code)}
                                                    className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                                                >
                                                    Seleccionar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal de edición (inline) */}
                {editingAccount && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                            <h3 className="text-xl font-bold mb-4">Editar cuenta</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium">Código</label>
                                    <input
                                        type="text"
                                        value={editForm.code}
                                        onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                                        className="w-full rounded-lg border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Nombre</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full rounded-lg border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Gestión 1</label>
                                    <input
                                        type="text"
                                        value={editForm.management1}
                                        onChange={(e) => setEditForm({ ...editForm, management1: e.target.value })}
                                        className="w-full rounded-lg border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Gestión 2</label>
                                    <input
                                        type="text"
                                        value={editForm.management2}
                                        onChange={(e) => setEditForm({ ...editForm, management2: e.target.value })}
                                        className="w-full rounded-lg border p-2"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setEditingAccount(null)} className="rounded-full border px-4 py-2">Cancelar</button>
                                <button onClick={handleSaveEdit} disabled={loading} className="rounded-full bg-primary px-4 py-2 text-white">Guardar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}