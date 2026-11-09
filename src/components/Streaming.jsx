import { useEffect, useState } from 'react'
import { parseStreamers, text } from '../lib/defaults'
import { cx, missingTable } from '../lib/format'
import { supabase } from '../lib/supabase'
import { Empty, SectionHeading } from './ui'

export default function Streaming({ settings }) {
  const [people, setPeople] = useState([])
  const [live, setLive] = useState({})
  const [avatars, setAvatars] = useState({})
  const [watch, setWatch] = useState(null)
  const logins = people.map((person) => person.login).join('\n')

  useEffect(() => {
    let cancel = false

    async function load() {
      const { data, error } = await supabase
        .from('streamers')
        .select('id,name,twitch_login')
        .eq('published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (cancel) return
      if (error) {
        if (missingTable(error)) setPeople(parseStreamers(text(settings, 'streamers')))
        return
      }
      setPeople((data || []).map((row) => ({ id: row.id, name: row.name, login: row.twitch_login })))
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
      const entries = await Promise.all(listed.map(async (person) => {
        try {
          const response = await fetch(`https://decapi.me/twitch/uptime/${encodeURIComponent(person.login)}`)
          const body = (await response.text()).toLowerCase()
          const online = response.ok && body.length > 0 && !body.includes('offline') && !body.includes('not found') && !body.includes('does not exist')
          return [person.login, online]
        } catch {
          return [person.login, false]
        }
      }))
      if (!cancel) setLive(Object.fromEntries(entries))
    }

    async function loadAvatars() {
      const entries = await Promise.all(listed.map(async (person) => {
        try {
          const response = await fetch(`https://decapi.me/twitch/avatar/${encodeURIComponent(person.login)}`)
          const url = (await response.text()).trim()
          return [person.login, response.ok && url.startsWith('https://') ? url : '']
        } catch {
          return [person.login, '']
        }
      }))
      if (!cancel) setAvatars(Object.fromEntries(entries))
    }

    check()
    loadAvatars()
    const timer = window.setInterval(check, 60000)
    return () => {
      cancel = true
      window.clearInterval(timer)
    }
  }, [logins])

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
              const online = Boolean(live[person.login])
              const avatar = avatars[person.login]
              return (
                <article
                  key={person.login}
                  className={cx(
                    'overflow-hidden border border-white/10 bg-[#12090b]/85',
                    online && 'hover:border-emerald-400/70',
                  )}
                >
                  <div className="relative aspect-video bg-black">
                    <iframe
                      src={`https://player.twitch.tv/?channel=${encodeURIComponent(person.login)}&parent=${encodeURIComponent(parent)}&muted=true&autoplay=false`}
                      title={`Perfil de ${person.name} en Twitch`}
                      className="absolute inset-0 h-full w-full"
                      allow="fullscreen"
                      allowFullScreen
                      loading="lazy"
                    />
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
                    {avatar ? (
                      <img src={avatar} alt="" className="h-14 w-14 shrink-0 rounded-full border border-white/15 object-cover" />
                    ) : (
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/15 bg-black/40 font-display text-xl text-silver">
                        {person.name.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-2xl text-silver">{person.name}</p>
                      <p className="truncate text-sm text-mute">twitch.tv/{person.login}</p>
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
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">En vivo en Twitch</p>
              </div>
              <button type="button" className="px-3 py-2 text-xs uppercase tracking-[0.16em] text-steel hover:text-white" onClick={() => setWatch(null)}>
                Cerrar
              </button>
            </div>
            <iframe
              src={`https://player.twitch.tv/?channel=${encodeURIComponent(watch.login)}&parent=${encodeURIComponent(parent)}&autoplay=true`}
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
