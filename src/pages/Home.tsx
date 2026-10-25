import { useEffect, useRef, useState } from 'react'
import { getSite, platformLabel, releaseKind, safeHref, type Announcement, type Picture, type Profile, type Release, type ReleaseLink } from '../api'

function releaseDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatReleaseDate(date: Date) {
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const day = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)
  if (date.getHours() === 0 && date.getMinutes() === 0) return day
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time}`
}

function CoverLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button className="lightbox-close" type="button" aria-label="Закрыть" onClick={onClose}>×</button>
      <img src={src} alt={alt} onClick={(event) => event.stopPropagation()} />
    </div>
  )
}

function FlipCard({ value }: { value: string }) {
  const previous = useRef(value)
  const [frame, setFrame] = useState({ from: '––', to: value, play: 0 })

  useEffect(() => {
    if (value === previous.current) return
    const from = previous.current
    previous.current = value
    setFrame((current) => ({ from, to: value, play: current.play + 1 }))
  }, [value])

  return (
    <span className="rail-num">
      <span className="flip-half is-top"><span>{frame.to}</span></span>
      <span className="flip-half is-bottom"><span>{frame.from}</span></span>
      <span className="flip-leaf is-top" key={`top-${frame.play}`}><span>{frame.from}</span></span>
      <span className="flip-leaf is-bottom" key={`bottom-${frame.play}`}><span>{frame.to}</span></span>
    </span>
  )
}

function formatDemoTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  const secs = String(total % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

function DemoPlayer({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const node = audio.current
    if (!node) return
    const onTime = () => setCurrent(node.currentTime || 0)
    const onMeta = () => setDuration(node.duration || 0)
    const onEnd = () => setPlaying(false)
    const onPause = () => setPlaying(false)
    const onPlay = () => {
      document.querySelectorAll('audio').forEach((item) => {
        if (item !== node) item.pause()
      })
      setPlaying(true)
    }
    node.addEventListener('timeupdate', onTime)
    node.addEventListener('loadedmetadata', onMeta)
    node.addEventListener('ended', onEnd)
    node.addEventListener('pause', onPause)
    node.addEventListener('play', onPlay)
    return () => {
      node.removeEventListener('timeupdate', onTime)
      node.removeEventListener('loadedmetadata', onMeta)
      node.removeEventListener('ended', onEnd)
      node.removeEventListener('pause', onPause)
      node.removeEventListener('play', onPlay)
    }
  }, [src])

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0

  return (
    <div className="demo">
      <audio ref={audio} src={src} preload="metadata" />
      <button
        className="demo-play"
        type="button"
        aria-label={playing ? 'Пауза' : 'Слушать демо'}
        onClick={() => {
          const node = audio.current
          if (!node) return
          if (node.paused) void node.play()
          else node.pause()
        }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
        )}
      </button>
      <div className="demo-body">
        <div className="demo-meta">
          <span>Демо</span>
          <span>{formatDemoTime(current)} / {formatDemoTime(duration)}</span>
        </div>
        <input
          className="demo-seek"
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          aria-label="Позиция демо"
          onChange={(event) => {
            const node = audio.current
            if (!node || !duration) return
            const next = (Number(event.target.value) / 100) * duration
            node.currentTime = next
            setCurrent(next)
          }}
        />
      </div>
    </div>
  )
}

function usableLinks(links: ReleaseLink[] | undefined) {
  return (links || []).flatMap((link) => {
    const href = safeHref(link.url)
    return href ? [{ ...link, href }] : []
  })
}

function ReleaseRail({
  announcement,
  badge,
  label,
  listenLabel,
  onEnded,
}: {
  announcement: Announcement
  badge: string
  label: string
  listenLabel: string
  onEnded: () => void
}) {
  const target = announcement.at ? releaseDate(announcement.at) : null
  const targetMs = target?.getTime() ?? Number.NaN
  const [now, setNow] = useState(() => Date.now())
  const [coverOpen, setCoverOpen] = useState(false)
  const endedNow = Boolean(announcement.archived) || (Boolean(target) && targetMs <= now)
  const seenEnded = useRef(endedNow)

  useEffect(() => {
    if (!endedNow || seenEnded.current) return
    seenEnded.current = true
    onEnded()
  }, [endedNow, onEnded])

  useEffect(() => {
    if (!Number.isFinite(targetMs) || targetMs <= Date.now()) return
    const timer = window.setInterval(() => {
      const next = Date.now()
      setNow(next)
      if (next >= targetMs) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [targetMs])

  if (!target) return null
  const ended = endedNow

  const total = Math.floor((targetMs - now) / 1000)
  const parts = [
    Math.floor(total / 86400),
    Math.floor((total % 86400) / 3600),
    Math.floor((total % 3600) / 60),
    total % 60,
  ]
  const when = formatReleaseDate(target)
  const title = announcement.title.trim().replace(/^[«"]|[»"]$/g, '')
  const kind = title ? releaseKind(announcement.tracks || 1) : ''
  const cover = announcement.cover.trim()
  const demo = (announcement.demo || '').trim()
  const coverAlt = title ? `Обложка «${title}»` : 'Обложка релиза'
  const units = ['дней', 'часов', 'мин', 'сек']
  const releaseHref = announcement.releaseId ? `#release-${announcement.releaseId}` : '#releases'
  const artist = announcement.artist.trim()
  const badgeText = kind ? `${badge} · ${kind.toLowerCase()}` : badge
  const listenLinks = usableLinks(announcement.links)

  return (
    <section className="rail glow-run" aria-label={badgeText}>
      <span className="neon-ring" aria-hidden="true"><span className="neon-ring-spin" /></span>
      <div className="rail-main">
        <span className="rail-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" />
          </svg>
          {badgeText}
        </span>
        <div className={cover ? 'rail-top has-cover' : 'rail-top'}>
          {cover && (
            <button className="rail-cover" type="button" onClick={() => setCoverOpen(true)} aria-label={coverAlt}>
              <img src={cover} alt="" />
            </button>
          )}
          <div className="rail-copy">
            <p className="rail-headline">
              <span>{title ? `«${title}»` : 'Выход'}</span>
              {kind && <span className="rail-kind">{kind}</span>}
            </p>
            <p className="rail-date">{artist ? `${artist} · ${when}` : when}</p>
            {announcement.text.trim() && <p className="rail-desc">{announcement.text}</p>}
          </div>
        </div>
        {demo && <DemoPlayer src={demo} />}
      </div>
      <div className={ended ? 'rail-timer is-arrived' : 'rail-timer'}>
        {ended ? (
          <div className="rail-listen-now">
            <p className="rail-listen-label">{listenLabel}</p>
            {listenLinks.length > 0 ? (
              <div className="rail-listen-links">
                {listenLinks.map((link) => (
                  <a key={`${link.platform}-${link.href}`} href={link.href} target="_blank" rel="noreferrer">
                    {platformLabel(link.platform)}
                  </a>
                ))}
              </div>
            ) : (
              <a className="btn btn-primary" href={releaseHref}>К релизу</a>
            )}
          </div>
        ) : (
          <>
            <div className="rail-head">
              <span className="rail-label"><span className="rail-dot" aria-hidden="true" />{label}</span>
              <span className="rail-after">{when}</span>
            </div>
            <div className="rail-cells" aria-hidden="true">
              {units.map((unit, index) => (
                <div className={index === 3 ? 'rail-cell is-sec' : 'rail-cell'} key={unit}>
                  <FlipCard value={String(parts[index]).padStart(2, '0')} />
                  <small>{unit}</small>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <span className="sr-only">
        {title ? `${title}${kind ? `, ${kind}` : ''}. ` : ''}
        {announcement.text.trim() ? `${announcement.text.trim()} ` : ''}
        {ended ? `${listenLabel}.` : `Выход ${when}.`}
      </span>
      {coverOpen && cover && <CoverLightbox src={cover} alt={coverAlt} onClose={() => setCoverOpen(false)} />}
    </section>
  )
}

function AboutText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  return paragraphs.map((part, index) => <p key={index}>{part}</p>)
}

function Logo({ mark, name }: { mark: string; name: string }) {
  return (
    <a className="logo" href="/">
      <span className="logo-mark">{mark}</span>
      {name}
    </a>
  )
}

function ReleaseCard({ release }: { release: Release }) {
  const links = usableLinks(release.links)
  const primary = links[0]
  const blurb = (release.blurb || '').trim()
  return (
    <article className="release" id={`release-${release.id}`}>
      <img src={release.cover} alt={`Обложка «${release.title}»`} />
      <div>
        <h3>{release.title}</h3>
        <p className="release-kind">{releaseKind(release.tracks)}</p>
        <p className="release-meta">{release.artist} · {release.year}</p>
        {blurb && <p className="release-blurb">{blurb}</p>}
        {primary ? (
          <div className="release-links">
            <a className="btn btn-primary btn-small" href={primary.href} target="_blank" rel="noreferrer">Слушать</a>
            {links.slice(1).map((link) => (
              <a key={`${link.platform}-${link.href}`} href={link.href} target="_blank" rel="noreferrer">
                {platformLabel(link.platform)}
              </a>
            ))}
          </div>
        ) : (
          <p className="release-soon">Скоро</p>
        )}
      </div>
    </article>
  )
}

function Pictures({ items, className }: { items: Picture[]; className: string }) {
  if (items.length === 0) return null
  return (
    <div className={className}>
      {items.map((item) => (
        <figure className="shot" key={item.src}>
          <img src={item.src} alt={item.alt} />
        </figure>
      ))}
    </div>
  )
}

type PlatformCta = { key: string; href: string; label: string; variant: 'yandex' | 'vk' | 'zvuk' }

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let live = true
    let snapshot = ''

    const refresh = () => {
      if (document.visibilityState === 'hidden') return
      getSite()
        .then((data) => {
          if (!live) return
          const next = JSON.stringify(data)
          if (next === snapshot) return
          snapshot = next
          setProfile(data.profile)
          setReleases(data.releases)
          setAnnouncements(data.announcements || [])
          document.title = data.profile.pageTitle || data.profile.name
          setError('')
        })
        .catch((reason: Error) => {
          if (live && !snapshot) setError(reason.message)
        })
    }

    refresh()
    const timer = window.setInterval(refresh, 5000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      live = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const vk = profile ? safeHref(profile.vkUrl) : undefined
  const followVk = profile ? safeHref(profile.menuVkUrl) || vk : undefined
  const yandex = profile ? safeHref(profile.yandexUrl) : undefined
  const zvuk = profile ? safeHref(profile.zvukUrl) : undefined
  const wink = profile ? safeHref(profile.winkUrl) : undefined
  const mts = profile ? safeHref(profile.mtsUrl) : undefined
  const email = profile?.contactEmail?.trim() || ''
  const mailHref = email ? `mailto:${email}` : undefined
  const maxHref = profile ? safeHref(profile.contactMaxUrl || '') : undefined
  const telegramHref = profile ? safeHref(profile.contactTelegramUrl || '') : undefined
  const showSound = profile && profile.steps.length > 0
  const showArtist = profile && (profile.aboutKicker || profile.about || profile.portrait)
  const showListen = Boolean(yandex || vk || zvuk || wink || mts)
  const showFollow = Boolean(followVk)
  const writeHref = mailHref || telegramHref || maxHref || (!showFollow ? followVk : undefined)
  const contactBtn = profile?.contactButton?.trim() || ''
  const contactBtnIsReleases = /релиз/i.test(contactBtn)
  const showContact = Boolean(
    email
    || followVk
    || profile?.contactReleaseText
    || profile?.contactButton
    || profile?.contactKicker,
  )

  const heroPlatforms: PlatformCta[] = []
  if (profile && yandex && profile.yandexButton) heroPlatforms.push({ key: 'yandex', href: yandex, label: profile.yandexButton, variant: 'yandex' })
  if (profile && vk && profile.heroButton) heroPlatforms.push({ key: 'vk', href: vk, label: profile.heroButton, variant: 'vk' })
  if (profile && zvuk && profile.zvukButton) heroPlatforms.push({ key: 'zvuk', href: zvuk, label: profile.zvukButton, variant: 'zvuk' })

  const listenPlatforms: { key: string; href: string; label: string }[] = []
  if (profile && yandex) listenPlatforms.push({ key: 'yandex', href: yandex, label: 'Яндекс.Музыка' })
  if (profile && vk) listenPlatforms.push({ key: 'vk', href: vk, label: 'VK Музыка' })
  if (profile && zvuk) listenPlatforms.push({ key: 'zvuk', href: zvuk, label: 'Звук' })
  if (profile && wink) listenPlatforms.push({ key: 'wink', href: wink, label: profile.winkButton || 'WINK Music' })
  if (profile && mts) listenPlatforms.push({ key: 'mts', href: mts, label: profile.mtsButton || 'МТС Music' })

  const refreshSite = () => {
    getSite().then((data) => {
      setProfile(data.profile)
      setReleases(data.releases)
      setAnnouncements(data.announcements || [])
    }).catch(() => {})
  }

  return (
    <>
      <div className="bg-media" aria-hidden="true">
        <video ref={(node) => { if (node) node.muted = true }} autoPlay muted loop playsInline preload="auto" src="/media/bg.webm" />
      </div>
      <header className="nav">
        {profile && <Logo mark={profile.logoMark || 'CK'} name={profile.name} />}
        <nav className={open ? 'nav-links open' : 'nav-links'} onClick={() => setOpen(false)}>
          {showSound && <a href="#sound">{profile?.navSound || 'Музыка'}</a>}
          <a href="#releases">{profile?.navReleases || 'Релизы'}</a>
          {profile && profile.covers.length > 0 && <a href="#covers">{profile.navCovers}</a>}
          {showContact && <a href="#contact">{profile?.navContact || 'Контакт'}</a>}
        </nav>
        {profile && (
          <div className="nav-actions">
            <a
              className="icon-btn icon-btn-max"
              href={maxHref || '#contact'}
              target={maxHref ? '_blank' : undefined}
              rel={maxHref ? 'noreferrer' : undefined}
              aria-label="MAX"
              title="MAX"
              onClick={() => setOpen(false)}
            >
              <img src="/media/max.png" alt="" width="40" height="40" />
            </a>
            <a
              className="icon-btn icon-btn-tg"
              href={telegramHref || '#contact'}
              target={telegramHref ? '_blank' : undefined}
              rel={telegramHref ? 'noreferrer' : undefined}
              aria-label="Telegram"
              title="Telegram"
              onClick={() => setOpen(false)}
            >
              <img src="/media/telegram.png" alt="" width="40" height="40" />
            </a>
            <a className="nav-listen" href="#listen" onClick={() => setOpen(false)}>
              {profile.navListen || 'Слушать'}
            </a>
          </div>
        )}
        <button className="menu-btn" type="button" aria-label="Меню" onClick={() => setOpen((value) => !value)}>
          <span aria-hidden="true">{open ? '×' : '☰'}</span>
        </button>
      </header>

      <main className="page">
        <div className="wrap hero">
          {error && <p className="error">{error}. Запустите сервер и обновите страницу.</p>}
          {!profile && !error && <p className="status">Загрузка</p>}
          {profile && (
            <>
              {profile.badge && <p className="badge"><i />{profile.badge}</p>}
              {(profile.titleWhite || profile.titleGradient) && (
                <h1>
                  {profile.titleWhite}
                  {profile.titleGradient && <span className="grad" data-text={profile.titleGradient}>{profile.titleGradient}</span>}
                </h1>
              )}
              {profile.lead && <p className="lead">{profile.lead}</p>}
              <div className="cta">
                {heroPlatforms.map((item) => (
                  <a
                    key={item.key}
                    className={item.variant === 'yandex' ? 'vk-cta ym-cta' : item.variant === 'zvuk' ? 'vk-cta zvuk-cta' : 'vk-cta'}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="vk-cta-ico" aria-hidden="true">
                      {item.variant === 'yandex' && (
                        <svg width="18" height="18" viewBox="0 0 144 144" aria-hidden="true">
                          <path fill="#FFEE00" d="m130.863 57.739-.468-2.327-19.788-3.457 11.498-15.557-1.337-1.462-16.913 8.11 2.139-21.54-1.738-.997-10.295 17.418L82.395 12H80.39l2.74 25.064-29.08-23.269-2.474.732 22.396 28.122-44.323-14.76-2.006 2.261L67.22 52.686l-54.618 4.521-.602 3.39 56.757 6.184-47.33 39.157 2.005 2.726 56.356-30.648-11.164 53.983h3.41l21.592-50.792 13.17 39.756 2.34-1.795-5.415-40.42 20.524 23.268 1.337-2.128-15.711-28.853 21.928 8.111.201-2.46-19.655-14.493 18.518-4.454Z" />
                        </svg>
                      )}
                      {item.variant === 'vk' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.79 16.24s.28-.03.43-.2c.14-.14.13-.42.13-.42s-.02-1.3.58-1.5c.59-.18 1.35.95 2.16 1.36.6.32 1.07.25 1.07.25l2.15-.03s1.12-.07.59-.96c-.04-.08-.31-.66-1.61-1.87-1.35-1.26-1.17-1.06.46-3.24.99-1.33 1.39-2.15 1.27-2.5-.12-.33-.86-.24-.86-.24l-2.42.02s-.18-.03-.31.05-.22.19-.22.19-.39 1.04-.9 1.92c-1.1 1.87-1.54 1.97-1.71 1.85-.42-.27-.31-1.08-.31-1.66 0-1.8.27-2.56-.53-2.76-.27-.06-.46-.1-1.14-.11-.88-.01-1.62 0-2.04.21-.28.14-.49.44-.36.46.16.02.53.1.72.37.25.34.24 1.11.24 1.11s.15 2.14-.33 2.4c-.33.18-.79-.19-1.76-1.86-.5-.86-.87-1.81-.87-1.81s-.07-.18-.2-.28c-.16-.11-.38-.15-.38-.15l-2.3.02s-.35.01-.47.16c-.12.13-.01.41-.01.41s1.8 4.24 3.83 6.38c1.87 1.96 3.99 1.83 3.99 1.83h.96z" />
                        </svg>
                      )}
                      {item.variant === 'zvuk' && <img src="/media/zvuk.png" alt="" width="32" height="32" />}
                    </span>
                    <span className="vk-cta-txt"><b>{item.label}</b></span>
                    <svg className="vk-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </a>
                ))}
                {profile.releasesButton && <a className="btn btn-ghost" href="#releases">{profile.releasesButton}</a>}
              </div>
            </>
          )}
        </div>

        {profile && announcements.length > 0 && (
          <div className="wrap announcements" id="featured">
            {announcements.map((announcement) => (
              <ReleaseRail
                key={announcement.id}
                announcement={announcement}
                badge={profile.upcomingBadge.trim() || 'Новый релиз'}
                label={profile.upcomingLabel.trim() || 'До релиза'}
                listenLabel={profile.featuredListenLabel.trim() || 'Слушать сейчас'}
                onEnded={refreshSite}
              />
            ))}
          </div>
        )}

        <section className="wrap panel glow-run" id="releases">
          <span className="neon-ring" aria-hidden="true"><span className="neon-ring-spin" /></span>
          <p className="kicker">{profile?.releasesKicker || 'Релизы'}</p>
          {releases.length === 0 ? (
            <div className="empty">{profile?.releasesEmpty || 'Пока пусто.'}</div>
          ) : (
            <div className="releases">
              {releases.map((release) => <ReleaseCard key={release.id} release={release} />)}
            </div>
          )}
        </section>

        {profile && showSound && (
          <section className="wrap panel glow-run" id="sound">
            <span className="neon-ring" aria-hidden="true"><span className="neon-ring-spin" /></span>
            {profile.soundKicker && <p className="kicker">{profile.soundKicker}</p>}
            <div className="steps">
              {profile.steps.map((step, index) => (
                <article className="step" key={`${step.title}-${index}`}>
                  {step.title && <b>{step.title}</b>}
                  {step.text && <p>{step.text}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {profile && profile.covers.length > 0 && (
          <section className="wrap panel glow-shade shade-pink" id="covers">
            {profile.coversKicker && <p className="kicker">{profile.coversKicker}</p>}
            {profile.coversLead && <p className="section-lead">{profile.coversLead}</p>}
            <Pictures items={profile.covers} className="covers" />
          </section>
        )}

        {profile && showArtist && (
          <section className="wrap panel about glow-shade shade-magenta" id="artist">
            {profile.aboutKicker && <p className="kicker">{profile.aboutKicker}</p>}
            <div className={profile.portrait ? 'artist-layout' : 'artist-layout is-text-only'}>
              {profile.portrait && (
                <figure className="shot artist-portrait glow-shade shade-violet">
                  <img src={profile.portrait} alt={profile.portraitAlt} />
                </figure>
              )}
              <div className="artist-copy">
                <h2>{profile.name}</h2>
                {profile.about && <AboutText text={profile.about} />}
              </div>
            </div>
          </section>
        )}

        {profile && showListen && (
          <section className="wrap panel glow-run" id="listen">
            <span className="neon-ring" aria-hidden="true"><span className="neon-ring-spin" /></span>
            <p className="kicker">{profile.listenKicker || 'Слушать'}</p>
            <div className="platform-list">
              {listenPlatforms.map((item) => (
                <a className="btn btn-ghost" key={item.key} href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
              ))}
            </div>
          </section>
        )}

        {profile && showFollow && followVk && (
          <section className="wrap panel glow-shade shade-pink" id="follow">
            <p className="kicker">{profile.followKicker || 'Следить'}</p>
            <a className="row" href={followVk} target="_blank" rel="noreferrer">
              <b>{profile.contactVkTitle || 'ВКонтакте'}</b>
              <span>{profile.contactVkText || 'новые треки и обложки'}</span>
            </a>
          </section>
        )}

        {profile && showContact && (
          <section className="wrap panel glow-run" id="contact">
            <span className="neon-ring" aria-hidden="true"><span className="neon-ring-spin" /></span>
            {profile.contactKicker && <p className="kicker">{profile.contactKicker}</p>}
            {profile.contactReleaseText && <p className="section-lead">{profile.contactReleaseText}</p>}
            <div className="contact">
              <div className="contact-card">
                <div className="contact-primary">
                  {email ? (
                    <a className="contact-email" href={mailHref}>
                      <span className="contact-email-action">{contactBtn && !contactBtnIsReleases ? contactBtn : 'Написать'}</span>
                      <span className="contact-email-addr">{email}</span>
                    </a>
                  ) : writeHref && !contactBtnIsReleases ? (
                    <a
                      className="btn btn-primary"
                      href={writeHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {contactBtn || 'Написать'}
                    </a>
                  ) : (
                    <p className="contact-hint">Почта появится здесь · пока напишите в мессенджер</p>
                  )}
                </div>
                <div className="contact-messengers" role="group" aria-label="Мессенджеры">
                  <span className="contact-messengers-label">Мессенджеры</span>
                  <div className="contact-bots">
                    {maxHref ? (
                      <a className="contact-bot" href={maxHref} target="_blank" rel="noreferrer" aria-label="MAX">
                        <img src="/media/max.png" alt="" width="44" height="44" />
                      </a>
                    ) : (
                      <span className="contact-bot is-soon" title="Скоро">
                        <img src="/media/max.png" alt="" width="44" height="44" />
                      </span>
                    )}
                    {telegramHref ? (
                      <a className="contact-bot" href={telegramHref} target="_blank" rel="noreferrer" aria-label="Telegram">
                        <img src="/media/telegram.png" alt="" width="44" height="44" />
                      </a>
                    ) : (
                      <span className="contact-bot is-soon" title="Скоро">
                        <img src="/media/telegram.png" alt="" width="44" height="44" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!showFollow && followVk && (
                <a className="row" href={followVk} target="_blank" rel="noreferrer">
                  <b>{profile.contactVkTitle || 'ВКонтакте'}</b>
                  <span>{profile.contactVkText || 'сообщество CHECKago'}</span>
                </a>
              )}
              {contactBtn && contactBtnIsReleases && (
                <a className="btn btn-ghost" href="#releases">{contactBtn}</a>
              )}
            </div>
          </section>
        )}

        <footer className="wrap footer">
          <span>© {new Date().getFullYear()} {profile?.name || 'CHECKago'}{profile?.footer ? ` · ${profile.footer}` : ''}</span>
        </footer>
      </main>
      <button
        className="to-top"
        type="button"
        aria-label="Наверх"
        onClick={() => {
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      </button>
    </>
  )
}
