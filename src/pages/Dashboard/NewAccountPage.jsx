import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  deleteAllAccounts,
  deleteAccount,
  exportAccountsToCsvText,
  findAccountByCode,
  formatMoney,
  getAccountLevel,
  importAccountsFromCsvText,
  readAccounts,
  saveAccount,
  extractAccountCodesFromCsvText,
} from '../../utils/accountsStore'
import ConfirmImportModal from '../../components/ConfirmImportModal'
import ConfirmCodeConvertModal from '../../components/ConfirmCodeConvertModal'
import { parseCsvToAccounts } from '../../utils/csvParser'


const fieldNotes = [
  'El código debe respetar la jerarquía del plan de cuentas.',
  'Solo las cuentas de detalle deberían tener valores de gestión.',
  'Usa nombres claros para facilitar búsquedas y reportes.',
]

function Field({ label, name, value, onChange, placeholder, type = 'text', hint, disabled = false }) {
  return (
    <label className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.95rem] font-semibold text-on-surface">{label}</span>
        {hint ? <span className="text-xs font-medium text-on-surface-variant">{hint}</span> : null}
      </div>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        disabled={disabled}
        className="h-14 rounded-2xl border border-outline-variant/80 bg-white px-4 text-[15px] text-on-surface shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition-all placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
      />
    </label>
  )
}

