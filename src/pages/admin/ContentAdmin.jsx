import { useEffect, useState } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { Button, Field, Frame, TextArea } from '../../components/ui'

const GROUPS = [
  {
    title: 'Inicio',
    fields: [
      ['hero_kicker', 'Antetítulo', false],
      ['hero_title', 'Título', false],
      ['hero_subtitle', 'Subtítulo', true],
    ],
  },
  {
    title: 'Sobre nosotros',
    note: 'Separa los párrafos con una línea en blanco. En filosofía y tarjetas, una idea por línea: Título | texto.',
    fields: [
      ['about_title', 'Título', false],
      ['about_text', 'Texto', true],
      ['about_quote', 'Frase destacada', false],
      ['philosophy_title', 'Título de la filosofía', false],
      ['philosophy_items', 'Filosofía', true],
      ['about_pillars', 'Tarjetas de cierre', true],
    ],
  },
  {
    title: 'Staff',
    note: 'Una persona por línea: Nombre | rol | descripción. El orden corresponde a las fotos.',
    fields: [
      ['staff_title', 'Título', false],
      ['staff_intro', 'Introducción', true],
      ['staff_cards', 'Personas del staff', true],
    ],
  },
  {
    title: 'Galería de videos',
    fields: [
      ['videos_title', 'Título', false],
      ['videos_text', 'Texto', true],
    ],
  },
  {
    title: 'Streaming',
    note: 'Aquí solo cambias el título y el texto de la sección. Los nombres y los enlaces de Twitch se administran en Streaming.',
    fields: [
      ['streaming_title', 'Título', false],
      ['streaming_text', 'Texto', true],
    ],
  },
  {
    title: 'Guías',
    fields: [
      ['guides_title', 'Título', false],
      ['guides_text', 'Texto', true],
    ],
  },
  {
    title: 'Contacto y pie',
    fields: [
      ['contact_title', 'Título', false],
      ['contact_text', 'Texto', true],
      ['contact_email', 'Correo', false],
      ['discord_url', 'Enlace de Discord', false],
      ['footer_text', 'Frase del footer', true],
    ],
  },
]

const FIELDS = GROUPS.flatMap((group) => group.fields)

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
        Textos del inicio, sobre nosotros, la filosofía, el staff, la galería, el streaming, las guías, el contacto y el pie. Se guardan en Supabase.
      </p>
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        {GROUPS.map((group) => (
          <Frame key={group.title} className="p-5">
            <h3 className="font-display text-2xl text-silver">{group.title}</h3>
            {group.note ? <p className="mt-2 text-sm leading-relaxed text-mute">{group.note}</p> : null}
            <div className="mt-4 grid gap-4">
              {group.fields.map(([key, label, multiline]) => (
                multiline ? (
                  <TextArea key={key} label={label} value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                ) : (
                  <Field key={key} label={label} value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                )
              ))}
            </div>
          </Frame>
        ))}
        <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contenido'}</Button>
      </form>
    </div>
  )
}
