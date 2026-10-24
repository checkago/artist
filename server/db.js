import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const profileFields = [
  ['name', 'name'],
  ['logoMark', 'logo_mark'],
  ['pageTitle', 'page_title'],
  ['badge', 'badge'],
  ['titleWhite', 'title_white'],
  ['titleGradient', 'title_gradient'],
  ['lead', 'lead'],
  ['heroButton', 'hero_button'],
  ['yandexButton', 'yandex_button'],
  ['yandexUrl', 'yandex_url'],
  ['zvukButton', 'zvuk_button'],
  ['zvukUrl', 'zvuk_url'],
  ['releasesButton', 'releases_button'],
  ['navSound', 'nav_sound'],
  ['navReleases', 'nav_releases'],
  ['navCovers', 'nav_covers'],
  ['navContact', 'nav_contact'],
  ['menuVkUrl', 'menu_vk_url'],
  ['menuVkIcon', 'menu_vk_icon'],
  ['upcomingBadge', 'upcoming_badge'],
  ['upcomingTitle', 'upcoming_title'],
  ['upcomingText', 'upcoming_text'],
  ['upcomingAt', 'upcoming_at'],
  ['upcomingLabel', 'upcoming_label'],
  ['upcomingCover', 'upcoming_cover'],
  ['upcomingReleaseId', 'upcoming_release_id'],
  ['portrait', 'portrait'],
  ['portraitAlt', 'portrait_alt'],
  ['soundKicker', 'sound_kicker'],
  ['coversKicker', 'covers_kicker'],
  ['releasesKicker', 'releases_kicker'],
  ['releasesEmpty', 'releases_empty'],
  ['aboutKicker', 'about_kicker'],
  ['about', 'about'],
  ['contactKicker', 'contact_kicker'],
  ['contactVkTitle', 'contact_vk_title'],
  ['contactVkText', 'contact_vk_text'],
  ['contactReleaseTitle', 'contact_release_title'],
  ['contactReleaseText', 'contact_release_text'],
  ['contactButton', 'contact_button'],
  ['footer', 'footer'],
  ['vkUrl', 'vk_url'],
]

const textKinds = [
  ['facts', 'fact'],
  ['steps', 'step'],
  ['sounds', 'sound'],
]
const pictureKinds = [
  ['shots', 'shot'],
  ['covers', 'cover'],
]

function textValue(value) {
  return typeof value === 'string' ? value : ''
}

function readJson(dataFile) {
  if (!fs.existsSync(dataFile)) return null
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  } catch (error) {
    throw new Error(`Не удалось прочитать ${dataFile}: ${error.message}`)
  }
}

