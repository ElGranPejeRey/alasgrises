import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { Badge, Button, Frame } from '../../components/ui'

export default function PeopleAdmin({ onOpenMessages }) {
  const { user } = useAuth()
  const push = useToast()
  const [people, setPeople] = useState([])

  async function load() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    if (error) {
      push('No se pudieron cargar los cazadores.', 'err')
      return
    }
    setPeople(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function setRole(person, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', person.id)
    if (error) {
      push(error.message.includes('administrador') ? 'Debe quedar al menos un administrador.' : 'No se pudo cambiar el rol.', 'err')
      return
    }
    push(role === 'admin' ? `${person.username} ahora es admin.` : `${person.username} vuelve a ser cazador.`)
    load()
  }

  async function openChat(person) {
    const existing = await supabase.from('conversations').select('id').eq('user_id', person.id).maybeSingle()
    if (!existing.data) {
      const created = await supabase.from('conversations').insert({ user_id: person.id })
      if (created.error) {
        push('No se pudo abrir el chat.', 'err')
        return
      }
    }
    onOpenMessages()
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Cazadores</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        La primera cuenta del sitio nace como administrador. Desde aquí puedes nombrar a otros del consejo.
      </p>
      <div className="mt-6 grid gap-3">
        {people.map((person) => (
          <Frame key={person.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-xl text-silver">{person.username}</p>
                <Badge tone={person.role === 'admin' ? 'fire' : 'steel'}>{person.role === 'admin' ? 'Admin' : 'Cazador'}</Badge>
                {person.id === user.id ? <Badge>Tú</Badge> : null}
              </div>
              <p className="mt-1 break-all text-sm text-steel">{person.email}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-mute">{formatDate(person.created_at)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {person.id !== user.id ? <Button variant="ghost" onClick={() => openChat(person)}>Escribir</Button> : null}
              {person.role === 'admin' ? (
                <Button variant="steel" onClick={() => setRole(person, 'user')}>Quitar admin</Button>
              ) : (
                <Button onClick={() => setRole(person, 'admin')}>Hacer admin</Button>
              )}
            </div>
          </Frame>
        ))}
      </div>
    </div>
  )
}
