export const D4_CLASSES = ['Bárbaro', 'Hechicero', 'Brujo', 'Druida', 'Nigromante', 'Pícaro', 'Espiritualista', 'Paladín']

export const D4_AVATARS = [
  { slug: 'barbaro', className: 'Bárbaro', title: 'Bárbaro', image: '/img/avatars/barbaro.jpg' },
  { slug: 'hechicero', className: 'Hechicero', title: 'Hechicero', image: '/img/avatars/hechicero.jpg' },
  { slug: 'brujo', className: 'Brujo', title: 'Brujo', image: '/img/avatars/brujo.jpg' },
  { slug: 'druida', className: 'Druida', title: 'Druida', image: '/img/avatars/druida.jpg' },
  { slug: 'nigromante', className: 'Nigromante', title: 'Nigromante', image: '/img/avatars/nigromante.jpg' },
  { slug: 'picaro', className: 'Pícaro', title: 'Pícaro', image: '/img/avatars/picaro.jpg' },
  { slug: 'espiritualista', className: 'Espiritualista', title: 'Espiritualista', image: '/img/avatars/espiritualista.jpg' },
  { slug: 'paladin', className: 'Paladín', title: 'Paladín', image: '/img/avatars/paladin.jpg' },
]

const BATTLETAG = /^[A-Za-zÀ-ÿ0-9]{3,16}#[0-9]{4,8}$/

export function normalizeBattleTag(value) {
  return String(value || '')
    .trim()
    .replace(/[\uFF03\uFE5F♯]/g, '#')
    .replace(/\s+/g, '')
}

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
  const tag = normalizeBattleTag(value)
  return tag === '' || BATTLETAG.test(tag)
}

export function avatarCatalog(rows) {
  const fromDb = (rows || []).map((row) => ({
    slug: row.slug,
    className: row.class_name,
    title: row.title,
    image: row.image_path,
  }))
  const seen = new Set(fromDb.map((item) => item.slug))
  const merged = [...fromDb, ...D4_AVATARS.filter((item) => !seen.has(item.slug))]
  return merged.sort((a, b) => {
    const left = D4_AVATARS.findIndex((item) => item.slug === a.slug)
    const right = D4_AVATARS.findIndex((item) => item.slug === b.slug)
    return (left < 0 ? 99 : left) - (right < 0 ? 99 : right)
  })
}
