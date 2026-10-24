import { useEffect, useRef, useState } from 'react'
import { getSite, platformLabel, releaseKind, safeHref, type Picture, type Profile, type Release, type TextBlock } from '../api'

function faClass(code: string) {
  const tokens = code.split(/\s+/).filter((token) => /^fa[a-z0-9-]*$/i.test(token))
  return tokens.join(' ') || 'fa-brands fa-vk'
}

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

const arrivedWords = ['пришло', 'время', 'насладиться', 'звуком']

function ReleaseRail({ profile, onEnded }: { profile: Profile; onEnded: () => void }) {
  const target = profile.upcomingAt ? releaseDate(profile.upcomingAt) : null
  const targetMs = target?.getTime() ?? Number.NaN
  const [now, setNow] = useState(() => Date.now())
  const [coverOpen, setCoverOpen] = useState(false)
  const endedNow = Boolean(target) && targetMs <= now
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
  const badge = profile.upcomingBadge.trim() || 'Новый релиз'
  const label = profile.upcomingLabel.trim() || 'До выхода'
  const title = profile.upcomingTitle.trim().replace(/^[«"]|[»"]$/g, '')
  const kind = profile.upcomingReleaseId && title ? releaseKind(profile.upcomingTracks ?? 1) : ''
  const cover = (profile.upcomingCover ?? '').trim()
  const coverAlt = title ? `Обложка «${title}»` : 'Обложка релиза'
  const units = ['дней', 'часов', 'мин', 'сек']
  const releaseHref = profile.upcomingReleaseId ? `#release-${profile.upcomingReleaseId}` : '#releases'

  return (
    <section className="rail glow-run" aria-label={badge}>
      <span className="neon-ring" aria-hidden="true"><span className="neon-ring-spin" /></span>
      <div className={cover ? 'rail-main has-cover' : 'rail-main'}>
        {cover && (
          <button className="rail-cover" type="button" onClick={() => setCoverOpen(true)} aria-label={coverAlt}>
            <img src={cover} alt="" />
          </button>
        )}
        <div>
        <span className="rail-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" />
          </svg>
          {badge}
        </span>
        <p className="rail-headline">
          <span>{title ? `«${title}»` : 'Выход'}</span>
          {kind && <span className="rail-kind">{kind}</span>}
        </p>
        <p className="rail-date">{when}</p>
        {profile.upcomingText.trim() && <p className="rail-desc">{profile.upcomingText}</p>}
        </div>
      </div>
      <div className={ended ? 'rail-timer is-arrived' : 'rail-timer'}>
        {ended ? (
          <a className="rail-arrived" href={releaseHref}>
            {arrivedWords.map((word) => (
              <span className="grad" data-text={word} key={word}>{word}</span>
            ))}
          </a>
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
        {profile.upcomingText.trim() ? `${profile.upcomingText.trim()} ` : ''}
        {ended ? 'Пришло время насладиться звуком.' : `Выход ${when}.`}
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
  const links = release.links.flatMap((link) => {
    const href = safeHref(link.url)
    return href ? [{ ...link, href }] : []
  })
  return (
    <article className="release" id={`release-${release.id}`}>
      <img src={release.cover} alt={`Обложка «${release.title}»`} />
      <div>
        <h3>{release.title}</h3>
        <p className="release-kind">{releaseKind(release.tracks)}</p>
        <p className="release-meta">{release.artist} · {release.year}</p>
        {links.length > 0 ? (
          <div className="release-links">
            {links.map((link) => (
              <a key={`${link.platform}-${link.href}`} href={link.href} target="_blank" rel="noreferrer">
                {platformLabel(link.platform)}
              </a>
            ))}
          </div>
        ) : <p className="note">Ссылки на площадки появятся после публикации.</p>}
      </div>
    </article>
  )
}

function Blocks({ items }: { items: TextBlock[] }) {
  if (items.length === 0) return null
  return (
    <div className="sounds">
      {items.map((item, index) => (
        <article className="sound" key={`${item.title}-${index}`}>
          {item.title && <h3>{item.title}</h3>}
          {item.text && <p>{item.text}</p>}
        </article>
      ))}
    </div>
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

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let live = true
    getSite()
      .then((data) => {
        if (!live) return
        setProfile(data.profile)
        setReleases(data.releases)
        document.title = data.profile.pageTitle || data.profile.name
      })
      .catch((reason: Error) => {
        if (live) setError(reason.message)
      })
    return () => { live = false }
  }, [])

  const vk = profile ? safeHref(profile.vkUrl) : undefined
  const menuVk = profile ? safeHref(profile.menuVkUrl) : undefined
  const yandex = profile ? safeHref(profile.yandexUrl) : undefined
  const zvuk = profile ? safeHref(profile.zvukUrl) : undefined
  const showSound = profile && (profile.steps.length > 0 || profile.sounds.length > 0 || profile.shots.length > 0)
  const showContact = profile && (profile.about || profile.contactVkTitle || profile.contactReleaseTitle || profile.contactButton)

  return (
    <>
      <header className="nav">
        {profile && <Logo mark={profile.logoMark || 'CK'} name={profile.name} />}
        <nav className={open ? 'nav-links open' : 'nav-links'} onClick={() => setOpen(false)}>
          {profile && showSound && <a href="#sound">{profile.navSound}</a>}
          <a href="#releases">{profile?.navReleases || 'Релизы'}</a>
          {profile && profile.covers.length > 0 && <a href="#covers">{profile.navCovers}</a>}
          {showContact && <a href="#contact">{profile?.navContact}</a>}
        </nav>
        {menuVk && (
          <a className="icon-btn" href={menuVk} target="_blank" rel="noreferrer" aria-label="ВКонтакте">
            <i className={faClass(profile?.menuVkIcon || '')} aria-hidden="true" />
          </a>
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
              {profile.facts.length > 0 && (
                <div className="facts">
                  {profile.facts.map((fact, index) => (
                    <div key={`${fact.title}-${index}`}><b>{fact.title}</b><span>{fact.text}</span></div>
                  ))}
                </div>
              )}
              <ReleaseRail profile={profile} onEnded={() => {
                getSite().then((data) => {
                  setProfile(data.profile)
                  setReleases(data.releases)
                }).catch(() => {})
              }} />
              <div className="cta">
                {yandex && profile.yandexButton && (
                  <a className="vk-cta ym-cta" href={yandex} target="_blank" rel="noreferrer">
                    <span className="vk-cta-ico" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 144 144" aria-hidden="true">
                        <path fill="#FFEE00" d="m130.863 57.739-.468-2.327-19.788-3.457 11.498-15.557-1.337-1.462-16.913 8.11 2.139-21.54-1.738-.997-10.295 17.418L82.395 12H80.39l2.74 25.064-29.08-23.269-2.474.732 22.396 28.122-44.323-14.76-2.006 2.261L67.22 52.686l-54.618 4.521-.602 3.39 56.757 6.184-47.33 39.157 2.005 2.726 56.356-30.648-11.164 53.983h3.41l21.592-50.792 13.17 39.756 2.34-1.795-5.415-40.42 20.524 23.268 1.337-2.128-15.711-28.853 21.928 8.111.201-2.46-19.655-14.493 18.518-4.454Z" />
                      </svg>
                    </span>
                    <span className="vk-cta-txt"><b>{profile.yandexButton}</b></span>
                    <svg className="vk-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </a>
                )}
                {vk && profile.heroButton && (
                  <a className="vk-cta" href={vk} target="_blank" rel="noreferrer">
                    <span className="vk-cta-ico" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.79 16.24s.28-.03.43-.2c.14-.14.13-.42.13-.42s-.02-1.3.58-1.5c.59-.18 1.35.95 2.16 1.36.6.32 1.07.25 1.07.25l2.15-.03s1.12-.07.59-.96c-.04-.08-.31-.66-1.61-1.87-1.35-1.26-1.17-1.06.46-3.24.99-1.33 1.39-2.15 1.27-2.5-.12-.33-.86-.24-.86-.24l-2.42.02s-.18-.03-.31.05-.22.19-.22.19-.39 1.04-.9 1.92c-1.1 1.87-1.54 1.97-1.71 1.85-.42-.27-.31-1.08-.31-1.66 0-1.8.27-2.56-.53-2.76-.27-.06-.46-.1-1.14-.11-.88-.01-1.62 0-2.04.21-.28.14-.49.44-.36.46.16.02.53.1.72.37.25.34.24 1.11.24 1.11s.15 2.14-.33 2.4c-.33.18-.79-.19-1.76-1.86-.5-.86-.87-1.81-.87-1.81s-.07-.18-.2-.28c-.16-.11-.38-.15-.38-.15l-2.3.02s-.35.01-.47.16c-.12.13-.01.41-.01.41s1.8 4.24 3.83 6.38c1.87 1.96 3.99 1.83 3.99 1.83h.96z" />
                      </svg>
                    </span>
                    <span className="vk-cta-txt"><b>{profile.heroButton}</b></span>
                    <svg className="vk-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </a>
                )}
                {zvuk && profile.zvukButton && (
                  <a className="vk-cta zvuk-cta" href={zvuk} target="_blank" rel="noreferrer">
                    <span className="vk-cta-ico" aria-hidden="true">
                      <img src="/media/zvuk.png" alt="" width="32" height="32" />
                    </span>
                    <span className="vk-cta-txt"><b>{profile.zvukButton}</b></span>
                    <svg className="vk-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </a>
                )}
                {profile.releasesButton && <a className="btn btn-ghost" href="#releases">{profile.releasesButton}</a>}
              </div>
            </>
          )}
        </div>

        {profile?.portrait && (
          <div className="wrap">
            <figure className="shot glow-shade shade-violet">
              <img src={profile.portrait} alt={profile.portraitAlt} />
            </figure>
          </div>
        )}

        {profile && showSound && (
          <section className="wrap panel glow-run" id="sound">
            <span className="neon-ring" aria-hidden="true"><span className="neon-ring-spin" /></span>
            {profile.soundKicker && <p className="kicker">{profile.soundKicker}</p>}
            {profile.steps.length > 0 && (
              <div className="steps">
                {profile.steps.map((step, index) => (
                  <article className="step" key={`${step.title}-${index}`}>
                    {step.title && <b>{step.title}</b>}
                    {step.text && <p>{step.text}</p>}
                  </article>
                ))}
              </div>
            )}
            <Blocks items={profile.sounds} />
            <Pictures items={profile.shots} className="gallery" />
          </section>
        )}

        {profile && profile.covers.length > 0 && (
          <section className="wrap panel glow-shade shade-pink" id="covers">
            {profile.coversKicker && <p className="kicker">{profile.coversKicker}</p>}
            <Pictures items={profile.covers} className="covers" />
          </section>
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

        {profile && showContact && (
          <section className="wrap split" id="contact">
            {(profile.aboutKicker || profile.about) && (
              <article className="panel about glow-shade shade-magenta">
                {profile.aboutKicker && <p className="kicker">{profile.aboutKicker}</p>}
                <h2>{profile.name}</h2>
                {profile.about && <AboutText text={profile.about} />}
              </article>
            )}
            <article className="panel glow-run">
              <span className="neon-ring" aria-hidden="true"><span className="neon-ring-spin" /></span>
              {profile.contactKicker && <p className="kicker">{profile.contactKicker}</p>}
              <div className="contact">
                {vk && (profile.contactVkTitle || profile.contactVkText) && (
                  <a className="row" href={vk} target="_blank" rel="noreferrer">
                    {profile.contactVkTitle && <b>{profile.contactVkTitle}</b>}
                    {profile.contactVkText && <span>{profile.contactVkText}</span>}
                  </a>
                )}
                {(profile.contactReleaseTitle || profile.contactReleaseText) && (
                  <div className="row">
                    {profile.contactReleaseTitle && <b>{profile.contactReleaseTitle}</b>}
                    {profile.contactReleaseText && <span>{profile.contactReleaseText}</span>}
                  </div>
                )}
                {profile.contactButton && <a className="btn btn-primary" href="#releases">{profile.contactButton}</a>}
              </div>
            </article>
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
