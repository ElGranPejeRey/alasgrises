import { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { Badge, Button, Empty, Frame } from '../../components/ui'

export default function ContactAdmin() {
  const push = useToast()
  const [items, setItems] = useState([])
  const [active, setActive] = useState(null)

  async function load() {
    const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
    if (error) {
      push('No se pudo abrir el buzón.', 'err')
      return
    }
    setItems(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function openMessage(message) {
    setActive(message)
    if (!message.is_read) {
      await supabase.from('contact_messages').update({ is_read: true }).eq('id', message.id)
      setItems((current) => current.map((item) => (item.id === message.id ? { ...item, is_read: true } : item)))
    }
  }

  async function remove(message) {
    const { error } = await supabase.from('contact_messages').delete().eq('id', message.id)
    if (error) {
      push('No se pudo borrar el mensaje.', 'err')
      return
    }
    if (active?.id === message.id) setActive(null)
    push('Mensaje eliminado.')
    load()
  }

  if (items.length === 0) {
    return (
      <div>
        <h2 className="font-display text-3xl text-silver">Contacto</h2>
        <div className="mt-6">
          <Empty title="El buzón está vacío" text="Los mensajes del formulario de la web llegan aquí." />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Contacto</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-2">
          {items.map((message) => (
            <button key={message.id} type="button" onClick={() => openMessage(message)} className="text-left">
              <Frame className={`p-4 ${active?.id === message.id ? 'border-[#ff4536]/60' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-lg text-silver">{message.name}</p>
                  {!message.is_read ? <Badge tone="fire">Nuevo</Badge> : null}
                </div>
                <p className="mt-1 truncate text-sm text-steel">{message.message}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-mute">{formatDate(message.created_at)}</p>
              </Frame>
            </button>
          ))}
        </div>
        {active ? (
          <Frame className="p-5">
            <p className="font-display text-2xl text-silver">{active.name}</p>
            <a className="mt-1 block break-all text-sm text-[#ffb0a6]" href={`mailto:${active.email}`}>{active.email}</a>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-steel">{active.message}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => { window.location.href = `mailto:${active.email}` }}>Responder por correo</Button>
              <Button variant="danger" onClick={() => remove(active)}>Borrar</Button>
            </div>
          </Frame>
        ) : (
          <Empty title="Elige un mensaje" text="El texto completo se abre en este panel." />
        )}
      </div>
    </div>
  )
}
