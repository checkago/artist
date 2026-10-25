declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void
  }
}

export const METRIKA_ID = 113788518

/** Идентификаторы целей в кабинете Метрики */
const LISTEN_GOALS: Record<string, string> = {
  yandex: 'listen_platform', // уже создана: «Клик по площадке Яндекс»
  vk: 'listen_vk',
  vkmusic: 'listen_vk',
  zvuk: 'listen_zvuk',
  wink: 'listen_wink',
  mts: 'listen_mts',
}

export function reachGoal(target: string, params?: Record<string, string | number | boolean>) {
  try {
    window.ym?.(METRIKA_ID, 'reachGoal', target, params)
  } catch {
    /* ignore */
  }
}

export function trackListenPlatform(platform: string) {
  const target = LISTEN_GOALS[platform]
  if (!target) return
  reachGoal(target)
}

/** Клик по площадке из выпадающего «Слушать» в блоке релизов */
export function trackReleaseListen(platform: string) {
  reachGoal('release_listen', { platform })
  trackListenPlatform(platform)
}

/** Клик по площадке в блоке «Слушать» (#listen / вкладка в /app) */
export function trackListenBlock(platform: string) {
  reachGoal('listen_block', { platform })
  trackListenPlatform(platform)
}

const BOT_GOALS: Record<string, string> = {
  max: 'chat_max',
  telegram: 'chat_telegram',
}

/** Переход в чат-бот MAX / Telegram */
export function trackChatBot(bot: 'max' | 'telegram') {
  const target = BOT_GOALS[bot]
  if (!target) return
  reachGoal(target)
}

/** Нажатие Play на демо в анонсе релиза */
export function trackDemoPlay() {
  reachGoal('demo_play')
}
