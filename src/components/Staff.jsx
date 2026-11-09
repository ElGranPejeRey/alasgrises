import { text } from '../lib/defaults'
import { cx } from '../lib/format'

const CARDS = [
  {
    name: 'Eryndor Vahl',
    role: 'Líder',
    text: 'Marca el rumbo del gremio y se asegura de que nadie quede fuera.',
    image: '/img/staff-eryndor.jpg',
    featured: true,
  },
  {
    name: 'Maera Sol',
    role: 'Oficial',
    text: 'Organiza las partidas y recibe a quien llega por primera vez.',
    image: '/img/staff-maera.jpg',
  },
  {
    name: 'Kael Dravos',
    role: 'Estratega',
    text: 'Comparte rutas, builds y lo que cada temporada enseña.',
    image: '/img/staff-kael.jpg',
  },
  {
    name: 'Liora Ash',
    role: 'Comunidad',
    text: 'Cuida las amistades y que cada aporte tenga un lugar.',
    image: '/img/staff-liora.jpg',
  },
  {
    name: 'Thorne Vale',
    role: 'Moderación',
    text: 'Sostiene el respeto y no deja espacio para la toxicidad.',
    image: '/img/staff-thorne.jpg',
  },
]

export default function Staff({ settings }) {
  const intro = text(settings, 'staff_intro').split(/\n\n+/).filter(Boolean)

  return (
    <section id="staff" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-[11px] uppercase tracking-[0.35em] text-[#ff6a5a]">Staff</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl leading-tight text-silver sm:text-4xl">Quienes cuidan el gremio</h2>
        <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-steel">
          {intro.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {CARDS.map((card) => (
            <article
              key={card.name}
              className={cx(
                'staff-card group relative min-h-[340px] overflow-hidden border border-white/10 bg-black',
                card.featured ? 'sm:col-span-2 lg:col-span-4 lg:row-span-2 lg:min-h-[560px]' : 'lg:col-span-4 lg:min-h-[272px]',
              )}
            >
              <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
              <span className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l border-t border-[#ff4536]" />
              <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-[#ff4536]" />
              <div className="relative flex h-full flex-col justify-end p-5">
                <p className="font-display text-[11px] uppercase tracking-[0.22em] text-[#ff8d80]">{card.role}</p>
                <h3 className="mt-1 font-display text-2xl text-silver sm:text-3xl">{card.name}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#ddd4d5]">{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
