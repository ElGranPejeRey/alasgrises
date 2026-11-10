import { useEffect } from 'react'
import About from '../components/About'
import Staff from '../components/Staff'
import Hero from '../components/Hero'
import PhotoGallery from '../components/PhotoGallery'
import Streaming from '../components/Streaming'
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
      <Staff settings={settings} />
      <VideoGallery settings={settings} />
      <PhotoGallery settings={settings} />
      <Streaming settings={settings} />
    </main>
  )
}
