import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { text } from '../lib/defaults'
import { countGuideView, cx, formatBytes, formatDate, guideVideoUrl, missingTable, youtubeGuideId } from '../lib/format'
import { supabase } from '../lib/supabase'
import { Badge, Button, Empty, Frame, SectionHeading, Skeleton } from './ui'

const PUBLIC_COLUMNS = 'id,title,description,category,file_name,file_size,downloads,created_at'
const MEMBER_COLUMNS = `${PUBLIC_COLUMNS},file_path`

export default function Guides({ settings = {}, variant = 'page' }) {
  const { user, loading: authLoading, openAuth } = useAuth()
  const push = useToast()
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [watching, setWatching] = useState(null)
  const [gate, setGate] = useState(false)
  const counted = useRef(new Set())

  useEffect(() => {
    let cancel = false
    async function load() {
      const columns = user ? MEMBER_COLUMNS : PUBLIC_COLUMNS
      const { data, error } = await supabase
        .from('guides')
        .select(columns)
        .eq('published', true)
        .order('created_at', { ascending: false })
      if (cancel) return
      if (error) {
        setFailed(!missingTable(error))
        setGuides([])
        if (!missingTable(error)) push('No se pudieron cargar las guías.', 'err')
      } else {
        setFailed(false)
        setGuides(data || [])
      }
      setLoading(false)
    }
    load()
    const channel = supabase
      .channel(`public-guides-${variant}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guides' }, load)
      .subscribe()
    return () => {
      cancel = true
      supabase.removeChannel(channel)
    }
  }, [user, variant, push])

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(guides.map((guide) => guide.category).filter(Boolean)))], [guides])

  const visible = guides.filter((guide) => {
    const matchesCategory = category === 'Todas' || guide.category === category
    const haystack = `${guide.title} ${guide.description} ${guide.category}`.toLowerCase()
    return matchesCategory && haystack.includes(query.trim().toLowerCase())
  })

  function onView(guideId) {
    if (counted.current.has(guideId)) return
    counted.current.add(guideId)
    countGuideView(guideId)
    setGuides((current) => current.map((item) => (
      item.id === guideId ? { ...item, downloads: (item.downloads || 0) + 1 } : item
    )))
  }

  useEffect(() => {
    if (!watching && !gate) return undefined
    function onKey(event) {
      if (event.key !== 'Escape') return
      setWatching(null)
      setGate(false)
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [watching, gate])

  const body = (
    <>
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cx(
                'shrink-0 border px-3 py-2 text-[11px] uppercase tracking-[0.16em]',
                category === item ? 'border-[#ff4536] bg-[#ff4536]/15 text-white' : 'border-white/10 text-steel hover:border-white/30',
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar una guía"
          className="w-full border border-white/10 bg-black/40 px-3 py-3 text-sm text-silver outline-none placeholder:text-white/30 focus:border-[#ff5a3c]/80 lg:max-w-xs"
        />
      </div>

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-56" />)}
        </div>
      ) : null}

      {!loading && failed ? (
        <div className="mt-8">
          <Empty title="Las guías no cargaron" text="Revisa la conexión con Supabase. Si el esquema aún no existe, hay que crearlo antes." />
        </div>
      ) : null}

      {!loading && !failed && guides.length === 0 ? (
        <div className="mt-8">
          <Empty
            title="Todavía no hay guías"
            text="Cuando el consejo publique un video, se verá aquí. Solo una cuenta registrada puede verlo completo."
          />
        </div>
      ) : null}

      {!loading && !failed && guides.length > 0 && visible.length === 0 ? (
        <div className="mt-8">
          <Empty title="Ninguna guía coincide" text="Prueba con otra clase o borra la búsqueda." />
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((guide) => (
            <Frame key={guide.id} className="flex flex-col overflow-hidden">
              <GuidePlayer
                guide={guide}
                locked={!user}
                onNeedAccount={() => {
                  if (!authLoading) setGate(true)
                }}
                onWatch={(video) => {
                  onView(guide.id)
                  setWatching(video)
                }}
                onError={() => push('No se pudo abrir el video. Entra con tu cuenta e inténtalo de nuevo.', 'err')}
              />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <Badge tone="fire">{guide.category || 'General'}</Badge>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-mute">{formatDate(guide.created_at)}</span>
                </div>
                <h3 className="mt-4 font-display text-2xl leading-tight text-silver">{guide.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-steel">{guide.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-mute">
                  <span>{formatBytes(guide.file_size) || 'Video'}</span>
                  <span>{guide.downloads || 0} vistas</span>
                </div>
              </div>
            </Frame>
          ))}
        </div>
      ) : null}

      {watching ? <GuideModal video={watching} onClose={() => setWatching(null)} /> : null}
      {gate ? (
        <GuideGate
          onClose={() => setGate(false)}
          onRegister={() => {
            setGate(false)
            openAuth('register')
          }}
          onLogin={() => {
            setGate(false)
            openAuth('login')
          }}
        />
      ) : null}
    </>
  )

  if (variant === 'dashboard') {
    return (
      <div>
        <h2 className="font-display text-3xl text-silver">Guías del clan</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
          Estás dentro. Desde aquí puedes ver completo cada video que el consejo haya publicado.
        </p>
        {body}
      </div>
    )
  }

  return (
    <section id="guias" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          kicker="Guías"
          title={text(settings, 'guides_title')}
          text={text(settings, 'guides_text')}
        />
        {body}
      </div>
    </section>
  )
}

function GuidePlayer({ guide, locked, onNeedAccount, onWatch, onError }) {
  const [busy, setBusy] = useState(false)
  const poster = youtubeGuideId(guide.file_path)

  async function open() {
    if (locked) {
      onNeedAccount()
      return
    }
    if (poster) {
      onWatch({ guide, youtubeId: poster, url: '' })
      return
    }
    if (!guide.file_path) {
      onError()
      return
    }
    setBusy(true)
    try {
      onWatch({ guide, youtubeId: '', url: await guideVideoUrl(guide) })
    } catch {
      onError()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={open} className="relative grid aspect-video w-full place-items-center overflow-hidden bg-black text-center">
      {poster ? (
        <img src={`https://i.ytimg.com/vi/${poster}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(157,28,46,0.5),transparent_58%)]" />
      )}
      <span className="absolute inset-0 bg-black/45" />
      <span className="relative px-4">
        <span className="mx-auto grid h-14 w-14 place-items-center border border-[#ff4536] bg-black/50 font-display text-lg text-white">▶</span>
        <span className="mt-3 block text-[11px] uppercase tracking-[0.16em] text-[#ffb0a6]">
          {busy ? 'Abriendo…' : 'Ver video'}
        </span>
      </span>
    </button>
  )
}

