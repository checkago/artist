export type TextBlock = { title: string; text: string }
export type Picture = { src: string; alt: string }

export type Profile = {
  name: string
  logoMark: string
  pageTitle: string
  badge: string
  titleWhite: string
  titleGradient: string
  lead: string
  heroButton: string
  yandexButton: string
  yandexUrl: string
  zvukButton: string
  zvukUrl: string
  releasesButton: string
  navSound: string
  navReleases: string
  navCovers: string
  navContact: string
  menuVkUrl: string
  menuVkIcon: string
  facts: TextBlock[]
  upcomingBadge: string
  upcomingTitle: string
  upcomingText: string
  upcomingAt: string
  upcomingLabel: string
  upcomingCover: string
  upcomingReleaseId: string
  upcomingTracks?: number
  portrait: string
  portraitAlt: string
  soundKicker: string
  steps: TextBlock[]
  sounds: TextBlock[]
  shots: Picture[]
  coversKicker: string
  covers: Picture[]
  releasesKicker: string
  releasesEmpty: string
  aboutKicker: string
  about: string
  contactKicker: string
  contactVkTitle: string
  contactVkText: string
  contactReleaseTitle: string
  contactReleaseText: string
  contactButton: string
  footer: string
  vkUrl: string
}

export type PlatformId =
  | 'vk'
  | 'vkmusic'
  | 'yandex'
  | 'spotify'
  | 'apple'
  | 'youtube'
  | 'zvuk'
  | 'wink'
  | 'mts'
  | 'bandlink'
  | 'other'

export type ReleaseLink = { platform: PlatformId; url: string }

export type Release = {
  id: string
  title: string
  artist: string
  year: number
  tracks: number
  cover: string
  links: ReleaseLink[]
  sort: number
  draft?: boolean
  visibleWithoutAnnouncement?: boolean
  publicId?: string
  revealed?: boolean
}

export const PLATFORMS: { id: PlatformId; label: string }[] = [
  { id: 'yandex', label: 'Яндекс Музыка' },
  { id: 'vkmusic', label: 'VK Музыка' },
  { id: 'vk', label: 'ВКонтакте' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'apple', label: 'Apple Music' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'zvuk', label: 'Звук' },
  { id: 'wink', label: 'WINK Music' },
  { id: 'mts', label: 'МТС Music' },
  { id: 'bandlink', label: 'BandLink' },
  { id: 'other', label: 'Ссылка' },
]

export function platformLabel(id: string): string {
  return PLATFORMS.find((item) => item.id === id)?.label ?? 'Ссылка'
}

export function releaseKind(tracks: number): string {
  const count = Number(tracks) || 1
  if (count <= 1) return 'Сингл'
  if (count <= 6) return 'Мини-альбом (EP)'
  return 'Альбом'
}

export function safeHref(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return url
  } catch {
    return undefined
  }
  return undefined
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...init })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new Error(data.error || 'Ошибка запроса')
  return data as T
}

export function getSite() {
  return request<{ profile: Profile; releases: Release[] }>('/api/site')
}

export function getAdminSite() {
  return request<{ profile: Profile; releases: Release[] }>('/api/admin/site')
}

export function getSession() {
  return request<{ ok: boolean }>('/api/session')
}

export function login(password: string) {
  return request<{ ok: boolean }>('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
}

export function logout() {
  return request<{ ok: boolean }>('/api/logout', { method: 'POST' })
}

export function uploadMedia(file: File) {
  const body = new FormData()
  body.append('cover', file)
  return request<{ url: string }>('/api/media', { method: 'POST', body })
}

export function saveProfile(profile: Profile) {
  return request<{ profile: Profile }>('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
}

export function saveRelease(
  id: string | null,
  payload: { title: string; artist: string; year: number; tracks: number; links: ReleaseLink[]; draft: boolean; visibleWithoutAnnouncement: boolean },
  file: File | null,
) {
  const body = new FormData()
  body.append('payload', JSON.stringify(payload))
  if (file) body.append('cover', file)
  return request<{ release: Release }>(id ? `/api/releases/${id}` : '/api/releases', {
    method: id ? 'PUT' : 'POST',
    body,
  })
}

export function deleteRelease(id: string) {
  return request<{ ok: boolean }>(`/api/releases/${id}`, { method: 'DELETE' })
}

export function moveRelease(id: string, direction: 'up' | 'down') {
  return request<{ releases: Release[] }>(`/api/releases/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction }),
  })
}
