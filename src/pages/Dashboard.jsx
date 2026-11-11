import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ChatPanel from '../components/ChatPanel'
import Donations from '../components/Donations'
import Guides from '../components/Guides'
import { Badge, Button, Field, Frame, ScreenLoader, SelectField } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { cx } from '../lib/format'
import { D4_AVATARS, D4_CLASSES, avatarCatalog, hunterFields, normalizeBattleTag, validBattleTag } from '../lib/hunter'
import { supabase } from '../lib/supabase'
import DiscordAdmin from './admin/DiscordAdmin'
import ContentAdmin from './admin/ContentAdmin'
import GuideAdmin from './admin/GuideAdmin'
import Overview from './admin/Overview'
import PeopleAdmin from './admin/PeopleAdmin'
import PayPalAdmin from './admin/PayPalAdmin'
import PhotoAdmin from './admin/PhotoAdmin'
import StreamAdmin from './admin/StreamAdmin'
import VideoAdmin from './admin/VideoAdmin'

const ADMIN_ITEMS = [
  ['resumen', 'Resumen'],
  ['perfil', 'Perfil'],
  ['guias', 'Guías'],
  ['videos', 'Videos'],
  ['fotos', 'Fotos'],
  ['streaming', 'Streaming'],
  ['discord', 'Discord'],
  ['paypal', 'PayPal'],
  ['contenido', 'Contenido'],
  ['cazadores', 'Usuarios'],
  ['mensajes', 'Mensajes'],
]

const USER_ITEMS = [
  ['guias', 'Guías'],
  ['perfil', 'Perfil'],
  ['donaciones', 'Donaciones'],
  ['mensajes', 'Mensajes'],
]

