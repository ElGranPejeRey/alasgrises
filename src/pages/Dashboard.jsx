import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ChatPanel from '../components/ChatPanel'
import Guides from '../components/Guides'
import { Badge, Button, Field, Frame, ScreenLoader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { cx } from '../lib/format'
import { supabase } from '../lib/supabase'
import ContactAdmin from './admin/ContactAdmin'
import ContentAdmin from './admin/ContentAdmin'
import GuideAdmin from './admin/GuideAdmin'
import Overview from './admin/Overview'
import PeopleAdmin from './admin/PeopleAdmin'
import VideoAdmin from './admin/VideoAdmin'

const ADMIN_ITEMS = [
  ['resumen', 'Resumen'],
  ['guias', 'Guías'],
  ['videos', 'Videos'],
  ['contenido', 'Contenido'],
  ['cazadores', 'Cazadores'],
  ['contacto', 'Contacto'],
  ['mensajes', 'Mensajes'],
]

const USER_ITEMS = [
  ['guias', 'Guías'],
  ['mensajes', 'Mensajes'],
  ['cuenta', 'Cuenta'],
]

export default function Dashboard() {
  const { user, profile, loading, profileReady, isAdmin, openAuth, signOut } = useAuth()
  const push = useToast()
  const navigate = useNavigate()
  const items = isAdmin ? ADMIN_ITEMS : USER_ITEMS
  const [section, setSection] = useState(isAdmin ? 'resumen' : 'guias')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.title = 'Panel · Alas Grises'
  }, [])

  useEffect(() => {
    if (loading || user) return undefined
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || data.session) return
      openAuth('login')
      navigate('/', { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [loading, user, openAuth, navigate])

  useEffect(() => {
    if (!items.some(([id]) => id === section)) setSection(items[0][0])
  }, [isAdmin, items, section])

  useEffect(() => {
    setUsername(profile?.username || '')
  }, [profile])

  async function leave() {
    await signOut()
    navigate('/')
  }

  async function saveProfile(event) {
    event.preventDefault()
    const next = username.trim()
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9 _-]{3,20}$/.test(next)) {
      push('El nombre debe tener entre 3 y 20 caracteres.', 'err')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ username: next }).eq('id', user.id)
    setSaving(false)
    if (error) {
      push('No se pudo guardar el nombre.', 'err')
      return
    }
    push('Nombre actualizado.')
  }

  if (loading || (user && !profileReady)) return <ScreenLoader label="Abriendo tu panel" />
  if (!user) return null
  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-md">
          <p className="font-display text-3xl text-silver">No encontramos tu ficha</p>
          <p className="mt-3 text-sm leading-relaxed text-steel">Confirma el correo de registro o revisa que las tablas de Supabase ya estén creadas.</p>
          <Button className="mt-6" onClick={() => navigate('/')}>Volver al sitio</Button>
        </div>
      </div>
    )
  }

  let content = null
  if (isAdmin && section === 'resumen') content = <Overview onNavigate={setSection} />
  if (isAdmin && section === 'guias') content = <GuideAdmin />
  if (isAdmin && section === 'videos') content = <VideoAdmin />
  if (isAdmin && section === 'contenido') content = <ContentAdmin />
  if (isAdmin && section === 'cazadores') content = <PeopleAdmin onOpenMessages={() => setSection('mensajes')} />
  if (isAdmin && section === 'contacto') content = <ContactAdmin />
  if (section === 'mensajes') {
    content = (
      <div>
        <h2 className="mb-4 font-display text-3xl text-silver">{isAdmin ? 'Chat del clan' : 'Mensajes al consejo'}</h2>
        <ChatPanel variant="page" />
      </div>
    )
  }
  if (!isAdmin && section === 'guias') content = <Guides variant="dashboard" />
  if (!isAdmin && section === 'cuenta') {
    content = (
      <div>
        <h2 className="font-display text-3xl text-silver">Tu cuenta</h2>
        <Frame className="mt-6 max-w-xl p-5">
          <form className="grid gap-4" onSubmit={saveProfile}>
            <Field label="Nombre en el clan" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={20} />
            <p className="text-sm text-steel">{user.email}</p>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar nombre'}</Button>
          </form>
        </Frame>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ash">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <Link to="/" className="min-w-0">
          <img src="/img/alas.jpg" alt="Alas Grises" className="h-11 w-auto max-w-[180px] object-contain" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-40 truncate text-sm text-steel sm:inline">{profile.username}</span>
          <Badge tone={isAdmin ? 'fire' : 'steel'}>{isAdmin ? 'Admin' : 'Cazador'}</Badge>
          <Button variant="ghost" onClick={leave}>Salir</Button>
        </div>
      </header>

      <div className="md:grid md:grid-cols-[230px_minmax(0,1fr)]">
        <nav className="sticky top-0 hidden h-fit flex-col gap-1 border-r border-white/10 p-4 md:flex" aria-label="Panel">
          {items.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cx(
                'border-l-2 px-3 py-3 text-left text-xs uppercase tracking-[0.16em]',
                section === id ? 'border-[#ff4536] bg-white/5 text-white' : 'border-transparent text-steel hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
          <Link to="/" className="mt-6 px-3 text-xs uppercase tracking-[0.16em] text-mute hover:text-white">Volver al sitio</Link>
        </nav>

        <div>
          <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-3 py-3 md:hidden">
            {items.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={cx(
                  'shrink-0 border px-3 py-2 text-[11px] uppercase tracking-[0.14em]',
                  section === id ? 'border-[#ff4536] text-white' : 'border-white/10 text-steel',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="px-4 py-6 sm:px-6 sm:py-8">{content}</div>
        </div>
      </div>
    </div>
  )
}
