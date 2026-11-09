import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { text } from '../lib/defaults'
import { supabase } from '../lib/supabase'
import { Button, Field, Frame, SectionHeading, TextArea } from './ui'

export default function Contact({ settings }) {
  const { user, profile, openAuth } = useAuth()
  const push = useToast()
  const [form, setForm] = useState({
    name: profile?.username || '',
    email: user?.email || '',
    message: '',
    company: '',
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: current.name || profile?.username || '',
      email: current.email || user?.email || '',
    }))
  }, [profile, user])
  const email = text(settings, 'contact_email')
  const discord = text(settings, 'discord_url')

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (form.company) {
      push('Mensaje enviado. El consejo lo va a leer.')
      setForm((current) => ({ ...current, message: '', company: '' }))
      return
    }
    if (form.name.trim().length < 2 || !form.email.includes('@') || form.message.trim().length < 10) {
      push('Revisa el nombre, el correo y escribe al menos unas líneas.', 'err')
      return
    }
    setSending(true)
    const { error } = await supabase.from('contact_messages').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    })
    setSending(false)
    if (error) {
      push('No se pudo enviar el mensaje.', 'err')
      return
    }
    push('Mensaje enviado. El consejo lo va a leer.')
    setForm((current) => ({ ...current, message: '' }))
  }

  return (
    <section id="contacto" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <SectionHeading
            kicker="Contacto"
            title={text(settings, 'contact_title')}
            text={text(settings, 'contact_text')}
          />
          <Frame className="mt-8 space-y-4 p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-mute">Correo</p>
              {email ? (
                <a className="mt-1 block text-silver hover:text-white" href={`mailto:${email}`}>{email}</a>
              ) : (
                <p className="mt-1 text-steel">El consejo aún no publica un correo. Usa el formulario.</p>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-mute">Discord</p>
              {discord.startsWith('http') ? (
                <a className="mt-1 block text-[#ffb0a6] hover:text-white" href={discord} target="_blank" rel="noreferrer">
                  Entrar al canal
                </a>
              ) : (
                <p className="mt-1 text-steel">Aún no hay un enlace público.</p>
              )}
            </div>
            {!user ? (
              <Button variant="ghost" onClick={() => openAuth('register')}>Crear cuenta</Button>
            ) : null}
          </Frame>
        </div>

        <Frame className="p-5 sm:p-7">
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" name="name" value={form.name} onChange={update} required maxLength={80} />
              <Field label="Correo" name="email" type="email" value={form.email} onChange={update} required maxLength={160} />
            </div>
            <TextArea label="Mensaje" name="message" value={form.message} onChange={update} required maxLength={2000} placeholder="Cuéntale al consejo qué necesitas." />
            <input className="hidden" tabIndex={-1} autoComplete="off" name="company" value={form.company} onChange={update} />
            <Button type="submit" disabled={sending} className="w-full sm:w-auto">
              {sending ? 'Enviando…' : 'Enviar mensaje'}
            </Button>
          </form>
        </Frame>
      </div>
    </section>
  )
}
