import { useEffect, useState } from 'react'
import { HERO_SLIDES, text } from '../lib/defaults'
import { cx } from '../lib/format'
import { Button } from './ui'

export default function Hero({ settings }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length)
    }, 6800)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section id="inicio" className="relative min-h-[100svh] scroll-mt-24 overflow-hidden">
      {HERO_SLIDES.map((slide, slideIndex) => (
        <img
          key={slide.src}
          src={slide.src}
          alt=""
          className={cx(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-[1700ms] ease-in-out',
            slideIndex === index ? 'ken opacity-100' : 'opacity-0',
          )}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-ash via-black/20 to-black/55" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 16 }, (_, ember) => (
          <span
            key={ember}
            className="ember"
            style={{
              left: `${(ember * 6.4) % 100}%`,
              width: ember % 3 === 0 ? 4 : 2,
              height: ember % 3 === 0 ? 4 : 2,
              animationDelay: `${(ember * 0.42) % 5}s`,
              animationDuration: `${7 + (ember % 6)}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-5 pb-16 pt-28 text-center">
        <p className="font-display text-[11px] uppercase tracking-[0.42em] text-[#ffb0a6] sm:text-xs">
          {text(settings, 'hero_kicker')}
        </p>
        <h1 className="mt-4 max-w-full font-display text-[2.15rem] font-black leading-none tracking-[0.12em] text-metallic sm:text-6xl sm:tracking-[0.16em] md:text-7xl lg:text-8xl">
          {text(settings, 'hero_title')}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-[#f3e8e6] sm:text-lg">
          {text(settings, 'hero_subtitle')}
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button href="#nosotros" className="w-full sm:w-auto">Sobre nosotros</Button>
          <Button href="#guias" variant="ghost" className="w-full sm:w-auto">Ver guías</Button>
        </div>
        <p className="mt-8 text-[11px] uppercase tracking-[0.32em] text-white/70">{HERO_SLIDES[index].caption}</p>
        <div className="mt-4 flex gap-2" role="tablist" aria-label="Imágenes del hero">
          {HERO_SLIDES.map((slide, slideIndex) => (
            <button
              key={slide.src}
              type="button"
              aria-label={slide.caption}
              onClick={() => setIndex(slideIndex)}
              className={cx('h-1.5 transition-all', slideIndex === index ? 'w-10 bg-[#ff4536]' : 'w-4 bg-white/35 hover:bg-white/60')}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
