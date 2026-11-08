import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AuthModal from './components/AuthModal'
import ChatWidget from './components/ChatWidget'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import { ToastProvider } from './context/ToastContext'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'

function useHashScroll() {
  const { hash, pathname } = useLocation()
  useEffect(() => {
    if (pathname !== '/' || !hash) return undefined
    const node = document.getElementById(hash.replace('#', ''))
    if (!node) return undefined
    const timer = window.setTimeout(() => node.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    return () => window.clearTimeout(timer)
  }, [hash, pathname])
}

function SchemaBanner() {
  const { status } = useSettings()
  if (status === 'loading' || status === 'ok') return null
  const message = status === 'missing'
    ? 'Falta crear las tablas en Supabase. El archivo supabase/schema.sql deja listo perfiles, guías, videos, contacto y el chat.'
    : 'No se pudo leer el contenido de Supabase. Revisa la URL del proyecto y la clave pública.'
  return (
    <div className="mt-20 border-b border-[#ff4536]/40 bg-black/92 px-4 py-3 text-center text-sm leading-relaxed text-[#ffd2cb]">
      {message}
    </div>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const dashboard = pathname.startsWith('/dashboard')
  useHashScroll()

  return (
    <>
      {!dashboard ? <Navbar /> : null}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!dashboard ? <Footer /> : null}
      <AuthModal />
      <ChatWidget />
      <SchemaBanner />
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
