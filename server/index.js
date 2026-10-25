import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import multer from 'multer'
import { openDatabase } from './db.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, 'data')
const dataFile = path.join(dataDir, 'site.json')
const uploadsDir = path.join(root, 'uploads')
const distDir = path.join(root, 'dist')

function loadEnvFile() {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index <= 0) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvFile()

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '127.0.0.1'
const password = process.env.ADMIN_PASSWORD || 'checkago'
const secret = process.env.ADMIN_SECRET || 'checkago-cookie-secret'
const cookieName = 'cg_admin'
const platforms = ['vk', 'vkmusic', 'yandex', 'spotify', 'apple', 'youtube', 'zvuk', 'wink', 'mts', 'bandlink', 'other']

fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(uploadsDir, { recursive: true })

function seed() {
  return {
    profile: {
      name: 'CHECKago',
      badge: 'Рутс-регги · инди · симфония',
      titleWhite: 'CHECKago —',
      titleGradient: 'корни и неон',
      lead: 'Рутс-регги и инди с симфонией внутри грува. Свой голос — без чужой частоты и без чужих правил.',
      about:
        'CHECKago пишет рутс-регги и инди с симфонией внутри ритма. Корень слышен с первого такта: one drop, тёплый бас, offbeat. Струнные и духовые не накрывают песню сверху — они входят в грув как ещё один инструмент и держат свою партию без пафоса.\n\nВ текстах — свой путь. Не плыть по чужим правилам, не мерить жизнь чужим аршином, не набивать котомку чужим. Голос близко: строка важнее жанрового декора.\n\nЗвук тёплый и земной. Неон в картинке — оболочка мира, а не замена корню: хром и город за стеклом обрамляют регги, но не подменяют его.',
      vkUrl: 'https://vk.ru/artist/2853842974054444473',
      sounds: [],
      logoMark: 'CK',
      pageTitle: 'CHECKago — рутс-регги',
      heroButton: 'Слушать во ВКонтакте',
      yandexButton: 'Слушать в Яндекс.Музыке',
      yandexUrl: 'https://music.yandex.ru/artist/26809206',
      zvukButton: 'Слушать в Звуке',
      zvukUrl: 'https://zvuk.com/artist/214839684',
      winkButton: 'WINK Music',
      winkUrl: 'https://music.wink.ru/release/53489018',
      mtsButton: 'МТС Music',
      mtsUrl: 'https://music.mts.ru/album/44514912',
      releasesButton: 'Все релизы',
      navSound: 'Музыка',
      navReleases: 'Релизы',
      navCovers: 'Обложки',
      navContact: 'Контакт',
      navListen: 'Слушать',
      menuVkUrl: 'https://vk.ru/club241116184',
      menuVkIcon: 'fa-brands fa-vk',
      facts: [],
      upcomingBadge: 'Новый релиз',
      upcomingTitle: '',
      upcomingText: '',
      upcomingAt: '',
      upcomingLabel: 'До релиза',
      upcomingCover: '',
      upcomingReleaseId: '',
      featuredListenLabel: 'Слушать сейчас',
      portrait: '/media/chimp.jpg',
      portraitAlt: 'CHECKago: шимпанзе у микрофона, наушники и неон',
      soundKicker: 'О звуке',
      steps: [
        { title: 'Корень', text: 'One drop, тёплый бас и offbeat. Регги слышно с первого такта.' },
        { title: 'Песня', text: 'Голос близко. Строка важнее жанрового декора.' },
        { title: 'Оркестр', text: 'Струнные и духовые — часть грува, не заставка сверху.' },
      ],
      shots: [],
      coversKicker: 'Обложки',
      coversLead: 'Визуальный мир треков: корень, город и свой путь.',
      covers: [
        { src: '/media/vk-studio.jpg', alt: 'Обложка VK: акустика, неон и металлическая рука' },
      ],
      releasesKicker: 'Релизы',
      releasesEmpty: 'Пока пусто. Новый релиз добавляется в админке.',
      aboutKicker: 'Артист',
      listenKicker: 'Слушать',
      followKicker: 'Следить',
      contactKicker: 'Контакт',
      contactEmail: '',
      contactVkTitle: 'ВКонтакте',
      contactVkText: 'Сообщество CHECKago',
      contactReleaseTitle: '',
      contactReleaseText: 'По сотрудничеству, прессе и площадкам.',
      contactButton: 'Написать',
      contactMaxUrl: '',
      contactMaxText: 'чат-бот',
      contactTelegramUrl: '',
      contactTelegramText: 'чат-бот',
      footer: 'рутс-регги · инди · симфония внутри трека',
    },
    releases: [
      {
        id: crypto.randomUUID(),
        title: 'Чужая частота',
        artist: 'CHECKago',
        year: 2026,
        cover: '/media/cover-chastota.jpg',
        links: [{ platform: 'vk', url: 'https://vk.ru/club241116184' }],
        sort: 0,
      },
    ],
  }
}

