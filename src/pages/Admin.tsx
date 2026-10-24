import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  PLATFORMS,
  deleteRelease,
  getSession,
  getSite,
  login,
  logout,
  moveRelease,
  platformLabel,
  saveProfile,
  saveRelease,
  uploadMedia,
  type Picture,
  type PlatformId,
  type Profile,
  type Release,
  type ReleaseLink,
  type TextBlock,
} from '../api'

type Draft = {
  id: string | null
  title: string
  artist: string
  year: string
  links: ReleaseLink[]
  file: File | null
  preview: string
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction
  if (next < 0 || next >= items.length) return items
  const copy = items.slice()
  const [item] = copy.splice(index, 1)
  copy.splice(next, 0, item)
  return copy
}

function PairEditor({
  items,
  titleLabel,
  textLabel,
  addLabel,
  onChange,
}: {
  items: TextBlock[]
  titleLabel: string
  textLabel: string
  addLabel: string
  onChange: (items: TextBlock[]) => void
}) {
  return (
    <div className="stack">
      {items.map((item, index) => (
        <div className="admin-card stack" key={index}>
          <div className="admin-grid">
            <label>{titleLabel}<input value={item.title} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry))} /></label>
            <label>{textLabel}<textarea value={item.text} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, text: event.target.value } : entry))} /></label>
          </div>
          <div className="release-tools">
            <button className="btn btn-ghost btn-small" type="button" disabled={index === 0} onClick={() => onChange(moveItem(items, index, -1))}>Вверх</button>
            <button className="btn btn-ghost btn-small" type="button" disabled={index === items.length - 1} onClick={() => onChange(moveItem(items, index, 1))}>Вниз</button>
            <button className="btn btn-danger btn-small" type="button" onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}>Удалить</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-small" type="button" onClick={() => onChange([...items, { title: '', text: '' }])}>{addLabel}</button>
    </div>
  )
}

function PictureEditor({
  items,
  onChange,
  onError,
}: {
  items: Picture[]
  onChange: (items: Picture[]) => void
  onError: (message: string) => void
}) {
  async function add(file: File | undefined) {
    if (!file) return
    try {
      const uploaded = await uploadMedia(file)
      onChange([...items, { src: uploaded.url, alt: '' }])
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Не удалось загрузить изображение')
    }
  }

  async function replace(index: number, file: File | undefined) {
    if (!file) return
    try {
      const uploaded = await uploadMedia(file)
      onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, src: uploaded.url } : item))
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Не удалось загрузить изображение')
    }
  }

  return (
    <div className="stack">
      {items.map((item, index) => (
        <div className="picture-row" key={`${item.src}-${index}`}>
          <img src={item.src} alt="" />
          <div className="stack">
            <label>Подпись<input value={item.alt} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, alt: event.target.value } : entry))} /></label>
            <div className="release-tools">
              <label className="btn btn-ghost btn-small file-btn">
                Заменить
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { void replace(index, event.target.files?.[0]) }} />
              </label>
              <button className="btn btn-ghost btn-small" type="button" disabled={index === 0} onClick={() => onChange(moveItem(items, index, -1))}>Вверх</button>
              <button className="btn btn-ghost btn-small" type="button" disabled={index === items.length - 1} onClick={() => onChange(moveItem(items, index, 1))}>Вниз</button>
              <button className="btn btn-danger btn-small" type="button" onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}>Удалить</button>
            </div>
          </div>
        </div>
      ))}
      <label className="btn btn-ghost btn-small file-btn">
        Добавить изображение
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { void add(event.target.files?.[0]) }} />
      </label>
    </div>
  )
}

const TABS = [
  { id: 'releases', label: 'Релизы' },
  { id: 'hero', label: 'Экран' },
  { id: 'upcoming', label: 'Анонс' },
  { id: 'sound', label: 'Трек' },
  { id: 'covers', label: 'Обложки' },
  { id: 'contact', label: 'Связь' },
] as const

type TabId = (typeof TABS)[number]['id']

const emptyDraft = (): Draft => ({
  id: null,
  title: '',
  artist: 'CHECKago',
  year: String(new Date().getFullYear()),
  links: [{ platform: 'vk', url: '' }],
  file: null,
  preview: '',
})

