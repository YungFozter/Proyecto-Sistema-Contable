import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getRegisteredUsers } from '../../utils/authStore'

export default function AccountPage() {
  const users = getRegisteredUsers()
  const current = users.length ? users.at(-1) : null
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl">
        <div className="relative bg-surface-container-lowest rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.25)] p-6 md:p-8">
          <button
            onClick={() => navigate(-1)}
            className="absolute -top-4 -left-4 bg-white border border-outline-variant rounded-full w-12 h-12 flex items-center justify-center shadow-sm hover:bg-white/90 transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>

          <header className="text-center mb-6">
            <h1 className="font-headline text-2xl md:text-3xl font-bold">Mi cuenta</h1>
            <p className="text-on-surface-variant mt-2">Aquí verás tus datos de usuario almacenado en la base local.</p>
          </header>

          <main className="flex flex-col items-center gap-6">
            {!current ? (
              <div className="w-full text-center rounded-2xl border border-outline-variant bg-white/80 p-6">
                <p className="font-medium text-on-surface">No hay usuarios registrados</p>
                <p className="text-sm text-on-surface-variant mt-2">Crea una cuenta desde Registro para poder verla aquí.</p>
                <Link to="/" className="inline-block mt-4 rounded-full bg-primary px-4 py-2 text-on-primary">Crear cuenta</Link>
              </div>
            ) : (
              <div className="w-full max-w-xl text-center">
                <div className="mb-4">
                  <p className="text-sm uppercase tracking-[0.24em] text-on-surface-variant font-label mb-2">Nombre</p>
                  <p className="font-medium text-on-surface">{current.name}</p>
                </div>

                <div className="mb-4">
                  <p className="text-sm uppercase tracking-[0.24em] text-on-surface-variant font-label mb-2">Correo</p>
                  <p className="font-medium text-on-surface">{current.email}</p>
                </div>

                <div className="mb-1">
                  <p className="text-sm uppercase tracking-[0.24em] text-on-surface-variant font-label mb-2">Contraseña</p>
                  <div className="mx-auto flex items-center gap-3 rounded-2xl bg-white/80 border border-outline-variant px-4 py-3 max-w-md">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      readOnly
                      value={current.password || ''}
                      className="bg-transparent outline-none w-full text-center font-medium text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="flex items-center gap-2 text-on-surface-variant"
                      aria-label="Mostrar contraseña"
                    >
                      <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => navigate(-1)}
                    className="rounded-full bg-primary px-6 py-2 text-on-primary font-semibold hover:bg-[#e5884a] transition-colors"
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
