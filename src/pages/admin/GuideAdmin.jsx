import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { CATEGORIES } from '../../lib/defaults'
import { formatDate, parseVideoInput, youtubeGuideId } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { Badge, Button, Field, Frame, SelectField, TextArea } from '../../components/ui'

const EMPTY = { title: '', description: '', category: 'General', youtube: '', published: true }

export default function GuideAdmin() {
  const { user } = useAuth()
  const push = useToast()
  const [guides, setGuides] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  async function load() {
    const { data, error } = await supabase.from('guides').select('*').order('created_at', { ascending: false })
    if (error) {
      push('No se pudieron cargar las guías.', 'err')
      return
    }
    setGuides(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  function edit(guide) {
    setEditing(guide.id)
    const youtubeId = youtubeGuideId(guide.file_path)
    setForm({
      title: guide.title,
      description: guide.description || '',
      category: guide.category || 'General',
      youtube: youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '',
      published: guide.published,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    setEditing(null)
    setForm(EMPTY)
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) {
      push('La guía necesita un título.', 'err')
      return
    }
    const parsed = parseVideoInput(form.youtube)
    if (!parsed?.youtube_id) {
      push('Pega un enlace de YouTube válido.', 'err')
      return
    }
    setBusy(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      published: form.published,
      file_path: `youtube:${parsed.youtube_id}`,
      file_name: 'YouTube',
      file_size: 0,
    }
    const result = editing
      ? await supabase.from('guides').update(payload).eq('id', editing)
      : await supabase.from('guides').insert({ ...payload, created_by: user.id })

    if (result.error) {
      setBusy(false)
      push(result.error.message || 'No se pudo guardar la guía.', 'err')
      return
    }

    if (editing) {
      const previous = guides.find((guide) => guide.id === editing)
      if (previous?.file_path && !youtubeGuideId(previous.file_path)) {
        await supabase.storage.from('guides').remove([previous.file_path])
      }
    }

    setBusy(false)
    push(editing ? 'Guía actualizada.' : 'Guía publicada en la web.')
    reset()
    load()
  }

  async function toggle(guide) {
    const { error } = await supabase.from('guides').update({ published: !guide.published }).eq('id', guide.id)
    if (error) {
      push('No se pudo cambiar la visibilidad.', 'err')
      return
    }
    load()
  }

  async function remove(guide) {
    const { error } = await supabase.from('guides').delete().eq('id', guide.id)
    if (error) {
      push('No se pudo borrar la guía.', 'err')
      return
    }
    if (guide.file_path && !youtubeGuideId(guide.file_path)) await supabase.storage.from('guides').remove([guide.file_path])
    setPendingDelete(null)
    if (editing === guide.id) reset()
    push('Guía eliminada.')
    load()
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Guías</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        Pega el enlace de YouTube. Quien visita la web ve el título, y el video completo solo se reproduce con una cuenta registrada.
      </p>

      <Frame className="mt-6 p-5">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Título" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={120} />
            <SelectField label="Categoría" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </SelectField>
          </div>
          <TextArea label="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={1200} />
          <Field
            label="Enlace de YouTube"
            value={form.youtube}
            onChange={(event) => setForm({ ...form, youtube: event.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
          <label className="flex items-center gap-2 text-sm text-steel">
            <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
            Visible en la web
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar video'}</Button>
            {editing ? <Button variant="ghost" onClick={reset}>Cancelar edición</Button> : null}
          </div>
        </form>
      </Frame>

      <div className="mt-6 grid gap-3">
        {guides.map((guide) => (
          <Frame key={guide.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="fire">{guide.category}</Badge>
                  <Badge tone={guide.published ? 'ok' : 'steel'}>{guide.published ? 'Visible' : 'Oculta'}</Badge>
                </div>
                <h3 className="mt-3 font-display text-2xl text-silver">{guide.title}</h3>
                <p className="mt-2 text-sm text-steel">{guide.description}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-mute">
                  YouTube · {guide.downloads || 0} vistas · {formatDate(guide.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => edit(guide)}>Editar</Button>
                <Button variant="steel" onClick={() => toggle(guide)}>{guide.published ? 'Ocultar' : 'Publicar'}</Button>
                {pendingDelete === guide.id ? (
                  <>
                    <Button variant="danger" onClick={() => remove(guide)}>Confirmar</Button>
                    <Button variant="ghost" onClick={() => setPendingDelete(null)}>No</Button>
                  </>
                ) : (
                  <Button variant="danger" onClick={() => setPendingDelete(guide.id)}>Borrar</Button>
                )}
              </div>
            </div>
          </Frame>
        ))}
        {guides.length === 0 ? <p className="text-sm text-mute">Todavía no hay videos de guías.</p> : null}
      </div>
    </div>
  )
}
