import { useEffect, useState } from 'react'
import { Button, Field, Frame } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { twitchLogin } from '../../lib/defaults'
import { supabase } from '../../lib/supabase'

export default function StreamAdmin() {
  const { user } = useAuth()
  const push = useToast()
  const [people, setPeople] = useState([])
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const detected = twitchLogin(link)

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
    setLink('')
    setEditing(null)
  }

  function edit(person) {
    setEditing(person.id)
    setName(person.name)
    setLink(person.twitch_url || `https://www.twitch.tv/${person.twitch_login}`)
    setPendingDelete(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(event) {
    event.preventDefault()
    const cleanName = name.trim()
    const login = twitchLogin(link)
    if (cleanName.length < 2 || cleanName.length > 40) {
      push('El nombre debe tener entre 2 y 40 caracteres.', 'err')
      return
    }
    if (!login) {
      push('Pega un enlace de Twitch válido, como https://www.twitch.tv/usuario.', 'err')
      return
    }
    if (people.some((person) => person.twitch_login === login && person.id !== editing)) {
      push('Ese canal de Twitch ya está en la lista.', 'err')
      return
    }
    const payload = {
      name: cleanName,
      twitch_login: login,
      twitch_url: link.trim(),
      updated_at: new Date().toISOString(),
    }
    setBusy(true)
    const result = editing
      ? await supabase.from('streamers').update(payload).eq('id', editing)
      : await supabase.from('streamers').insert({
        ...payload,
        created_by: user?.id || null,
        sort_order: people.reduce((max, person) => Math.max(max, person.sort_order || 0), 0) + 1,
      })
    setBusy(false)
    if (result.error) {
      push(result.error.code === '23505' ? 'Ese canal de Twitch ya está en la lista.' : 'No se pudo guardar el streaming.', 'err')
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
        Agrega el nombre de quien transmite y el enlace de su canal de Twitch. Cada persona se guarda en Supabase. En la web el botón se pone verde cuando está en vivo y rojo cuando está fuera de línea.
      </p>

      <Frame className="mt-6 p-5">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre en el clan" required maxLength={40} />
            <Field
              label="Enlace de Twitch"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://www.twitch.tv/usuario"
              required
            />
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-mute">
            {detected ? `Canal detectado: twitch.tv/${detected}` : 'Pega el enlace completo del canal.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar transmisión'}</Button>
            {editing ? <Button variant="ghost" onClick={reset}>Cancelar edición</Button> : null}
          </div>
        </form>
      </Frame>

      <div className="mt-6 grid gap-3">
        {people.map((person) => (
          <Frame key={person.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-2xl text-silver">{person.name}</h3>
                <a className="mt-1 inline-block text-sm text-steel hover:text-white" href={`https://www.twitch.tv/${person.twitch_login}`} target="_blank" rel="noreferrer">
                  https://www.twitch.tv/{person.twitch_login}
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
        ))}
        {people.length === 0 ? <p className="text-sm text-mute">Todavía no hay transmisiones. Agrega un nombre y su enlace de Twitch.</p> : null}
      </div>
    </div>
  )
}
