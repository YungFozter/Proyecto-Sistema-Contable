import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import relieveNaranja from '../../Registro/relieveNaranja.png'
import relieveNaranja2 from '../../Registro/relieveNaranja2.png'
import relieveNaranja3 from '../../Registro/relieveNaranja3.png'
import relieveNaranja4 from '../../Registro/relieveNaranja4.png'
import relieveNaranja5 from '../../Registro/relieveNaranja5.png'
import { saveRegisteredUser } from '../../utils/authStore'

export default function RegistrationPage() {
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const carouselImages = useMemo(
    () => [relieveNaranja, relieveNaranja2, relieveNaranja3, relieveNaranja4, relieveNaranja5],
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

  function handleRegister(event) {
    event.preventDefault()

    const savedUser = saveRegisteredUser(formValues)

    if (savedUser) {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-[#e7e0d6] flex items-center justify-center p-4 md:p-8 font-body text-on-surface">
      <div className="bg-surface-container-lowest rounded-[2rem] shadow-[0_35px_80px_rgba(0,0,0,0.18)] w-full max-w-7xl overflow-hidden flex flex-col lg:flex-row min-h-[800px]">
        <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-between bg-[linear-gradient(180deg,#fffdfb_0%,#fbf8f4_100%)]">
          <div className="flex items-center justify-between gap-4 mb-12">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                bolt
              </span>
              <span className="font-headline font-bold text-2xl tracking-tight">KIOS</span>
            </div>
            <Link
              to="/login"
              className="hidden md:inline-flex rounded-full border border-outline-variant px-4 py-2 text-sm font-label text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>

          <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
            <div className="mb-10 text-center lg:text-left">
              <h1 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mb-3 tracking-tight">
                Crea tu cuenta y empieza a generar estadísticas desde CSV
              </h1>
              <p className="text-on-surface-variant font-body">Completa tus datos para empezar a generar estadísticas desde CSV.</p>
            </div>

            <form className="space-y-5" onSubmit={handleRegister}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
                <input
                  className="block w-full pl-12 pr-4 py-3.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-label transition-all"
                  id="name"
                  placeholder=" Nombre completo"
                  value={formValues.name}
                  onChange={(event) => setFormValues((currentValues) => ({ ...currentValues, name: event.target.value }))}
                  type="text"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant">mail</span>
                </div>
                <input
                  className="block w-full pl-12 pr-10 py-3.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-label transition-all"
                  id="email"
                  placeholder=" Correo electrónico"
                  value={formValues.email}
                  onChange={(event) => setFormValues((currentValues) => ({ ...currentValues, email: event.target.value }))}
                  type="email"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-green-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant">key</span>
                </div>
                <input
                  className="block w-full pl-12 pr-10 py-3.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-label transition-all placeholder-on-surface-variant"
                  id="password"
                  placeholder=" Mínimo 8 caracteres"
                  value={formValues.password}
                  onChange={(event) => setFormValues((currentValues) => ({ ...currentValues, password: event.target.value }))}
                  type={showPassword ? 'text' : 'password'}
                  required
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
                <div className="flex items-center" />
                <a className="font-medium text-on-surface hover:text-primary underline decoration-outline-variant underline-offset-2 transition-colors font-label text-sm" href="#">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <div className="pt-4">
                <button
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-on-primary bg-primary-container hover:bg-[#e5884a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-300 font-label"
                  type="submit"
                >
                  Registrarse
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-on-surface-variant font-label">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="font-medium text-on-surface hover:text-primary underline decoration-outline-variant underline-offset-2 transition-colors">
                  <b>Inicia Sesión para ver estadísticas</b>
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-12 text-center max-w-xs mx-auto">
            <p className="text-xs text-on-surface-variant font-label leading-relaxed">
              Al registrarte aceptas nuestros <a className="font-medium text-on-surface underline hover:text-primary transition-colors" href="#">Términos de servicio</a> y <a className="font-medium text-on-surface underline hover:text-primary transition-colors" href="#">Política de privacidad</a>.
            </p>
          </div>
        </div>

        <div className="hidden lg:block lg:w-1/2 p-4 relative bg-[#111111]">
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
      </div>
    </div>
  )
}
