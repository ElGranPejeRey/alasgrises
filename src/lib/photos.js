import { supabase } from './supabase'

export function photoUrl(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  return data?.publicUrl || ''
}

export function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const max = 1600
      const scale = Math.min(1, max / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('imagen'))
        else resolve(blob)
      }, 'image/jpeg', 0.82)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('imagen'))
    }
    image.src = url
  })
}