const store = openDatabase({ dataDir, dataFile, seed })

function readDb() {
  return store.readSite()
}

let writeQueue = Promise.resolve()

function updateDb(mutator) {
  const run = writeQueue.then(() => {
    const data = readDb()
    const next = mutator(data) || data
    store.writeSite(next)
    return next
  })
  writeQueue = run.catch(() => {})
  return run
}

function sortReleases(list) {
  return [...list].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title, 'ru'))
}

function withDefaults(profile = {}) {
  const base = seed().profile
  const next = { ...base }
  for (const key of Object.keys(base)) {
    if (profile[key] !== undefined) next[key] = profile[key]
  }
  return next
}

function revealDue(data) {
  const now = Date.now()
  let releases = data.releases || []
  let releaseChanged = false
  const announcements = (data.announcements || []).map((item) => {
    const time = new Date(item.at).getTime()
    if (!item.at || !Number.isFinite(time) || time > now) return item
    const next = item.archived ? item : { ...item, archived: true }
    const index = releases.findIndex((release) => release.id === item.releaseId && !release.draft && !release.revealed)
    if (index >= 0) {
      if (!releaseChanged) releases = releases.slice()
      releases[index] = { ...releases[index], revealed: true }
      releaseChanged = true
    }
    return next
  })
  const archivedIds = announcements.filter((item, index) => item.archived && !data.announcements[index]?.archived).map((item) => item.id)
  if (!releaseChanged && archivedIds.length === 0) return { ...data, announcements }
  if (releaseChanged) store.writeSite({ ...data, releases })
  if (archivedIds.length > 0) store.archiveAnnouncements(archivedIds)
  return { ...data, releases, announcements }
}

function sortAnnouncements(list) {
  const active = list.filter((item) => !item.archived).sort((a, b) => String(a.at).localeCompare(String(b.at)))
  const archived = list.filter((item) => item.archived).sort((a, b) => String(b.at).localeCompare(String(a.at)))
  return [...active, ...archived]
}

function publicAnnouncement(item, releases) {
  const release = (releases || []).find((entry) => (
    entry.id === item.releaseId || (item.publicId && entry.publicId === item.publicId)
  ))
  const allowed = new Set(['yandex', 'vkmusic', 'zvuk'])
  const links = (release?.links || []).filter((link) => allowed.has(link.platform))
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    cover: item.cover,
    tracks: item.tracks || 1,
    at: item.at,
    text: item.text,
    demo: item.demo || '',
    releaseId: item.publicId,
    links,
    archived: Boolean(item.archived),
  }
}

function publicRelease(release) {
  return {
    id: release.publicId || release.id,
    title: release.title,
    artist: release.artist,
    year: release.year,
    tracks: release.tracks,
    releasedAt: release.releasedAt || '',
    cover: release.cover,
    blurb: release.blurb || '',
    links: release.links || [],
    sort: release.sort,
    draft: Boolean(release.draft),
  }
}

function publicDb(data) {
  const now = Date.now()
  const allReleases = data.releases || []
  const visible = allReleases.filter((release) => (
    !release.draft && release.publicId && (release.visibleWithoutAnnouncement || release.revealed)
  ))
  const upcoming = allReleases.filter((release) => {
    if (!release.releasedAt) return false
    const time = new Date(release.releasedAt).getTime()
    if (!Number.isFinite(time)) return false
    if (release.draft) return true
    return time > now
  })
  const profile = withDefaults(data.profile)
  const linked = allReleases.find((release) => (
    release.publicId && release.publicId === profile.upcomingReleaseId && !release.draft
  ))
  if (linked) profile.upcomingTracks = linked.tracks || 1
  const announcements = sortAnnouncements(data.announcements || [])
    .filter((item) => item.at)
    .map((item) => publicAnnouncement(item, allReleases))
  return {
    profile,
    releases: sortReleases(visible).map(publicRelease),
    upcomingReleases: sortReleases(upcoming).map(publicRelease),
    announcements,
  }
}

