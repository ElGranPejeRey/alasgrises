import { supabase } from './supabase'

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatBytes(bytes) {
  const size = Number(bytes) || 0
  if (size <= 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function timeAgo(value) {
  if (!value) return ''
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  return `hace ${days} d`
}

export function accountEmail(value) {
  const text = value.trim().toLowerCase()
  if (!text || text.includes('@')) return text
  return `${text}@alasgrises.com`
}

export function humanAuthError(message = '') {
  const text = message.toLowerCase()
  if (text.includes('invalid login') || text.includes('invalid credentials')) {
    return 'Usuario o contraseña incorrectos.'
  }
  if (text.includes('already registered') || text.includes('already been registered')) {
    return 'Ese correo ya está en el gremio.'
  }
  if (text.includes('email not confirmed')) {
    return 'Confirma el correo antes de entrar.'
  }
  if (text.includes('password')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return 'Demasiados intentos. Espera un momento.'
  }
  if (text.includes('valid email') || text.includes('unable to validate')) {
    return 'Ese correo no es válido.'
  }
  return 'No se pudo completar. Revisa los datos e inténtalo de nuevo.'
}

export function parseVideoInput(raw) {
  const value = raw.trim()
  if (!value) return null
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/)
  if (match) return { youtube_id: match[1], video_url: null }
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return { youtube_id: value, video_url: null }
  if (/^https?:\/\//i.test(value)) return { youtube_id: null, video_url: value }
  return null
}

export function safeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

export async function downloadGuide(guide) {
  const { data, error } = await supabase.storage.from('guides').createSignedUrl(guide.file_path, 180, {
    download: guide.file_name || true,
  })
  if (error) throw error
  supabase.rpc('increment_downloads', { guide_id: guide.id }).then(() => {}, () => {})
  const link = document.createElement('a')
  link.href = data.signedUrl
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function missingTable(error) {
  if (!error) return false
  return /schema cache|does not exist|relation|PGRST205|42P01|PGRST204/i.test(`${error.code || ''} ${error.message || ''}`)
}