export default function Dashboard() {
  const { user, profile, loading, profileReady, isAdmin, openAuth, signOut, refreshProfile } = useAuth()
  const push = useToast()
  const navigate = useNavigate()
  const items = isAdmin ? ADMIN_ITEMS : USER_ITEMS
  const [section, setSection] = useState(isAdmin ? 'resumen' : 'guias')
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('')
  const [d4Class, setD4Class] = useState('')
  const [battletag, setBattletag] = useState('')
  const [saving, setSaving] = useState(false)
  const [catalog, setCatalog] = useState(D4_AVATARS)

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
    const fields = hunterFields(profile, user)
    setUsername(fields.username)
    setAvatar(fields.avatar)
    setD4Class(fields.d4Class)
    setBattletag(fields.battletag)
  }, [profile, user])

  async function leave() {
    await signOut()
    navigate('/')
  }

  useEffect(() => {
    let cancel = false
    supabase.from('avatars').select('slug,class_name,title,image_path').order('sort_order', { ascending: true }).then(({ data, error }) => {
      if (cancel || error || !data?.length) return
      setCatalog(avatarCatalog(data))
    })
    return () => {
      cancel = true
    }
  }, [])

  async function saveProfile(event) {
    event.preventDefault()
    const next = username.trim()
    const tag = normalizeBattleTag(battletag)
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9 _-]{3,20}$/.test(next)) {
      push('El nombre debe tener entre 3 y 20 caracteres.', 'err')
      return
    }
    if (d4Class && !D4_CLASSES.includes(d4Class)) {
      push('Elige una clase de Diablo IV.', 'err')
      return
    }
    if (!validBattleTag(tag)) {
      push('El BattleTag usa el formato Nombre#1234.', 'err')
      return
    }
    if (avatar && !catalog.some((item) => item.image === avatar)) {
      push('Elige un avatar de Diablo IV.', 'err')
      return
    }
    setBattletag(tag)
    setSaving(true)
    const sheet = { avatar_url: avatar, d4_class: d4Class, battletag: tag }
    const authUpdate = await supabase.auth.updateUser({ data: sheet })
    if (authUpdate.error) {
      setSaving(false)
      push('No se pudo guardar el perfil.', 'err')
      return
    }
    let { error } = await supabase.from('profiles').update({ username: next, ...sheet }).eq('id', user.id)
    if (error) {
      const fallback = await supabase.from('profiles').update({ username: next }).eq('id', user.id)
      error = fallback.error
    }
    setSaving(false)
    if (error) {
      push('No se pudo guardar el nombre.', 'err')
      return
    }
    await refreshProfile()
    push('Perfil actualizado.')
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
  if (isAdmin && section === 'fotos') content = <PhotoAdmin />
  if (isAdmin && section === 'streaming') content = <StreamAdmin />
  if (isAdmin && section === 'discord') content = <DiscordAdmin />
  if (isAdmin && section === 'paypal') content = <PayPalAdmin />
  if (isAdmin && section === 'contenido') content = <ContentAdmin />
  if (isAdmin && section === 'cazadores') content = <PeopleAdmin onOpenMessages={() => setSection('mensajes')} />
  if (section === 'mensajes') {
    content = (
      <div>
        <h2 className="mb-4 font-display text-3xl text-silver">{isAdmin ? 'Chat del clan' : 'Mensajes al consejo'}</h2>
        <ChatPanel variant="page" />
      </div>
    )
  }
  if (!isAdmin && section === 'guias') content = <Guides />
  if (!isAdmin && section === 'donaciones') content = <Donations />
  if (section === 'perfil') {
    content = (
      <div>
        <h2 className="font-display text-3xl text-silver">Tu perfil</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
          Así te ve el gremio: tu nombre, un avatar de Diablo IV, la clase con la que entras a Santuario y tu BattleTag.
        </p>
        <div className="mt-6 grid items-start gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <HunterCard username={username} avatar={avatar} d4Class={d4Class} battletag={battletag} email={user.email} />
          <Frame className="p-5">
            <form className="grid gap-4" onSubmit={saveProfile}>
              <div>
                <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-mute">Avatar de Diablo IV</span>
                <div className="flex flex-wrap gap-2">
                  {catalog.map((item) => {
                    const selected = avatar === item.image
                    return (
                      <button
                        key={item.slug}
                        type="button"
                        aria-pressed={selected}
                        aria-label={item.title}
                        onClick={() => {
                          setAvatar(item.image)
                          setD4Class(item.className)
                        }}
                        className={cx(
                          'w-14 border p-1 text-center transition sm:w-16',
                          selected ? 'border-[#ff4536] bg-[#ff4536]/10' : 'border-white/10 hover:border-[#ff5a3c]/70',
                        )}
                      >
                        <img src={item.image} alt="" className="aspect-square w-full object-cover" />
                        <span className="mt-1 block truncate text-[10px] uppercase tracking-[0.08em] text-steel">{item.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <Field label="Nombre de usuario" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={20} />
              <SelectField label="Clase principal de Diablo IV" value={d4Class} onChange={(event) => setD4Class(event.target.value)}>
                <option value="">Elige tu clase</option>
                {D4_CLASSES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </SelectField>
              <Field
                label="BattleTag"
                value={battletag}
                onChange={(event) => setBattletag(event.target.value)}
                placeholder="Nombre#1234"
                maxLength={24}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar perfil'}</Button>
            </form>
          </Frame>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ash">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <Link to="/" className="min-w-0">
          <img src="/img/Emblema%20Alas%20Grises.png" alt="Alas Grises" className="h-12 w-12 object-contain" />
        </Link>
        <div className="flex items-center gap-2">
          <Avatar name={profile.username} src={avatar} className="h-9 w-9" />
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
          <div className="px-4 py-6 sm:px-6 sm:py-8">
            {!isAdmin && section !== 'perfil' ? (
              <button type="button" className="mb-6 block w-full text-left" onClick={() => setSection('perfil')}>
                <Frame className="flex flex-col gap-4 p-4 transition hover:border-[#ff4536]/50 sm:flex-row sm:items-center sm:justify-between">
                  <HunterIdentity username={username || profile.username} avatar={avatar} d4Class={d4Class} battletag={battletag} />
                  <span className="text-xs uppercase tracking-[0.16em] text-[#ffb0a6]">Editar perfil</span>
                </Frame>
              </button>
            ) : null}
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}

function Avatar({ name, src, className = 'h-16 w-16' }) {
  const initial = (name || 'C').trim().charAt(0).toUpperCase()
  return (
    <span className={cx('relative grid shrink-0 place-items-center overflow-hidden border border-[#ff4536]/70 bg-black font-display text-xl text-[#ffb0a6]', className)}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  )
}

function HunterIdentity({ username, avatar, d4Class, battletag }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <Avatar name={username} src={avatar} className="h-16 w-16 text-2xl" />
      <div className="min-w-0">
        <p className="truncate font-display text-2xl text-silver">{username || 'Cazador'}</p>
        <p className="mt-1 truncate text-sm text-steel">{d4Class || 'Clase principal sin elegir'}</p>
        <p className="truncate text-sm tracking-wide text-[#ffb0a6]">{battletag || 'BattleTag sin cargar'}</p>
      </div>
    </div>
  )
}

function HunterCard({ username, avatar, d4Class, battletag, email }) {
  return (
    <Frame className="bg-[radial-gradient(120%_80%_at_100%_0%,rgba(157,28,46,0.4),transparent_55%)] p-5">
      <Avatar name={username} src={avatar} className="h-20 w-20 text-3xl" />
      <p className="mt-4 font-display text-2xl leading-tight text-silver">{username || 'Cazador'}</p>
      <p className="mt-2 text-sm text-steel">{d4Class || 'Clase principal sin elegir'}</p>
      <p className="mt-1 text-sm tracking-wide text-[#ffb0a6]">{battletag || 'BattleTag sin cargar'}</p>
      <p className="mt-4 break-all text-xs uppercase tracking-[0.12em] text-mute">{email}</p>
    </Frame>
  )
}
