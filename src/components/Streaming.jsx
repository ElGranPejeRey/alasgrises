import { useEffect, useState } from 'react'
import { parseStreamers, text } from '../lib/defaults'
import { cx, missingTable } from '../lib/format'
import { streamLabel, streamPlatform, streamPresence } from '../lib/streams'
import { supabase } from '../lib/supabase'
import { Empty, SectionHeading } from './ui'

export default function Streaming({ settings }) {
  const [people, setPeople] = useState([])
  const [presence, setPresence] = useState({})
  const [watch, setWatch] = useState(null)
  const roster = people.map((person) => `${person.platform}:${person.login}`).join('\n')

  useEffect(() => {
    let cancel = false

    async function load() {
      const columns = 'id,name,twitch_login,platform'
      let result = await supabase
        .from('streamers')
        .select(columns)
        .eq('published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (result.error && missingTable(result.error) && /platform/i.test(result.error.message || '')) {
        result = await supabase
          .from('streamers')
          .select('id,name,twitch_login')
          .eq('published', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
      }
      if (cancel) return
      if (result.error) {
        if (missingTable(result.error)) setPeople(parseStreamers(text(settings, 'streamers')).map((person) => ({ ...person, platform: 'twitch', id: person.login })))
        return
      }
      setPeople((result.data || []).map((row) => ({
        id: row.id,
        name: row.name,
        login: row.twitch_login,
        platform: streamPlatform(row.platform),
      })))
    }

    load()
    const channel = supabase
      .channel('public-streamers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streamers' }, load)
      .subscribe()
    return () => {
      cancel = true
      supabase.removeChannel(channel)
    }
  }, [settings])

  useEffect(() => {
    const listed = people
    if (!listed.length) return undefined
    let cancel = false

    async function check() {
      const entries = await Promise.all(listed.map(async (person) => [person.id, await streamPresence(person)]))
      if (!cancel) setPresence(Object.fromEntries(entries))
    }

    check()
    const timer = window.setInterval(check, 60000)
    return () => {
      cancel = true
      window.clearInterval(timer)
    }
  }, [roster])

  useEffect(() => {
    if (!watch) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setWatch(null)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [watch])

  const parent = typeof window === 'undefined' ? 'localhost' : window.location.hostname

  return (
    <section id="streaming" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          kicker="Streaming"
          title={text(settings, 'streaming_title')}
          text={text(settings, 'streaming_text')}
        />
        {people.length === 0 ? (
          <div className="mt-8">
            <Empty title="Nadie está en la lista" text="Cuando el consejo publique a quienes streamean, aparecerán aquí." />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => {
              const status = presence[person.id] || {}
              const online = Boolean(status.online)
              const preview = playerSrc(person, status, parent, false)
              const service = serviceName(person.platform)
              return (
                <article
                  key={person.id}
                  className={cx(
                    'overflow-hidden border border-white/10 bg-[#12090b]/85',
                    online && 'hover:border-emerald-400/70',
                  )}
                >
                  <div className="relative aspect-video bg-black">
                    {preview ? (
                      <iframe
                        src={preview}
                        title={`Perfil de ${person.name} en ${service}`}
                        className="absolute inset-0 h-full w-full"
                        allow="fullscreen"
                        allowFullScreen
                        loading="lazy"
                      />
                    ) : status.thumbnail ? (
                      <img src={status.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                    ) : null}
                    {online ? (
                      <button
                        type="button"
                        className="absolute inset-0"
                        aria-label={`Abrir la transmisión de ${person.name}`}
                        onClick={() => setWatch(person)}
                      />
                    ) : null}
                  </div>
                  <div className="relative flex items-center gap-3 px-4 py-4">
                    {status.avatar ? (
                      <img src={status.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full border border-white/15 object-cover" />
                    ) : (
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/15 bg-black/40 font-display text-xl text-silver">
                        {person.name.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-2xl text-silver">{person.name}</p>
                      <p className="truncate text-sm text-mute">{streamLabel(person.platform, person.login)}</p>
                    </div>
                    <button
                      type="button"
                      aria-disabled={!online}
                      onClick={() => {
                        if (online) setWatch(person)
                      }}
                      className={cx(
                        'shrink-0 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white',
                        online ? 'bg-emerald-600' : 'cursor-default bg-red-700',
                      )}
                    >
                      {online ? 'En vivo' : 'Offline'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {watch ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`Transmisión de ${watch.name}`}>
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar transmisión" onClick={() => setWatch(null)} />
          <div className="relative w-full max-w-5xl border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="font-display text-xl text-silver">{watch.name}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">En vivo en {serviceName(watch.platform)}</p>
              </div>
              <button type="button" className="px-3 py-2 text-xs uppercase tracking-[0.16em] text-steel hover:text-white" onClick={() => setWatch(null)}>
                Cerrar
              </button>
            </div>
            <iframe
              src={playerSrc(watch, presence[watch.id], parent, true)}
              title={`Transmisión de ${watch.name}`}
              className="aspect-video w-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function serviceName(platform) {
  if (platform === 'kick') return 'Kick'
  if (platform === 'youtube') return 'YouTube'
  return 'Twitch'
}

function playerSrc(person, status, parent, autoplay) {
  const platform = person.platform || 'twitch'
  if (platform === 'kick') {
    return `https://player.kick.com/${encodeURIComponent(person.login)}?muted=${autoplay ? 'false' : 'true'}&autoplay=${autoplay ? 'true' : 'false'}`
  }
  if (platform === 'youtube') {
    if (!status?.embed) return ''
    return `${status.embed}?autoplay=${autoplay ? 1 : 0}&mute=${autoplay ? 0 : 1}`
  }
  return `https://player.twitch.tv/?channel=${encodeURIComponent(person.login)}&parent=${encodeURIComponent(parent)}&muted=${autoplay ? 'false' : 'true'}&autoplay=${autoplay ? 'true' : 'false'}`
}
