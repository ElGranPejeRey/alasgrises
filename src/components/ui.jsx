import { cx } from '../lib/format'

export function Frame({ className = '', children }) {
  return (
    <div className={cx('relative border border-white/10 bg-[#12090b]/85', className)}>
      <span className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l border-t border-[#ff4536]" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-[#ff4536]" />
      {children}
    </div>
  )
}

export function Button({ variant = 'fire', className = '', type = 'button', href, children, ...props }) {
  const variants = {
    fire: 'btn-fire text-white',
    ghost: 'border border-white/15 bg-white/5 text-silver hover:border-[#ff5a3c]/70 hover:text-white',
    danger: 'border border-red-400/40 bg-red-950/50 text-red-100 hover:bg-red-900/60',
    steel: 'border border-white/10 bg-[#1a1214] text-silver hover:border-white/30',
  }
  const classes = cx(
    'inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    className,
  )
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    )
  }
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}

export function Field({ label, className = '', ...props }) {
  return (
    <label className={cx('block text-left', className)}>
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-mute">{label}</span>
      <input
        className="w-full border border-white/10 bg-black/45 px-3 py-3 text-sm text-silver outline-none transition placeholder:text-white/25 focus:border-[#ff5a3c]/80"
        {...props}
      />
    </label>
  )
}

export function TextArea({ label, className = '', ...props }) {
  return (
    <label className={cx('block text-left', className)}>
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-mute">{label}</span>
      <textarea
        className="min-h-32 w-full resize-y border border-white/10 bg-black/45 px-3 py-3 text-sm text-silver outline-none transition placeholder:text-white/25 focus:border-[#ff5a3c]/80"
        {...props}
      />
    </label>
  )
}

export function SelectField({ label, children, className = '', ...props }) {
  return (
    <label className={cx('block text-left', className)}>
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-mute">{label}</span>
      <select
        className="w-full border border-white/10 bg-black/45 px-3 py-3 text-sm text-silver outline-none focus:border-[#ff5a3c]/80"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Badge({ children, tone = 'steel' }) {
  const tones = {
    steel: 'border-white/15 text-steel',
    fire: 'border-[#ff5a3c]/50 bg-[#ff5a3c]/10 text-[#ffc3b8]',
    ok: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  }
  return (
    <span className={cx('inline-flex items-center border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]', tones[tone])}>
      {children}
    </span>
  )
}

export function Spinner({ className = '' }) {
  return <span className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white', className)} />
}

export function ScreenLoader({ label = 'Abriendo el nido' }) {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 font-display text-xs tracking-[0.28em] text-steel">{label}</p>
      </div>
    </div>
  )
}

export function SectionHeading({ kicker, title, text }) {
  return (
    <div className="max-w-2xl">
      <p className="font-display text-[11px] uppercase tracking-[0.35em] text-[#ff6a5a]">{kicker}</p>
      <h2 className="mt-3 font-display text-3xl text-silver sm:text-5xl">{title}</h2>
      {text ? <p className="mt-4 text-base leading-relaxed text-steel sm:text-lg">{text}</p> : null}
    </div>
  )
}

export function Empty({ title, text, action }) {
  return (
    <Frame className="px-6 py-14 text-center">
      <p className="font-display text-2xl text-silver">{title}</p>
      {text ? <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mute">{text}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </Frame>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={cx('animate-pulse bg-white/5', className)} />
}

export function IconFlame({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.2 2.2c.4 2.4-.4 4.1-1.5 5.4-.3.4-.7.7-.7 1.2 0 .8.9 1.4 1.6 1 .8-.4 1.8-1.6 2.1-3.1 1.6 1.3 3.8 3.7 3.8 7.1 0 3.9-3.1 7.2-7.3 7.2S2.9 17.7 2.9 13.8c0-2.6 1.3-4.5 2.7-6.1.2 1.6 1.2 2.7 2.2 3.2-.3-1.6-.2-3.4.5-5.1 1-2.1 2.6-3.4 3.9-3.6Z" />
    </svg>
  )
}

export function IconMenu({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconClose({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