function releaseFlags(input, existing) {
  let draft = Boolean(input?.draft)
  let visibleWithoutAnnouncement = Boolean(input?.visibleWithoutAnnouncement)
  if (visibleWithoutAnnouncement) draft = false
  if (draft) visibleWithoutAnnouncement = false
  let publicId = existing?.publicId || ''
  if (!draft && !publicId) publicId = crypto.randomUUID()
  return { draft, visibleWithoutAnnouncement, publicId, revealed: Boolean(existing?.revealed) }
}

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function normalizeUrl(value) {
  const raw = text(value, 500)
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function cleanPairs(list, limit) {
  if (!Array.isArray(list)) return []
  return list.slice(0, limit).map((item) => ({
    title: text(item?.title, 80),
    text: text(item?.text, 500),
  })).filter((item) => item.title || item.text)
}

function cleanSrc(value) {
  const src = text(value, 500)
  if (!src) return ''
  if (src.startsWith('/media/') || src.startsWith('/uploads/')) {
    if (src.includes('..')) return null
    return src
  }
  return normalizeUrl(src)
}

function cleanPictures(list) {
  if (!Array.isArray(list)) return { pictures: [] }
  const pictures = []
  for (const item of list.slice(0, 12)) {
    const src = cleanSrc(item?.src)
    if (text(item?.src, 500) && src === null) return { error: 'Проверьте адрес изображения' }
    if (!src) continue
    pictures.push({ src, alt: text(item?.alt, 200) })
  }
  return { pictures }
}

function cleanIcon(value) {
  const raw = text(value, 80)
  if (!raw) return ''
  return raw.split(/\s+/).filter((token) => /^fa[a-z0-9-]*$/i.test(token)).join(' ')
}

function cleanProfile(input) {
  const vkUrl = normalizeUrl(input?.vkUrl)
  if (text(input?.vkUrl, 500) && !vkUrl) return { error: 'Проверьте ссылку ВКонтакте' }
  const menuVkUrl = normalizeUrl(input?.menuVkUrl)
  if (text(input?.menuVkUrl, 500) && !menuVkUrl) return { error: 'Проверьте ссылку VK в меню' }
  const yandexUrl = normalizeUrl(input?.yandexUrl)
  if (text(input?.yandexUrl, 500) && !yandexUrl) return { error: 'Проверьте ссылку Яндекс.Музыки' }
  const zvukUrl = normalizeUrl(input?.zvukUrl)
  if (text(input?.zvukUrl, 500) && !zvukUrl) return { error: 'Проверьте ссылку Звука' }
  const winkUrl = normalizeUrl(input?.winkUrl)
  if (text(input?.winkUrl, 500) && !winkUrl) return { error: 'Проверьте ссылку WINK Music' }
  const mtsUrl = normalizeUrl(input?.mtsUrl)
  if (text(input?.mtsUrl, 500) && !mtsUrl) return { error: 'Проверьте ссылку МТС Music' }
  const contactEmail = text(input?.contactEmail, 120)
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { error: 'Проверьте email' }
  const contactMaxUrl = normalizeUrl(input?.contactMaxUrl)
  if (text(input?.contactMaxUrl, 500) && !contactMaxUrl) return { error: 'Проверьте ссылку MAX' }
  const contactTelegramUrl = normalizeUrl(input?.contactTelegramUrl)
  if (text(input?.contactTelegramUrl, 500) && !contactTelegramUrl) return { error: 'Проверьте ссылку Telegram' }
  const portrait = cleanSrc(input?.portrait)
  if (text(input?.portrait, 500) && portrait === null) return { error: 'Проверьте портрет' }
  const shots = cleanPictures(input?.shots)
  if (shots.error) return shots
  const covers = cleanPictures(input?.covers)
  if (covers.error) return covers
  const name = text(input?.name, 80)
  if (!name) return { error: 'Нужно имя артиста' }
  const upcomingAt = text(input?.upcomingAt, 40)
  if (upcomingAt && Number.isNaN(new Date(upcomingAt).getTime())) return { error: 'Проверьте дату выхода релиза' }
  const upcomingCover = cleanSrc(input?.upcomingCover)
  if (text(input?.upcomingCover, 500) && upcomingCover === null) return { error: 'Проверьте обложку релиза' }
  const upcomingReleaseId = text(input?.upcomingReleaseId, 80)
  if (upcomingReleaseId && !/^[0-9a-f-]{36}$/i.test(upcomingReleaseId)) return { error: 'Проверьте релиз анонса' }
  return {
    profile: {
      name,
      logoMark: text(input?.logoMark, 4) || 'CK',
      pageTitle: text(input?.pageTitle, 120) || name,
      badge: text(input?.badge, 120),
      titleWhite: text(input?.titleWhite, 80),
      titleGradient: text(input?.titleGradient, 80),
      lead: text(input?.lead, 500),
      heroButton: text(input?.heroButton, 80),
      yandexButton: text(input?.yandexButton, 80),
      yandexUrl: yandexUrl || '',
      zvukButton: text(input?.zvukButton, 80),
      zvukUrl: zvukUrl || '',
      winkButton: text(input?.winkButton, 80),
      winkUrl: winkUrl || '',
      mtsButton: text(input?.mtsButton, 80),
      mtsUrl: mtsUrl || '',
      releasesButton: text(input?.releasesButton, 80),
      navSound: text(input?.navSound, 40) || 'Музыка',
      navReleases: text(input?.navReleases, 40) || 'Релизы',
      navCovers: text(input?.navCovers, 40) || 'Обложки',
      navContact: text(input?.navContact, 40) || 'Контакт',
      navListen: text(input?.navListen, 40) || 'Слушать',
      menuVkUrl: menuVkUrl || '',
      menuVkIcon: cleanIcon(input?.menuVkIcon),
      facts: cleanPairs(input?.facts, 6),
      upcomingBadge: text(input?.upcomingBadge, 60),
      upcomingTitle: text(input?.upcomingTitle, 120),
      upcomingText: text(input?.upcomingText, 300),
      upcomingAt,
      upcomingLabel: text(input?.upcomingLabel, 40) || 'До релиза',
      upcomingCover: upcomingCover || '',
      upcomingReleaseId,
      featuredListenLabel: text(input?.featuredListenLabel, 80) || 'Слушать сейчас',
      portrait: portrait || '',
      portraitAlt: text(input?.portraitAlt, 200),
      soundKicker: text(input?.soundKicker, 80),
      steps: cleanPairs(input?.steps, 8),
      sounds: cleanPairs(input?.sounds, 8),
      shots: shots.pictures,
      coversKicker: text(input?.coversKicker, 80),
      coversLead: text(input?.coversLead, 200),
      covers: covers.pictures,
      releasesKicker: text(input?.releasesKicker, 80) || 'Релизы',
      releasesEmpty: text(input?.releasesEmpty, 300),
      aboutKicker: text(input?.aboutKicker, 80),
      about: text(input?.about, 2000),
      listenKicker: text(input?.listenKicker, 80) || 'Слушать',
      followKicker: text(input?.followKicker, 80) || 'Следить',
      contactKicker: text(input?.contactKicker, 80),
      contactEmail,
      contactVkTitle: text(input?.contactVkTitle, 80),
      contactVkText: text(input?.contactVkText, 300),
      contactReleaseTitle: text(input?.contactReleaseTitle, 80),
      contactReleaseText: text(input?.contactReleaseText, 300),
      contactButton: text(input?.contactButton, 80),
      contactMaxUrl: contactMaxUrl || '',
      contactMaxText: text(input?.contactMaxText, 120) || 'чат-бот',
      contactTelegramUrl: contactTelegramUrl || '',
      contactTelegramText: text(input?.contactTelegramText, 120) || 'чат-бот',
      footer: text(input?.footer, 200),
      vkUrl: vkUrl || '',
    },
  }
}

function cleanLinks(links) {
  if (!Array.isArray(links)) return { links: [] }
  const cleaned = []
  for (const link of links.slice(0, 12)) {
    const rawUrl = text(link?.url, 500)
    if (!rawUrl) continue
    const url = normalizeUrl(rawUrl)
    if (!url) return { error: 'Проверьте ссылку на площадку: нужен адрес сайта' }
    cleaned.push({
      platform: platforms.includes(link?.platform) ? link.platform : 'other',
      url,
    })
  }
  return { links: cleaned }
}

function cleanRelease(input, cover) {
  const title = text(input?.title, 120)
  const artist = text(input?.artist, 120)
  const year = Number(input?.year)
  const tracks = Number(input?.tracks)
  if (!title || !artist) return { error: 'Нужны название и исполнитель' }
  if (!Number.isInteger(year) || year < 1950 || year > 2100) return { error: 'Год указан неверно' }
  if (!Number.isInteger(tracks) || tracks < 1 || tracks > 99) return { error: 'Укажите число треков от 1 до 99' }
  const releasedAt = text(input?.releasedAt, 40)
  if (releasedAt && Number.isNaN(new Date(releasedAt).getTime())) return { error: 'Проверьте дату выхода' }
  if (!cover) return { error: 'Добавьте обложку' }
  const links = cleanLinks(input?.links)
  if (links.error) return links
  return { release: { title, artist, year, tracks, releasedAt, cover, blurb: text(input?.blurb, 200), links: links.links } }
}

function signToken() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 14 * 24 * 60 * 60 * 1000 })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

