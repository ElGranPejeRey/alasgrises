import { useLocation } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import { discordUrl, text } from '../lib/defaults'

export default function DiscordButton() {
  const { settings } = useSettings()
  const { pathname } = useLocation()
  const link = discordUrl(text(settings, 'discord_url'))
  if (pathname.startsWith('/dashboard') || !link) return null

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      aria-label="Abrir el Discord del gremio"
      className="fixed right-3 top-1/2 z-40 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full bg-[#5865F2] text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition hover:bg-[#4752C4] sm:right-5"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
        <path
          fill="currentColor"
          d="M19.27 5.33A17.4 17.4 0 0 0 15.09 4l-.43.84a16.1 16.1 0 0 1 4.07 1.55 15.3 15.3 0 0 0-13.46 0A12 12 0 0 1 9.34 4l-.43-.84a17.4 17.4 0 0 0-4.18 1.33C2.1 9.05 1.3 12.67 1.68 16.24a17.6 17.6 0 0 0 5.32 2.69l.68-1.12a11.5 11.5 0 0 1-1.7-.82l.42-.33c3.3 1.54 6.88 1.54 10.14 0l.42.33c-.54.33-1.11.6-1.7.82l.68 1.12a17.5 17.5 0 0 0 5.32-2.69c.46-4.18-.78-7.76-2.99-10.91M8.7 14.3c-.99 0-1.8-.92-1.8-2.05s.79-2.05 1.8-2.05 1.82.92 1.8 2.05-.79 2.05-1.8 2.05m6.6 0c-.99 0-1.8-.92-1.8-2.05s.79-2.05 1.8-2.05 1.82.92 1.8 2.05-.79 2.05-1.8 2.05"
        />
      </svg>
    </a>
  )
}
