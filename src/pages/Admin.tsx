import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  PLATFORMS,
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  deleteRelease,
  getAdminSite,
  getSession,
  login,
  logout,
  moveRelease,
  platformLabel,
  releaseKind,
  saveProfile,
  saveRelease,
  uploadMedia,
  type Picture,
  type PlatformId,
  type Profile,
  type Announcement,
  type Release,
  type ReleaseLink,
  type TextBlock,
} from '../api'

type Draft = {
  id: string | null
  title: string
  artist: string
  year: string
  tracks: string
  releasedAt: string
  links: ReleaseLink[]
  file: File | null
  preview: string
  isDraft: boolean
  visibleWithoutAnnouncement: boolean
}

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

function upcomingParts(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value)
  return { date: match?.[1] ?? '', hour: match?.[2] ?? '00', minute: match?.[3] ?? '00' }
}

function upcomingValue(date: string, hour: string, minute: string) {
  if (!date) return ''
  return `${date}T${hour}:${minute}`
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Дата не указана'
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  if (date.getHours() === 0 && date.getMinutes() === 0) return day
  return `${day}, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
}

function WhenField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const when = upcomingParts(value)
  const update = (part: { date?: string; hour?: string; minute?: string }) => {
    onChange(upcomingValue(part.date ?? when.date, part.hour ?? when.hour, part.minute ?? when.minute))
  }
  return (
    <label className="wide">
      Дата и время выхода
      <span className="when-pick">
        <input type="date" lang="ru-RU" value={when.date} onChange={(event) => update({ date: event.target.value })} />
        <select aria-label="Часы" value={when.date ? when.hour : '00'} disabled={!when.date} onChange={(event) => update({ hour: event.target.value })}>
          {hours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
        </select>
        <span className="when-colon" aria-hidden="true">:</span>
        <select aria-label="Минуты" value={when.date ? when.minute : '00'} disabled={!when.date} onChange={(event) => update({ minute: event.target.value })}>
          {minutes.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
        </select>
      </span>
    </label>
  )
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

function withHttps(url: string): string {
  const value = url.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if ('https://'.startsWith(value.toLowerCase()) || 'http://'.startsWith(value.toLowerCase())) return url
  return `https://${value}`
}

const emptyDraft = (): Draft => ({
  id: null,
  title: '',
  artist: 'CHECKago',
  year: String(new Date().getFullYear()),
  tracks: '1',
  releasedAt: '',
  links: [{ platform: 'vk', url: '' }],
  file: null,
  preview: '',
  isDraft: true,
  visibleWithoutAnnouncement: false,
})