function validToken(token) {
  if (!token || !token.includes('.')) return false
  const [body, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    return typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

function readCookie(req) {
  const raw = req.headers.cookie || ''
  const part = raw.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))
  return part ? decodeURIComponent(part.slice(cookieName.length + 1)) : ''
}

function setAuthCookie(res, token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === '1' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`)
}

function requireAdmin(req, res, next) {
  if (!validToken(readCookie(req))) {
    res.status(401).json({ error: 'Нужен вход в админку' })
    return
  }
  next()
}

function samePassword(input) {
  const left = Buffer.from(String(input))
  const right = Buffer.from(password)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

const attempts = new Map()

function limited(ip) {
  const now = Date.now()
  const row = attempts.get(ip) || { count: 0, at: now }
  if (now - row.at > 15 * 60 * 1000) {
    row.count = 0
    row.at = now
  }
  row.count += 1
  attempts.set(ip, row)
  return row.count > 10
}

function removeUpload(cover) {
  if (typeof cover !== 'string' || !cover.startsWith('/uploads/')) return
  fs.rmSync(path.join(uploadsDir, path.basename(cover)), { force: true })
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg'
      cb(null, `${crypto.randomUUID()}${safeExt}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(new Error('Нужен файл JPG, PNG, WEBP или GIF'))
      return
    }
    cb(null, true)
  },
})

