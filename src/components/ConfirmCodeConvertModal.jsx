import React, { useState } from 'react'

export default function ConfirmCodeConvertModal({ open, samples = [], onConfirm, onCancel }) {
  const [remember, setRemember] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold">¿Convertir códigos numéricos concatenados?</h3>
        <p className="mt-2 text-sm text-on-surface-variant">Se detectaron códigos como los siguientes que parecen estar concatenados sin puntos. ¿Deseas convertirlos automáticamente a formato jerárquico (ej. 101 → 1.1)?</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {samples.map((s) => (
            <div key={s} className="rounded-md border px-3 py-2 text-center text-sm">{s}</div>
          ))}
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Recordar mi elección y aplicar siempre</span>
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-full border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={() => onConfirm(true, remember)} className="rounded-full bg-primary px-4 py-2 text-sm text-white">Convertir y continuar</button>
          <button onClick={() => onConfirm(false, remember)} className="rounded-full bg-white border px-4 py-2 text-sm">No convertir</button>
        </div>
      </div>
    </div>
  )
}
