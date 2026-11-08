import { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { parseVideoInput } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { Badge, Button, Field, Frame, TextArea } from '../../components/ui'

const EMPTY = { title: '', description: '', url: '', published: true }

export default function VideoAdmin() {
  const push = useToast()
  const [videos, setVideos] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('videos').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (error) {
      push('No se pudieron cargar los videos.', 'err')
      return
    }
    setVideos(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  function reset() {
    setEditing(null)
    setForm(EMPTY)
  }

  async function onSubmit(event) {
    event.preventDefault()
    const parsed = parseVideoInput(form.url)
    if (!form.title.trim() || !parsed) {
      push('Necesitas un título y un enlace válido de YouTube o de un video.', 'err')
      return
    }
    setBusy(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      youtube_id: parsed.youtube_id,
      video_url: parsed.video_url,
      published: form.published,
    }
    const result = editing
      ? await supabase.from('videos').update(payload).eq('id', editing)
      : await supabase.from('videos').insert({
        ...payload,
        sort_order: videos.reduce((max, video) => Math.max(max, video.sort_order || 0), 0) + 1,
      })
    setBusy(false)
    if (result.error) {
      push('No se pudo guardar el video.', 'err')
      return
    }
    push(editing ? 'Video actualizado.' : 'Video agregado al carrusel.')
    reset()
    load()
  }

  async function move(video, direction) {
    const index = videos.findIndex((item) => item.id === video.id)
    const swap = videos[index + direction]
    if (!swap) return
    await supabase.from('videos').update({ sort_order: swap.sort_order }).eq('id', video.id)
    await supabase.from('videos').update({ sort_order: video.sort_order }).eq('id', swap.id)
    load()
  }

  async function remove(video) {
    const { error } = await supabase.from('videos').delete().eq('id', video.id)
    if (error) {
      push('No se pudo borrar el video.', 'err')
      return
    }
    if (editing === video.id) reset()
    push('Video eliminado.')
    load()
  }

  function startEdit(video) {
    setEditing(video.id)
    setForm({
      title: video.title,
      description: video.description || '',
      url: video.youtube_id ? `https://youtu.be/${video.youtube_id}` : video.video_url || '',
      published: video.published,
    })
  }

  return (
    <div>
      <h2 className="font-display text-3xl text-silver">Galería de videos</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
        Pega un enlace de YouTube o la URL pública de un mp4. El orden de esta lista es el orden del carrusel.
      </p>
      <Frame className="mt-6 p-5">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Título" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={120} />
            <Field label="Enlace" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://www.youtube.com/watch?v=..." required />
          </div>
          <TextArea label="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} />
          <label className="flex items-center gap-2 text-sm text-steel">
            <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
            Visible en el carrusel
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar video' : 'Agregar video'}</Button>
            {editing ? <Button variant="ghost" onClick={reset}>Cancelar</Button> : null}
          </div>
        </form>
      </Frame>
      <div className="mt-6 grid gap-3">
        {videos.map((video, index) => (
          <Frame key={video.id} className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="h-24 w-full overflow-hidden border border-white/10 sm:w-40">
              {video.youtube_id ? (
                <img src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[10px] uppercase tracking-[0.16em] text-mute">MP4</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <Badge tone={video.published ? 'ok' : 'steel'}>{video.published ? 'Visible' : 'Oculto'}</Badge>
              </div>
              <h3 className="mt-2 font-display text-xl text-silver">{video.title}</h3>
              <p className="mt-1 text-sm text-steel">{video.description}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col">
              <Button variant="ghost" onClick={() => move(video, -1)} disabled={index === 0}>Subir</Button>
              <Button variant="ghost" onClick={() => move(video, 1)} disabled={index === videos.length - 1}>Bajar</Button>
              <Button variant="steel" onClick={() => startEdit(video)}>Editar</Button>
              <Button variant="danger" onClick={() => remove(video)}>Borrar</Button>
            </div>
          </Frame>
        ))}
      </div>
    </div>
  )
}