function cleanDemo(value) {
  const demo = text(value, 200)
  if (!demo) return ''
  if (!/^\/uploads\/[0-9a-f-]{36}\.(mp3|ogg|wav|m4a)$/i.test(demo)) return null
  return demo
}

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      const safeExt = ['.mp3', '.ogg', '.wav', '.m4a'].includes(ext) ? ext : ''
      cb(null, `${crypto.randomUUID()}${safeExt}`)
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!['.mp3', '.ogg', '.wav', '.m4a'].includes(ext)) {
      cb(new Error('Нужен файл MP3, OGG, WAV или M4A'))
      return
    }
    cb(null, true)
  },
})

function withAudio(req, res, next) {
  audioUpload.single('audio')(req, res, (error) => {
    if (error) {
      const tooBig = error?.code === 'LIMIT_FILE_SIZE'
      res.status(400).json({ error: tooBig ? 'Демо больше 15 МБ' : (error.message || 'Не удалось загрузить демо') })
      return
    }
    next()
  })
}

function withUpload(req, res, next) {
  upload.single('cover')(req, res, (error) => {
    if (error) {
      res.status(400).json({ error: error.message || 'Не удалось загрузить обложку' })
      return
    }
    next()
  })
}

function readPayload(req) {
  try {
    return JSON.parse(req.body?.payload || '')
  } catch {
    return null
  }
}

function asyncRoute(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error(error)
      if (!res.headersSent) res.status(500).json({ error: 'Ошибка сервера' })
    })
  }
}

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

app.get('/api/site', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(publicDb(revealDue(readDb())))
})

let vkDigestCache = { at: 0, url: '', text: '' }

async function fetchVkDigest(url) {
  const href = normalizeUrl(url)
  if (!href) return ''
  const now = Date.now()
  if (vkDigestCache.url === href && now - vkDigestCache.at < 15 * 60 * 1000 && vkDigestCache.text) {
    return vkDigestCache.text
  }
  try {
    const response = await fetch(href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CHECKagoBot/1.0)',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return vkDigestCache.url === href ? vkDigestCache.text : ''
    const html = await response.text()
    const pick = (pattern) => {
      const match = pattern.exec(html)
      return match?.[1] ? match[1].replace(/\s+/g, ' ').trim() : ''
    }
    const title = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<title[^>]*>([^<]+)<\/title>/i)
    const description = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    const plain = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1800)
    const digest = [
      title && `Заголовок VK: ${title}`,
      description && `Описание VK: ${description}`,
      plain && `Фрагмент страницы VK: ${plain}`,
    ].filter(Boolean).join('\n')
    if (digest) vkDigestCache = { at: now, url: href, text: digest }
    return digest
  } catch {
    return vkDigestCache.url === href ? vkDigestCache.text : ''
  }
}

function formatRuDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

function releaseBucket(release, now = Date.now()) {
  const when = release.releasedAt ? new Date(release.releasedAt).getTime() : Number.NaN
  const dateText = formatRuDate(release.releasedAt)
  if (release.draft) {
    return {
      bucket: 'planned',
      status: dateText ? `готовится, планируемая дата ${dateText}` : 'готовится, дата уточняется',
    }
  }
  if (Number.isFinite(when) && when > now) {
    return {
      bucket: 'upcoming',
      status: dateText ? `ожидается, выход ${dateText}` : 'ожидается',
    }
  }
  return {
    bucket: 'released',
    status: dateText ? `вышел ${dateText}` : 'вышел',
  }
}

function announcementBucket(item, now = Date.now()) {
  const when = item.at ? new Date(item.at).getTime() : Number.NaN
  const dateText = formatRuDate(item.at)
  if (item.archived || (Number.isFinite(when) && when <= now)) {
    return {
      bucket: 'released',
      status: dateText ? `вышел ${dateText}` : 'вышел',
    }
  }
  if (Number.isFinite(when) && when > now) {
    return {
      bucket: 'upcoming',
      status: dateText ? `ожидается, выход ${dateText}` : 'ожидается',
    }
  }
  return { bucket: 'upcoming', status: 'ожидается' }
}