export default function Admin() {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [announceText, setAnnounceText] = useState('')
  const [announceError, setAnnounceError] = useState('')
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [editAt, setEditAt] = useState('')
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
    const session = await getSession()
    setAuthed(session.ok)
    if (!session.ok) return
    const site = await getAdminSite()
    setProfile(site.profile)
    setReleases(site.releases)
    setAnnouncements(site.announcements || [])
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
      tracks: String(release.tracks || 1),
      releasedAt: release.releasedAt || '',
      links: release.links.length > 0 ? release.links.map((link) => ({ ...link })) : [{ platform: 'vk', url: '' }],
      file: null,
      preview: release.cover,
      isDraft: Boolean(release.draft),
      visibleWithoutAnnouncement: Boolean(release.visibleWithoutAnnouncement),
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

  function onLinkUrl(index: number, input: HTMLInputElement) {
    const raw = input.value
    const next = withHttps(raw)
    const cursor = input.selectionStart ?? next.length
    updateLink(index, { url: next })
    if (next === raw) return
    const pos = Math.max(0, cursor + next.length - raw.length)
    requestAnimationFrame(() => input.setSelectionRange(pos, pos))
  }

  async function onSaveRelease(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const title = draft.title.trim()
    const artist = draft.artist.trim()
    const year = Number(draft.year)
    const tracks = Number(draft.tracks)
    const links = draft.links.map((link) => ({ ...link, url: withHttps(link.url) }))
    if (!title || !artist) {
      setReleaseError('Нужны название и исполнитель')
      return
    }
    if (!Number.isInteger(year) || year < 1950 || year > 2100) {
      setReleaseError('Год указан неверно')
      return
    }
    if (!Number.isInteger(tracks) || tracks < 1 || tracks > 99) {
      setReleaseError('Укажите число треков от 1 до 99')
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
      const result = await saveRelease(draft.id, {
        title,
        artist,
        year,
        tracks,
        releasedAt: draft.releasedAt,
        links,
        draft: draft.isDraft,
        visibleWithoutAnnouncement: draft.visibleWithoutAnnouncement,
      }, draft.file)
      if (draft.preview.startsWith('blob:')) URL.revokeObjectURL(draft.preview)
      const saved = result.release
      setDraft(null)
      const site = await getAdminSite()
      setReleases(site.releases)
      setAnnouncements(site.announcements || [])
      if (saved.draft) setReleaseNote(saved.publicId ? `«${saved.title}» снова черновик. На сайте его нет, ID сохранён: ${saved.publicId}` : `«${saved.title}» сохранён как черновик. На сайте его нет, ID появится после снятия галочки.`)
      else if (saved.visibleWithoutAnnouncement) setReleaseNote(`«${saved.title}» на сайте. ID: ${saved.publicId}`)
      else setReleaseNote(`«${saved.title}» получил ID ${saved.publicId}. На сайте появится, когда закончится таймер его анонса.`)
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

  async function onCreateAnnouncement(event: FormEvent) {
    event.preventDefault()
    if (!draft?.id) return
    setBusy(true)
    setAnnounceError('')
    try {
      await createAnnouncement(draft.id, announceText.trim())
      const site = await getAdminSite()
      setReleases(site.releases)
      setAnnouncements(site.announcements || [])
      setAnnounceOpen(false)
      setReleaseNote(`Анонс «${draft.title}» сохранён`)
    } catch (reason) {
      setAnnounceError(reason instanceof Error ? reason.message : 'Анонс не сохранился')
    } finally {
      setBusy(false)
    }
  }

  function openEditAnnouncement(item: Announcement) {
    setEditing(item)
    setAnnounceText(item.text)
    setEditAt(item.at)
    setAnnounceError('')
  }

  async function onSaveAnnouncement(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    setAnnounceError('')
    try {
      await updateAnnouncement(editing.id, { text: announceText.trim(), at: editAt })
      const site = await getAdminSite()
      setAnnouncements(site.announcements || [])
      setReleases(site.releases)
      setEditing(null)
      setProfileNote(`Анонс «${editing.title}» сохранён`)
    } catch (reason) {
      setAnnounceError(reason instanceof Error ? reason.message : 'Анонс не сохранился')
    } finally {
      setBusy(false)
    }
  }

  async function onDeleteAnnouncement(item: Announcement) {
    if (!window.confirm(`Удалить анонс «${item.title}»?`)) return
    setBusy(true)
    try {
      await deleteAnnouncement(item.id)
      setAnnouncements((current) => current.filter((entry) => entry.id !== item.id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось удалить анонс')
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
        <section className="admin-blocks" id="admin-releases" hidden={tab !== 'releases'}>
          <div className="admin-head">
            <p className="kicker">Релизы</p>
            <button className="btn btn-ghost btn-small" type="button" onClick={openCreate}>Новый релиз</button>
          </div>
          {releaseError && <p className="error">{releaseError}</p>}
          {releaseNote && <p className="status">{releaseNote}</p>}

          {releases.map((release, index) => (
            <article className="release-admin admin-block" key={release.id}>
              <img src={release.cover} alt="" />
              <div>
                <strong>{release.title}</strong>
                <p className="release-kind">{releaseKind(release.tracks || 1)}</p>
                <p className="release-meta">{release.artist} · {release.year}</p>
                <p className="note">{release.links.map((link) => platformLabel(link.platform)).join(' · ') || 'Без ссылок'}</p>
                <p className="note">{release.draft ? (release.publicId ? `Черновик · ${release.publicId}` : 'Черновик') : release.visibleWithoutAnnouncement || release.revealed ? `На сайте · ${release.publicId}` : `Ждёт анонса · ${release.publicId}`}</p>
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
            <form className="admin-block stack" ref={releaseFormRef} onSubmit={onSaveRelease}>
              <div className="admin-grid">
                <label>Название<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
                <label>Исполнитель<input value={draft.artist} onChange={(event) => setDraft({ ...draft, artist: event.target.value })} required /></label>
                <label>Год<input inputMode="numeric" value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} required /></label>
                <label>Треков<input inputMode="numeric" value={draft.tracks} onChange={(event) => setDraft({ ...draft, tracks: event.target.value })} required /></label>
                <WhenField value={draft.releasedAt} onChange={(releasedAt) => setDraft({ ...draft, releasedAt })} />
                <label>
                  {draft.id ? 'Новая обложка' : 'Обложка'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
                </label>
              </div>
              <p className="note">{draft.id ? 'Файл нужен только если меняете картинку. https:// подставится сам.' : 'Без файла релиз не сохранится. https:// подставится сам.'}</p>
              {draft.preview && <img src={draft.preview} alt="" style={{ width: 180, borderRadius: 12 }} />}
              <div className="stack">
                {draft.links.map((link, index) => (
                  <div className="link-row" key={index}>
                    <select value={link.platform} onChange={(event) => updateLink(index, { platform: event.target.value as PlatformId })}>
                      {PLATFORMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                    <input placeholder="адрес площадки" value={link.url} onChange={(event) => onLinkUrl(index, event.target)} />
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => setDraft({ ...draft, links: draft.links.filter((_, linkIndex) => linkIndex !== index) })}>×</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-small" type="button" onClick={() => setDraft({ ...draft, links: [...draft.links, { platform: 'yandex', url: '' }] })}>Площадка</button>
              </div>
              <div className="check-row">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={draft.isDraft}
                    onChange={(event) => setDraft({
                      ...draft,
                      isDraft: event.target.checked,
                      visibleWithoutAnnouncement: event.target.checked ? false : draft.visibleWithoutAnnouncement,
                    })}
                  />
                  Черновик
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={draft.visibleWithoutAnnouncement}
                    onChange={(event) => setDraft({
                      ...draft,
                      visibleWithoutAnnouncement: event.target.checked,
                      isDraft: event.target.checked ? false : draft.isDraft,
                    })}
                  />
                  Виден без анонса
                </label>
              </div>
              <p className="note">Черновик виден только здесь и не получает ID. Без галочки релиз получает ID для анонса и выходит на сайт, когда таймер этого анонса закончится. «Виден без анонса» публикует его сразу.</p>
              {releaseError && <p className="error">{releaseError}</p>}
              <div className="release-tools">
                <button className="btn btn-primary" type="submit" disabled={busy}>{draft.id ? 'Сохранить релиз' : 'Добавить релиз'}</button>
                <button className="btn btn-ghost" type="button" disabled={!draft.id || busy} onClick={() => { setAnnounceText(''); setAnnounceError(''); setAnnounceOpen(true) }}>Создать анонс</button>
                <button className="btn btn-ghost" type="button" onClick={() => setDraft(null)}>Отмена</button>
              </div>
              {!draft.id && <p className="note">«Создать анонс» включится после сохранения релиза.</p>}
            </form>
          )}
        </section>

        {profile && (
          <form id="page-form" hidden={tab === 'releases'} onSubmit={onSaveProfile}>
            <div className="admin-blocks" hidden={tab !== 'hero'}>
            <section className="admin-block">
            <h2>Первый экран</h2>
            <div className="admin-grid">
              <label>Имя<input value={profile.name} onChange={(event) => patchProfile({ name: event.target.value })} /></label>
              <label>Буквы в знаке<input value={profile.logoMark} maxLength={4} onChange={(event) => patchProfile({ logoMark: event.target.value })} /></label>
              <label>Заголовок вкладки<input value={profile.pageTitle} onChange={(event) => patchProfile({ pageTitle: event.target.value })} /></label>
              <label>Бейдж<input value={profile.badge} onChange={(event) => patchProfile({ badge: event.target.value })} /></label>
              <label>Заголовок<input value={profile.titleWhite} onChange={(event) => patchProfile({ titleWhite: event.target.value })} /></label>
              <label>Градиентная строка<input value={profile.titleGradient} onChange={(event) => patchProfile({ titleGradient: event.target.value })} /></label>
              <label className="wide">Лид<textarea value={profile.lead} onChange={(event) => patchProfile({ lead: event.target.value })} /></label>
            </div>
            </section>
            <section className="admin-block">
            <h2>Кнопки</h2>
            <div className="admin-grid">
              <label>Кнопка Яндекс.Музыки<input value={profile.yandexButton} onChange={(event) => patchProfile({ yandexButton: event.target.value })} /></label>
              <label>Кнопка ВКонтакте<input value={profile.heroButton} onChange={(event) => patchProfile({ heroButton: event.target.value })} /></label>
              <label>Кнопка Звука<input value={profile.zvukButton} onChange={(event) => patchProfile({ zvukButton: event.target.value })} /></label>
              <label>Кнопка релизов<input value={profile.releasesButton} onChange={(event) => patchProfile({ releasesButton: event.target.value })} /></label>
              <label className="wide">Яндекс.Музыка<input value={profile.yandexUrl} onChange={(event) => patchProfile({ yandexUrl: event.target.value })} /></label>
              <label className="wide">ВКонтакте<input value={profile.vkUrl} onChange={(event) => patchProfile({ vkUrl: event.target.value })} /></label>
              <label className="wide">Звук<input value={profile.zvukUrl} onChange={(event) => patchProfile({ zvukUrl: event.target.value })} /></label>
            </div>
            </section>
            <section className="admin-block">
            <h2>VK в меню</h2>
            <div className="admin-grid">
              <label className="wide">Ссылка<input value={profile.menuVkUrl} onChange={(event) => patchProfile({ menuVkUrl: event.target.value })} /></label>
              <label className="wide">Иконка Font Awesome<input value={profile.menuVkIcon} placeholder="fa-brands fa-vk" onChange={(event) => patchProfile({ menuVkIcon: event.target.value })} /></label>
            </div>
            </section>
            <section className="admin-block">
            <h2>Пункты меню</h2>
            <div className="admin-grid">
              <label>Звук<input value={profile.navSound} onChange={(event) => patchProfile({ navSound: event.target.value })} /></label>
              <label>Релизы<input value={profile.navReleases} onChange={(event) => patchProfile({ navReleases: event.target.value })} /></label>
              <label>Обложки<input value={profile.navCovers} onChange={(event) => patchProfile({ navCovers: event.target.value })} /></label>
              <label>Контакты<input value={profile.navContact} onChange={(event) => patchProfile({ navContact: event.target.value })} /></label>
            </div>
            </section>
            <section className="admin-block">
            <h2>Факты под заголовком</h2>
            <PairEditor items={profile.facts} titleLabel="Крупно" textLabel="Подпись" addLabel="Факт" onChange={(facts) => patchProfile({ facts })} />
            </section>
            <section className="admin-block">
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
            </div>

            <div className="admin-blocks" hidden={tab !== 'upcoming'}>
            <section className="admin-block">
            <h2>Анонсы</h2>
            <p className="status">Новый анонс создаётся из карточки релиза. Когда таймер заканчивается, анонс остаётся здесь и на сайте и помечается как архивный.</p>
            <div className="admin-grid">
              <label>Бейдж<input value={profile.upcomingBadge ?? ''} onChange={(event) => patchProfile({ upcomingBadge: event.target.value })} /></label>
              <label>Подпись таймера<input value={profile.upcomingLabel ?? ''} onChange={(event) => patchProfile({ upcomingLabel: event.target.value })} /></label>
            </div>
            {announcements.map((item) => (
              <article className={item.cover ? 'release-admin admin-block' : 'announce-row admin-block'} key={item.id}>
                {item.cover && <img src={item.cover} alt="" />}
                <div>
                  <strong>{item.title}</strong>
                  <p className="release-kind">{releaseKind(item.tracks || 1)}</p>
                  <p className="release-meta">{item.artist}{item.at ? ` · ${formatWhen(item.at)}` : ''}</p>
                  {item.text && <p className="note">{item.text}</p>}
                  <p className="note">{item.archived ? 'Архив' : 'Таймер идёт'}</p>
                </div>
                <div className="release-tools">
                  {!item.archived && <button className="btn btn-ghost btn-small" type="button" onClick={() => openEditAnnouncement(item)}>Редактировать</button>}
                  <button className="btn btn-danger btn-small" type="button" onClick={() => { void onDeleteAnnouncement(item) }}>Удалить</button>
                </div>
              </article>
            ))}
            {announcements.length === 0 && <div className="empty">Анонсов пока нет.</div>}
            </section>
            </div>

            <div className="admin-blocks" hidden={tab !== 'sound'}>
            <section className="admin-block">
            <h2>Как собран трек</h2>
            <label>Заголовок блока<input value={profile.soundKicker} onChange={(event) => patchProfile({ soundKicker: event.target.value })} /></label>
            </section>
            <section className="admin-block">
            <h2>Шаги</h2>
            <PairEditor items={profile.steps} titleLabel="Шаг" textLabel="Текст" addLabel="Шаг" onChange={(steps) => patchProfile({ steps })} />
            </section>
            <section className="admin-block">
            <h2>Жанры</h2>
            <PairEditor items={profile.sounds} titleLabel="Жанр" textLabel="Текст" addLabel="Жанр" onChange={(sounds) => patchProfile({ sounds })} />
            </section>
            <section className="admin-block">
            <h2>Кадры</h2>
            <PictureEditor items={profile.shots} onChange={(shots) => patchProfile({ shots })} onError={setProfileError} />
            </section>
            </div>

            <div className="admin-blocks" hidden={tab !== 'covers'}>
            <section className="admin-block">
            <h2>Обложки</h2>
            <label>Заголовок блока<input value={profile.coversKicker} onChange={(event) => patchProfile({ coversKicker: event.target.value })} /></label>
            <PictureEditor items={profile.covers} onChange={(covers) => patchProfile({ covers })} onError={setProfileError} />
            </section>
            </div>

            <div className="admin-blocks" hidden={tab !== 'contact'}>
            <section className="admin-block">
            <h2>Подписи релизов</h2>
            <div className="admin-grid">
              <label>Заголовок<input value={profile.releasesKicker} onChange={(event) => patchProfile({ releasesKicker: event.target.value })} /></label>
              <label>Текст, если релизов нет<textarea value={profile.releasesEmpty} onChange={(event) => patchProfile({ releasesEmpty: event.target.value })} /></label>
            </div>
            </section>
            <section className="admin-block">
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
            </div>
          </form>
        )}
        {announceOpen && draft?.id && (
          <div className="modal" role="dialog" aria-modal="true" aria-label="Новый анонс" onClick={() => setAnnounceOpen(false)}>
            <form className="modal-card" onClick={(event) => event.stopPropagation()} onSubmit={onCreateAnnouncement}>
              {(() => {
                const source = releases.find((item) => item.id === draft.id)
                const title = source?.title || draft.title
                const artist = source?.artist || draft.artist
                const cover = source?.cover || (draft.preview.startsWith('blob:') ? '' : draft.preview)
                const tracks = source?.tracks || Number(draft.tracks) || 1
                const at = source?.releasedAt || ''
                return (
                  <>
                    {cover && <img src={cover} alt="" />}
                    <p className="rail-headline"><span>«{title}»</span><span className="rail-kind">{releaseKind(tracks)}</span></p>
                    <p className="release-meta">{artist}</p>
                    <p className="note">{formatWhen(at)}</p>
                  </>
                )
              })()}
              <label className="wide">Описание<textarea value={announceText} onChange={(event) => setAnnounceText(event.target.value)} required /></label>
              <p className="note">Название, обложка, дата, исполнитель и тип взяты из сохранённого релиза. Осталось описание.</p>
              {announceError && <p className="error">{announceError}</p>}
              <div className="release-tools">
                <button className="btn btn-primary" type="submit" disabled={busy}>Сохранить анонс</button>
                <button className="btn btn-ghost" type="button" onClick={() => setAnnounceOpen(false)}>Закрыть</button>
              </div>
            </form>
          </div>
        )}
        {editing && (
          <div className="modal" role="dialog" aria-modal="true" aria-label="Редактировать анонс" onClick={() => setEditing(null)}>
            <form className="modal-card" onClick={(event) => event.stopPropagation()} onSubmit={onSaveAnnouncement}>
              {editing.cover && <img src={editing.cover} alt="" />}
              <p className="rail-headline"><span>«{editing.title}»</span><span className="rail-kind">{releaseKind(editing.tracks || 1)}</span></p>
              <p className="release-meta">{editing.artist}</p>
              <WhenField value={editAt} onChange={setEditAt} />
              <label className="wide">Описание<textarea value={announceText} onChange={(event) => setAnnounceText(event.target.value)} required /></label>
              {announceError && <p className="error">{announceError}</p>}
              <div className="release-tools">
                <button className="btn btn-primary" type="submit" disabled={busy}>Сохранить</button>
                <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>Закрыть</button>
              </div>
            </form>
          </div>
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
