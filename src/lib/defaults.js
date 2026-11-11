export const DEFAULTS = {
  hero_kicker: 'Gremio de Diablo IV',
  hero_title: 'ALAS GRISES',
  hero_subtitle: 'Ceniza, acero y una hermandad que no suelta la espada.',
  about_title: 'Una comunidad, una historia y un mismo destino.',
  about_text:
    'Bienvenidos, viajeros, guerreros y aventureros.\n\nAlas Grises nace como un espacio para quienes comparten la pasión por los mundos de fantasía, las grandes batallas y las aventuras que hacen de cada partida una experiencia memorable.\n\nSomos una comunidad de jugadores que busca mucho más que conquistar desafíos: queremos compartir experiencias, aprender unos de otros, formar nuevas amistades y construir un lugar donde todos puedan sentirse parte de algo.\n\nCreemos que un buen gremio no se mide únicamente por su poder, nivel o logros, sino también por las personas que lo conforman. Por eso, promovemos el respeto, la colaboración, la buena convivencia y el compañerismo.\n\nAquí cada integrante tiene un lugar, cada aporte cuenta y siempre habrá alguien dispuesto a echar una mano. No importa si eres un veterano de mil batallas o si recién comienzas tu aventura: lo importante es tener ganas de compartir y disfrutar el camino.',
  contact_email: '',
  discord_url: '',
  paypal_url: '',
  footer_text: 'La ceniza cubre el filo, no el pacto. Santuario no perdona, y nosotros no nos soltamos.',
  about_quote: 'Lo importante es tener ganas de compartir y disfrutar el camino.',
  philosophy_title: '🛡️ Nuestra filosofía',
  philosophy_items: 'Respeto | Tratamos a todos con cordialidad, sin importar su experiencia o nivel.\nCompañerismo | Nos apoyamos, compartimos conocimientos y avanzamos juntos.\nColaboración | Creemos que una comunidad crece cuando todos aportan.\nDiversión | Jugamos para disfrutar, no para competir entre nosotros.\nCero toxicidad | No hay espacio para egos, malos tratos ni dramas innecesarios.',
  about_pillars: 'Comunidad | Compartimos experiencias, aprendemos unos de otros y formamos nuevas amistades.\nRespeto | Promovemos la colaboración, la buena convivencia y el compañerismo.\nCompañerismo | Cada integrante tiene un lugar y siempre habrá alguien dispuesto a echar una mano.',
  staff_title: 'Quienes cuidan el gremio',
  staff_intro: 'Detrás de cada gran comunidad existe un grupo de personas que dedica tiempo, esfuerzo y compromiso para mantenerla viva.\n\nNuestro equipo de liderazgo y Staff tiene la misión de orientar, organizar, apoyar a los integrantes y velar por el buen funcionamiento de Alas Grises.\n\nA continuación, conocerás a las personas que forman parte de nuestro equipo y que trabajan día a día para hacer crecer esta comunidad.',
  staff_cards: 'Eryndor Vahl | Líder | Marca el rumbo del gremio y se asegura de que nadie quede fuera.\nMaera Sol | Oficial | Organiza las partidas y recibe a quien llega por primera vez.\nKael Dravos | Estratega | Comparte rutas, builds y lo que cada temporada enseña.\nLiora Ash | Comunidad | Cuida las amistades y que cada aporte tenga un lugar.\nThorne Vale | Moderación | Sostiene el respeto y no deja espacio para la toxicidad.',
  staff_members: 'Consejo | Dirección | Cuida el rumbo del gremio y que cada persona tenga un lugar.\nOficiales | Organización | Acompañan las partidas, comparten conocimiento y ayudan a quien empieza.\nModeración | Convivencia | Sostiene el respeto y no deja espacio para la toxicidad.',
  videos_title: 'El archivo del clan',
  videos_text: 'Cinemáticas y piezas que el consejo deja en el carrusel. Pasa las alas, no te quedes en una sola llama.',
  guides_title: 'El grimorio abierto',
  guides_text: 'Las guías del gremio están en video. Sin cuenta se ve la ficha; el video completo se abre al registrarse.',
  contact_title: 'Habla con el consejo',
  contact_text: 'Escribe desde aquí si todavía no tienes cuenta. Quienes ya están en el gremio también pueden dejar un mensaje directo en el chat.',
  streaming_title: 'En vivo en Twitch',
  streaming_text: 'Los cazadores que transmiten aparecen aquí. El botón verde abre la transmisión; el rojo indica que están fuera de línea.',
  photos_title: 'El álbum del clan',
  photos_text: 'Las fotos se ven pequeñas. Pulsa una para verla en grande y pasa a la siguiente con las flechas.',
  streamers: '',
}

