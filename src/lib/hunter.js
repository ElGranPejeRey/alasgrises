export const D4_CLASSES = ['Bárbaro', 'Hechicero', 'Druida', 'Nigromante', 'Pícaro', 'Espiritualista', 'Paladín']

const BATTLETAG = /^[A-Za-zÀ-ÿ0-9]{3,16}#[0-9]{4,8}$/

export function hunterFields(profile, user) {
  const meta = user?.user_metadata || {}
  return {
    username: profile?.username || '',
    avatar: profile?.avatar_url || meta.avatar_url || '',
    d4Class: profile?.d4_class || meta.d4_class || '',
    battletag: profile?.battletag || meta.battletag || '',
  }
}

export function validBattleTag(value) {
  const tag = value.trim()
  return tag === '' || BATTLETAG.test(tag)
}

export function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / image.width, size / image.height)
      const width = image.width * scale
      const height = image.height * scale
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('imagen'))
    }
    image.src = url
  })
}