export default function Admin() {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileNote, setProfileNote] = useState('')
  const [releaseError, setReleaseError] = useState('')
  const [releaseNote, setReleaseNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [formToken, setFormToken] = useState(0)
  const [tab, setTab] = useState<TabId>('releases')
  const releaseFormRef = useRef<HTMLFormElement>(null)

  function openTab(next: TabId) {
    setTab(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function load() {
    const [session, site] = await Promise.all([getSession(), getSite()])
    setAuthed(session.ok)
    setProfile(site.profile)
    setReleases(site.releases)
  }

  useEffect(() => {
    document.title = 'Админка — CHECKago'
    load()
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setReady(true))
  }, [])

  async function onLogin(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(password)
      setPassword('')
      setAuthed(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ошибка входа')
    } finally {
      setBusy(false)
    }
  }

  async function onLogout() {
    await logout()
    setAuthed(false)
    setDraft(null)
  }

  function patchProfile(patch: Partial<Profile>) {
    setProfile((current) => current ? { ...current, ...patch } : current)
  }

  async function onUpcomingCover(file: File | undefined) {
    if (!file || !profile) return
    setProfileError('')
    try {
      const uploaded = await uploadMedia(file)
      patchProfile({ upcomingCover: uploaded.url })
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : 'Не удалось загрузить обложку')
    }
  }

  async function onPortrait(file: File | undefined) {
    if (!file || !profile) return
    setProfileError('')
    try {
      const uploaded = await uploadMedia(file)
      patchProfile({ portrait: uploaded.url })
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : 'Не удалось загрузить портрет')
    }
  }

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault()
    if (!profile) return
    setBusy(true)
    setProfileError('')
    setProfileNote('')
    try {
      const result = await saveProfile(profile)
      setProfile(result.profile)
      setProfileNote('Текст визитки сохранён')
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : 'Не сохранилось')
    } finally {
      setBusy(false)
    }
  }

  function openCreate() {
    setDraft(emptyDraft())
    setReleaseError('')
    setReleaseNote('')
    setFormToken((value) => value + 1)
  }

  function openEdit(release: Release) {
    setDraft({
      id: release.id,
      title: release.title,
      artist: release.artist,
      year: String(release.year),
      links: release.links.length > 0 ? release.links.map((link) => ({ ...link })) : [{ platform: 'vk', url: '' }],
      file: null,
      preview: release.cover,
    })
    setReleaseError('')
    setReleaseNote('')
    setFormToken((value) => value + 1)
  }

  useEffect(() => {
    if (formToken === 0) return
    releaseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [formToken])

  function onFile(file: File | null) {
    setDraft((current) => {
      if (!current) return current
      if (current.preview.startsWith('blob:')) URL.revokeObjectURL(current.preview)
      return {
        ...current,
        file,
        preview: file ? URL.createObjectURL(file) : current.preview,
      }
    })
  }

  function updateLink(index: number, patch: Partial<ReleaseLink>) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        links: current.links.map((link, linkIndex) => (linkIndex === index ? { ...link, ...patch } : link)),
      }
    })
  }

  async function onSaveRelease(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const title = draft.title.trim()
    const artist = draft.artist.trim()
    const year = Number(draft.year)
    const links = draft.links.map((link) => {
      const url = link.url.trim()
      if (!url || /^https?:\/\//i.test(url)) return { ...link, url }
      return { ...link, url: `https://${url}` }
    })
    if (!title || !artist) {
      setReleaseError('Нужны название и исполнитель')
      return
    }
    if (!Number.isInteger(year) || year < 1950 || year > 2100) {
      setReleaseError('Год указан неверно')
      return
    }
    if (!draft.id && !draft.file) {
      setReleaseError('Добавьте обложку. Без файла релиз не сохраняется и в списке не появляется.')
      return
    }
    setBusy(true)
    setReleaseError('')
    setReleaseNote('')
    try {
      await saveRelease(draft.id, { title, artist, year, links }, draft.file)
      if (draft.preview.startsWith('blob:')) URL.revokeObjectURL(draft.preview)
      const savedTitle = title
      setDraft(null)
      const site = await getSite()
      setReleases(site.releases)
      setReleaseNote(`«${savedTitle}» сохранён. Карточка в списке выше и на главной.`)
      document.getElementById('admin-releases')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (reason) {
      setReleaseError(reason instanceof Error ? reason.message : 'Не сохранилось')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(release: Release) {
    if (!window.confirm(`Удалить «${release.title}»?`)) return
    setBusy(true)
    setReleaseError('')
    try {
      await deleteRelease(release.id)
      setReleases((current) => current.filter((item) => item.id !== release.id))
      if (draft?.id === release.id) setDraft(null)
    } catch (reason) {
      setReleaseError(reason instanceof Error ? reason.message : 'Не удалось удалить')
    } finally {
      setBusy(false)
    }
  }

  async function onMove(id: string, direction: 'up' | 'down') {
    setReleaseError('')
    try {
      const result = await moveRelease(id, direction)
      setReleases(result.releases)
    } catch (reason) {
      setReleaseError(reason instanceof Error ? reason.message : 'Не удалось переместить')
    }
  }

  if (!ready) return <main className="page"><p className="wrap status">Загрузка</p></main>

  if (!authed) {
    return (
      <main className="page">
        <form className="panel login stack" onSubmit={onLogin}>
          <a className="logo" href="/"><span className="logo-mark">CK</span>CHECKago</a>
          <h1>Админка</h1>
          <p className="note">Релизы, тексты визитки и ссылка на сообщество.</p>
          <label>
            Пароль
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>Войти</button>
        </form>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="admin-page">
        <div className="admin-head">
          <a className="logo" href="/"><span className="logo-mark">CK</span>CHECKago</a>
          <button className="btn btn-ghost" type="button" onClick={onLogout}>Выйти</button>
        </div>
        <div className="admin-tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'admin-tab is-on' : 'admin-tab'}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => openTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <section className="panel stack" id="admin-releases" hidden={tab !== 'releases'}>
          <div className="admin-head">
            <p className="kicker">Релизы</p>
            <button className="btn btn-ghost btn-small" type="button" onClick={openCreate}>Новый релиз</button>
          </div>
          {releaseError && <p className="error">{releaseError}</p>}
          {releaseNote && <p className="status">{releaseNote}</p>}

          {releases.map((release, index) => (
            <article className="release-admin" key={release.id}>
              <img src={release.cover} alt="" />
              <div>
                <strong>{release.title}</strong>
                <p className="release-meta">{release.artist} · {release.year}</p>
                <p className="note">{release.links.map((link) => platformLabel(link.platform)).join(' · ') || 'Без ссылок'}</p>
              </div>
              <div className="release-tools">
                <button className="btn btn-ghost btn-small" type="button" disabled={index === 0} onClick={() => onMove(release.id, 'up')}>Вверх</button>
                <button className="btn btn-ghost btn-small" type="button" disabled={index === releases.length - 1} onClick={() => onMove(release.id, 'down')}>Вниз</button>
                <button className="btn btn-ghost btn-small" type="button" onClick={() => openEdit(release)}>Править</button>
                <button className="btn btn-danger btn-small" type="button" onClick={() => onDelete(release)}>Удалить</button>
              </div>
            </article>
          ))}
          {releases.length === 0 && <div className="empty">Пока пусто. Новый релиз появляется здесь только после обложки и кнопки «Добавить релиз».</div>}

          {draft && (
            <form className="admin-card stack" ref={releaseFormRef} onSubmit={onSaveRelease}>
              <div className="admin-grid">
                <label>Название<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
                <label>Исполнитель<input value={draft.artist} onChange={(event) => setDraft({ ...draft, artist: event.target.value })} required /></label>
                <label>Год<input inputMode="numeric" value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} required /></label>
                <label>
                  {draft.id ? 'Новая обложка' : 'Обложка'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
                </label>
              </div>
              <p className="note">{draft.id ? 'Файл нужен только если меняете картинку.' : 'Без файла релиз не сохранится. Ссылку можно вставить и без https://.'}</p>
              {draft.preview && <img src={draft.preview} alt="" style={{ width: 180, borderRadius: 12 }} />}
              <div className="stack">
                {draft.links.map((link, index) => (
                  <div className="link-row" key={index}>
                    <select value={link.platform} onChange={(event) => updateLink(index, { platform: event.target.value as PlatformId })}>
                      {PLATFORMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                    <input placeholder="https:// или адрес площадки" value={link.url} onChange={(event) => updateLink(index, { url: event.target.value })} />
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => setDraft({ ...draft, links: draft.links.filter((_, linkIndex) => linkIndex !== index) })}>×</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-small" type="button" onClick={() => setDraft({ ...draft, links: [...draft.links, { platform: 'yandex', url: '' }] })}>Площадка</button>
              </div>
              {releaseError && <p className="error">{releaseError}</p>}
              <div className="release-tools">
                <button className="btn btn-primary" type="submit" disabled={busy}>{draft.id ? 'Сохранить релиз' : 'Добавить релиз'}</button>
                <button className="btn btn-ghost" type="button" onClick={() => setDraft(null)}>Отмена</button>
              </div>
            </form>
          )}
        </section>

        {profile && (
          <form id="page-form" className="panel stack" hidden={tab === 'releases'} onSubmit={onSaveProfile}>
            <section hidden={tab !== 'hero'}>
            <h2>Первый экран</h2>
            <div className="admin-grid">
              <label>Имя<input value={profile.name} onChange={(event) => patchProfile({ name: event.target.value })} /></label>
              <label>Буквы в знаке<input value={profile.logoMark} maxLength={4} onChange={(event) => patchProfile({ logoMark: event.target.value })} /></label>
              <label>Заголовок вкладки<input value={profile.pageTitle} onChange={(event) => patchProfile({ pageTitle: event.target.value })} /></label>
              <label>Бейдж<input value={profile.badge} onChange={(event) => patchProfile({ badge: event.target.value })} /></label>
              <label>Заголовок<input value={profile.titleWhite} onChange={(event) => patchProfile({ titleWhite: event.target.value })} /></label>
              <label>Градиентная строка<input value={profile.titleGradient} onChange={(event) => patchProfile({ titleGradient: event.target.value })} /></label>
              <label className="wide">Лид<textarea value={profile.lead} onChange={(event) => patchProfile({ lead: event.target.value })} /></label>
              <label>Кнопка ВКонтакте<input value={profile.heroButton} onChange={(event) => patchProfile({ heroButton: event.target.value })} /></label>
              <label>Кнопка релизов<input value={profile.releasesButton} onChange={(event) => patchProfile({ releasesButton: event.target.value })} /></label>
              <label className="wide">ВКонтакте<input value={profile.vkUrl} onChange={(event) => patchProfile({ vkUrl: event.target.value })} /></label>
            </div>
            <p className="kicker">Пункты меню</p>
            <div className="admin-grid">
              <label>Звук<input value={profile.navSound} onChange={(event) => patchProfile({ navSound: event.target.value })} /></label>
              <label>Релизы<input value={profile.navReleases} onChange={(event) => patchProfile({ navReleases: event.target.value })} /></label>
              <label>Обложки<input value={profile.navCovers} onChange={(event) => patchProfile({ navCovers: event.target.value })} /></label>
              <label>Контакты<input value={profile.navContact} onChange={(event) => patchProfile({ navContact: event.target.value })} /></label>
            </div>
            <p className="kicker">Факты под заголовком</p>
            <PairEditor items={profile.facts} titleLabel="Крупно" textLabel="Подпись" addLabel="Факт" onChange={(facts) => patchProfile({ facts })} />

            <h2>Портрет</h2>
            {profile.portrait && <img src={profile.portrait} alt="" style={{ width: 220, borderRadius: 16 }} />}
            <div className="admin-grid">
              <label>Подпись<input value={profile.portraitAlt} onChange={(event) => patchProfile({ portraitAlt: event.target.value })} /></label>
              <label className="btn btn-ghost file-btn">
                {profile.portrait ? 'Заменить портрет' : 'Загрузить портрет'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { void onPortrait(event.target.files?.[0]) }} />
              </label>
            </div>
            {profile.portrait && <button className="btn btn-danger btn-small" type="button" onClick={() => patchProfile({ portrait: '' })}>Убрать портрет</button>}
            </section>

            <section hidden={tab !== 'upcoming'}>
            <h2>Ближайший релиз</h2>
            <p className="status">Пустая дата прячет блок. Когда время наступит, он тоже исчезнет.</p>
            {profile.upcomingCover && <img src={profile.upcomingCover} alt="" style={{ width: 120, borderRadius: 14 }} />}
            <div className="admin-grid">
              <label>Бейдж<input value={profile.upcomingBadge ?? ''} onChange={(event) => patchProfile({ upcomingBadge: event.target.value })} /></label>
              <label>Название<input value={profile.upcomingTitle ?? ''} onChange={(event) => patchProfile({ upcomingTitle: event.target.value })} /></label>
              <label className="wide">Описание<textarea value={profile.upcomingText ?? ''} onChange={(event) => patchProfile({ upcomingText: event.target.value })} /></label>
              <label>Дата и время выхода<input type="datetime-local" value={profile.upcomingAt ?? ''} onChange={(event) => patchProfile({ upcomingAt: event.target.value })} /></label>
              <label>Подпись таймера<input value={profile.upcomingLabel ?? ''} onChange={(event) => patchProfile({ upcomingLabel: event.target.value })} /></label>
              <label className="btn btn-ghost file-btn">
                {profile.upcomingCover ? 'Заменить обложку' : 'Загрузить обложку'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { void onUpcomingCover(event.target.files?.[0]) }} />
              </label>
            </div>
            {profile.upcomingCover && <button className="btn btn-danger btn-small" type="button" onClick={() => patchProfile({ upcomingCover: '' })}>Убрать обложку</button>}
            </section>

            <section hidden={tab !== 'sound'}>
            <h2>Как собран трек</h2>
            <label>Заголовок блока<input value={profile.soundKicker} onChange={(event) => patchProfile({ soundKicker: event.target.value })} /></label>
            <p className="kicker">Шаги</p>
            <PairEditor items={profile.steps} titleLabel="Шаг" textLabel="Текст" addLabel="Шаг" onChange={(steps) => patchProfile({ steps })} />
            <p className="kicker">Жанры</p>
            <PairEditor items={profile.sounds} titleLabel="Жанр" textLabel="Текст" addLabel="Жанр" onChange={(sounds) => patchProfile({ sounds })} />
            <p className="kicker">Кадры</p>
            <PictureEditor items={profile.shots} onChange={(shots) => patchProfile({ shots })} onError={setProfileError} />
            </section>

            <section hidden={tab !== 'covers'}>
            <h2>Обложки</h2>
            <label>Заголовок блока<input value={profile.coversKicker} onChange={(event) => patchProfile({ coversKicker: event.target.value })} /></label>
            <PictureEditor items={profile.covers} onChange={(covers) => patchProfile({ covers })} onError={setProfileError} />
            </section>

            <section hidden={tab !== 'contact'}>
            <h2>Подписи релизов</h2>
            <div className="admin-grid">
              <label>Заголовок<input value={profile.releasesKicker} onChange={(event) => patchProfile({ releasesKicker: event.target.value })} /></label>
              <label>Текст, если релизов нет<textarea value={profile.releasesEmpty} onChange={(event) => patchProfile({ releasesEmpty: event.target.value })} /></label>
            </div>

            <h2>Артист и связь</h2>
            <div className="admin-grid">
              <label>Заголовок об артисте<input value={profile.aboutKicker} onChange={(event) => patchProfile({ aboutKicker: event.target.value })} /></label>
              <label>Заголовок связи<input value={profile.contactKicker} onChange={(event) => patchProfile({ contactKicker: event.target.value })} /></label>
              <label className="wide">Текст об артисте<textarea value={profile.about} onChange={(event) => patchProfile({ about: event.target.value })} /></label>
              <label>Карточка ВКонтакте<input value={profile.contactVkTitle} onChange={(event) => patchProfile({ contactVkTitle: event.target.value })} /></label>
              <label>Текст карточки<textarea value={profile.contactVkText} onChange={(event) => patchProfile({ contactVkText: event.target.value })} /></label>
              <label>Карточка релизов<input value={profile.contactReleaseTitle} onChange={(event) => patchProfile({ contactReleaseTitle: event.target.value })} /></label>
              <label>Текст карточки<textarea value={profile.contactReleaseText} onChange={(event) => patchProfile({ contactReleaseText: event.target.value })} /></label>
              <label>Кнопка<input value={profile.contactButton} onChange={(event) => patchProfile({ contactButton: event.target.value })} /></label>
              <label>Подвал<input value={profile.footer} onChange={(event) => patchProfile({ footer: event.target.value })} /></label>
            </div>

            </section>
          </form>
        )}
        {profile && (
          <div className="save-bar">
            {profileError && <p className="error">{profileError}</p>}
            {profileNote && <p className="status">{profileNote}</p>}
            <button className="btn btn-primary" type="submit" form="page-form" disabled={busy}>Сохранить</button>
          </div>
        )}
      </div>
    </main>
  )
}
