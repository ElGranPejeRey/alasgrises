import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import ChatPanel from './ChatPanel'
import { IconClose, IconFlame } from './ui'

export default function ChatWidget() {
  const { user, profile, isAdmin } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const visible = Boolean(user && profile && !isAdmin && location.pathname !== '/dashboard')

  useEffect(() => {
    if (!visible) return undefined
    let cancel = false
    async function count() {
      const { data: conversation } = await supabase.from('conversations').select('id').eq('user_id', user.id).maybeSingle()
      if (!conversation || cancel) {
        if (!cancel) setUnread(0)
        return
      }
      const { count: total } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id)
        .eq('is_read', false)
        .neq('sender_id', user.id)
      if (!cancel) setUnread(total || 0)
    }
    count()
    const channel = supabase
      .channel(`widget-unread-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, count)
      .subscribe()
    return () => {
      cancel = true
      supabase.removeChannel(channel)
    }
  }, [visible, user])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="flex h-[min(72svh,540px)] w-[min(92vw,380px)] flex-col overflow-hidden border border-white/10 bg-[#10080a]/95 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="font-display text-sm tracking-[0.18em] text-silver">CONSEJO</p>
              <p className="text-xs text-mute">Mensaje directo con los administradores</p>
            </div>
            <button type="button" aria-label="Cerrar chat" onClick={() => setOpen(false)} className="text-steel hover:text-white">
              <IconClose className="h-5 w-5" />
            </button>
          </div>
          <ChatPanel variant="widget" />
        </div>
      ) : null}
      <button
        type="button"
        aria-label={open ? 'Cerrar chat del clan' : 'Abrir chat del clan'}
        onClick={() => {
          setOpen((value) => !value)
          setUnread(0)
        }}
        className="btn-fire relative grid h-14 w-14 place-items-center rounded-full"
      >
        <IconFlame className="h-6 w-6" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
            {unread}
          </span>
        ) : null}
      </button>
    </div>
  )
}
