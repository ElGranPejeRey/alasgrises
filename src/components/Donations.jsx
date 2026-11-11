import { useSettings } from '../context/SettingsContext'
import { paypalUrl, text } from '../lib/defaults'
import { Frame } from './ui'

export default function Donations() {
  const { settings } = useSettings()
  const link = paypalUrl(text(settings, 'paypal_url'))

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Donaciones</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        Si quieres apoyar al gremio, el aporte se hace con PayPal. El botón abre la página de pago en una pestaña nueva.
      </p>
      <Frame className="mt-6 max-w-xl p-5">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 bg-[#ffc439] px-5 py-3 text-sm font-semibold text-[#003087] transition hover:bg-[#f5b800]"
          >
            <span className="text-base font-bold italic tracking-tight">
              <span className="text-[#003087]">Pay</span><span className="text-[#009cde]">Pal</span>
            </span>
            Donar
          </a>
        ) : (
          <p className="text-sm leading-relaxed text-mute">El consejo todavía no publicó el enlace de PayPal.</p>
        )}
      </Frame>
    </div>
  )
}
