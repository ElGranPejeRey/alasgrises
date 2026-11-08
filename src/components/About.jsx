import { text } from '../lib/defaults'
import { Frame, SectionHeading } from './ui'

const PILLARS = [
  {
    title: 'Hermandad',
    text: 'Nadie se queda solo frente a un jefe. El chat del clan llega directo al consejo.',
  },
  {
    title: 'Guías vivas',
    text: 'Se publican en la web y solo las descarga quien se registra en el gremio.',
  },
  {
    title: 'Oficio',
    text: 'Diablo IV se juega con memoria de clan: builds, rutas y temporada, sin ruido.',
  },
]

export default function About({ settings }) {
  const paragraphs = text(settings, 'about_text').split(/\n\n+/).filter(Boolean)

  return (
    <section id="nosotros" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="relative">
          <div className="absolute -inset-8 bg-[#9d1c2e]/25 blur-3xl" />
          <Frame className="relative bg-black p-3 sm:p-5">
            <img src="/img/alas.jpg" alt="Emblema de Alas Grises: alas negras, espada y halo rojo" className="w-full object-contain" />
          </Frame>
        </div>
        <div>
          <SectionHeading kicker="Sobre nosotros" title={text(settings, 'about_title')} />
          <div className="mt-6 space-y-4 text-base leading-relaxed text-steel sm:text-lg">
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-6 font-display text-lg text-[#f0d2cc] sm:text-xl">
            El filo no pregunta de qué lado vienes. Pregunta si te quedas.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {PILLARS.map((pillar) => (
              <Frame key={pillar.title} className="p-4">
                <p className="font-display text-sm tracking-wide text-silver">{pillar.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-mute">{pillar.text}</p>
              </Frame>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
