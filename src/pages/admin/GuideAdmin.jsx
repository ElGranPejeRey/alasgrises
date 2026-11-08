import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { CATEGORIES } from '../../lib/defaults'
import { formatBytes, formatDate, safeFileName } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { Badge, Button, Field, Frame, SelectField, TextArea } from '../../components/ui'

const EMPTY = { title: '', description: '', category: 'General', published: true }

export default function GuideAdmin() {
  const { user } = useAuth()
  const push = useToast()
  const [guides, setGuides] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
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
    setFile(null)
    setForm({
      title: guide.title,
      description: guide.description || '',
      category: guide.category || 'General',
      published: guide.published,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    setEditing(null)
    setFile(null)
    setForm(EMPTY)
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) {
      push('La guía necesita un título.', 'err')
      return
    }
    if (!editing && !file) {
      push('Adjunta el archivo de la guía.', 'err')
      return
    }
    if (file && file.size > 20 * 1024 * 1024) {
      push('El archivo supera los 20 MB.', 'err')
      return
    }
    setBusy(true)
    let filePath
    let fileName
    let fileSize
    if (file) {
      fileName = safeFileName(file.name)
      filePath = `${crypto.randomUUID()}-${fileName}`
      const uploaded = await supabase.storage.from('guides').upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
      if (uploaded.error) {
        setBusy(false)
        push('No se pudo subir el archivo.', 'err')
        return
      }
      fileSize = file.size
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      published: form.published,
    }
    if (file) {
      payload.file_path = filePath
      payload.file_name = fileName
      payload.file_size = fileSize
    }

    const result = editing
      ? await supabase.from('guides').update(payload).eq('id', editing)
      : await supabase.from('guides').insert({ ...payload, created_by: user.id })

    if (result.error) {
      if (filePath) await supabase.storage.from('guides').remove([filePath])
      setBusy(false)
      push(result.error.message || 'No se pudo guardar la guía.', 'err')
      return
    }

    if (editing && file) {
      const previous = guides.find((guide) => guide.id === editing)
      if (previous?.file_path) await supabase.storage.from('guides').remove([previous.file_path])
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
    if (guide.file_path) await supabase.storage.from('guides').remove([guide.file_path])
    setPendingDelete(null)
    if (editing === guide.id) reset()
    push('Guía eliminada.')
    load()
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Guías</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        El título y la descripción se ven en la web. El archivo solo lo descarga un usuario registrado.
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
          <label className="block cursor-pointer border border-dashed border-white/20 bg-white/[0.03] px-4 py-8 text-center hover:border-[#ff4536]/70">
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.zip,.png,.jpg,.jpeg,.webp,.txt,.docx,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <span className="text-sm text-steel">{file ? file.name : editing ? 'Cambiar archivo (opcional)' : 'Elegir PDF, ZIP, imagen o documento'}</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-steel">
            <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
            Visible en la web
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar guía'}</Button>
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
                  {guide.file_name} · {formatBytes(guide.file_size)} · {guide.downloads} descargas · {formatDate(guide.created_at)}
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
        {guides.length === 0 ? <p className="text-sm text-mute">Todavía no subes ninguna guía.</p> : null}
      </div>
    </div>
  )
}
