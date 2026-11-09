import { useEffect, useState } from 'react'
import { Button, Field, Frame, TextArea } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { compressPhoto, photoUrl } from '../../lib/photos'
import { supabase } from '../../lib/supabase'

const EMPTY = { title: '', caption: '', published: true }

export default function PhotoAdmin() {
  const { user } = useAuth()
  const push = useToast()
  const [photos, setPhotos] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [fileKey, setFileKey] = useState(0)

  async function load() {
    const { data, error } = await supabase.from('photos').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (error) {
      push('No se pudieron cargar las fotos. Revisa que la tabla photos exista en Supabase.', 'err')
      return
    }
    setPhotos(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  function reset() {
    setEditing(null)
    setForm(EMPTY)
    setFile(null)
    setFileKey((current) => current + 1)
  }

  function edit(photo) {
    setEditing(photo.id)
    setForm({ title: photo.title || '', caption: photo.caption || '', published: photo.published })
    setFile(null)
    setPendingDelete(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(event) {
    event.preventDefault()
    const title = form.title.trim()
    const caption = form.caption.trim()
    if (title.length > 80 || caption.length > 240) {
      push('El título o el texto son demasiado largos.', 'err')
      return
    }
    if (!editing && !file) {
      push('Elige una imagen.', 'err')
      return
    }
    if (file && !file.type.startsWith('image/')) {
      push('El archivo tiene que ser una imagen.', 'err')
      return
    }
    if (file && file.size > 12 * 1024 * 1024) {
      push('La imagen supera los 12 MB.', 'err')
      return
    }

    setBusy(true)
    let storagePath = editing ? photos.find((photo) => photo.id === editing)?.storage_path : ''
    let uploaded = ''
    if (file) {
      try {
        const blob = await compressPhoto(file)
        uploaded = `${crypto.randomUUID()}.jpg`
        const upload = await supabase.storage.from('photos').upload(uploaded, blob, { contentType: 'image/jpeg', upsert: false })
        if (upload.error) {
          setBusy(false)
          push('No se pudo subir la imagen.', 'err')
          return
        }
        storagePath = uploaded
      } catch {
        setBusy(false)
        push('No se pudo leer la imagen.', 'err')
        return
      }
    }

    const payload = { title, caption, published: form.published, storage_path: storagePath }
    const result = editing
      ? await supabase.from('photos').update(payload).eq('id', editing)
      : await supabase.from('photos').insert({
        ...payload,
        created_by: user?.id || null,
        sort_order: photos.reduce((max, photo) => Math.max(max, photo.sort_order || 0), 0) + 1,
      })

    if (result.error) {
      if (uploaded) await supabase.storage.from('photos').remove([uploaded])
      setBusy(false)
      push('No se pudo guardar la foto.', 'err')
      return
    }

    if (editing && uploaded) {
      const previous = photos.find((photo) => photo.id === editing)
      if (previous?.storage_path && previous.storage_path !== uploaded) {
        await supabase.storage.from('photos').remove([previous.storage_path])
      }
    }

    setBusy(false)
    push(editing ? 'Foto actualizada.' : 'Foto publicada en la galería.')
    reset()
    load()
  }

  async function remove(photo) {
    setBusy(true)
    const { error } = await supabase.from('photos').delete().eq('id', photo.id)
    if (error) {
      setBusy(false)
      push('No se pudo borrar la foto.', 'err')
      return
    }
    if (photo.storage_path) await supabase.storage.from('photos').remove([photo.storage_path])
    setBusy(false)
    if (editing === photo.id) reset()
    setPendingDelete(null)
    push('Foto eliminada.')
    load()
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Galería de fotos</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        Sube las imágenes del clan. En la web se ven pequeñas y, al pulsarlas, se abren en grande con botones para pasar a la anterior y a la siguiente.
      </p>

      <Frame className="mt-6 p-5">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Field label="Título" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={80} placeholder="Opcional" />
          <TextArea label="Texto" value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} maxLength={240} />
          <label className="block text-left">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-mute">{editing ? 'Cambiar imagen' : 'Imagen'}</span>
            <input
              key={fileKey}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!editing}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block w-full text-sm text-steel file:mr-3 file:border file:border-white/15 file:bg-white/5 file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-[0.14em] file:text-silver"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-steel">
            <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
            Visible en la web
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar foto'}</Button>
            {editing ? <Button variant="ghost" onClick={reset}>Cancelar edición</Button> : null}
          </div>
        </form>
      </Frame>

      <div className="mt-6 grid gap-3">
        {photos.map((photo) => (
          <Frame key={photo.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <img src={photoUrl(photo.storage_path)} alt="" className="h-16 w-16 object-cover" />
                <div>
                  <h3 className="font-display text-2xl text-silver">{photo.title || 'Sin título'}</h3>
                  <p className="mt-1 text-sm text-steel">{photo.caption}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-mute">{photo.published ? 'Visible' : 'Oculta'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => edit(photo)}>Editar</Button>
                {pendingDelete === photo.id ? (
                  <>
                    <Button variant="danger" disabled={busy} onClick={() => remove(photo)}>Confirmar</Button>
                    <Button variant="ghost" onClick={() => setPendingDelete(null)}>No</Button>
                  </>
                ) : (
                  <Button variant="danger" onClick={() => setPendingDelete(photo.id)}>Borrar</Button>
                )}
              </div>
            </div>
          </Frame>
        ))}
        {photos.length === 0 ? <p className="text-sm text-mute">Todavía no hay fotos.</p> : null}
      </div>
    </div>
  )
}
