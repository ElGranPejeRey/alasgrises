import { useEffect } from 'react'
import About from '../components/About'
import Contact from '../components/Contact'
import Guides from '../components/Guides'
import Hero from '../components/Hero'
import VideoGallery from '../components/VideoGallery'
import { useSettings } from '../context/SettingsContext'

export default function Home() {
  const { settings } = useSettings()

  useEffect(() => {
    document.title = 'Alas Grises · Gremio de Diablo IV'
  }, [])

  return (
    <main>
      <Hero settings={settings} />
      <About settings={settings} />
      <VideoGallery />
      <Guides />
      <Contact settings={settings} />
    </main>
  )
}
