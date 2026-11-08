import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileReady, setProfileReady] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [recovery, setRecovery] = useState(false)

  const loadProfile = useCallback(async (userId) => {
    setProfileReady(false)
    const first = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (first.data) {
      setProfile(first.data)
      setProfileReady(true)
      return
    }
    await new Promise((resolve) => window.setTimeout(resolve, 700))
    const second = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(second.data || null)
    setProfileReady(true)
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) loadProfile(data.session.user.id)
      else setProfileReady(true)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (next?.user) window.setTimeout(() => loadProfile(next.user.id), 0)
      else {
        setProfile(null)
        setProfileReady(true)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileReady,
    isAdmin: profile?.role === 'admin',
    authOpen,
    authMode,
    recovery,
    setRecovery,
    openAuth(mode = 'login') {
      setAuthMode(mode)
      setAuthOpen(true)
    },
    closeAuth() {
      setAuthOpen(false)
    },
    setAuthMode,
    refreshProfile() {
      if (session?.user) return loadProfile(session.user.id)
      return Promise.resolve()
    },
    async signOut() {
      await supabase.auth.signOut()
      setProfile(null)
    },
  }), [session, profile, loading, profileReady, authOpen, authMode, recovery, loadProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