function GuideGate({ onClose, onRegister, onLogin }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="guide-gate-title">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar aviso" onClick={onClose} />
      <div className="relative w-full max-w-md border border-white/10 bg-[#10080a] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <p id="guide-gate-title" className="font-display text-3xl leading-tight text-silver">Para ver este contenido tienes que estar registrado en el sitio.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="sm:flex-1" onClick={onRegister}>Registrarme</Button>
          <Button variant="ghost" className="sm:flex-1" onClick={onLogin}>Iniciar sesión</Button>
        </div>
        <button type="button" className="mt-4 text-xs uppercase tracking-[0.16em] text-steel hover:text-white" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

function GuideModal({ video, onClose }) {
  const { guide, youtubeId, url } = video
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={guide.title}>
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar video" onClick={onClose} />
      <div className="relative w-full max-w-5xl border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-display text-xl text-silver">{guide.title}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-[#ffb0a6]">{guide.category || 'Guía'}</p>
          </div>
          <button type="button" className="shrink-0 px-3 py-2 text-xs uppercase tracking-[0.16em] text-steel hover:text-white" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&autoplay=1`}
            title={guide.title}
            className="aspect-video max-h-[calc(100svh-8.5rem)] w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={url} controls autoPlay playsInline className="aspect-video max-h-[calc(100svh-8.5rem)] w-full bg-black" />
        )}
      </div>
    </div>
  )
}
