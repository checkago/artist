import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getSite, platformLabel, releaseKind, safeHref, type Profile, type Release } from '../api'

type TabId = 'home' | 'listen' | 'releases' | 'artist' | 'contact' | 'chat'
type ChatMsg = { role: 'user' | 'assistant'; text: string }

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Старт' },
  { id: 'listen', label: 'Слушать' },
  { id: 'releases', label: 'Релизы' },
  { id: 'artist', label: 'Артист' },
  { id: 'contact', label: 'Связь' },
  { id: 'chat', label: 'Чат' },
]

function AboutText({ text }: { text: string }) {
  return text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean).map((part, index) => (
    <p key={index}>{part}</p>
  ))
}

function useWebApp() {
  useEffect(() => {
    const tg = document.createElement('script')
    tg.src = 'https://telegram.org/js/telegram-web-app.js'
    tg.async = true
    document.head.appendChild(tg)
    const max = document.createElement('script')
    max.src = 'https://dev.max.ru/js/max-web-app.js'
    max.async = true
    document.head.appendChild(max)

    const ready = () => {
      const telegram = (window as Window & { Telegram?: { WebApp?: { ready: () => void; expand: () => void; setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void } } }).Telegram?.WebApp
      telegram?.ready()
      telegram?.expand?.()
      telegram?.setHeaderColor?.('#08080f')
      telegram?.setBackgroundColor?.('#08080f')
      const webApp = (window as Window & { WebApp?: { ready?: () => void } }).WebApp
      webApp?.ready?.()
    }
    tg.addEventListener('load', ready)
    max.addEventListener('load', ready)
    return () => {
      tg.remove()
      max.remove()
    }
  }, [])
}

