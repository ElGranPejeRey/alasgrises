export const DEFAULTS = {
  hero_kicker: 'Gremio de Diablo IV',
  hero_title: 'ALAS GRISES',
  hero_subtitle: 'Ceniza, acero y una hermandad que no suelta la espada.',
  about_title: 'Una comunidad, una historia y un mismo destino.',
  about_text:
    'Bienvenidos, viajeros, guerreros y aventureros.\n\nAlas Grises nace como un espacio para quienes comparten la pasión por los mundos de fantasía, las grandes batallas y las aventuras que hacen de cada partida una experiencia memorable.\n\nSomos una comunidad de jugadores que busca mucho más que conquistar desafíos: queremos compartir experiencias, aprender unos de otros, formar nuevas amistades y construir un lugar donde todos puedan sentirse parte de algo.\n\nCreemos que un buen gremio no se mide únicamente por su poder, nivel o logros, sino también por las personas que lo conforman. Por eso, promovemos el respeto, la colaboración, la buena convivencia y el compañerismo.\n\nAquí cada integrante tiene un lugar, cada aporte cuenta y siempre habrá alguien dispuesto a echar una mano. No importa si eres un veterano de mil batallas o si recién comienzas tu aventura: lo importante es tener ganas de compartir y disfrutar el camino.',
  contact_email: '',
  discord_url: '',
  footer_text: 'La ceniza cubre el filo, no el pacto. Santuario no perdona, y nosotros no nos soltamos.',
  staff_intro: 'Detrás de cada gran comunidad existe un grupo de personas que dedica tiempo, esfuerzo y compromiso para mantenerla viva.\n\nNuestro equipo de liderazgo y Staff tiene la misión de orientar, organizar, apoyar a los integrantes y velar por el buen funcionamiento de Alas Grises.\n\nA continuación, conocerás a las personas que forman parte de nuestro equipo y que trabajan día a día para hacer crecer esta comunidad.',
  staff_members: 'Consejo | Dirección | Cuida el rumbo del gremio y que cada persona tenga un lugar.\nOficiales | Organización | Acompañan las partidas, comparten conocimiento y ayudan a quien empieza.\nModeración | Convivencia | Sostiene el respeto y no deja espacio para la toxicidad.',
}

const NARRATIVE = new Set([
  'hero_kicker',
  'hero_title',
  'hero_subtitle',
  'about_title',
  'about_text',
  'footer_text',
  'staff_intro',
  'staff_members',
])

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
