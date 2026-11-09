import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { Badge, Button, Frame } from '../../components/ui'

const RANKS = [
  { id: 'admin', label: 'Admin' },
  { id: 'user', label: 'Usuario normal' },
]

export default function PeopleAdmin({ onOpenMessages }) {
  const { user, refreshProfile } = useAuth()
  const push = useToast()
  const [people, setPeople] = useState([])
  const [openId, setOpenId] = useState(null)
  const [savingId, setSavingId] = useState(null)

  async function load() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    if (error) {
      push('No se pudieron cargar los usuarios.', 'err')
      return
    }
    setPeople(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function setRole(person, role) {
    if (person.role === role) {
      setOpenId(null)
      return
    }
    setSavingId(person.id)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', person.id)
    setSavingId(null)
    if (error) {
      push(error.message.includes('administrador') ? 'Debe quedar al menos un administrador.' : 'No se pudo cambiar el rango.', 'err')
      return
    }
    push(role === 'admin' ? `${person.username} ahora es admin.` : `${person.username} ahora es usuario normal.`)
    setOpenId(null)
    if (person.id === user.id) await refreshProfile()
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
      <h2 className="font-display text-3xl text-silver">Usuarios registrados</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        {people.length} {people.length === 1 ? 'cuenta' : 'cuentas'} en el gremio. El rango se guarda en Supabase.
      </p>
      <div className="mt-6 grid gap-3">
        {people.length === 0 ? (
          <Frame className="p-6 text-sm text-steel">Todavía no hay usuarios registrados.</Frame>
        ) : null}
        {people.map((person) => {
          const open = openId === person.id
          const rank = RANKS.find((item) => item.id === person.role)
          return (
            <Frame key={person.id} className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl text-silver">{person.username}</p>
                    <Badge tone={person.role === 'admin' ? 'fire' : 'steel'}>{rank?.label || 'Usuario normal'}</Badge>
                    {person.id === user.id ? <Badge>Tú</Badge> : null}
                  </div>
                  <p className="mt-1 break-all text-sm text-steel">{person.email}</p>
                  {person.d4_class || person.battletag ? (
                    <p className="mt-1 text-sm text-[#ffb0a6]">{[person.d4_class, person.battletag].filter(Boolean).join(' · ')}</p>
                  ) : null}
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-mute">{formatDate(person.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {person.id !== user.id ? <Button variant="ghost" onClick={() => openChat(person)}>Escribir</Button> : null}
                  <Button variant="steel" onClick={() => setOpenId(open ? null : person.id)} disabled={savingId === person.id}>
                    {savingId === person.id ? 'Guardando…' : 'Cambiar rango'}
                  </Button>
                </div>
              </div>
              {open ? (
                <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
                  {RANKS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(person, item.id)}
                      className={`border px-4 py-3 text-left text-sm ${
                        person.role === item.id
                          ? 'border-[#ff4536] bg-[#ff4536]/10 text-white'
                          : 'border-white/10 text-steel hover:border-[#ff5a3c]/70 hover:text-white'
                      }`}
                    >
                      <span className="block font-display text-base tracking-wide text-silver">{item.label}</span>
                      <span className="mt-1 block text-xs uppercase tracking-[0.14em]">
                        {person.role === item.id ? 'Rango actual' : 'Asignar este rango'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </Frame>
          )
        })}
      </div>
    </div>
  )
}
