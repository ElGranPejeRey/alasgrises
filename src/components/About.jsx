import { parsePairs, text } from '../lib/defaults'
import { Frame } from './ui'

export default function About({ settings }) {
  const paragraphs = text(settings, 'about_text').split(/\n\n+/).filter(Boolean)
  const philosophy = parsePairs(text(settings, 'philosophy_items'))
  const pillars = parsePairs(text(settings, 'about_pillars'))

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
            {text(settings, 'about_quote')}
          </p>
        </div>
        <div className="mt-14">
          <h3 className="font-display text-2xl text-silver sm:text-3xl">{text(settings, 'philosophy_title')}</h3>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {philosophy.map((item) => (
              <Frame key={item.title} className="p-4">
                <p className="font-display text-sm tracking-wide text-silver">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-mute">{item.text}</p>
              </Frame>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {pillars.map((pillar) => (
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
