import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/format'
import { Button, IconClose, IconMenu } from './ui'

const LINKS = [
  { href: '#inicio', id: 'inicio', label: 'Inicio' },
  { href: '#nosotros', id: 'nosotros', label: 'Sobre nosotros' },
  { href: '#staff', id: 'staff', label: 'Staff' },
  { href: '#videos', id: 'videos', label: 'Galería de videos' },
  { href: '#fotos', id: 'fotos', label: 'Fotos' },
  { href: '#streaming', id: 'streaming', label: 'Streaming' },
  { href: '#guias', id: 'guias', label: 'Guías' },
]

function sectionInView() {
  const marker = 128
  const nearBottom = window.scrollY > 40 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8
  if (nearBottom) {
    const last = [...LINKS].reverse().find((link) => document.getElementById(link.id))
    if (last) return last.id
  }
  let current = LINKS[0].id
  for (const link of LINKS) {
    const node = document.getElementById(link.id)
    if (node && node.getBoundingClientRect().top <= marker) current = link.id
  }
  return current
}

export default function Navbar() {
  const { user, profile, openAuth, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('inicio')
  const holdSpy = useRef(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (location.pathname !== '/') return undefined
    let frame = 0
    function sync() {
      if (performance.now() < holdSpy.current) return
      setActive(sectionInView())
    }
    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(sync)
    }
    sync()
    const later = window.setTimeout(sync, 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('hashchange', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(later)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('hashchange', onScroll)
    }
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function Item({ link, className = '' }) {
    const props = {
      className: cx('fire-link', className),
      'data-active': location.pathname === '/' && active === link.id ? 'true' : 'false',
      onClick: () => {
        setOpen(false)
        setActive(link.id)
        holdSpy.current = performance.now() + 700
        window.setTimeout(() => {
          holdSpy.current = 0
          if (window.location.pathname === '/') setActive(sectionInView())
        }, 760)
      },
    }
    if (location.pathname !== '/') {
      return (
        <Link to={`/${link.href}`} {...props}>
          {link.label}
        </Link>
      )
    }
    return (
      <a href={link.href} {...props}>
        {link.label}
      </a>
    )
  }

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-40 transition',
        scrolled || open ? 'border-b border-white/10 bg-black/80 backdrop-blur-md' : 'bg-gradient-to-b from-black/80 to-transparent',
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/#inicio" className="shrink-0" onClick={() => setOpen(false)}>
          <img src="/img/alas.jpg" alt="Alas Grises" className="h-12 w-auto max-w-[180px] object-contain sm:h-14 sm:max-w-[220px]" />
        </Link>

        <nav className="hidden items-center gap-4 xl:gap-6 lg:flex" aria-label="Principal">
          {LINKS.map((link) => (
            <Item key={link.id} link={link} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <button type="button" className="hidden text-sm text-steel xl:inline" onClick={() => navigate('/dashboard')}>
                {profile?.username || 'Cazador'}
              </button>
              <Button onClick={() => navigate('/dashboard')}>Panel</Button>
              <Button variant="ghost" onClick={signOut}>
                Salir
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => openAuth('login')}>
                Login
              </Button>
              <Button onClick={() => openAuth('register')}>Registro</Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center border border-white/15 text-silver lg:hidden"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {open ? (
        <div className="flex min-h-[calc(100svh-5rem)] flex-col border-t border-white/10 bg-black px-5 py-6 lg:hidden">
          <nav className="flex flex-col gap-2" aria-label="Móvil">
            {LINKS.map((link) => (
              <Item key={link.id} link={link} className="text-base tracking-[0.18em]" />
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {user ? (
              <>
                <Button className="w-full sm:flex-1" onClick={() => { setOpen(false); navigate('/dashboard') }}>
                  Panel
                </Button>
                <Button variant="ghost" className="sm:flex-1" onClick={() => { setOpen(false); signOut() }}>
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="sm:flex-1" onClick={() => { setOpen(false); openAuth('login') }}>
                  Login
                </Button>
                <Button className="sm:flex-1" onClick={() => { setOpen(false); openAuth('register') }}>
                  Registro
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}
