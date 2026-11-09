import { text } from '../lib/defaults'
import { Frame } from './ui'

const PHILOSOPHY = [
  {
    title: 'Respeto',
    text: 'Tratamos a todos con cordialidad, sin importar su experiencia o nivel.',
  },
  {
    title: 'Compañerismo',
    text: 'Nos apoyamos, compartimos conocimientos y avanzamos juntos.',
  },
  {
    title: 'Colaboración',
    text: 'Creemos que una comunidad crece cuando todos aportan.',
  },
  {
    title: 'Diversión',
    text: 'Jugamos para disfrutar, no para competir entre nosotros.',
  },
  {
    title: 'Cero toxicidad',
    text: 'No hay espacio para egos, malos tratos ni dramas innecesarios.',
  },
]

const PILLARS = [
  {
    title: 'Comunidad',
    text: 'Compartimos experiencias, aprendemos unos de otros y formamos nuevas amistades.',
  },
  {
    title: 'Respeto',
    text: 'Promovemos la colaboración, la buena convivencia y el compañerismo.',
  },
  {
    title: 'Compañerismo',
    text: 'Cada integrante tiene un lugar y siempre habrá alguien dispuesto a echar una mano.',
  },
]

export default function About({ settings }) {
  const paragraphs = text(settings, 'about_text').split(/\n\n+/).filter(Boolean)

  return (
    <section id="nosotros" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="font-display text-[11px] uppercase tracking-[0.35em] text-[#ff6a5a]">Sobre nosotros</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-silver sm:text-4xl">
            {text(settings, 'about_title')}
          </h2>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-steel">
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-6 font-display text-lg leading-snug text-[#f0d2cc] sm:text-xl">
            Lo importante es tener ganas de compartir y disfrutar el camino.
          </p>
        </div>
        <div className="mt-14">
          <h3 className="font-display text-2xl text-silver sm:text-3xl">🛡️ Nuestra filosofía</h3>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PHILOSOPHY.map((item) => (
              <Frame key={item.title} className="p-4">
                <p className="font-display text-sm tracking-wide text-silver">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-mute">{item.text}</p>
              </Frame>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Frame key={pillar.title} className="p-4">
              <p className="font-display text-sm tracking-wide text-silver">{pillar.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-mute">{pillar.text}</p>
            </Frame>
          ))}
        </div>
      </div>
    </section>
  )
}