const NARRATIVE = new Set([
  'hero_kicker',
  'hero_title',
  'hero_subtitle',
  'about_title',
  'about_text',
  'footer_text',
  'about_quote',
  'philosophy_title',
  'philosophy_items',
  'about_pillars',
  'staff_title',
  'staff_intro',
  'staff_cards',
  'staff_members',
  'videos_title',
  'videos_text',
  'guides_title',
  'guides_text',
  'contact_title',
  'contact_text',
  'streaming_title',
  'streaming_text',
  'photos_title',
  'photos_text',
])

export function twitchLogin(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  let candidate = raw
  if (/twitch\.tv/i.test(raw) || /^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
      const host = url.hostname.replace(/^www\./, '').toLowerCase()
      if (host === 'player.twitch.tv') candidate = url.searchParams.get('channel') || ''
      else if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) candidate = url.pathname.split('/').filter(Boolean)[0] || ''
      else return ''
    } catch {
      return ''
    }
  }
  const login = candidate.replace(/^@/, '').toLowerCase()
  return /^[a-z0-9_]{3,25}$/.test(login) ? login : ''
}

export function parseStreamers(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim())
      const source = parts.length > 1 ? parts.slice(1).join('|') : parts[0]
      const login = twitchLogin(source)
      const name = (parts.length > 1 ? parts[0] : login).trim()
      return { name, login }
    })
    .filter((item) => item.name && item.login)
}

export function serializeStreamers(people) {
  return people.map((person) => `${person.name.trim()} | ${person.login}`).join('\n')
}

export function parsePairs(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split('|')
      return { title: (title || '').trim(), text: rest.join('|').trim() }
    })
    .filter((item) => item.title && item.text)
}

export function parseStaff(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, role, detail] = line.split('|').map((part) => part.trim())
      return { name, role: role || 'Staff', detail: detail || '' }
    })
    .filter((member) => member.name)
}

export function text(settings, key) {
  const value = settings?.[key]
  if (typeof value === 'string' && value.trim()) return value
  if (NARRATIVE.has(key)) return DEFAULTS[key]
  return ''
}

const DISCORD_HOSTS = new Set(['discord.gg', 'discord.com', 'discordapp.com'])

export function discordUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let url
  try {
    url = new URL(withProtocol)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const allowed = DISCORD_HOSTS.has(host) || host.endsWith('.discord.com') || host.endsWith('.discord.gg')
  if (!allowed) return null
  return url.toString()
}

const PAYPAL_HOSTS = new Set(['paypal.com', 'paypal.me'])

export function paypalUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let url
  try {
    url = new URL(withProtocol)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const allowed = PAYPAL_HOSTS.has(host) || host.endsWith('.paypal.com') || host.endsWith('.paypal.me')
  if (!allowed) return null
  return url.toString()
}

export const CATEGORIES = [
  'General',
  'Bárbaro',
  'Hechicero',
  'Druida',
  'Nigromante',
  'Pícaro',
  'Espiritualista',
  'Paladín',
  'Temporada',
  'Endgame',
  'Jefes',
]

export const HERO_SLIDES = [
  { src: '/img/hero-santuario.jpg', caption: 'Santuario en ceniza' },
  { src: '/img/hero-alas.jpg', caption: 'El pacto de las alas' },
  { src: '/img/hero-infierno.jpg', caption: 'Bajo el cielo rojo' },
]
