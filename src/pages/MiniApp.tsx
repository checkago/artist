import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getSite, platformLabel, releaseKind, safeHref, type Profile, type Release } from '../api'

type TabId = 'home' | 'listen' | 'releases' | 'artist' | 'contact' | 'chat'
type ChatMsg = { role: 'user' | 'assistant'; text: string }

const TABS: { id: Exclude<TabId, 'home'>; label: string; icon: string }[] = [
  { id: 'listen', label: 'Слушать', icon: '▶' },
  { id: 'releases', label: 'Релизы', icon: '◎' },
  { id: 'artist', label: 'Артист', icon: '◇' },
  { id: 'contact', label: 'Связь', icon: '@' },
  { id: 'chat', label: 'Чат', icon: '✦' },
]

function paras(text: string) {
  return text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
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
      const telegram = (window as Window & {
        Telegram?: { WebApp?: { ready: () => void; expand: () => void; setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void } }
      }).Telegram?.WebApp
      telegram?.ready()
      telegram?.expand?.()
      telegram?.setHeaderColor?.('#0b0914')
      telegram?.setBackgroundColor?.('#0b0914')
      ;(window as Window & { WebApp?: { ready?: () => void } }).WebApp?.ready?.()
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
    { role: 'assistant', text: 'Привет. Я CHECKago Bot — релизы, площадки, тексты и музыка. Спрашивай.' },
  ])
  const [draft, setDraft] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatError, setChatError] = useState('')
  const logRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.documentElement.classList.add('mini-root')
    document.body.classList.add('mini-root')
    document.title = 'CHECKago Bot'
    getSite()
      .then((data) => {
        setProfile(data.profile)
        setReleases(data.releases)
      })
      .catch((reason: Error) => setError(reason.message))
    return () => {
      document.documentElement.classList.remove('mini-root')
      document.body.classList.remove('mini-root')
    }
  }, [])

  useEffect(() => {
    if (tab !== 'chat') return
    const node = logRef.current
    if (node) node.scrollTop = node.scrollHeight
    inputRef.current?.focus()
  }, [messages, chatBusy, tab])

  const yandex = profile ? safeHref(profile.yandexUrl) : undefined
  const vk = profile ? safeHref(profile.vkUrl) : undefined
  const zvuk = profile ? safeHref(profile.zvukUrl) : undefined
  const wink = profile ? safeHref(profile.winkUrl) : undefined
  const mts = profile ? safeHref(profile.mtsUrl) : undefined
  const followVk = profile ? safeHref(profile.menuVkUrl) : undefined
  const email = profile?.contactEmail?.trim() || ''
  const maxHref = profile ? safeHref(profile.contactMaxUrl || '') : undefined
  const telegramHref = profile ? safeHref(profile.contactTelegramUrl || '') : undefined

  const listen = [
    yandex && { key: 'yandex', href: yandex, label: 'Яндекс.Музыка', tone: 'ym' },
    vk && { key: 'vk', href: vk, label: 'VK Музыка', tone: 'vk' },
    zvuk && { key: 'zvuk', href: zvuk, label: 'Звук', tone: 'zvuk' },
    wink && { key: 'wink', href: wink, label: profile?.winkButton || 'WINK Music', tone: 'soft' },
    mts && { key: 'mts', href: mts, label: profile?.mtsButton || 'МТС Music', tone: 'soft' },
  ].filter(Boolean) as { key: string; href: string; label: string; tone: string }[]

  async function sendChat(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || chatBusy) return
    setDraft('')
    setChatError('')
    const history = [...messages, { role: 'user' as const, text }]
    setMessages(history)
    setChatBusy(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((item) => ({ role: item.role, content: item.text })),
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

  const title = {
    home: 'CHECKago',
    listen: 'Слушать',
    releases: 'Релизы',
    artist: 'Артист',
    contact: 'Связь',
    chat: 'Чат',
  }[tab]

  return (
    <div className="ma">
      <header className="ma-bar">
        <button className="ma-brand" type="button" onClick={() => setTab('home')}>
          <span className="ma-mark">{profile?.logoMark || 'CK'}</span>
          <span>{title}</span>
        </button>
        {profile?.badge && tab === 'home' && <span className="ma-badge">{profile.badge}</span>}
      </header>

      <div className={tab === 'chat' ? 'ma-body is-chat' : 'ma-body'}>
        {error && <p className="ma-error">{error}</p>}
        {!profile && !error && <p className="ma-muted">Загрузка…</p>}

        {profile && tab === 'home' && (
          <section className="ma-screen">
            <p className="ma-kicker">Мини-приложение</p>
            <h1 className="ma-title">
              {profile.titleWhite}{' '}
              <span className="ma-grad">{profile.titleGradient}</span>
            </h1>
            <p className="ma-text">{profile.lead}</p>
            <p className="ma-text ma-dim">
              На каких площадках слушать релизы, что за треки и о чём тексты. Анонсы, сотрудничество и живой чат.
            </p>
            <div className="ma-grid">
              {TABS.map((item) => (
                <button key={item.id} className="ma-tile" type="button" onClick={() => setTab(item.id)}>
                  <span className="ma-tile-ico" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {profile && tab === 'listen' && (
          <section className="ma-screen">
            <p className="ma-kicker">Площадки</p>
            <div className="ma-list">
              {listen.map((item) => (
                <a key={item.key} className={`ma-link ma-link-${item.tone}`} href={item.href} target="_blank" rel="noreferrer">
                  <span>{item.label}</span>
                  <span aria-hidden="true">→</span>
                </a>
              ))}
              {listen.length === 0 && <p className="ma-muted">Ссылки появятся позже.</p>}
            </div>
          </section>
        )}

        {profile && tab === 'releases' && (
          <section className="ma-screen">
            <p className="ma-kicker">Каталог</p>
            <div className="ma-list">
              {releases.length === 0 && <p className="ma-muted">{profile.releasesEmpty || 'Пока пусто.'}</p>}
              {releases.map((release) => {
                const primary = release.links
                  .map((link) => ({ ...link, href: safeHref(link.url) }))
                  .find((link) => link.href)
                return (
                  <article className="ma-card" key={release.id}>
                    <img src={release.cover} alt="" />
                    <div className="ma-card-body">
                      <h2>{release.title}</h2>
                      <p className="ma-meta">{releaseKind(release.tracks)} · {release.year}</p>
                      {release.blurb && <p className="ma-dim">{release.blurb}</p>}
                      {primary?.href ? (
                        <a className="ma-mini-btn" href={primary.href} target="_blank" rel="noreferrer">
                          Слушать · {platformLabel(primary.platform)}
                        </a>
                      ) : (
                        <span className="ma-soon">Скоро</span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {profile && tab === 'artist' && (
          <section className="ma-screen">
            <p className="ma-kicker">{profile.aboutKicker || 'Артист'}</p>
            <h1 className="ma-title">{profile.name}</h1>
            {paras(profile.about).map((part, index) => (
              <p className="ma-text" key={index}>{part}</p>
            ))}
            {profile.portrait && <img className="ma-portrait" src={profile.portrait} alt={profile.portraitAlt} />}
          </section>
        )}

        {profile && tab === 'contact' && (
          <section className="ma-screen">
            <p className="ma-kicker">{profile.contactKicker || 'Связь'}</p>
            {profile.contactReleaseText && <p className="ma-text">{profile.contactReleaseText}</p>}
            <div className="ma-list">
              {email && (
                <a className="ma-link ma-link-soft" href={`mailto:${email}`}>
                  <span>
                    <strong>Email</strong>
                    <small>{email}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </a>
              )}
              {maxHref && (
                <a className="ma-link ma-link-soft" href={maxHref} target="_blank" rel="noreferrer">
                  <span><strong>MAX</strong><small>{profile.contactMaxText || 'чат-бот'}</small></span>
                  <span aria-hidden="true">→</span>
                </a>
              )}
              {telegramHref && (
                <a className="ma-link ma-link-soft" href={telegramHref} target="_blank" rel="noreferrer">
                  <span><strong>Telegram</strong><small>{profile.contactTelegramText || 'чат-бот'}</small></span>
                  <span aria-hidden="true">→</span>
                </a>
              )}
              {followVk && (
                <a className="ma-link ma-link-soft" href={followVk} target="_blank" rel="noreferrer">
                  <span><strong>{profile.contactVkTitle || 'ВКонтакте'}</strong><small>{profile.contactVkText || 'сообщество'}</small></span>
                  <span aria-hidden="true">→</span>
                </a>
              )}
            </div>
          </section>
        )}

        {tab === 'chat' && (
          <section className="ma-chat">
            <div className="ma-chat-log" ref={logRef}>
              {messages.map((item, index) => (
                <div className={item.role === 'user' ? 'ma-msg is-user' : 'ma-msg is-bot'} key={`${item.role}-${index}`}>
                  {item.text}
                </div>
              ))}
              {chatBusy && <div className="ma-msg is-bot is-wait">Печатает…</div>}
            </div>
            {chatError && <p className="ma-error">{chatError}</p>}
            <form className="ma-chat-form" onSubmit={sendChat}>
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Спроси про трек или площадку…"
                maxLength={1200}
                disabled={chatBusy}
                enterKeyHint="send"
              />
              <button type="submit" disabled={chatBusy || !draft.trim()} aria-label="Отправить">
                ↑
              </button>
            </form>
          </section>
        )}
      </div>

      <nav className="ma-nav" aria-label="Разделы">
        <button className={tab === 'home' ? 'is-on' : undefined} type="button" onClick={() => setTab('home')}>
          <span aria-hidden="true">⌂</span>
          Старт
        </button>
        {TABS.map((item) => (
          <button key={item.id} className={tab === item.id ? 'is-on' : undefined} type="button" onClick={() => setTab(item.id)}>
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
