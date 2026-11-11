import { useEffect, useState } from 'react'
import Donations from '../../components/Donations'
import { Button, Field, Frame } from '../../components/ui'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'
import { paypalUrl } from '../../lib/defaults'
import { supabase } from '../../lib/supabase'

export default function PayPalAdmin() {
  const { settings, reload } = useSettings()
  const push = useToast()
  const [link, setLink] = useState(settings.paypal_url || '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLink(settings.paypal_url || '')
  }, [settings.paypal_url])

  async function onSubmit(event) {
    event.preventDefault()
    const next = paypalUrl(link)
    if (next === null) {
      push('Usa un enlace de paypal.me o paypal.com.', 'err')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('site_settings').upsert({ key: 'paypal_url', value: next })
    setBusy(false)
    if (error) {
      push('No se pudo guardar el enlace de PayPal.', 'err')
      return
    }
    setLink(next)
    await reload()
    push(next ? 'Los cazadores ya pueden donar con este PayPal.' : 'Las donaciones quedaron ocultas.')
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">PayPal</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        Este enlace abre el botón Donar con PayPal en el panel de los usuarios. Si lo dejas vacío, el botón no se muestra.
      </p>
      <form className="mt-6 max-w-xl" onSubmit={onSubmit}>
        <Frame className="p-5">
          <Field
            label="Enlace de PayPal"
            value={link}
            placeholder="https://paypal.me/tu-usuario"
            onChange={(event) => setLink(event.target.value)}
          />
          <Button className="mt-4" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar enlace'}</Button>
        </Frame>
      </form>
      <div className="mt-8 max-w-xl border-t border-white/10 pt-8">
        <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-mute">Así lo ve el panel de usuarios</p>
        <Donations />
      </div>
    </div>
  )
}
