import React from 'react'

export default function ConfirmImportModal({ open, fileName, duplicates = [], onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/45 backdrop-blur-sm">
      <div className="w-full max-w-5xl xl:max-w-6xl overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_35px_80px_rgba(0,0,0,0.25)] border border-outline-variant">
        <div className="p-6 md:p-10 xl:p-12 flex flex-col justify-center bg-[linear-gradient(180deg,#fffdfb_0%,#fbf8f4_100%)]">
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Se encontraron duplicados</p>
              <p className="text-on-surface-variant font-body">El CSV <span className="font-medium">{fileName}</span> contiene códigos que ya existen. Elige si omitirlos o actualizar las cuentas existentes.</p>
            </div>

            <div className="rounded-2xl border border-outline-variant bg-white px-6 py-5 shadow-sm max-h-48 overflow-auto">
              <p className="text-xs uppercase tracking-[0.25em] text-on-surface-variant font-label mb-2">Códigos duplicados</p>
              <div className="flex flex-wrap gap-2">
                {duplicates.map((code) => (
                  <span key={code} className="rounded-full bg-surface-container-low px-3 py-1 text-sm">{code}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                type="button"
                onClick={() => onConfirm('skip')}
                className="w-full sm:w-auto flex-1 py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-on-primary bg-primary-container hover:bg-[#e5884a] transition-colors duration-300"
              >
                Omitir duplicados
              </button>

              <button
                type="button"
                onClick={() => onConfirm('update')}
                className="w-full sm:w-auto flex-1 py-4 px-4 rounded-xl border border-outline-variant text-base font-medium hover:border-primary hover:text-primary transition-colors duration-300"
              >
                Actualizar cuentas existentes
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto flex-1 py-4 px-4 rounded-xl border border-outline-variant text-base font-medium text-on-surface-variant hover:border-primary hover:text-primary transition-colors duration-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