function buildChatSystemPrompt(data, vkDigest = '') {
  const profile = withDefaults(data.profile)
  const now = Date.now()
  const today = formatRuDate(new Date(now).toISOString())
  const releases = sortReleases(data.releases || [])
  const announcements = sortAnnouncements(data.announcements || [])
  const grouped = { released: [], upcoming: [], planned: [] }
  for (const release of releases.slice(0, 30)) {
    const info = releaseBucket(release, now)
    const links = (release.links || []).map((link) => `${link.platform}: ${link.url}`).join('; ')
    const kind = Number(release.tracks) > 1 ? `${release.tracks} треков` : 'сингл'
    grouped[info.bucket].push(
      `- «${release.title}» — ${kind}, ${info.status}. ${release.blurb || ''}`.trim()
      + (links ? ` Ссылки: ${links}.` : ''),
    )
  }
  const lines = [
    'Ты — CHECKago Bot, голос артиста CHECKago.',
    'Стиль: коротко, по-русски, тепло, без канцелярита.',
    `Сегодня на сервере: ${today}. Сравнивай любые даты выхода только с этой датой.`,
    'Не выдумывай даты, ссылки и факты. Опирайся на каталог сайта ниже и на снимок страницы ВКонтакте.',
    'Если в каталоге и на VK нет ответа — скажи прямо и предложи разделы Слушать / Релизы / Связь или сообщество VK.',
    'Про релизы говори только так: вышедшие, ожидаемые и планируемые.',
    'Никогда не говори слова «админка», «админ», «черновик», «из админки».',
    'Релиз с будущей датой — ожидаемый, ещё не вышел. Не пиши, что он уже вышел.',
    'Планируемый релиз формулируй: «готовится, планируемая дата ДД.ММ.ГГГГ» (или «дата уточняется», если даты нет).',
    '',
    '=== Каталог сайта ===',
    `Имя: ${profile.name}`,
    `Бейдж: ${profile.badge || '—'}`,
    `Заголовок: ${profile.titleWhite || ''} ${profile.titleGradient || ''}`.trim(),
    `Лид: ${profile.lead || '—'}`,
    `Об артисте: ${(profile.about || '').replace(/\n+/g, ' ') || '—'}`,
    `О звуке: ${(profile.steps || []).map((step) => `${step.title}: ${step.text}`).join(' | ') || '—'}`,
    `Яндекс.Музыка: ${profile.yandexUrl || '—'}`,
    `VK Музыка / артист: ${profile.vkUrl || '—'}`,
    `Звук: ${profile.zvukUrl || '—'}`,
    `WINK Music: ${profile.winkUrl || '—'}`,
    `МТС Music: ${profile.mtsUrl || '—'}`,
    `Сообщество VK: ${profile.menuVkUrl || '—'}`,
    `Email: ${profile.contactEmail || '—'}`,
    `MAX: ${profile.contactMaxUrl || '—'}`,
    `Telegram: ${profile.contactTelegramUrl || '—'}`,
    `Текст контакта: ${profile.contactReleaseText || '—'}`,
    '',
    'Вышедшие релизы:',
    ...(grouped.released.length ? grouped.released : ['- нет']),
    '',
    'Ожидаемые релизы:',
    ...(grouped.upcoming.length ? grouped.upcoming : ['- нет']),
    '',
    'Планируемые релизы:',
    ...(grouped.planned.length ? grouped.planned : ['- нет']),
    '',
    'Анонсы на сайте:',
  ]
  if (announcements.length === 0) lines.push('- нет')
  for (const item of announcements.slice(0, 12)) {
    const info = announcementBucket(item, now)
    lines.push(
      `- «${item.title}» — ${info.status}: ${(item.text || '').replace(/\n+/g, ' ')}`,
    )
  }
  lines.push('', '=== ВКонтакте ===')
  lines.push(`URL сообщества: ${profile.menuVkUrl || 'не задан'}`)
  lines.push('Задача: для новостей, постов, атмосферы и свежих упоминаний используй снимок страницы VK ниже. Если снимок пуст — направь пользователя в сообщество по ссылке.')
  lines.push(vkDigest || 'Снимок страницы VK сейчас недоступен.')
  return lines.join('\n')
}

app.post('/api/chat', asyncRoute(async (req, res) => {
  const key = process.env.DEEPSEEK_API_KEY || ''
  if (!key) {
    res.status(503).json({ error: 'Чат ещё не подключён на сервере' })
    return
  }
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : []
  const cleaned = incoming
    .slice(-16)
    .map((item) => ({
      role: item?.role === 'assistant' ? 'assistant' : 'user',
      content: text(item?.content, 1200),
    }))
    .filter((item) => item.content)
  if (cleaned.length === 0) {
    res.status(400).json({ error: 'Пустое сообщение' })
    return
  }
  const data = revealDue(readDb())
  const profile = withDefaults(data.profile)
  const vkDigest = await fetchVkDigest(profile.menuVkUrl || profile.vkUrl || '')
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  const payload = {
    model,
    messages: [
      { role: 'system', content: buildChatSystemPrompt(data, vkDigest) },
      ...cleaned,
    ],
    stream: false,
  }
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    res.status(502).json({ error: body?.error?.message || 'DeepSeek не ответил' })
    return
  }
  const reply = text(body?.choices?.[0]?.message?.content, 4000)
  if (!reply) {
    res.status(502).json({ error: 'Пустой ответ модели' })
    return
  }
  res.json({ reply })
}))

