import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { cx, timeAgo } from '../lib/format'
import { supabase } from '../lib/supabase'
import { Button, Empty, Spinner } from './ui'

export default function ChatPanel({ variant = 'page' }) {
  const { user, isAdmin } = useAuth()
  const push = useToast()
  const mode = variant === 'widget' || !isAdmin ? 'user' : 'admin'
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [mobileThread, setMobileThread] = useState(false)
  const [unread, setUnread] = useState({})
  const scroller = useRef(null)

  async function loadConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, profiles(username, email)')
      .order('updated_at', { ascending: false })
    if (error) {
      push('No se pudieron cargar las conversaciones.', 'err')
      return []
    }
    const { data: unreadRows } = await supabase
      .from('chat_messages')
      .select('conversation_id')
      .eq('is_read', false)
      .neq('sender_id', user.id)
    const counts = {}
    for (const row of unreadRows || []) counts[row.conversation_id] = (counts[row.conversation_id] || 0) + 1
    setUnread(counts)
    setConversations(data || [])
    return data || []
  }

  useEffect(() => {
    if (!user) return undefined
    let cancel = false
    async function boot() {
      setLoading(true)
      if (mode === 'user') {
        const found = await supabase.from('conversations').select('*').eq('user_id', user.id).maybeSingle()
        let conversation = found.data
        if (!conversation && !found.error) {
          const created = await supabase.from('conversations').insert({ user_id: user.id }).select('*').single()
          conversation = created.data || (await supabase.from('conversations').select('*').eq('user_id', user.id).maybeSingle()).data
        }
        if (!cancel) setActiveId(conversation?.id || null)
      } else {
        const data = await loadConversations()
        if (!cancel) setActiveId((current) => current || data[0]?.id || null)
      }
      if (!cancel) setLoading(false)
    }
    boot()
    return () => {
      cancel = true
    }
  }, [user, mode])

  useEffect(() => {
    if (mode !== 'admin' || !user) return undefined
    const channel = supabase
      .channel('admin-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, loadConversations)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, loadConversations)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [mode, user])

  useEffect(() => {
    if (!activeId || !user) return undefined
    let cancel = false
    supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancel) return
        if (error) push('No se pudieron cargar los mensajes.', 'err')
        setMessages(data || [])
      })
    supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', activeId)
      .neq('sender_id', user.id)
      .eq('is_read', false)
      .then(() => {
        setUnread((current) => ({ ...current, [activeId]: 0 }))
      })

    const channel = supabase
      .channel(`chat-${activeId}-${variant}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${activeId}`,
      }, (payload) => {
        setMessages((current) => (current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new]))
        if (payload.new.sender_id !== user.id) {
          supabase.from('chat_messages').update({ is_read: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()

    return () => {
      cancel = true
      supabase.removeChannel(channel)
    }
  }, [activeId, user, variant])

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [messages, activeId])

  async function send(event) {
    event.preventDefault()
    const text = body.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ conversation_id: activeId, sender_id: user.id, body: text })
      .select('*')
      .single()
    setSending(false)
    if (error) {
      push('No se pudo enviar el mensaje.', 'err')
      return
    }
    setBody('')
    setMessages((current) => (current.some((item) => item.id === data.id) ? current : [...current, data]))
  }

  const activeConversation = conversations.find((item) => item.id === activeId)

  function labelFor(message) {
    if (message.sender_id === user.id) return 'Tú'
    if (mode === 'user') return 'Consejo'
    if (activeConversation && message.sender_id === activeConversation.user_id) {
      return activeConversation.profiles?.username || 'Cazador'
    }
    return 'Consejo'
  }

  const thread = (
    <div className="flex min-h-0 flex-1 flex-col">
      {mode === 'admin' ? (
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <button type="button" className="text-xs uppercase tracking-[0.14em] text-mute md:hidden" onClick={() => setMobileThread(false)}>
            Volver
          </button>
          <div>
            <p className="font-display text-lg text-silver">{activeConversation?.profiles?.username || 'Conversación'}</p>
            <p className="text-xs text-mute">{activeConversation?.profiles?.email}</p>
          </div>
        </div>
      ) : null}
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? <div className="grid h-full place-items-center"><Spinner className="h-6 w-6" /></div> : null}
        {!loading && messages.length === 0 ? (
          <p className="text-sm text-mute">Aún no hay mensajes. El consejo lee este canal.</p>
        ) : null}
        {messages.map((message) => {
          const mine = message.sender_id === user.id
          return (
            <div key={message.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[85%] px-3 py-2 text-sm leading-relaxed', mine ? 'bg-gradient-to-b from-[#ff5a3c] to-[#8d1824] text-white' : 'border border-white/10 bg-black/50 text-silver')}>
                <p className="mb-1 text-[10px] uppercase tracking-[0.16em] opacity-70">{labelFor(message)}</p>
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] opacity-60">{timeAgo(message.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>
      <form className="flex gap-2 border-t border-white/10 p-3" onSubmit={send}>
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          placeholder={mode === 'admin' ? 'Responder al cazador' : 'Escribe al consejo'}
          className="min-w-0 flex-1 border border-white/10 bg-black/40 px-3 py-3 text-sm text-silver outline-none focus:border-[#ff5a3c]/80"
        />
        <Button type="submit" disabled={sending || !body.trim() || !activeId}>{sending ? '…' : 'Enviar'}</Button>
      </form>
    </div>
  )

  if (mode === 'user') {
    return <div className={cx('flex min-h-0 flex-1 flex-col', variant === 'page' ? 'min-h-[68svh] border border-white/10 bg-[#12090b]/70' : 'h-full')}>{thread}</div>
  }

  if (!loading && conversations.length === 0) {
    return <Empty title="Nadie ha escrito todavía" text="Cuando un cazador abra el chat, la conversación aparecerá aquí." />
  }

  return (
    <div className="grid min-h-[70svh] border border-white/10 bg-[#12090b]/70 md:grid-cols-[280px_1fr]">
      <aside className={cx('border-white/10 md:border-r', mobileThread ? 'hidden md:block' : 'block')}>
        <div className="border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-mute">Cazadores</div>
        <div className="max-h-[70svh] overflow-y-auto">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => {
                setActiveId(conversation.id)
                setMobileThread(true)
              }}
              className={cx(
                'flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left',
                conversation.id === activeId ? 'bg-white/5' : 'hover:bg-white/[0.03]',
              )}
            >
              <span>
                <span className="block text-sm text-silver">{conversation.profiles?.username || 'Cazador'}</span>
                <span className="block text-xs text-mute">{timeAgo(conversation.updated_at)}</span>
              </span>
              {unread[conversation.id] ? (
                <span className="grid h-5 min-w-5 place-items-center bg-[#ff4536] px-1 text-[10px] text-white">{unread[conversation.id]}</span>
              ) : null}
            </button>
          ))}
        </div>
      </aside>
      <section className={cx('min-h-0', mobileThread ? 'flex' : 'hidden md:flex')}>{thread}</section>
    </div>
  )
}
