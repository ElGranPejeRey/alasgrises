import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatDate, missingTable } from '../../lib/format'
import { GUIDE_PERMISSION, GUIDE_PERMISSION_LABEL } from '../../lib/permissions'
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
  const [pendingDelete, setPendingDelete] = useState(null)
  const [granted, setGranted] = useState(() => new Set())
  const [permissionsReady, setPermissionsReady] = useState(true)

  async function load() {
    const [profiles, permissions] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('user_permissions').select('user_id').eq('permission_slug', GUIDE_PERMISSION),
    ])
    if (profiles.error) {
      push('No se pudieron cargar los usuarios.', 'err')
      return
    }
    setPeople(profiles.data || [])
    if (permissions.error) {
      setGranted(new Set())
      setPermissionsReady(false)
      if (!missingTable(permissions.error)) push('No se pudieron cargar los permisos.', 'err')
      return
    }
    setPermissionsReady(true)
    setGranted(new Set((permissions.data || []).map((row) => row.user_id)))
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

  async function remove(person) {
    setSavingId(person.id)
    const { error } = await supabase.rpc('delete_clan_user', { target_id: person.id })
    setSavingId(null)
    if (error) {
      const message = error.message || ''
      if (message.includes('administrador')) push('Debe quedar al menos un administrador.', 'err')
      else if (message.includes('ti mismo')) push('No puedes eliminarte a ti mismo.', 'err')
      else if (message.includes('delete_clan_user') || message.includes('schema cache')) push('Falta ejecutar el script de borrado en Supabase.', 'err')
      else push('No se pudo eliminar al usuario.', 'err')
      return
    }
    setPendingDelete(null)
    setOpenId(null)
    push(`${person.username} fue eliminado.`)
    load()
  }

  async function togglePermission(person) {
    const has = granted.has(person.id)
    setSavingId(person.id)
    const result = has
      ? await supabase.from('user_permissions').delete().eq('user_id', person.id).eq('permission_slug', GUIDE_PERMISSION)
      : await supabase.from('user_permissions').insert({
        user_id: person.id,
        permission_slug: GUIDE_PERMISSION,
        granted_by: user.id,
      })
    setSavingId(null)
    if (result.error) {
      const message = result.error.message || ''
      if (missingTable(result.error) || message.includes('schema cache')) push('Falta ejecutar el script de permisos en Supabase.', 'err')
      else push(has ? 'No se pudo quitar el permiso.' : 'No se pudo dar el permiso.', 'err')
      return
    }
    push(has ? `${person.username} ya no tiene ${GUIDE_PERMISSION_LABEL}.` : `${person.username} ahora tiene ${GUIDE_PERMISSION_LABEL}.`)
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
        {people.length} {people.length === 1 ? 'cuenta' : 'cuentas'} en el gremio. El permiso {GUIDE_PERMISSION_LABEL} abre las guías y solo lo entrega un administrador.
      </p>
      {permissionsReady ? null : (
        <Frame className="mt-4 p-4 text-sm text-steel">
          Falta ejecutar el script de permisos en Supabase para poder dar {GUIDE_PERMISSION_LABEL}.
        </Frame>
      )}
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
                    {granted.has(person.id) ? <Badge tone="fire">{GUIDE_PERMISSION_LABEL}</Badge> : null}
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
                  {person.role === 'user' ? (
                    <Button
                      variant={granted.has(person.id) ? 'ghost' : 'steel'}
                      disabled={!permissionsReady || savingId === person.id}
                      onClick={() => togglePermission(person)}
                    >
                      {granted.has(person.id) ? `Quitar ${GUIDE_PERMISSION_LABEL}` : `Dar ${GUIDE_PERMISSION_LABEL}`}
                    </Button>
                  ) : null}
                  <Button variant="steel" onClick={() => setOpenId(open ? null : person.id)} disabled={savingId === person.id}>
                    {savingId === person.id ? 'Guardando…' : 'Cambiar rango'}
                  </Button>
                  {person.id !== user.id ? (
                    pendingDelete === person.id ? (
                      <>
                        <Button variant="danger" disabled={savingId === person.id} onClick={() => remove(person)}>Confirmar</Button>
                        <Button variant="ghost" onClick={() => setPendingDelete(null)}>No</Button>
                      </>
                    ) : (
                      <Button variant="danger" className="px-3" aria-label={`Eliminar a ${person.username}`} onClick={() => setPendingDelete(person.id)}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M4 7h16" />
                          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          <path d="M8 7l1 13h6l1-13" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </Button>
                    )
                  ) : null}
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
