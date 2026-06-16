import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import loginRelieveNaranja from '../../Login/LoginRelieveNaranja.png'
import loginRelieveNaranja2 from '../../Login/LoginRelieveNaranja2.png'
import loginRelieveNaranja3 from '../../Login/LoginRelieveNaranja3.png'
import loginRelieveNaranja4 from '../../Login/LoginRelieveNaranja4.png'
import loginRelieveNaranja5 from '../../Login/LoginRelieveNaranja5.png'
import manoMariposa from '../../RecupContra/manoMariposa.png'
import { consumeOneTimeRecoveryCode, findUserByIdentifier, generateAccessCode, saveOneTimeRecoveryCode } from '../../utils/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loginValues, setLoginValues] = useState({
    identifier: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [recoveryStep, setRecoveryStep] = useState(null)
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('')
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('')
  const [expectedRecoveryCode, setExpectedRecoveryCode] = useState('')
  const [temporaryAccessCode, setTemporaryAccessCode] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryMatchedUser, setRecoveryMatchedUser] = useState(null)
  const [loginError, setLoginError] = useState('')

  const carouselImages = useMemo(
    () => [loginRelieveNaranja, loginRelieveNaranja2, loginRelieveNaranja3, loginRelieveNaranja4, loginRelieveNaranja5],
    []
  )
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    if (carouselImages.length < 2) return undefined

    const intervalId = window.setInterval(() => {
      setActiveImageIndex((currentIndex) => (currentIndex + 1) % carouselImages.length)
    }, 3500)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [carouselImages.length])

  function openRecoveryModal() {
    setRecoveryIdentifier(loginValues.identifier)
    setRecoveryCodeInput('')
    setExpectedRecoveryCode('')
    setTemporaryAccessCode('')
    setRecoveryError('')
    setRecoveryMatchedUser(null)
    setRecoveryStep('lookup')
  }

  function handleRecoveryLookup(event) {
    event.preventDefault()

    const matchedUser = findUserByIdentifier(recoveryIdentifier)

    if (!matchedUser) {
      setRecoveryError('No encontramos ese usuario o correo en la base local.')
      return
    }

    const accessCode = generateAccessCode(8)

    setRecoveryMatchedUser(matchedUser)
    setExpectedRecoveryCode(accessCode)
    setRecoveryCodeInput('')
    setRecoveryError('')
    setRecoveryStep('verify')
  }

  function handleRecoveryVerify(event) {
    event.preventDefault()

    if (recoveryCodeInput.trim().toUpperCase() !== expectedRecoveryCode) {
      setRecoveryError('El código no coincide. Intenta de nuevo.')
      return
    }

    const nextTemporaryAccessCode = generateAccessCode(8)

    setTemporaryAccessCode(nextTemporaryAccessCode)
    setRecoveryError('')
    setLoginValues({
      identifier: recoveryMatchedUser?.name ?? recoveryIdentifier,
      password: nextTemporaryAccessCode,
    })
    saveOneTimeRecoveryCode(recoveryMatchedUser?.email ?? recoveryIdentifier, nextTemporaryAccessCode)
    setRecoveryStep('success')
  }

  async function copyTemporaryAccessCode() {
    if (!temporaryAccessCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(temporaryAccessCode)
    } catch {
      // If clipboard access is blocked, keep the code visible and selectable.
    }
  }

  function closeRecoveryModal() {
    setRecoveryStep(null)
  }

  function handleLogin(event) {
    event.preventDefault()

    const matchedUser = findUserByIdentifier(loginValues.identifier)

    if (!matchedUser) {
      setLoginError('No encontramos ese usuario o correo en la base local.')
      return
    }

    const enteredPassword = loginValues.password.trim()
    const storedPassword = String(matchedUser.password ?? '').trim()
    const storedRecoveryCode = String(matchedUser.oneTimeRecoveryCode ?? '').trim()

    const passwordMatches = enteredPassword !== '' && (enteredPassword === storedPassword || enteredPassword === storedRecoveryCode)

    if (!passwordMatches) {
      setLoginError('La contraseña no coincide.')
      return
    }

    if (enteredPassword === storedRecoveryCode) {
      const consumed = consumeOneTimeRecoveryCode(matchedUser.email ?? matchedUser.name, enteredPassword)

      if (!consumed) {
        setLoginError('Ese código temporal ya fue usado o expiró.')
        return
      }
    }

    setLoginError('')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#e7e0d6] flex items-center justify-center p-4 md:p-8 font-body text-on-surface">
      <div className="bg-surface-container-lowest rounded-[2rem] shadow-[0_35px_80px_rgba(0,0,0,0.18)] w-full max-w-7xl overflow-hidden flex flex-col lg:flex-row min-h-[800px]">
        <div className="hidden lg:block lg:w-1/2 p-4 relative bg-[#111111] order-2 lg:order-1">
          <div className="relative w-full h-full overflow-hidden rounded-[1.5rem] shadow-lg bg-[#111111]">
            <img
              key={activeImageIndex}
              alt={`Imagen decorativa abstracta ${activeImageIndex + 1}`}
              className="carousel-slide absolute inset-0 h-full w-full object-cover"
              src={carouselImages[activeImageIndex]}
            />

            {carouselImages.map((image, index) => (
              <img
                key={`${image}-${index}`}
                alt={`Imagen decorativa abstracta ${index + 1} preloaded`}
                className="hidden"
                src={image}
              />
            ))}

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {carouselImages.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  aria-label={`Ver imagen ${index + 1}`}
                  onClick={() => setActiveImageIndex(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === activeImageIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/55 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-between bg-[linear-gradient(180deg,#fffdfb_0%,#fbf8f4_100%)] order-1 lg:order-2">
          <div className="flex items-center justify-between gap-4 mb-12">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                bolt
              </span>
              <span className="font-headline font-bold text-2xl tracking-tight">KIOS</span>
            </div>
            <Link
              to="/"
              className="hidden md:inline-flex rounded-full border border-outline-variant px-4 py-2 text-sm font-label text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
            >
              Crear cuenta
            </Link>
          </div>

          <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
            <div className="mb-10 text-center lg:text-left">
              <h1 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mb-3 tracking-tight">
                Inicia sesión para ver tus estadísticas
              </h1>
              <p className="text-on-surface-variant font-body">Ingresa con tu nombre o correo y tu contraseña.</p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
                <input
                  className="block w-full pl-12 pr-4 py-3.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-label transition-all"
                  id="identifier"
                  placeholder=" Nombre o correo"
                  type="text"
                  value={loginValues.identifier}
                  onChange={(event) => setLoginValues((currentValues) => ({ ...currentValues, identifier: event.target.value }))}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant">key</span>
                </div>
                <input
                  className="block w-full pl-12 pr-10 py-3.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-label transition-all placeholder-on-surface-variant"
                  id="password"
                  placeholder=" Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  value={loginValues.password}
                  onChange={(event) => setLoginValues((currentValues) => ({ ...currentValues, password: event.target.value }))}
                />
                <button
                  className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-on-surface-variant hover:text-on-surface"
                  type="button"
                  onClick={() => setShowPassword((currentValue) => !currentValue)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between mt-4 gap-4">
                <div className="flex items-center">
                  {/*<input
                    className="h-4 w-4 text-primary focus:ring-primary border-outline-variant rounded bg-surface-container-lowest cursor-pointer"
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                  />
                  <label className="ml-2 block text-sm text-on-surface-variant font-label cursor-pointer" htmlFor="remember-me">
                    Recordarme <span className="text-xs opacity-75">(15 días)</span>
                  </label>*/}
                </div>
                <button
                  className="font-medium text-on-surface hover:text-primary underline decoration-outline-variant underline-offset-2 transition-colors font-label text-sm"
                  type="button"
                  onClick={openRecoveryModal}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {loginError ? <p className="text-sm text-red-600 font-label">{loginError}</p> : null}

              <div className="pt-4">
                <button
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-on-primary bg-primary-container hover:bg-[#e5884a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-300 font-label"
                  type="submit"
                >
                  Iniciar Sesión
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-on-surface-variant font-label">
                ¿No tienes cuenta?{' '}
                <Link to="/" className="font-medium text-on-surface hover:text-primary underline decoration-outline-variant underline-offset-2 transition-colors">
                  Crear cuenta
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-12 text-center max-w-xs mx-auto">
            <p className="text-xs text-on-surface-variant font-label leading-relaxed">
              Al iniciar sesión aceptas nuestros <a className="font-medium text-on-surface underline hover:text-primary transition-colors" href="#">Términos de servicio</a> y <a className="font-medium text-on-surface underline hover:text-primary transition-colors" href="#">Política de privacidad</a>.
            </p>
          </div>
        </div>
      </div>

      {recoveryStep !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/45 backdrop-blur-sm">
          <div className="w-full max-w-5xl xl:max-w-6xl overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_35px_80px_rgba(0,0,0,0.25)] border border-outline-variant relative">
            <button
              type="button"
              onClick={closeRecoveryModal}
              aria-label="Cerrar"
              className="absolute top-4 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white/90 text-on-surface shadow-sm hover:bg-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="grid lg:grid-cols-[0.95fr_1.35fr] min-h-[640px]">
              <div className="hidden lg:flex relative items-end justify-center bg-black overflow-hidden p-0">
                <img
                  src={manoMariposa}
                  alt="Mano con mariposa"
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                <div className="absolute top-8 left-8 flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                  <span className="font-headline font-bold text-2xl tracking-tight">KIOS</span>
                </div>
              </div>

              <div className="p-6 md:p-10 xl:p-12 flex flex-col justify-center bg-[linear-gradient(180deg,#fffdfb_0%,#fbf8f4_100%)]">
                <div className="flex items-center justify-between gap-4 mb-8 lg:hidden">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      bolt
                    </span>
                    <span className="font-headline font-bold text-2xl tracking-tight">KIOS</span>
                  </div>
                  <button
                    type="button"
                    onClick={closeRecoveryModal}
                    className="rounded-full border border-outline-variant px-3 py-2 text-sm font-label text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
                    Cerrar
                  </button>
                </div>

                {recoveryStep === 'lookup' ? (
                  <form className="space-y-5" onSubmit={handleRecoveryLookup}>
                    <div className="space-y-3">
                      <p className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Recuperar Acceso</p>
                      <p className="text-on-surface-variant font-body">Introduce tu nombre de usuario o correo:</p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-on-surface-variant">person</span>
                      </div>
                      <input
                        className="block w-full pl-12 pr-4 py-3.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-label transition-all"
                        id="recovery-identifier"
                        placeholder="Nombre o correo"
                        type="text"
                        value={recoveryIdentifier}
                        onChange={(event) => setRecoveryIdentifier(event.target.value)}
                      />
                    </div>

                    {recoveryError ? <p className="text-sm text-red-600 font-label">{recoveryError}</p> : null}

                    <button
                      className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-on-primary bg-primary-container hover:bg-[#e5884a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-300 font-label"
                      type="submit"
                    >
                      Siguiente
                    </button>
                  </form>
                ) : null}

                {recoveryStep === 'verify' ? (
                  <form className="space-y-5" onSubmit={handleRecoveryVerify}>
                    <div className="space-y-3">
                      <p className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Código de acceso</p>
                      <p className="text-on-surface-variant font-body">Introduce el código que se muestra abajo, escribiéndolo manualmente.</p>
                    </div>

                    <div className="rounded-2xl border border-outline-variant bg-white px-6 py-5 shadow-sm select-none" onCopy={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()}>
                      <p className="text-xs uppercase tracking-[0.25em] text-on-surface-variant font-label mb-2">Código</p>
                      <p className="font-headline text-2xl md:text-3xl tracking-[0.45em] text-on-surface break-all">{expectedRecoveryCode}</p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-on-surface-variant">password</span>
                      </div>
                      <input
                        className="block w-full pl-12 pr-4 py-3.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-label transition-all uppercase tracking-[0.25em]"
                        id="recovery-code"
                        placeholder="Escribe el código"
                        type="text"
                        value={recoveryCodeInput}
                        onChange={(event) => setRecoveryCodeInput(event.target.value.toUpperCase())}
                        autoComplete="off"
                        spellCheck="false"
                      />
                    </div>

                    {recoveryError ? <p className="text-sm text-red-600 font-label">{recoveryError}</p> : null}

                    <button
                      className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-on-primary bg-primary-container hover:bg-[#e5884a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-300 font-label"
                      type="submit"
                    >
                      Siguiente
                    </button>
                  </form>
                ) : null}

                {recoveryStep === 'success' ? (
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <p className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Acceso temporal</p>
                      <p className="text-on-surface-variant font-body">Copia este código temporal y úsalo como contraseña.</p>
                    </div>

                    <div className="rounded-2xl border border-outline-variant bg-white px-6 py-5 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.25em] text-on-surface-variant font-label mb-2">Código temporal</p>
                      <div className="flex items-center gap-3">
                        <input
                          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-headline text-xl tracking-[0.4em] text-on-surface"
                          readOnly
                          value={temporaryAccessCode}
                        />
                        <button
                          className="shrink-0 rounded-xl border border-outline-variant px-4 py-3 text-sm font-label text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                          type="button"
                          onClick={copyTemporaryAccessCode}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-on-primary bg-primary-container hover:bg-[#e5884a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-300 font-label"
                        type="button"
                        onClick={closeRecoveryModal}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
