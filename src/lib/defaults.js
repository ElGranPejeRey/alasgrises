export const DEFAULTS = {
  hero_kicker: 'Gremio de Diablo IV',
  hero_title: 'ALAS GRISES',
  hero_subtitle: 'Ceniza, acero y una hermandad que no suelta la espada.',
  about_title: 'Forjados entre el filo y la ceniza',
  about_text:
    'Alas Grises es un gremio de Diablo IV forjado entre la ceniza y el acero. No buscamos una turba de paso: buscamos cazadores que se queden cuando el mapa se pone rojo.\n\nCompartimos builds, rutas de temporada y la espalda en cada jefe. El emblema es el pacto: dos alas grises, un filo al centro y un halo que no se apaga. Aquí las guías se leen con claridad y solo las descargan quienes forman parte del clan.\n\nSi quieres oficio en vez de ruido, ya estás delante de la puerta.',
  contact_email: '',
  discord_url: '',
  footer_text: 'La ceniza cubre el filo, no el pacto. Santuario no perdona, y nosotros no nos soltamos.',
}

const NARRATIVE = new Set([
  'hero_kicker',
  'hero_title',
  'hero_subtitle',
  'about_title',
  'about_text',
  'footer_text',
])

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