app.get('/api/admin/site', requireAdmin, (_req, res) => {
  const data = revealDue(readDb())
  res.json({
    profile: withDefaults(data.profile),
    releases: sortReleases(data.releases),
    announcements: sortAnnouncements(data.announcements || []),
  })
})

app.get('/api/session', (req, res) => {
  res.json({ ok: validToken(readCookie(req)) })
})

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'local'
  if (limited(ip)) {
    res.status(429).json({ error: 'Слишком много попыток. Подождите 15 минут.' })
    return
  }
  if (!samePassword(req.body?.password || '')) {
    res.status(401).json({ error: 'Неверный пароль' })
    return
  }
  attempts.delete(ip)
  setAuthCookie(res, signToken(), 14 * 24 * 60 * 60)
  res.json({ ok: true })
})

app.post('/api/logout', (_req, res) => {
  setAuthCookie(res, '', 0)
  res.json({ ok: true })
})

app.put('/api/profile', requireAdmin, asyncRoute(async (req, res) => {
  const cleaned = cleanProfile(req.body)
  if (cleaned.error) {
    res.status(400).json({ error: cleaned.error })
    return
  }
  if (cleaned.profile.upcomingReleaseId) {
    const known = readDb().releases.some((item) => item.publicId === cleaned.profile.upcomingReleaseId && !item.draft)
    if (!known) {
      res.status(400).json({ error: 'Для анонса нужен релиз с ID, не черновик' })
      return
    }
  }
  const data = await updateDb((current) => ({ ...current, profile: cleaned.profile }))
  res.json({ profile: data.profile })
}))

app.post('/api/releases', requireAdmin, withUpload, asyncRoute(async (req, res) => {
  const cover = req.file ? `/uploads/${req.file.filename}` : ''
  const cleaned = cleanRelease(readPayload(req), cover)
  if (cleaned.error) {
    removeUpload(cover)
    res.status(400).json({ error: cleaned.error })
    return
  }
  const release = { id: crypto.randomUUID(), ...cleaned.release, sort: 0, ...releaseFlags(readPayload(req), null) }
  const data = await updateDb((current) => {
    const releases = sortReleases(current.releases)
    releases.unshift(release)
    releases.forEach((item, index) => {
      item.sort = index
    })
    return { ...current, releases }
  })
  res.json({ release: sortReleases(data.releases).find((item) => item.id === release.id) })
}))

app.put('/api/releases/:id', requireAdmin, withUpload, asyncRoute(async (req, res) => {
  const current = readDb()
  const existing = current.releases.find((item) => item.id === req.params.id)
  if (!existing) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`)
    res.status(404).json({ error: 'Релиз не найден' })
    return
  }
  const cover = req.file ? `/uploads/${req.file.filename}` : existing.cover
  const cleaned = cleanRelease(readPayload(req), cover)
  if (cleaned.error) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`)
    res.status(400).json({ error: cleaned.error })
    return
  }
  if (req.file) removeUpload(existing.cover)
  const data = await updateDb((db) => ({
    ...db,
    releases: db.releases.map((item) => (
      item.id === existing.id ? { ...item, ...cleaned.release, ...releaseFlags(readPayload(req), existing) } : item
    )),
  }))
  res.json({ release: data.releases.find((item) => item.id === existing.id) })
}))

app.delete('/api/releases/:id', requireAdmin, asyncRoute(async (req, res) => {
  const current = readDb()
  const existing = current.releases.find((item) => item.id === req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Релиз не найден' })
    return
  }
  removeUpload(existing.cover)
  await updateDb((db) => {
    const releases = db.releases.filter((item) => item.id !== existing.id)
    releases.forEach((item, index) => {
      item.sort = index
    })
    return { ...db, releases }
  })
  res.json({ ok: true })
}))

