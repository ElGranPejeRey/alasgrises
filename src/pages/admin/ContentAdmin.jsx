import { useEffect, useState } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { Button, Field, Frame, TextArea } from '../../components/ui'

const FIELDS = [
  ['hero_kicker', 'Antetítulo del hero', false],
  ['hero_title', 'Título del hero', false],
  ['hero_subtitle', 'Subtítulo del hero', true],
  ['about_title', 'Título de sobre nosotros', false],
  ['about_text', 'Descripción del gremio', true],
  ['staff_intro', 'Introducción del staff', true],
  ['contact_email', 'Correo de contacto', false],
  ['discord_url', 'Enlace de Discord', false],
  ['footer_text', 'Frase del footer', true],
]

export default function ContentAdmin() {
  const { settings, reload } = useSettings()
  const push = useToast()
  const [draft, setDraft] = useState(settings)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    const rows = FIELDS.map(([key]) => ({ key, value: draft[key] ?? '' }))
    const { error } = await supabase.from('site_settings').upsert(rows)
    setBusy(false)
    if (error) {
      push('No se pudo guardar el contenido.', 'err')
      return
    }
    await reload()
    push('El sitio ya muestra estos textos.')
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Contenido</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        Estos textos alimentan el inicio, la historia del gremio, el contacto y el footer.
      </p>
      <Frame className="mt-6 p-5">
        <form className="grid gap-4" onSubmit={onSubmit}>
          {FIELDS.map(([key, label, multiline]) => (
            multiline ? (
              <TextArea key={key} label={label} value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
            ) : (
              <Field key={key} label={label} value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
            )
          ))}
          <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contenido'}</Button>
        </form>
      </Frame>
    </div>
  )
}
