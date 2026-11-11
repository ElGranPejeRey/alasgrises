import { useEffect, useState } from 'react'
import { Button, Field, Frame, SelectField } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { missingTable } from '../../lib/format'
import { parseStreamLink, resolveYoutubeChannel, streamLabel, streamPlatform, streamUrl, STREAM_PLATFORMS } from '../../lib/streams'
import { supabase } from '../../lib/supabase'

const PLACEHOLDERS = {
  twitch: 'https://www.twitch.tv/usuario',
  kick: 'https://kick.com/usuario',
  youtube: 'https://www.youtube.com/@usuario',
}

export default function StreamAdmin() {
  const { user } = useAuth()
  const push = useToast()
  const [people, setPeople] = useState([])
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('twitch')
  const [link, setLink] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const detected = parseStreamLink(platform, link)

  async function load() {
    const { data, error } = await supabase.from('streamers').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (error) {
      push('No se pudieron cargar las transmisiones. Revisa que la tabla streamers exista en Supabase.', 'err')
      return
    }
    setPeople(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  function reset() {
    setName('')
    setPlatform('twitch')
    setLink('')
    setEditing(null)
  }

  function edit(person) {
    const kind = streamPlatform(person.platform)
    setEditing(person.id)
    setName(person.name)
    setPlatform(kind)
    setLink(person.twitch_url || streamUrl(kind, person.twitch_login))
    setPendingDelete(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(event) {
    event.preventDefault()
    const cleanName = name.trim()
    const parsed = parseStreamLink(platform, link)
    if (cleanName.length < 2 || cleanName.length > 40) {
      push('El nombre debe tener entre 2 y 40 caracteres.', 'err')
      return
    }
    if (!parsed) {
      push(invalidLink(platform), 'err')
      return
    }
    let login = parsed.login
    if (platform === 'youtube' && parsed.kind === 'video') {
      const channel = await resolveYoutubeChannel(parsed.login)
      if (!channel) {
        push('No pude leer el canal de ese video. Pega el enlace del canal, como https://www.youtube.com/@usuario.', 'err')
        return
      }
      login = channel.login
    }
    if (people.some((person) => streamPlatform(person.platform) === platform && person.twitch_login === login && person.id !== editing)) {
      push('Ese canal ya está en la lista.', 'err')
      return
    }
    const payload = {
      name: cleanName,
      platform,
      twitch_login: login,
      twitch_url: streamUrl(platform, login),
      updated_at: new Date().toISOString(),
    }
    setBusy(true)
    let result = editing
      ? await supabase.from('streamers').update(payload).eq('id', editing)
      : await supabase.from('streamers').insert({
        ...payload,
        created_by: user?.id || null,
        sort_order: people.reduce((max, person) => Math.max(max, person.sort_order || 0), 0) + 1,
      })
    if (result.error && missingPlatform(result.error)) {
      if (platform !== 'twitch') {
        setBusy(false)
        push('Para Kick y YouTube ejecuta en Supabase el script supabase/streaming-platforms.sql.', 'err')
        return
      }
      const { platform: _platform, ...legacy } = payload
      result = editing
        ? await supabase.from('streamers').update(legacy).eq('id', editing)
        : await supabase.from('streamers').insert({
          ...legacy,
          created_by: user?.id || null,
          sort_order: people.reduce((max, person) => Math.max(max, person.sort_order || 0), 0) + 1,
        })
    }
    setBusy(false)
    if (result.error) {
      push(result.error.code === '23505' ? 'Ese canal ya está en la lista.' : 'No se pudo guardar el streaming.', 'err')
      return
    }
    reset()
    push(editing ? 'Transmisión actualizada.' : 'Transmisión agregada. Ya aparece en la web.')
    load()
  }

  async function remove(person) {
    setBusy(true)
    const { error } = await supabase.from('streamers').delete().eq('id', person.id)
    setBusy(false)
    if (error) {
      push('No se pudo borrar la transmisión.', 'err')
      return
    }
    if (editing === person.id) reset()
    setPendingDelete(null)
    push('Transmisión eliminada.')
    load()
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Streaming</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        Agrega el nombre de quien transmite y el enlace de Twitch, Kick o YouTube. Cada persona se guarda en Supabase. En la web el botón se pone verde cuando está en vivo y rojo cuando está fuera de línea.
      </p>

      <Frame className="mt-6 p-5">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nombre" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre en el clan" required maxLength={40} />
            <SelectField label="Plataforma" value={platform} onChange={(event) => setPlatform(event.target.value)}>
              {STREAM_PLATFORMS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </SelectField>
            <Field
              label="Enlace del canal"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder={PLACEHOLDERS[platform]}
              required
            />
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-mute">
            {detected
              ? detected.kind === 'video'
                ? 'Video detectado. Al guardar se usa el canal de ese video.'
                : `Canal detectado: ${streamLabel(platform, detected.login)}`
              : 'Pega el enlace completo del canal.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar transmisión'}</Button>
            {editing ? <Button variant="ghost" onClick={reset}>Cancelar edición</Button> : null}
          </div>
        </form>
      </Frame>

      <div className="mt-6 grid gap-3">
        {people.map((person) => {
          const kind = streamPlatform(person.platform)
          const href = person.twitch_url || streamUrl(kind, person.twitch_login)
          return (
            <Frame key={person.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-2xl text-silver">{person.name}</h3>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#ff8d80]">{labelFor(kind)}</p>
                  <a className="mt-1 inline-block text-sm text-steel hover:text-white" href={href} target="_blank" rel="noreferrer">
                    {streamLabel(kind, person.twitch_login)}
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => edit(person)}>Editar</Button>
                  {pendingDelete === person.id ? (
                    <>
                      <Button variant="danger" disabled={busy} onClick={() => remove(person)}>Confirmar</Button>
                      <Button variant="ghost" onClick={() => setPendingDelete(null)}>No</Button>
                    </>
                  ) : (
                    <Button variant="danger" onClick={() => setPendingDelete(person.id)}>Borrar</Button>
                  )}
                </div>
              </div>
            </Frame>
          )
        })}
        {people.length === 0 ? <p className="text-sm text-mute">Todavía no hay transmisiones. Agrega un nombre y su enlace.</p> : null}
      </div>
    </div>
  )
}

function labelFor(platform) {
  return STREAM_PLATFORMS.find((item) => item.id === platform)?.label || 'Twitch'
}

function invalidLink(platform) {
  if (platform === 'kick') return 'Pega un enlace de Kick válido, como https://kick.com/usuario.'
  if (platform === 'youtube') return 'Pega un enlace de YouTube válido, como https://www.youtube.com/@usuario.'
  return 'Pega un enlace de Twitch válido, como https://www.twitch.tv/usuario.'
}

function missingPlatform(error) {
  return missingTable(error) && /platform/i.test(`${error.message || ''} ${error.details || ''}`)
}
