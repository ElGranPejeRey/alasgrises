import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Frame } from '../../components/ui'

const STEPS = [
  { id: 'contenido', title: 'Textos del clan', text: 'Ajusta el hero, la historia y el contacto.' },
  { id: 'guias', title: 'Guías', text: 'Súbelas. Se ven en la web y solo las descargan los registrados.' },
  { id: 'videos', title: 'Videos', text: 'Arma el carrusel con enlaces de YouTube o mp4.' },
  { id: 'cazadores', title: 'Usuarios', text: 'Mira las cuentas registradas y cambia el rango a admin o usuario normal.' },
  { id: 'mensajes', title: 'Chat', text: 'Responde a los cazadores desde el mismo hilo.' },
]

export default function Overview({ onNavigate }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({ guias: 0, videos: 0, cazadores: 0, chat: 0, contacto: 0 })

  useEffect(() => {
    let cancel = false
    async function load() {
      const [guides, videos, people, chat, contact] = await Promise.all([
        supabase.from('guides').select('id', { count: 'exact', head: true }),
        supabase.from('videos').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('is_read', false).neq('sender_id', user.id),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('is_read', false),
      ])
      if (cancel) return
      setStats({
        guias: guides.count || 0,
        videos: videos.count || 0,
        cazadores: people.count || 0,
        chat: chat.count || 0,
        contacto: contact.count || 0,
      })
    }
    if (user) load()
    return () => {
      cancel = true
    }
  }, [user])

  const cards = [
    ['Guías', stats.guias],
    ['Videos', stats.videos],
    ['Usuarios', stats.cazadores],
    ['Chat sin leer', stats.chat],
    ['Contacto sin leer', stats.contacto],
  ]

  return (
    <div>
      <h2 className="font-display text-3xl text-silver sm:text-4xl">Consejo de Alas Grises</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-steel sm:text-base">
        Desde aquí se administra el sitio: textos, guías, videos, cuentas y los mensajes del clan.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <Frame key={label} className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">{label}</p>
            <p className="mt-2 font-display text-3xl text-silver">{value}</p>
          </Frame>
        ))}
      </div>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {STEPS.map((step) => (
          <button key={step.id} type="button" onClick={() => onNavigate(step.id)} className="text-left">
            <Frame className="h-full p-5 transition hover:border-[#ff4536]/50">
              <p className="font-display text-xl text-silver">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-steel">{step.text}</p>
            </Frame>
          </button>
        ))}
      </div>
    </div>
  )
}