export function openDatabase({ dataDir, dataFile, seed }) {
  fs.mkdirSync(dataDir, { recursive: true })
  const db = new Database(path.join(dataDir, 'site.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      logo_mark TEXT NOT NULL DEFAULT '',
      page_title TEXT NOT NULL DEFAULT '',
      badge TEXT NOT NULL DEFAULT '',
      title_white TEXT NOT NULL DEFAULT '',
      title_gradient TEXT NOT NULL DEFAULT '',
      lead TEXT NOT NULL DEFAULT '',
      hero_button TEXT NOT NULL DEFAULT '',
      yandex_button TEXT NOT NULL DEFAULT '',
      yandex_url TEXT NOT NULL DEFAULT '',
      zvuk_button TEXT NOT NULL DEFAULT '',
      zvuk_url TEXT NOT NULL DEFAULT '',
      releases_button TEXT NOT NULL DEFAULT '',
      nav_sound TEXT NOT NULL DEFAULT '',
      nav_releases TEXT NOT NULL DEFAULT '',
      nav_covers TEXT NOT NULL DEFAULT '',
      nav_contact TEXT NOT NULL DEFAULT '',
      menu_vk_url TEXT NOT NULL DEFAULT '',
      menu_vk_icon TEXT NOT NULL DEFAULT '',
      upcoming_badge TEXT NOT NULL DEFAULT '',
      upcoming_title TEXT NOT NULL DEFAULT '',
      upcoming_text TEXT NOT NULL DEFAULT '',
      upcoming_at TEXT NOT NULL DEFAULT '',
      upcoming_label TEXT NOT NULL DEFAULT '',
      upcoming_cover TEXT NOT NULL DEFAULT '',
      upcoming_release_id TEXT NOT NULL DEFAULT '',
      portrait TEXT NOT NULL DEFAULT '',
      portrait_alt TEXT NOT NULL DEFAULT '',
      sound_kicker TEXT NOT NULL DEFAULT '',
      covers_kicker TEXT NOT NULL DEFAULT '',
      releases_kicker TEXT NOT NULL DEFAULT '',
      releases_empty TEXT NOT NULL DEFAULT '',
      about_kicker TEXT NOT NULL DEFAULT '',
      about TEXT NOT NULL DEFAULT '',
      contact_kicker TEXT NOT NULL DEFAULT '',
      contact_vk_title TEXT NOT NULL DEFAULT '',
      contact_vk_text TEXT NOT NULL DEFAULT '',
      contact_release_title TEXT NOT NULL DEFAULT '',
      contact_release_text TEXT NOT NULL DEFAULT '',
      contact_button TEXT NOT NULL DEFAULT '',
      footer TEXT NOT NULL DEFAULT '',
      vk_url TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS text_blocks (
      id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      text TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pictures (
      id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL,
      position INTEGER NOT NULL,
      src TEXT NOT NULL,
      alt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      year INTEGER NOT NULL,
      tracks INTEGER NOT NULL DEFAULT 1,
      released_at TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL,
      sort INTEGER NOT NULL,
      draft INTEGER NOT NULL DEFAULT 0,
      visible_without_announcement INTEGER NOT NULL DEFAULT 0,
      public_id TEXT NOT NULL DEFAULT '',
      revealed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL DEFAULT '',
      public_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      artist TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL DEFAULT '',
      tracks INTEGER NOT NULL DEFAULT 1,
      at TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      archived INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS release_links (
      id INTEGER PRIMARY KEY,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      platform TEXT NOT NULL,
      url TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS text_blocks_kind_position ON text_blocks (kind, position);
    CREATE INDEX IF NOT EXISTS pictures_kind_position ON pictures (kind, position);
    CREATE INDEX IF NOT EXISTS releases_sort ON releases (sort);
    CREATE INDEX IF NOT EXISTS release_links_release_position ON release_links (release_id, position);
  `)
  function hasColumn(table, column) {
    return db.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column)
  }
  function addColumn(table, column, definition) {
    if (!hasColumn(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
  addColumn('profile', 'upcoming_release_id', "TEXT NOT NULL DEFAULT ''")
  addColumn('releases', 'draft', 'INTEGER NOT NULL DEFAULT 0')
  addColumn('releases', 'visible_without_announcement', 'INTEGER NOT NULL DEFAULT 0')
  addColumn('releases', 'public_id', "TEXT NOT NULL DEFAULT ''")
  addColumn('releases', 'revealed', 'INTEGER NOT NULL DEFAULT 0')
  addColumn('releases', 'tracks', 'INTEGER NOT NULL DEFAULT 1')
  addColumn('releases', 'released_at', "TEXT NOT NULL DEFAULT ''")
  addColumn('announcements', 'demo', "TEXT NOT NULL DEFAULT ''")
  db.prepare(`INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('version', '1')`).run()

  const columns = profileFields.map((field) => field[1])
  const insertProfile = db.prepare(`
    INSERT INTO profile (id, ${columns.join(', ')})
    VALUES (@id, ${columns.map((column) => `@${column}`).join(', ')})
    ON CONFLICT(id) DO UPDATE SET
    ${columns.map((column) => `${column} = excluded.${column}`).join(', ')}
  `)
  const insertBlock = db.prepare(`
    INSERT INTO text_blocks (kind, position, title, text) VALUES (?, ?, ?, ?)
  `)
  const insertPicture = db.prepare(`
    INSERT INTO pictures (kind, position, src, alt) VALUES (?, ?, ?, ?)
  `)
  const insertRelease = db.prepare(`
    INSERT INTO releases (
      id, title, artist, year, tracks, released_at, cover, sort, draft, visible_without_announcement, public_id, revealed
    ) VALUES (
      @id, @title, @artist, @year, @tracks, @releasedAt, @cover, @sort, @draft, @visibleWithoutAnnouncement, @publicId, @revealed
    )
  `)
  const insertLink = db.prepare(`
    INSERT INTO release_links (release_id, position, platform, url) VALUES (?, ?, ?, ?)
  `)
  const clearBlocks = db.prepare('DELETE FROM text_blocks')
  const clearPictures = db.prepare('DELETE FROM pictures')
  const clearLinks = db.prepare('DELETE FROM release_links')
  const clearReleases = db.prepare('DELETE FROM releases')

  const writeSite = db.transaction((data) => {
    const profile = data.profile || {}
    const params = { id: 1 }
    for (const [key, column] of profileFields) params[column] = textValue(profile[key])
    clearLinks.run()
    clearReleases.run()
    clearBlocks.run()
    clearPictures.run()
    insertProfile.run(params)
    for (const [key, kind] of textKinds) {
      const items = Array.isArray(profile[key]) ? profile[key] : []
      items.forEach((item, position) => {
        insertBlock.run(kind, position, textValue(item?.title), textValue(item?.text))
      })
    }
    for (const [key, kind] of pictureKinds) {
      const items = Array.isArray(profile[key]) ? profile[key] : []
      items.forEach((item, position) => {
        insertPicture.run(kind, position, textValue(item?.src), textValue(item?.alt))
      })
    }
    const releases = Array.isArray(data.releases) ? data.releases : []
    releases.forEach((release, index) => {
      const legacy = release?.draft === undefined && release?.visibleWithoutAnnouncement === undefined && release?.publicId === undefined
      const draft = legacy ? false : Boolean(release?.draft)
      const visibleWithoutAnnouncement = legacy ? true : Boolean(release?.visibleWithoutAnnouncement)
      const id = textValue(release?.id) || crypto.randomUUID()
      let publicId = textValue(release?.publicId)
      if (!draft && !publicId) publicId = legacy ? id : crypto.randomUUID()
      insertRelease.run({
        id,
        title: textValue(release?.title),
        artist: textValue(release?.artist),
        year: Number(release?.year) || 0,
        tracks: Number.isInteger(Number(release?.tracks)) && Number(release?.tracks) > 0 ? Number(release.tracks) : 1,
        releasedAt: textValue(release?.releasedAt),
        cover: textValue(release?.cover),
        sort: Number.isInteger(release?.sort) ? release.sort : index,
        draft: draft ? 1 : 0,
        visibleWithoutAnnouncement: visibleWithoutAnnouncement ? 1 : 0,
        publicId,
        revealed: release?.revealed ? 1 : 0,
      })
      const links = Array.isArray(release?.links) ? release.links : []
      links.forEach((link, position) => {
        insertLink.run(id, position, textValue(link?.platform), textValue(link?.url))
      })
    })
  })

  function readSite() {
    const row = db.prepare('SELECT * FROM profile WHERE id = 1').get()
    const profile = {}
    for (const [key, column] of profileFields) profile[key] = row ? textValue(row[column]) : ''
    for (const [key] of textKinds) profile[key] = []
    for (const [key] of pictureKinds) profile[key] = []
    const blocks = db.prepare('SELECT kind, title, text FROM text_blocks ORDER BY kind, position, id').all()
    for (const block of blocks) {
      const pair = textKinds.find((item) => item[1] === block.kind)
      if (!pair) continue
      profile[pair[0]].push({ title: block.title, text: block.text })
    }
    const pictures = db.prepare('SELECT kind, src, alt FROM pictures ORDER BY kind, position, id').all()
    for (const picture of pictures) {
      const pair = pictureKinds.find((item) => item[1] === picture.kind)
      if (!pair) continue
      profile[pair[0]].push({ src: picture.src, alt: picture.alt })
    }
    const releases = db.prepare(`
      SELECT id, title, artist, year, tracks, released_at, cover, sort, draft, visible_without_announcement, public_id, revealed
      FROM releases ORDER BY sort, title
    `).all()
    const links = db.prepare('SELECT release_id, platform, url FROM release_links ORDER BY release_id, position, id').all()
    const linksByRelease = new Map()
    for (const link of links) {
      const list = linksByRelease.get(link.release_id) || []
      list.push({ platform: link.platform, url: link.url })
      linksByRelease.set(link.release_id, list)
    }
    return {
      profile,
      releases: releases.map((release) => ({
        id: release.id,
        title: release.title,
        artist: release.artist,
        year: release.year,
        tracks: release.tracks || 1,
        releasedAt: release.released_at || '',
        cover: release.cover,
        links: linksByRelease.get(release.id) || [],
        sort: release.sort,
        draft: Boolean(release.draft),
        visibleWithoutAnnouncement: Boolean(release.visible_without_announcement),
        publicId: release.public_id || '',
        revealed: Boolean(release.revealed),
      })),
      announcements: db.prepare(`
        SELECT id, release_id, public_id, title, artist, cover, tracks, at, text, demo, archived
        FROM announcements ORDER BY at, title
      `).all().map((item) => ({
        id: item.id,
        releaseId: item.release_id,
        publicId: item.public_id || '',
        title: item.title,
        artist: item.artist,
        cover: item.cover,
        tracks: item.tracks || 1,
        at: item.at,
        text: item.text,
        demo: item.demo || '',
        archived: Boolean(item.archived),
      })),
    }
  }

  function insertAnnouncement(item) {
    db.prepare(`
      INSERT INTO announcements (
        id, release_id, public_id, title, artist, cover, tracks, at, text, demo, archived
      ) VALUES (
        @id, @releaseId, @publicId, @title, @artist, @cover, @tracks, @at, @text, @demo, @archived
      )
    `).run({
      id: textValue(item?.id) || crypto.randomUUID(),
      releaseId: textValue(item?.releaseId),
      publicId: textValue(item?.publicId),
      title: textValue(item?.title),
      artist: textValue(item?.artist),
      cover: textValue(item?.cover),
      tracks: Number(item?.tracks) || 1,
      at: textValue(item?.at),
      text: textValue(item?.text),
      demo: textValue(item?.demo),
      archived: item?.archived ? 1 : 0,
    })
  }

  const markArchived = db.prepare('UPDATE announcements SET archived = 1 WHERE id = ?')
  const archiveAnnouncements = db.transaction((ids) => {
    for (const id of ids) markArchived.run(id)
  })

  function deleteAnnouncement(id) {
    const row = db.prepare('SELECT demo FROM announcements WHERE id = ?').get(id)
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id)
    return row?.demo || ''
  }

  function updateAnnouncement(item) {
    const result = db.prepare(`
      UPDATE announcements
      SET text = @text, at = @at, demo = @demo
      WHERE id = @id AND archived = 0
    `).run({
      id: textValue(item?.id),
      text: textValue(item?.text),
      at: textValue(item?.at),
      demo: textValue(item?.demo),
    })
    return result.changes > 0
  }

  const loaded = db.prepare('SELECT id FROM profile WHERE id = 1').get()
  if (!loaded) {
    const fromFile = readJson(dataFile)
    const initial = fromFile?.profile ? fromFile : seed()
    writeSite({ profile: initial.profile, releases: initial.releases || [] })
    console.log(fromFile?.profile ? 'Данные загружены из site.json в базу' : 'База создана из начальных данных')
  }

  let schemaVersion = db.prepare(`SELECT value FROM schema_meta WHERE key = 'version'`).get()?.value || '1'
  if (schemaVersion !== '2' && schemaVersion !== '3') {
    db.prepare(`
      UPDATE releases
      SET public_id = id, visible_without_announcement = 1
      WHERE public_id = '' AND draft = 0
    `).run()
    schemaVersion = '2'
  }
  if (schemaVersion !== '3') {
    const profile = db.prepare(`
      SELECT upcoming_title, upcoming_text, upcoming_at, upcoming_cover, upcoming_release_id
      FROM profile WHERE id = 1
    `).get()
    const existing = db.prepare('SELECT COUNT(*) AS total FROM announcements').get()
    if (profile && (profile.upcoming_title || profile.upcoming_at) && !existing?.total) {
      const release = profile.upcoming_release_id
        ? db.prepare('SELECT * FROM releases WHERE public_id = ?').get(profile.upcoming_release_id)
        : null
      const at = profile.upcoming_at || release?.released_at || ''
      insertAnnouncement({
        releaseId: release?.id || '',
        publicId: release?.public_id || profile.upcoming_release_id || '',
        title: profile.upcoming_title || release?.title || '',
        artist: release?.artist || '',
        cover: profile.upcoming_cover || '',
        tracks: release?.tracks || 1,
        at,
        text: profile.upcoming_text || '',
        archived: Boolean(at) && new Date(at).getTime() <= Date.now(),
      })
      if (release && at && !release.released_at) {
        db.prepare('UPDATE releases SET released_at = ? WHERE id = ?').run(at, release.id)
      }
    }
    schemaVersion = '3'
  }
  db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'version'`).run(schemaVersion)

  return { readSite, writeSite, insertAnnouncement, updateAnnouncement, archiveAnnouncements, deleteAnnouncement }
}
