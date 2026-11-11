import { useEffect, useState } from 'react'
import { Button, Field, Frame } from '../../components/ui'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'
import { discordUrl } from '../../lib/defaults'
import { supabase } from '../../lib/supabase'

export default function DiscordAdmin() {
  const { settings, reload } = useSettings()
  const push = useToast()
  const [link, setLink] = useState(settings.discord_url || '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLink(settings.discord_url || '')
  }, [settings.discord_url])

  async function onSubmit(event) {
    event.preventDefault()
    const next = discordUrl(link)
    if (next === null) {
      push('Usa un enlace de discord.gg o discord.com.', 'err')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('site_settings').upsert({ key: 'discord_url', value: next })
    setBusy(false)
    if (error) {
      push('No se pudo guardar el enlace de Discord.', 'err')
      return
    }
    setLink(next)
    await reload()
    push(next ? 'El botón de Discord ya usa este enlace.' : 'El botón de Discord quedó oculto.')
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Discord</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        Este enlace abre el botón flotante de la derecha en la página pública. Si lo dejas vacío, el botón no se muestra.
      </p>
      <form className="mt-6 max-w-xl" onSubmit={onSubmit}>
        <Frame className="p-5">
          <Field
            label="Enlace de Discord"
            value={link}
            placeholder="https://discord.gg/tu-invitacion"
            onChange={(event) => setLink(event.target.value)}
          />
          <Button className="mt-4" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar enlace'}</Button>
        </Frame>
      </form>
    </div>
  )
}
