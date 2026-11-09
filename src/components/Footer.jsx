import { Link, useLocation } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import { text } from '../lib/defaults'

const LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#nosotros', label: 'Sobre nosotros' },
  { href: '#staff', label: 'Staff' },
  { href: '#videos', label: 'Galería de videos' },
  { href: '#fotos', label: 'Fotos' },
  { href: '#streaming', label: 'Streaming' },
  { href: '#guias', label: 'Guías' },
]

export default function Footer() {
  const { settings } = useSettings()
  const location = useLocation()
  const email = text(settings, 'contact_email')
  const discord = text(settings, 'discord_url')
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-[#ff4536]/30 bg-black/50 px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.3fr_0.8fr_0.9fr]">
        <div>
          <img src="/img/alas.jpg" alt="Alas Grises" className="h-16 w-auto max-w-[240px] object-contain" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-steel">{text(settings, 'footer_text')}</p>
        </div>
        <div>
          <p className="font-display text-xs uppercase tracking-[0.28em] text-[#ff8d80]">Mapa</p>
          <ul className="mt-4 space-y-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                {location.pathname === '/' ? (
                  <a className="fire-link" href={link.href}>{link.label}</a>
                ) : (
                  <Link className="fire-link" to={`/${link.href}`}>{link.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-display text-xs uppercase tracking-[0.28em] text-[#ff8d80]">Consejo</p>
          <div className="mt-4 space-y-2 text-sm text-steel">
            {email ? <a className="block hover:text-white" href={`mailto:${email}`}>{email}</a> : null}
            {discord.startsWith('http') ? (
              <a className="block text-[#ffb0a6] hover:text-white" href={discord} target="_blank" rel="noreferrer">Discord del gremio</a>
            ) : null}
            <Link className="fire-link" to="/dashboard">Panel del clan</Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.18em] text-mute sm:flex-row sm:justify-between">
        <p>Alas Grises · {year}</p>
        <p>Gremio de Diablo IV</p>
      </div>
    </footer>
  )
}