export default function MiniApp() {
  useWebApp()
  const [tab, setTab] = useState<TabId>('home')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: 'Привет. Я CHECKago Bot — про релизы, площадки, тексты и музыку. Спрашивай.' },
  ])
  const [draft, setDraft] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatError, setChatError] = useState('')
  const chatEnd = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    document.title = 'CHECKago Bot'
    getSite()
      .then((data) => {
        setProfile(data.profile)
        setReleases(data.releases)
      })
      .catch((reason: Error) => setError(reason.message))
  }, [])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, tab])

  const yandex = profile ? safeHref(profile.yandexUrl) : undefined
  const vk = profile ? safeHref(profile.vkUrl) : undefined
  const zvuk = profile ? safeHref(profile.zvukUrl) : undefined
  const wink = profile ? safeHref(profile.winkUrl) : undefined
  const mts = profile ? safeHref(profile.mtsUrl) : undefined
  const followVk = profile ? safeHref(profile.menuVkUrl) : undefined
  const email = profile?.contactEmail?.trim() || ''
  const maxHref = profile ? safeHref(profile.contactMaxUrl || '') : undefined
  const telegramHref = profile ? safeHref(profile.contactTelegramUrl || '') : undefined

  const listenLinks = [
    yandex && { key: 'yandex', href: yandex, label: 'Яндекс.Музыка', kind: 'ym' as const },
    vk && { key: 'vk', href: vk, label: 'VK Музыка', kind: 'vk' as const },
    zvuk && { key: 'zvuk', href: zvuk, label: 'Звук', kind: 'zvuk' as const },
    wink && { key: 'wink', href: wink, label: profile?.winkButton || 'WINK Music', kind: 'plain' as const },
    mts && { key: 'mts', href: mts, label: profile?.mtsButton || 'МТС Music', kind: 'plain' as const },
  ].filter(Boolean) as { key: string; href: string; label: string; kind: 'ym' | 'vk' | 'zvuk' | 'plain' }[]

  async function onChat(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || chatBusy) return
    setDraft('')
    setChatError('')
    const next = [...messages, { role: 'user' as const, text }]
    setMessages(next)
    setChatBusy(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((item) => ({ role: item.role, content: item.text })),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string }
      if (!response.ok) throw new Error(data.error || 'Чат временно недоступен')
      setMessages((current) => [...current, { role: 'assistant', text: data.reply || '…' }])
    } catch (reason) {
      setChatError(reason instanceof Error ? reason.message : 'Ошибка чата')
    } finally {
      setChatBusy(false)
    }
  }

  return (
    <div className="mini">
      <div className="bg-media" aria-hidden="true">
        <video ref={(node) => { if (node) node.muted = true }} autoPlay muted loop playsInline preload="auto" src="/media/bg.webm" />
      </div>

      <header className="mini-top">
        <a className="logo" href="/app">
          <span className="logo-mark">{profile?.logoMark || 'CK'}</span>
          {profile?.name || 'CHECKago'}
        </a>
        <a className="mini-site" href="/" target="_blank" rel="noreferrer">Сайт</a>
      </header>

      <main className="mini-main">
        {error && <p className="error">{error}</p>}
        {!profile && !error && <p className="status">Загрузка</p>}

        {profile && tab === 'home' && (
          <section className="mini-panel mini-hero">
            {profile.badge && <p className="badge"><i />{profile.badge}</p>}
            <h1>
              {profile.titleWhite}
              {profile.titleGradient && <span className="grad" data-text={profile.titleGradient}>{profile.titleGradient}</span>}
            </h1>
            <p className="lead">{profile.lead}</p>
            <p className="mini-bot-lead">
              CHECKago Bot — на каких площадках слушать релизы, что за треки и о чём тексты. Подскажет анонсы, ответит по сотрудничеству и просто поговорит о музыке.
            </p>
            <div className="mini-actions">
              <button className="vk-cta" type="button" onClick={() => setTab('listen')}>
                <span className="vk-cta-txt"><b>Слушать</b></span>
                <svg className="vk-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setTab('chat')}>В чат</button>
            </div>
            <div className="mini-quick">
              {TABS.filter((item) => item.id !== 'home').map((item) => (
                <button key={item.id} className="mini-chip" type="button" onClick={() => setTab(item.id)}>{item.label}</button>
              ))}
            </div>
          </section>
        )}

        {profile && tab === 'listen' && (
          <section className="mini-panel">
            <p className="kicker">{profile.listenKicker || 'Слушать'}</p>
            <div className="mini-stack">
              {listenLinks.map((item) => (
                <a
                  key={item.key}
                  className={item.kind === 'ym' ? 'vk-cta ym-cta' : item.kind === 'zvuk' ? 'vk-cta zvuk-cta' : item.kind === 'vk' ? 'vk-cta' : 'btn btn-ghost'}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.kind !== 'plain' ? (
                    <>
                      <span className="vk-cta-txt"><b>{item.label}</b></span>
                      <svg className="vk-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </>
                  ) : item.label}
                </a>
              ))}
              {listenLinks.length === 0 && <p className="note">Ссылки на площадки появятся здесь.</p>}
            </div>
          </section>
        )}

        {profile && tab === 'releases' && (
          <section className="mini-panel">
            <p className="kicker">{profile.releasesKicker || 'Релизы'}</p>
            <div className="mini-releases">
              {releases.length === 0 && <div className="empty">{profile.releasesEmpty || 'Пока пусто.'}</div>}
              {releases.map((release) => {
                const primary = release.links.map((link) => ({ ...link, href: safeHref(link.url) })).find((link) => link.href)
                return (
                  <article className="mini-release" key={release.id}>
                    <img src={release.cover} alt="" />
                    <div>
                      <h3>{release.title}</h3>
                      <p className="release-kind">{releaseKind(release.tracks)}</p>
                      <p className="release-meta">{release.artist} · {release.year}</p>
                      {release.blurb && <p className="release-blurb">{release.blurb}</p>}
                      {primary?.href ? (
                        <a className="btn btn-primary btn-small" href={primary.href} target="_blank" rel="noreferrer">
                          Слушать · {platformLabel(primary.platform)}
                        </a>
                      ) : (
                        <p className="release-soon">Скоро</p>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {profile && tab === 'artist' && (
          <section className="mini-panel about">
            <p className="kicker">{profile.aboutKicker || 'Артист'}</p>
            <h2>{profile.name}</h2>
            {profile.about && <AboutText text={profile.about} />}
            {profile.portrait && (
              <figure className="shot artist-portrait">
                <img src={profile.portrait} alt={profile.portraitAlt} />
              </figure>
            )}
          </section>
        )}

        {profile && tab === 'contact' && (
          <section className="mini-panel">
            <p className="kicker">{profile.contactKicker || 'Контакт'}</p>
            {profile.contactReleaseText && <p className="section-lead">{profile.contactReleaseText}</p>}
            <div className="contact-card">
              <div className="contact-primary">
                {email ? (
                  <a className="contact-email" href={`mailto:${email}`}>
                    <span className="contact-email-action">Написать</span>
                    <span className="contact-email-addr">{email}</span>
                  </a>
                ) : (
                  <p className="contact-hint">По сотрудничеству и прессе — через мессенджеры ниже.</p>
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
                    <span className="contact-bot is-soon" title="Скоро"><img src="/media/max.png" alt="" width="44" height="44" /></span>
                  )}
                  {telegramHref ? (
                    <a className="contact-bot" href={telegramHref} target="_blank" rel="noreferrer" aria-label="Telegram">
                      <img src="/media/telegram.png" alt="" width="44" height="44" />
                    </a>
                  ) : (
                    <span className="contact-bot is-soon" title="Скоро"><img src="/media/telegram.png" alt="" width="44" height="44" /></span>
                  )}
                </div>
              </div>
            </div>
            {followVk && (
              <a className="row" href={followVk} target="_blank" rel="noreferrer" style={{ marginTop: 14 }}>
                <b>{profile.contactVkTitle || 'ВКонтакте'}</b>
                <span>{profile.contactVkText || 'новые треки и обложки'}</span>
              </a>
            )}
          </section>
        )}

        {tab === 'chat' && (
          <section className="mini-panel mini-chat">
            <p className="kicker">Чат</p>
            <div className="mini-chat-log">
              {messages.map((item, index) => (
                <div className={item.role === 'user' ? 'mini-bubble is-user' : 'mini-bubble is-bot'} key={`${item.role}-${index}`}>
                  {item.text}
                </div>
              ))}
              {chatBusy && <div className="mini-bubble is-bot is-typing">Печатает…</div>}
              <div ref={chatEnd} />
            </div>
            {chatError && <p className="error">{chatError}</p>}
            <form className="mini-chat-form" onSubmit={onChat}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Спроси про трек, площадку или смысл…"
                maxLength={1200}
                disabled={chatBusy}
              />
              <button className="btn btn-primary btn-small" type="submit" disabled={chatBusy || !draft.trim()}>
                Отправить
              </button>
            </form>
          </section>
        )}
      </main>

      <nav className="mini-nav" aria-label="Разделы">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? 'mini-nav-btn is-active' : 'mini-nav-btn'}
            type="button"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
