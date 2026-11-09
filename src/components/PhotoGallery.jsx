import { useEffect, useState } from 'react'
import { text } from '../lib/defaults'
import { missingTable } from '../lib/format'
import { photoUrl } from '../lib/photos'
import { supabase } from '../lib/supabase'
import { Empty, SectionHeading, Skeleton } from './ui'

export default function PhotoGallery({ settings = {} }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let cancel = false
    async function load() {
      const { data, error } = await supabase
        .from('photos')
        .select('id,title,caption,storage_path,sort_order')
        .eq('published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (cancel) return
      if (error) {
        setFailed(!missingTable(error))
        setPhotos([])
      } else {
        setFailed(false)
        setPhotos(data || [])
      }
      setLoading(false)
    }
    load()
    const channel = supabase
      .channel('public-photos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, load)
      .subscribe()
    return () => {
      cancel = true
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (open == null) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setOpen(null)
      if (event.key === 'ArrowRight') setOpen((current) => (current + 1) % photos.length)
      if (event.key === 'ArrowLeft') setOpen((current) => (current - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, photos.length])

  const active = open == null ? null : photos[open]

  function step(delta) {
    setOpen((current) => (current + delta + photos.length) % photos.length)
  }

  return (
    <section id="fotos" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          kicker="Galería de fotos"
          title={text(settings, 'photos_title')}
          text={text(settings, 'photos_text')}
        />

        <div className="mt-10">
          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
              {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="aspect-square" />)}
            </div>
          ) : null}
          {!loading && failed ? (
            <Empty title="La galería no respondió" text="Vuelve a intentar en un momento. Si acabas de crear la tabla, confirma que el script de fotos ya se ejecutó." />
          ) : null}
          {!loading && !failed && photos.length === 0 ? (
            <Empty title="El álbum está vacío" text="Cuando el consejo publique una foto, aparecerá aquí." />
          ) : null}
          {!loading && photos.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2 sm:gap-3">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setOpen(index)}
                  className="group relative aspect-square overflow-hidden border border-white/10 bg-black/50"
                  aria-label={photo.title || `Abrir foto ${index + 1}`}
                >
                  <img
                    src={photoUrl(photo.storage_path)}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110 group-hover:brightness-110"
                  />
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {active ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={active.title || 'Foto ampliada'}>
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar foto" onClick={() => setOpen(null)} />
          <div className="relative flex w-full max-w-5xl flex-col items-center">
            <img
              key={active.id}
              src={photoUrl(active.storage_path)}
              alt={active.title || 'Foto del gremio'}
              className="max-h-[78vh] w-auto max-w-full object-contain shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
            />
            <div className="relative mt-4 flex w-full max-w-3xl items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-silver">{active.title || active.caption}</p>
              <p className="shrink-0 text-xs uppercase tracking-[0.16em] text-mute">{open + 1} / {photos.length}</p>
            </div>
            {active.caption && active.title ? <p className="relative mt-1 max-w-3xl text-sm text-steel">{active.caption}</p> : null}
          </div>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={() => step(-1)}
                className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border border-white/20 bg-black/70 text-2xl text-white transition hover:border-[#ff5a3c] sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Foto siguiente"
                onClick={() => step(1)}
                className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border border-white/20 bg-black/70 text-2xl text-white transition hover:border-[#ff5a3c] sm:right-6"
              >
                ›
              </button>
            </>
          ) : null}
          <button type="button" className="absolute right-4 top-4 px-3 py-2 text-xs uppercase tracking-[0.16em] text-steel hover:text-white" onClick={() => setOpen(null)}>
            Cerrar
          </button>
        </div>
      ) : null}
    </section>
  )
}
