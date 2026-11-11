import { twitchLogin } from './defaults.js'

export const STREAM_PLATFORMS = [
  { id: 'twitch', label: 'Twitch' },
  { id: 'kick', label: 'Kick' },
  { id: 'youtube', label: 'YouTube' },
]

export function streamPlatform(value) {
  return STREAM_PLATFORMS.some((item) => item.id === value) ? value : 'twitch'
}

export function parseStreamLink(platform, value) {
  const kind = streamPlatform(platform)
  if (kind === 'twitch') {
    const login = twitchLogin(value)
    return login ? { login, kind: 'channel' } : null
  }
  if (kind === 'kick') {
    const login = kickSlug(value)
    return login ? { login, kind: 'channel' } : null
  }
  return youtubeTarget(value)
}

export function streamUrl(platform, login) {
  const kind = streamPlatform(platform)
  if (kind === 'kick') return `https://kick.com/${login}`
  if (kind === 'youtube') {
    return /^UC[A-Za-z0-9_-]{22}$/.test(login)
      ? `https://www.youtube.com/channel/${login}`
      : `https://www.youtube.com/@${login}`
  }
  return `https://www.twitch.tv/${login}`
}

export function streamLabel(platform, login) {
  const kind = streamPlatform(platform)
  if (kind === 'kick') return `kick.com/${login}`
  if (kind === 'youtube') {
    return /^UC[A-Za-z0-9_-]{22}$/.test(login) ? `youtube.com/channel/${login}` : `youtube.com/@${login}`
  }
  return `twitch.tv/${login}`
}

export async function resolveYoutubeChannel(videoId) {
  const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`)
  if (!response.ok) return null
  const data = await response.json()
  const channel = youtubeTarget(data.author_url || '')
  return channel?.kind === 'channel' ? channel : null
}

export async function streamPresence(person) {
  const platform = streamPlatform(person.platform)
  const offline = { online: false, avatar: '', embed: '', thumbnail: '' }
  try {
    if (platform === 'kick') {
      const response = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(person.login)}`)
      if (!response.ok) return offline
      const data = await response.json()
      const avatar = typeof data.user?.profile_pic === 'string' ? data.user.profile_pic : ''
      return { online: Boolean(data.livestream), avatar, embed: '', thumbnail: '' }
    }
    if (platform === 'youtube') {
      const response = await fetch(`https://theystill.live/yt/${encodeURIComponent(person.login)}`)
      if (!response.ok) return offline
      const data = await response.json()
      const video = String(data.embed || '').match(/embed\/([\w-]{11})/)
      const thumbnail = typeof data.thumbnail === 'string' && data.thumbnail.startsWith('https://') ? data.thumbnail : ''
      return {
        online: Boolean(data.live && data.found && video),
        avatar: '',
        embed: video ? `https://www.youtube-nocookie.com/embed/${video[1]}` : '',
        thumbnail,
      }
    }
    const response = await fetch(`https://decapi.me/twitch/uptime/${encodeURIComponent(person.login)}`)
    const body = (await response.text()).toLowerCase()
    const online = response.ok && body.length > 0 && !body.includes('offline') && !body.includes('not found') && !body.includes('does not exist')
    let avatar = ''
    const portrait = await fetch(`https://decapi.me/twitch/avatar/${encodeURIComponent(person.login)}`)
    const url = (await portrait.text()).trim()
    if (portrait.ok && url.startsWith('https://')) avatar = url
    return { online, avatar, embed: '', thumbnail: '' }
  } catch {
    return offline
  }
}

function kickSlug(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  let candidate = raw
  if (/kick\.com/i.test(raw) || /^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
      const host = url.hostname.replace(/^www\./, '').toLowerCase()
      if (host !== 'kick.com' && host !== 'player.kick.com') return ''
      candidate = url.pathname.split('/').filter(Boolean)[0] || ''
    } catch {
      return ''
    }
  }
  const slug = candidate.replace(/^@/, '').toLowerCase()
  return /^[a-z0-9_]{3,25}$/.test(slug) ? slug : ''
}

function youtubeTarget(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw) && !/youtube\.com|youtu\.be/i.test(raw)) {
    return asChannel(raw.replace(/^@/, ''))
  }
  let url
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (host === 'youtu.be') return asVideo(url.pathname.split('/').filter(Boolean)[0])
  if (host !== 'youtube.com' && !host.endsWith('.youtube.com')) return null
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0]?.startsWith('@')) return asChannel(parts[0].slice(1))
  if (parts[0] === 'channel' && parts[1]) return asChannel(parts[1])
  if ((parts[0] === 'c' || parts[0] === 'user') && parts[1]) return asChannel(parts[1])
  if (parts[0] === 'live' && parts[1]) return asVideo(parts[1])
  if (parts[0] === 'watch') return asVideo(url.searchParams.get('v'))
  if (parts[0] === 'embed' && parts[1] === 'live_stream') return asChannel(url.searchParams.get('channel'))
  if (parts[0] === 'embed' && parts[1]) return asVideo(parts[1])
  return null
}

function asChannel(value) {
  const token = String(value || '').trim()
  if (/^UC[A-Za-z0-9_-]{22}$/.test(token)) return { login: token, kind: 'channel' }
  const handle = token.replace(/^@/, '')
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(handle)) return null
  return { login: handle.toLowerCase(), kind: 'channel' }
}

function asVideo(value) {
  const id = String(value || '').trim()
  if (!/^[\w-]{11}$/.test(id)) return null
  return { login: id, kind: 'video' }
}