export default function NewAccountPage() {
  const location = useLocation()
  const initialEditingCode = location.state?.accountCode ?? null
  const [editingCode, setEditingCode] = useState(initialEditingCode)
  const editingAccount = editingCode ? findAccountByCode(editingCode) : null
  const [accounts, setAccounts] = useState(() => readAccounts())
  const [formValues, setFormValues] = useState({
    code: editingAccount?.code ?? '',
    name: editingAccount?.name ?? '',
    management1: editingAccount ? String(editingAccount.manualManagement1 ?? 0) : '',
    management2: editingAccount ? String(editingAccount.manualManagement2 ?? 0) : '',
  })
  const [formMessage, setFormMessage] = useState('')
  const [formMessageTone, setFormMessageTone] = useState('error')
  const [formMessageDetails, setFormMessageDetails] = useState([])
  const [detailsModalTitle, setDetailsModalTitle] = useState('Detalles')
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const detailsModalOpenRef = useRef(detailsModalOpen)

  // keep a ref in sync so timeouts can check whether the details modal is currently open
  useEffect(() => {
    detailsModalOpenRef.current = detailsModalOpen
  }, [detailsModalOpen])
  const [toastVisible, setToastVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef(null)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [pendingCsvText, setPendingCsvText] = useState('')
  const [pendingFileName, setPendingFileName] = useState('')
  const [duplicateCodes, setDuplicateCodes] = useState([])
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [convertSamples, setConvertSamples] = useState([])
  const [convertPref, setConvertPref] = useState(null) // 'always' | null (ask)
  const [convertMenuOpen, setConvertMenuOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTargetCode, setDeleteTargetCode] = useState('')
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false)

  const handleExportAccounts = () => {
    if (!accounts.length) {
      setFeedback({
        message: 'No hay cuentas registradas para exportar.',
        tone: 'error',
      })
      return
    }

    const csvText = `\uFEFF${exportAccountsToCsvText(accounts)}`
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
    const downloadUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = downloadUrl
    anchor.download = `cuentas-registradas-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(downloadUrl)

    setFeedback({
      message: 'Cuentas exportadas correctamente en CSV.',
      tone: 'success',
    })
  }

  const filledCount = useMemo(
    () => Object.values(formValues).filter((value) => String(value).trim().length > 0).length,
    [formValues]
  )

  const accountLevel = useMemo(() => getAccountLevel(formValues.code), [formValues.code])
  const isGroupingAccount = Boolean(accountLevel && accountLevel <= 3)

  useEffect(() => {
    if (!editingAccount) {
      return
    }

    setFormValues({
      code: editingAccount.code,
      name: editingAccount.name,
      management1: String(editingAccount.manualManagement1 ?? 0),
      management2: String(editingAccount.manualManagement2 ?? 0),
    })
  }, [editingAccount])

  // initialize conversion preference from localStorage once
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('proaccount.import.convertThreeDigitConcat')
      if (raw === 'always' || raw === 'true' || raw === '1') setConvertPref('always')
      else setConvertPref(null)
    } catch {
      setConvertPref(null)
    }
  }, [])

  useEffect(() => {
    if (!formMessage) {
      setToastVisible(false)
      return undefined
    }

    const enterFrameId = window.requestAnimationFrame(() => {
      setToastVisible(true)
    })

    const dismissId = window.setTimeout(() => {
      setToastVisible(false)

      window.setTimeout(() => {
        // Only clear details/modal if the user hasn't opened the details modal.
        // If the details modal is open, keep it open so the user can read errors.
        if (!detailsModalOpenRef.current) {
          setFormMessage('')
          setFormMessageDetails([])
        }
      }, 180)
    }, 2500)

    return () => {
      window.cancelAnimationFrame(enterFrameId)
      window.clearTimeout(dismissId)
    }
  }, [formMessage])

  const refreshAccounts = () => {
    setAccounts(readAccounts())
  }

  const setFeedback = ({ message, tone = 'error', details = [], title = 'Detalles' }) => {
    setFormMessage(message)
    setFormMessageTone(tone)
    setFormMessageDetails(Array.isArray(details) ? details : [])
    setDetailsModalTitle(title)
  }

  const resetToNewAccountMode = () => {
    setEditingCode(null)
    setFormValues({
      code: '',
      name: '',
      management1: '',
      management2: '',
    })
  }

  const handleClearFields = () => {
    resetToNewAccountMode()
    setFeedback({
      message: 'Campos limpiados. Puedes registrar una nueva cuenta.',
      tone: 'success',
    })
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    // Allow comma and dot as decimal separators for management inputs.
    if (name === 'management1' || name === 'management2') {
      const sanitizedValue = value.replace(/[^\d,.-]/g, '')
      setFormValues((current) => ({ ...current, [name]: sanitizedValue }))
      return
    }

    setFormValues((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    setIsSaving(true)
    setFeedback({ message: '', tone: 'error' })

    const result = saveAccount({
      ...formValues,
      currentCode: editingCode,
    })

    if (!result.ok) {
      setFeedback({
        message: 'No se pudo guardar la cuenta. Revisa los errores.',
        tone: 'error',
        details: result.errors,
        title: 'Errores de validación',
      })
      setIsSaving(false)
      return
    }

    setFeedback({
      message: editingCode ? `Cuenta ${result.account?.code ?? formValues.code} actualizada correctamente.` : `Cuenta ${result.account?.code ?? formValues.code} creada correctamente.`,
      tone: 'success',
    })
    refreshAccounts()
    setIsSaving(false)
  }

const handleCsvImport = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const csvText = await file.text()

    // ── PASO 1: intentar el parser inteligente con jerarquía automática ──
    let smartAccounts = []
    try {
      smartAccounts = parseCsvToAccounts(csvText)
    } catch (err) {
      console.warn('csvParser: no pudo parsear, usando flujo estándar.', err)
    }

    if (smartAccounts.length > 0) {
      // Detectar duplicados contra cuentas ya existentes
      const foundDuplicates = smartAccounts
        .map((a) => a.code)
        .filter((code) => Boolean(findAccountByCode(code)))

      if (foundDuplicates.length) {
        setDuplicateCodes(foundDuplicates)
        setPendingCsvText(csvText)
        setPendingFileName(file.name)
        setDuplicateModalOpen(true)
        return
      }

      // Sin duplicados: guardar cada cuenta directamente
      let imported = 0
      const importErrors = []

      for (const account of smartAccounts) {
        // Permitir que cuentas agrupadoras tengan saldos manuales durante importación
        const result = saveAccount({ ...account, _allowGroupManual: true })
        if (result.ok) {
          imported++
        } else {
          importErrors.push(...(result.errors ?? [`Error en cuenta ${account.code}`]))
        }
      }

      refreshAccounts()
      setFeedback({
        message: `Importación con jerarquía automática: ${imported} cuenta(s) registradas.`,
        tone: importErrors.length ? 'error' : 'success',
        details: importErrors,
        title: 'Resumen de importación CSV inteligente',
      })
      event.target.value = ''
      return
    }

    // ── PASO 2: flujo estándar original (CSV con códigos explícitos) ──
    const csvCodes = extractAccountCodesFromCsvText(csvText)
    const codesToConvert = csvCodes.filter((c) => /^[0-9]{3}$/.test(String(c)))
    const pref = convertPref

    if (codesToConvert.length) {
      if (pref === 'always') {
        const result = importAccountsFromCsvText(csvText, { onDuplicate: 'skip', convertThreeDigitConcat: true })

        if (!result.ok) {
          setFeedback({
            message: `Se encontraron ${result.errors.length} errores al importar ${file.name}.`,
            tone: 'error',
            details: result.errors,
            title: 'Errores de importación CSV',
          })
        } else {
          const detailLines = []
          if (result.updated && result.updated > 0) detailLines.push(`Actualizadas ${result.updated}: ${result.updatedCodes.join(', ')}`)
          if (Array.isArray(result.skipped) && result.skipped.length) detailLines.push(`Omitidas ${result.skipped.length}: ${result.skipped.join(', ')}`)
          if (Array.isArray(result.autoCreated) && result.autoCreated.length) detailLines.push(`Padres creados automáticamente (${result.autoCreated.length}): ${result.autoCreated.join(', ')}`)
          setFeedback({
            message: `Importación completada: ${result.imported} registradas${result.updated ? `, ${result.updated} actualizadas` : ''}${result.skipped?.length ? `, ${result.skipped.length} omitidas` : ''}.`,
            tone: 'success',
            details: detailLines,
            title: 'Resumen de importación CSV',
          })
          refreshAccounts()
        }

        event.target.value = ''
        return
      }

      setPendingCsvText(csvText)
      setPendingFileName(file.name)
      setConvertSamples(codesToConvert.slice(0, 6))
      setConvertModalOpen(true)
      return
    }

    const foundDuplicates = csvCodes.filter((code) => Boolean(findAccountByCode(code)))

    if (foundDuplicates.length) {
      setDuplicateCodes(foundDuplicates)
      setPendingCsvText(csvText)
      setPendingFileName(file.name)
      setDuplicateModalOpen(true)
      return
    }

    const result = importAccountsFromCsvText(csvText, { onDuplicate: 'skip' })

    if (!result.ok) {
      setFeedback({
        message: `Se encontraron ${result.errors.length} errores al importar ${file.name}.`,
        tone: 'error',
        details: result.errors,
        title: 'Errores de importación CSV',
      })
    } else {
      const detailLines = []
      if (result.updated && result.updated > 0) detailLines.push(`Actualizadas ${result.updated}: ${result.updatedCodes.join(', ')}`)
      if (Array.isArray(result.skipped) && result.skipped.length) detailLines.push(`Omitidas ${result.skipped.length}: ${result.skipped.join(', ')}`)
      if (Array.isArray(result.autoCreated) && result.autoCreated.length) detailLines.push(`Padres creados automáticamente (${result.autoCreated.length}): ${result.autoCreated.join(', ')}`)
      setFeedback({
        message: `Importación completada: ${result.imported} registradas${result.updated ? `, ${result.updated} actualizadas` : ''}${result.skipped?.length ? `, ${result.skipped.length} omitidas` : ''}.`,
        tone: 'success',
        details: detailLines,
        title: 'Resumen de importación CSV',
      })
      refreshAccounts()
    }

    event.target.value = ''
  }

  const handleConfirmImport = (onDuplicateChoice) => {
    if (!pendingCsvText) return

    const result = importAccountsFromCsvText(pendingCsvText, { onDuplicate: onDuplicateChoice })

    if (!result.ok) {
      setFeedback({
        message: `Se encontraron ${result.errors.length} errores al importar ${pendingFileName}.`,
        tone: 'error',
        details: result.errors,
        title: 'Errores de importación CSV',
      })
    } else {
      const detailLines = []

      if (result.updated && result.updated > 0) {
        detailLines.push(`Actualizadas ${result.updated}: ${result.updatedCodes.join(', ')}`)
      }

      if (Array.isArray(result.skipped) && result.skipped.length) {
        detailLines.push(`Omitidas ${result.skipped.length}: ${result.skipped.join(', ')}`)
      }

      if (Array.isArray(result.autoCreated) && result.autoCreated.length) {
        detailLines.push(`Padres creados automáticamente (${result.autoCreated.length}): ${result.autoCreated.join(', ')}`)
      }

      setFeedback({
        message: `Importación completada: ${result.imported} registradas${result.updated ? `, ${result.updated} actualizadas` : ''}${result.skipped?.length ? `, ${result.skipped.length} omitidas` : ''}.`,
        tone: 'success',
        details: detailLines,
        title: 'Resumen de importación CSV',
      })
      refreshAccounts()
    }

    setPendingCsvText('')
    setPendingFileName('')
    setDuplicateCodes([])
    setDuplicateModalOpen(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleConfirmConvert = (shouldConvert, remember) => {
    if (!pendingCsvText) return

    setConvertModalOpen(false)

    if (remember) {
      try {
        if (shouldConvert) {
          window.localStorage.setItem('proaccount.import.convertThreeDigitConcat', 'always')
          setConvertPref('always')
        } else {
          window.localStorage.removeItem('proaccount.import.convertThreeDigitConcat')
          setConvertPref(null)
        }
      } catch {}
    }

    // if user chose to convert, pass option to importer
    const result = importAccountsFromCsvText(pendingCsvText, { onDuplicate: 'skip', convertThreeDigitConcat: !!shouldConvert })

    if (!result.ok) {
      setFeedback({
        message: `Se encontraron ${result.errors.length} errores al importar ${pendingFileName}.`,
        tone: 'error',
        details: result.errors,
        title: 'Errores de importación CSV',
      })
    } else {
      const detailLines = []

      if (result.updated && result.updated > 0) {
        detailLines.push(`Actualizadas ${result.updated}: ${result.updatedCodes.join(', ')}`)
      }

      if (Array.isArray(result.skipped) && result.skipped.length) {
        detailLines.push(`Omitidas ${result.skipped.length}: ${result.skipped.join(', ')}`)
      }

      if (Array.isArray(result.autoCreated) && result.autoCreated.length) {
        detailLines.push(`Padres creados automáticamente (${result.autoCreated.length}): ${result.autoCreated.join(', ')}`)
      }

      setFeedback({
        message: `Importación completada: ${result.imported} registradas${result.updated ? `, ${result.updated} actualizadas` : ''}${result.skipped?.length ? `, ${result.skipped.length} omitidas` : ''}.`,
        tone: 'success',
        details: detailLines,
        title: 'Resumen de importación CSV',
      })
      refreshAccounts()
    }

    setPendingCsvText('')
    setPendingFileName('')
    setDuplicateCodes([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleHistoryEdit = (code) => {
    const account = findAccountByCode(code)

    if (!account) {
      setFeedback({
        message: `No se encontró la cuenta ${code} para editar.`,
        tone: 'error',
      })
      return
    }

    setEditingCode(code)
    setFormValues({
      code: account.code,
      name: account.name,
      management1: String(account.manualManagement1 ?? 0),
      management2: String(account.manualManagement2 ?? 0),
    })
    setFeedback({
      message: `Cuenta ${code} cargada para edición.`,
      tone: 'success',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleHistoryDelete = (code) => {
    setDeleteTargetCode(code)
    setDeleteModalOpen(true)
  }

  const confirmDeleteHistoryAccount = () => {
    if (!deleteTargetCode) {
      setDeleteModalOpen(false)
      return
    }

    const result = deleteAccount(deleteTargetCode)

    if (!result.ok) {
      setFeedback({
        message: 'No se pudo eliminar la cuenta.',
        tone: 'error',
        details: result.errors,
        title: 'Error al eliminar cuenta',
      })
      setDeleteModalOpen(false)
      return
    }

    if (editingCode === deleteTargetCode) {
      resetToNewAccountMode()
    }

    refreshAccounts()
    setFeedback({
      message: `Cuenta ${deleteTargetCode} eliminada correctamente.`,
      tone: 'success',
    })
    setDeleteTargetCode('')
    setDeleteModalOpen(false)
  }

  const handleClearAllAccounts = () => {
    setClearAllModalOpen(true)
  }

  const confirmClearAllAccounts = () => {
    const result = deleteAllAccounts()

    if (!result.ok) {
      setFeedback({
        message: 'No se pudieron eliminar todas las cuentas.',
        tone: 'error',
        details: result.errors,
        title: 'Error al limpiar historial',
      })
      setClearAllModalOpen(false)
      return
    }

    resetToNewAccountMode()
    refreshAccounts()
    setFeedback({
      message: 'Se eliminaron todas las cuentas registradas.',
      tone: 'success',
    })
    setClearAllModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_28%),radial-gradient(circle_at_right,rgba(99,102,241,0.08),transparent_24%),linear-gradient(180deg,#fffdfb_0%,#f7f1e8_100%)] font-body text-on-surface px-4 py-8 sm:px-6 sm:py-10 md:px-8 xl:px-12 xl:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl flex-col">
        <Link to="/dashboard" className="inline-flex w-fit items-center gap-2 rounded-full border border-outline-variant/70 bg-white/75 px-4 py-2 text-sm font-medium text-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:border-primary hover:text-primary">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Volver al dashboard
        </Link>

        <section className="mt-8 flex flex-1 flex-col items-start justify-center pt-2 sm:mt-10 sm:pt-4">
          <div className="w-full rounded-[2.2rem] border border-outline-variant/70 bg-surface-container-lowest shadow-[0_22px_50px_rgba(15,23,42,0.10)]">
            <div className="border-b border-outline-variant/70 bg-white/80 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-on-surface-variant font-label">Captura rápida</p>
                  <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
                    {editingCode ? 'Editar Cuenta' : 'Nueva Cuenta'}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
                    Registra una cuenta contable con jerarquía, validación de padre y cálculo automático de sumatorias.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    <span className="rounded-full bg-surface-container-low px-3 py-1">Nivel {accountLevel ?? 'N/A'}</span>
                    <span className="rounded-full bg-surface-container-low px-3 py-1">
                      {isGroupingAccount ? 'Agrupación' : 'Detalle'}
                    </span>
                  </div>
                </div>

                <div className="inline-flex w-fit items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  {filledCount}/4 campos
                </div>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <form onSubmit={handleSubmit} className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 md:gap-7">
                <Field
                  label="Código de cuenta"
                  name="code"
                  value={formValues.code}
                  onChange={handleChange}
                  placeholder="Ej: 1.1.1.1.1"
                  hint="Hasta 5 niveles"
                />

                <Field
                  label="Nombre de la cuenta"
                  name="name"
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="Ej: Caja Moneda Nacional"
                  hint="Descripción clara"
                />

                <Field
                  label="Gestión 1 (Año anterior)"
                  name="management1"
                  value={formValues.management1}
                  onChange={handleChange}
                  placeholder="0,00"
                  type="text"
                  hint={isGroupingAccount ? 'Se calcula automáticamente' : 'Saldo inicial'}
                  disabled={isGroupingAccount}
                />

                <Field
                  label="Gestión 2 (Año actual)"
                  name="management2"
                  value={formValues.management2}
                  onChange={handleChange}
                  placeholder="0,00"
                  type="text"
                  hint={isGroupingAccount ? 'Se calcula automáticamente' : 'Saldo actual'}
                  disabled={isGroupingAccount}
                />

                <div className="md:col-span-2 rounded-[1.5rem] border border-outline-variant/70 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <p className="text-sm font-semibold text-on-surface">Recomendaciones</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {fieldNotes.map((note) => (
                      <div key={note} className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm leading-relaxed text-on-surface-variant">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end lg:flex-nowrap lg:items-center">
                  <button
                    type="button"
                    onClick={handleClearFields}
                    className="shrink-0 inline-flex items-center justify-center rounded-full border border-outline-variant px-4 py-2.5 text-[13px] font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
                    Limpiar Campos
                  </button>
                  <div className="shrink-0 inline-flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center rounded-full border border-outline-variant px-4 py-2.5 text-[13px] font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                    >
                      📄 Importar CSV
                    </button>

                    <div className="relative inline-block text-left">
                      <span className="text-xs font-semibold pr-2">Preferencia:</span>
                      <button
                        type="button"
                        onClick={() => setConvertMenuOpen((v) => !v)}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-medium bg-white"
                      >
                        {convertPref === 'always' ? 'Siempre convertir' : 'Preguntar antes'}
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {typeof convertMenuOpen !== 'undefined' && convertMenuOpen ? (
                        <div className="absolute right-0 mt-2 w-64 rounded-md border bg-white shadow-lg z-50">
                          <div className="p-2">
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  window.localStorage.removeItem('proaccount.import.convertThreeDigitConcat')
                                } catch {}
                                setConvertPref(null)
                                setConvertMenuOpen(false)
                                setFeedback({ message: 'Preferencia: Preguntar', tone: 'success' })
                              }}
                              className="w-full text-left rounded px-3 py-2 hover:bg-surface-container-low"
                            >
                              <div className="font-medium">Preguntar antes de convertir</div>
                              <div className="text-xs text-on-surface-variant">Se mostrará el diálogo de vista previa si hay códigos candidatos.</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  window.localStorage.setItem('proaccount.import.convertThreeDigitConcat', 'always')
                                } catch {}
                                setConvertPref('always')
                                setConvertMenuOpen(false)
                                setFeedback({ message: 'Preferencia: Siempre convertir', tone: 'success' })
                              }}
                              className="mt-1 w-full text-left rounded px-3 py-2 hover:bg-surface-container-low"
                            >
                              <div className="font-medium">Siempre convertir automáticamente</div>
                              <div className="text-xs text-on-surface-variant">Aplica la conversión y no mostrará el modal.</div>
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  <button type="submit" disabled={isSaving} className="shrink-0 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-on-primary shadow-[0_10px_24px_rgba(249,115,22,0.28)] transition-colors hover:bg-[#e5884a] disabled:cursor-not-allowed disabled:opacity-70">
                    {isSaving ? 'Guardando...' : 'Guardar cuenta'}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
              </form>
            </div>
          </div>

          <div className="mt-6 w-full rounded-[2.2rem] border border-outline-variant/70 bg-surface-container-lowest shadow-[0_22px_50px_rgba(15,23,42,0.10)]">
            <div className="border-b border-outline-variant/70 bg-white/80 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-on-surface-variant font-label">Historial</p>
                  <h2 className="mt-2 font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">Cuentas Registradas</h2>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant sm:text-base">Administra las cuentas ya creadas desde esta misma pantalla.</p>
                </div>

                <button
                  type="button"
                  onClick={handleExportAccounts}
                  disabled={!accounts.length}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-white px-5 text-sm font-semibold text-primary shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 lg:mt-1"
                >
                  Exportar CSV
                </button>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="overflow-hidden rounded-2xl border border-outline-variant bg-white/90">
                <div className="flex items-center justify-between gap-3 border-b border-outline-variant/70 px-4 py-3">
                  <p className="text-sm text-on-surface-variant">{accounts.length} cuenta{accounts.length === 1 ? '' : 's'} registradas</p>
                  <div className="flex items-center gap-3">
                    <span className="hidden md:inline text-xs uppercase tracking-[0.22em] text-on-surface-variant font-label">Código · Cuenta · Gestión 1 · Gestión 2 · Variación · Acciones</span>
                    <button
                      type="button"
                      onClick={handleClearAllAccounts}
                      disabled={!accounts.length}
                      className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Eliminar todas las cuentas
                    </button>
                  </div>
                </div>

                {accounts.length ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead className="bg-surface-container-lowest">
                        <tr className="text-xs uppercase tracking-[0.22em] text-on-surface-variant font-label">
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Cuenta</th>
                          <th className="px-4 py-3">Gestión 1</th>
                          <th className="px-4 py-3">Gestión 2</th>
                          <th className="px-4 py-3">Variación</th>
                          <th className="px-4 py-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((account) => {
                          const variationTone = account.variation >= 0 ? 'text-emerald-600' : 'text-red-600'

                          return (
                            <tr key={account.code} className="border-t border-outline-variant/70 odd:bg-white/50">
                              <td className="px-4 py-4 align-top">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
                                    {account.level}
                                  </span>
                                  <span className="font-semibold text-on-surface">{account.code}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="space-y-1">
                                  <p className="font-semibold text-on-surface">{account.name.toUpperCase()}</p>
                                  <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                                    {account.type === 'group' ? 'Agrupación' : 'Detalle'}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-on-surface-variant align-top">{formatMoney(account.management1)}</td>
                              <td className="px-4 py-4 text-sm text-on-surface-variant align-top">{formatMoney(account.management2)}</td>
                              <td className={`px-4 py-4 text-sm font-semibold align-top ${variationTone}`}>
                                {account.variation >= 0 ? '↗' : '↘'} {formatMoney(account.variation)}
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleHistoryEdit(account.code)}
                                    className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#e5884a] transition-colors"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleHistoryDelete(account.code)}
                                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
                    No hay cuentas guardadas todavía. Usa la captura rápida o importa un CSV para empezar.
                  </div>
                )}
              </div>
            </div>
            </div>
          </section>
        </div>
        <ConfirmImportModal
          open={duplicateModalOpen}
          fileName={pendingFileName}
          duplicates={duplicateCodes}
          onConfirm={handleConfirmImport}
          onCancel={() => setDuplicateModalOpen(false)}
        />
        <ConfirmCodeConvertModal
          open={convertModalOpen}
          samples={convertSamples}
          onConfirm={handleConfirmConvert}
          onCancel={() => {
            setConvertModalOpen(false)
            setPendingCsvText('')
            setPendingFileName('')
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
        />
        {deleteModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/45 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_35px_80px_rgba(0,0,0,0.25)] border border-outline-variant">
              <div className="border-b border-outline-variant/70 bg-white/80 px-6 py-5 sm:px-8 sm:py-6">
                <p className="text-xs uppercase tracking-[0.28em] text-on-surface-variant font-label">Confirmación</p>
                <h3 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface">Eliminar cuenta registrada</h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Vas a eliminar la cuenta <span className="font-semibold text-on-surface">{deleteTargetCode}</span>. Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-8 bg-[linear-gradient(180deg,#fffdfb_0%,#fbf8f4_100%)]">
                <div className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-white/80 px-5 py-4 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-100 text-red-700">
                    <span className="material-symbols-outlined text-[24px]">delete</span>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">Se eliminará del historial y de la base local del navegador.</p>
                    <p className="text-sm text-on-surface-variant">Si luego necesitas volver a usarla, tendrás que crearla nuevamente.</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteModalOpen(false)
                      setDeleteTargetCode('')
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-outline-variant px-5 py-3 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteHistoryAccount}
                    className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(220,38,38,0.22)] transition-colors hover:bg-red-700"
                  >
                    Eliminar cuenta
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {clearAllModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/45 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_35px_80px_rgba(0,0,0,0.25)] border border-outline-variant">
              <div className="border-b border-outline-variant/70 bg-white/80 px-6 py-5 sm:px-8 sm:py-6">
                <p className="text-xs uppercase tracking-[0.28em] text-on-surface-variant font-label">Confirmación</p>
                <h3 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface">Borrar todas las cuentas</h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Esta acción eliminará <span className="font-semibold text-on-surface">todas las cuentas registradas</span> del historial y de la base local del navegador.
                </p>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-8 bg-[linear-gradient(180deg,#fffdfb_0%,#fbf8f4_100%)]">
                <div className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-white/80 px-5 py-4 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-100 text-red-700">
                    <span className="material-symbols-outlined text-[24px]">delete_forever</span>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">Se borrarán cuentas, jerarquías y sumatorias almacenadas.</p>
                    <p className="text-sm text-on-surface-variant">Después tendrás que volver a cargar o crear las cuentas manualmente.</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setClearAllModalOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-outline-variant px-5 py-3 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmClearAllAccounts}
                    className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(220,38,38,0.22)] transition-colors hover:bg-red-700"
                  >
                    Eliminar todas las cuentas
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {formMessage ? (
          <div
            className={`fixed bottom-4 left-4 z-50 max-w-md rounded-2xl border px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm transition-all duration-300 ease-out ${
              toastVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-3 opacity-0 scale-[0.98]'
            } ${
              formMessageTone === 'success'
                ? 'border-primary/30 bg-[linear-gradient(180deg,rgba(255,250,245,0.98)_0%,rgba(255,244,234,0.98)_100%)] text-on-surface'
                : 'border-primary/30 bg-[linear-gradient(180deg,rgba(255,247,245,0.98)_0%,rgba(255,241,237,0.98)_100%)] text-on-surface'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                  formMessageTone === 'success'
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                    : 'border-red-200 bg-red-100 text-red-700'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] font-bold">
                  {formMessageTone === 'success' ? 'check_circle' : 'error'}
                </span>
              </div>
              <div className="min-w-0 flex-1 self-center">
                <p className="text-sm font-semibold leading-relaxed">{formMessage}</p>
                {formMessageDetails.length ? (
                  <button
                    type="button"
                    onClick={() => setDetailsModalOpen(true)}
                    className="mt-2 inline-flex rounded-full border border-primary/30 bg-white/70 px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-white transition-colors"
                  >
                    Ver detalles ({formMessageDetails.length})
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {detailsModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/45 backdrop-blur-sm">
            <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_35px_80px_rgba(0,0,0,0.25)] border border-outline-variant">
              <div className="border-b border-outline-variant/70 bg-white/80 px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-3">
                <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">{detailsModalTitle}</h3>
                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                >
                  Cerrar
                </button>
              </div>
              <div className="px-6 py-6 sm:px-8 sm:py-8 max-h-[60vh] overflow-y-auto">
                <ul className="space-y-2 text-sm text-on-surface-variant leading-relaxed">
                  {formMessageDetails.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-xl border border-outline-variant/60 bg-white/70 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
        
      </div>
  )
}
