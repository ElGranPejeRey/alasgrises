import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULTS } from '../lib/defaults'
import { missingTable } from '../lib/format'
import { supabase } from '../lib/supabase'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [status, setStatus] = useState('loading')

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('site_settings').select('key,value')
    if (error) {
      setStatus(missingTable(error) ? 'missing' : 'error')
      return
    }
    const next = { ...DEFAULTS }
    for (const row of data || []) next[row.key] = row.value ?? ''
    setSettings(next)
    setStatus('ok')
  }, [])

  useEffect(() => {
    reload()
    const channel = supabase
      .channel('site-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        reload()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [reload])

  return (
    <SettingsContext.Provider value={{ settings, status, reload }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings debe usarse dentro de SettingsProvider')
  return context
}
