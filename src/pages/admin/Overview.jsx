import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Frame } from '../../components/ui'

const STEPS = [
  { id: 'contenido', title: 'Textos del clan', text: 'Ajusta el hero, la historia y el contacto.' },
  { id: 'guias', title: 'Guías', text: 'Pega un enlace de YouTube. Los usuarios las ven solo con el permiso AlasGrises.' },
  { id: 'videos', title: 'Videos', text: 'Arma el carrusel con enlaces de YouTube o mp4.' },
  { id: 'fotos', title: 'Fotos', text: 'Sube imágenes. En la web se ven pequeñas y se abren en grande.' },
  { id: 'mapa', title: 'Mapa', text: 'Abre el mapa interactivo de Santuario, el mismo para el consejo y los cazadores.' },
  { id: 'streaming', title: 'Streaming', text: 'Agrega el canal de Twitch, Kick o YouTube de quien transmite.' },
  { id: 'discord', title: 'Discord', text: 'Cambia el enlace del botón flotante de la página.' },
  { id: 'paypal', title: 'PayPal', text: 'Cambia el enlace con el que los usuarios donan.' },
  { id: 'cazadores', title: 'Usuarios', text: 'Cambia el rango y entrega el permiso AlasGrises para abrir las guías.' },
  { id: 'mensajes', title: 'Chat', text: 'Responde a los cazadores desde el mismo hilo.' },
]

export default function Overview({ onNavigate }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({ guias: 0, videos: 0, cazadores: 0, chat: 0 })

  useEffect(() => {
    let cancel = false
    async function load() {
      const [guides, videos, people, chat] = await Promise.all([
        supabase.from('guides').select('id', { count: 'exact', head: true }),
        supabase.from('videos').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('is_read', false).neq('sender_id', user.id),
      ])
      if (cancel) return
      setStats({
        guias: guides.count || 0,
        videos: videos.count || 0,
        cazadores: people.count || 0,
        chat: chat.count || 0,
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
  ]

  return (
    <div>
      <h2 className="font-display text-3xl text-silver sm:text-4xl">Consejo de Alas Grises</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-steel sm:text-base">
        Desde aquí se administra el sitio: textos, guías, videos, cuentas y los mensajes del clan.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
