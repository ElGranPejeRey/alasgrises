import { useEffect, useRef, useState } from 'react'
import { cx, missingTable } from '../lib/format'
import { supabase } from '../lib/supabase'
import { Empty, SectionHeading, Skeleton } from './ui'

export default function VideoGallery() {
  const [videos, setVideos] = useState([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const startX = useRef(null)

  useEffect(() => {
    let cancel = false
    async function load() {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (cancel) return
      if (error) {
        setFailed(!missingTable(error))
        setVideos([])
      } else {
        setFailed(false)
        setVideos(data || [])
      }
      setLoading(false)
    }
    load()
    const channel = supabase
      .channel('public-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, load)
      .subscribe()
    return () => {
      cancel = true
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (index > videos.length - 1) setIndex(0)
  }, [index, videos.length])

  const active = videos[index]

  function prev() {
    setIndex((current) => (current - 1 + videos.length) % videos.length)
  }

  function next() {
    setIndex((current) => (current + 1) % videos.length)
  }

  return (
    <section id="videos" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          kicker="Galería de videos"
          title="El archivo del clan"
          text="Cinemáticas y piezas que el consejo deja en el carrusel. Pasa las alas, no te quedes en una sola llama."
        />

        <div className="mt-10">
          {loading ? <Skeleton className="aspect-video w-full" /> : null}
          {!loading && failed ? (
            <Empty title="La galería no respondió" text="Vuelve a intentar en un momento. Si acabas de crear el proyecto, confirma que las tablas ya existen." />
          ) : null}
          {!loading && !failed && videos.length === 0 ? (
            <Empty title="El archivo está en silencio" text="Cuando el consejo publique un video, aparecerá aquí." />
          ) : null}
          {active ? (
            <div
              onTouchStart={(event) => {
                startX.current = event.changedTouches[0].clientX
              }}
              onTouchEnd={(event) => {
                if (startX.current == null) return
                const delta = event.changedTouches[0].clientX - startX.current
                if (delta > 48) prev()
                if (delta < -48) next()
                startX.current = null
              }}
            >
              <div className="relative overflow-hidden border border-white/10 bg-black shadow-[0_0_80px_rgba(157,28,46,0.25)]">
                <div className="relative aspect-video">
                  {active.youtube_id ? (
                    <iframe
                      key={active.id}
                      title={active.title}
                      src={`https://www.youtube-nocookie.com/embed/${active.youtube_id}?rel=0`}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video key={active.video_url} src={active.video_url} controls className="h-full w-full bg-black" />
                  )}
                </div>
                {videos.length > 1 ? (
                  <>
                    <button type="button" aria-label="Video anterior" onClick={prev} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center border border-white/20 bg-black/70 text-2xl text-white backdrop-blur hover:border-[#ff4536]">
                      ‹
                    </button>
                    <button type="button" aria-label="Video siguiente" onClick={next} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center border border-white/20 bg-black/70 text-2xl text-white backdrop-blur hover:border-[#ff4536]">
                      ›
                    </button>
                  </>
                ) : null}
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#ff8d80]">
                    {String(index + 1).padStart(2, '0')} — {String(videos.length).padStart(2, '0')}
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-silver sm:text-3xl">{active.title}</h3>
                  {active.description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel sm:text-base">{active.description}</p> : null}
                </div>
              </div>

              <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                {videos.map((video, videoIndex) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setIndex(videoIndex)}
                    className={cx(
                      'relative h-20 w-36 shrink-0 overflow-hidden border text-left transition',
                      videoIndex === index ? 'border-[#ff4536] opacity-100' : 'border-white/10 opacity-65 hover:opacity-100',
                    )}
                  >
                    {video.youtube_id ? (
                      <img src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center bg-[#1a0c10] text-[10px] uppercase tracking-[0.2em] text-steel">Video</span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent px-2 py-1 text-[10px] uppercase tracking-wider text-white">
                      {video.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
