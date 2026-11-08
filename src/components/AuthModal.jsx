import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { accountEmail, cx, humanAuthError } from '../lib/format'
import { supabase } from '../lib/supabase'
import { Button, Field, IconClose } from './ui'

export default function AuthModal() {
  const { authOpen, authMode, setAuthMode, closeAuth, recovery, setRecovery } = useAuth()
  const push = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const visible = authOpen || recovery

  useEffect(() => {
    if (!visible) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') {
        closeAuth()
        setRecovery(false)
      }
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [visible, closeAuth, setRecovery])

  useEffect(() => {
    setError('')
    setInfo('')
    setForgot(false)
  }, [authMode, authOpen, recovery])

  if (!visible) return null

  async function onLogin(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: accountEmail(email),
      password,
    })
    setBusy(false)
    if (authError) {
      setError(humanAuthError(authError.message))
      return
    }
    closeAuth()
    push('Bienvenido al nido.')
    navigate('/dashboard')
  }

  async function onRegister(event) {
    event.preventDefault()
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9 _-]{3,20}$/.test(username.trim())) {
      setError('El nombre debe tener entre 3 y 20 caracteres.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    setError('')
    const credentials = { email: email.trim(), password }
    const { data, error: authError } = await supabase.auth.signUp({
      ...credentials,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { username: username.trim() },
      },
    })
    const duplicate = authError && /already registered|already been registered/i.test(authError.message)
    if (authError && !duplicate) {
      setBusy(false)
      setError(humanAuthError(authError.message))
      return
    }
    let session = data?.session ?? null
    if (!session) {
      const login = await supabase.auth.signInWithPassword(credentials)
      session = login.data.session
      if (!session) {
        setBusy(false)
        setError(login.error ? humanAuthError(login.error.message) : 'No se pudo abrir la sesión.')
        return
      }
    }
    setBusy(false)
    closeAuth()
    push('Cuenta creada. Ya eres parte de Alas Grises.')
    navigate('/dashboard')
  }

  async function onForgot(event) {
    event.preventDefault()
    if (!accountEmail(email).includes('@')) {
      setError('Escribe el usuario o el correo de tu cuenta.')
      return
    }
    setBusy(true)
    const { error: authError } = await supabase.auth.resetPasswordForEmail(accountEmail(email), {
      redirectTo: window.location.origin,
    })
    setBusy(false)
    if (authError) {
      setError(humanAuthError(authError.message))
      return
    }
    setInfo('Si el correo está en el gremio, te enviamos un enlace para renovar la contraseña.')
  }

  async function onRecovery(event) {
    event.preventDefault()
    if (password.length < 6) {
      setError('Usa al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    const { error: authError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (authError) {
      setError(humanAuthError(authError.message))
      return
    }
    setRecovery(false)
    setPassword('')
    setConfirm('')
    push('Contraseña actualizada.')
    navigate('/dashboard')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={() => { closeAuth(); setRecovery(false) }} />
      <div className="relative max-h-[92svh] w-full overflow-y-auto border border-white/10 bg-[#10080a] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:max-w-md sm:p-7">
        <span className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l border-t border-[#ff4536]" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-[#ff4536]" />
        <button type="button" className="absolute right-3 top-3 grid h-10 w-10 place-items-center text-steel hover:text-white" aria-label="Cerrar ventana" onClick={() => { closeAuth(); setRecovery(false) }}>
          <IconClose />
        </button>
        <img src="/img/alas.jpg" alt="" className="mx-auto h-14 w-auto max-w-[200px] object-contain" />
        <h2 id="auth-title" className="mt-4 text-center font-display text-2xl text-silver">
          {recovery ? 'Nueva contraseña' : authMode === 'login' ? 'Entrar al nido' : 'Unirse al gremio'}
        </h2>

        {!recovery ? (
          <div className="mt-5 grid grid-cols-2 border border-white/10">
            {['login', 'register'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAuthMode(mode)}
                className={cx('py-2 text-[11px] uppercase tracking-[0.18em]', authMode === mode ? 'bg-[#ff4536] text-white' : 'text-steel')}
              >
                {mode === 'login' ? 'Login' : 'Registro'}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="mt-4 border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">{error}</p> : null}
        {info ? <p className="mt-4 border border-emerald-400/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">{info}</p> : null}

        {recovery ? (
          <form className="mt-5 grid gap-4" onSubmit={onRecovery}>
            <Field label="Nueva contraseña" type={show ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
            <Field label="Confirmar" type={show ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required />
            <button type="button" className="text-left text-xs uppercase tracking-[0.14em] text-mute" onClick={() => setShow((value) => !value)}>
              {show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            </button>
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</Button>
          </form>
        ) : null}

        {!recovery && forgot ? (
          <form className="mt-5 grid gap-4" onSubmit={onForgot}>
            <Field label="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            <Button type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</Button>
            <button type="button" className="text-xs uppercase tracking-[0.14em] text-mute" onClick={() => setForgot(false)}>Volver al login</button>
          </form>
        ) : null}

        {!recovery && !forgot && authMode === 'login' ? (
          <form className="mt-5 grid gap-4" onSubmit={onLogin}>
            <Field label="Usuario o correo" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
            <Field label="Contraseña" type={show ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-mute">
              <button type="button" onClick={() => setShow((value) => !value)}>{show ? 'Ocultar' : 'Mostrar'}</button>
              <button type="button" onClick={() => setForgot(true)}>Olvidé mi contraseña</button>
            </div>
            <Button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
          </form>
        ) : null}

        {!recovery && !forgot && authMode === 'register' ? (
          <form className="mt-5 grid gap-4" onSubmit={onRegister}>
            <Field label="Nombre en el clan" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required maxLength={20} />
            <Field label="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            <Field label="Contraseña" type={show ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
            <Field label="Confirmar contraseña" type={show ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required />
            <button type="button" className="text-left text-xs uppercase tracking-[0.14em] text-mute" onClick={() => setShow((value) => !value)}>
              {show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            </button>
            <p className="text-xs leading-relaxed text-mute">El registro guarda tu cuenta en Supabase. Las cuentas nuevas entran como cazadores.</p>
            <Button type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</Button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