app.post('/api/announcements', requireAdmin, asyncRoute(async (req, res) => {
  const releaseId = text(req.body?.releaseId, 80)
  const description = text(req.body?.text, 300)
  if (!description) {
    res.status(400).json({ error: 'Добавьте описание' })
    return
  }
  const release = readDb().releases.find((item) => item.id === releaseId)
  if (!release) {
    res.status(404).json({ error: 'Релиз не найден' })
    return
  }
  if (release.draft || !release.publicId) {
    res.status(400).json({ error: 'Снимите «Черновик» и сохраните релиз' })
    return
  }
  if (!release.releasedAt) {
    res.status(400).json({ error: 'Укажите дату выхода в карточке релиза и сохраните её' })
    return
  }
  const demo = cleanDemo(req.body?.demo)
  if (demo === null) {
    res.status(400).json({ error: 'Демо должно быть файлом MP3, OGG, WAV или M4A' })
    return
  }
  const atTime = new Date(release.releasedAt).getTime()
  const announcement = {
    id: crypto.randomUUID(),
    releaseId: release.id,
    publicId: release.publicId,
    title: release.title,
    artist: release.artist,
    cover: release.cover,
    tracks: release.tracks || 1,
    at: release.releasedAt,
    text: description,
    demo,
    archived: Number.isFinite(atTime) && atTime <= Date.now(),
  }
  store.insertAnnouncement(announcement)
  const data = revealDue(readDb())
  res.json({ announcement: (data.announcements || []).find((item) => item.id === announcement.id) || announcement })
}))

app.put('/api/announcements/:id', requireAdmin, asyncRoute(async (req, res) => {
  const current = readDb().announcements.find((item) => item.id === req.params.id)
  if (!current) {
    res.status(404).json({ error: 'Анонс не найден' })
    return
  }
  if (current.archived) {
    res.status(400).json({ error: 'Архивный анонс не редактируется' })
    return
  }
  const description = text(req.body?.text, 300)
  const at = text(req.body?.at, 40)
  if (!description) {
    res.status(400).json({ error: 'Добавьте описание' })
    return
  }
  if (!at || Number.isNaN(new Date(at).getTime())) {
    res.status(400).json({ error: 'Проверьте дату выхода' })
    return
  }
  const demo = req.body?.demo === undefined ? current.demo : cleanDemo(req.body.demo)
  if (demo === null) {
    res.status(400).json({ error: 'Демо должно быть файлом MP3, OGG, WAV или M4A' })
    return
  }
  const saved = store.updateAnnouncement({ id: current.id, text: description, at, demo })
  if (!saved) {
    res.status(400).json({ error: 'Архивный анонс не редактируется' })
    return
  }
  if (demo !== current.demo) removeUpload(current.demo)
  const data = revealDue(readDb())
  res.json({ announcement: (data.announcements || []).find((item) => item.id === current.id) })
}))

app.delete('/api/announcements/:id', requireAdmin, asyncRoute(async (req, res) => {
  const demo = store.deleteAnnouncement(req.params.id)
  removeUpload(demo)
  res.json({ ok: true })
}))

app.post('/api/audio', requireAdmin, withAudio, (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Выберите аудиофайл' })
    return
  }
  res.json({ url: `/uploads/${req.file.filename}` })
})

app.post('/api/media', requireAdmin, withUpload, (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Выберите изображение' })
    return
  }
  res.json({ url: `/uploads/${req.file.filename}` })
})

app.post('/api/releases/:id/move', requireAdmin, asyncRoute(async (req, res) => {
  const direction = req.body?.direction === 'up' ? -1 : 1
  let missing = false
  const data = await updateDb((db) => {
    const releases = sortReleases(db.releases)
    const index = releases.findIndex((item) => item.id === req.params.id)
    const next = index + direction
    if (index < 0) {
      missing = true
      return db
    }
    if (next < 0 || next >= releases.length) return db
    const [item] = releases.splice(index, 1)
    releases.splice(next, 0, item)
    releases.forEach((release, sort) => {
      release.sort = sort
    })
    return { ...db, releases }
  })
  if (missing) {
    res.status(404).json({ error: 'Релиз не найден' })
    return
  }
  res.json({ releases: sortReleases(data.releases) })
}))

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400) {
    res.status(400).json({ error: 'Некорректный JSON' })
    return
  }
  next(error)
})

app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }))

const serveWeb = process.env.npm_lifecycle_event === 'start' || process.env.NODE_ENV === 'production'
if (serveWeb) {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.error('Нет сборки. Сначала выполните npm run build')
    process.exit(1)
  }
  app.use(express.static(distDir))
  const spaRoutes = new Set(['/', '/admin', '/app', '/404', '/403', '/500', '/502', '/503'])
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      next()
      return
    }
    const clean = req.path.replace(/\/+$/, '') || '/'
    if (!spaRoutes.has(clean)) res.status(404)
    else if (/^\/(40[034]|50[023])$/.test(clean)) res.status(Number(clean.slice(1)))
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

const server = app.listen(port, host, () => {
  console.log(`API http://${host}:${port}`)
  if (!serveWeb) console.log('Сайт в разработке: http://127.0.0.1:5173')
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Порт ${port} занят`)
    process.exit(1)
  }
  throw error
})
