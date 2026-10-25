import { useEffect, useState } from 'react'
import { getSite, safeHref, type Profile } from '../api'

type ErrorPageProps = { code?: number }
type ErrorCopy = { title: string; text: string }

const COPY: Record<number, ErrorCopy[]> = {
  403: [
    { title: 'Гейт закрыт', text: 'Охрана на входе кивает в такт, но тебя не пускает. Это не твой riddim — вернись к улице, где бас ещё тёплый.' },
    { title: 'Не тот бэкстейдж', text: 'Пропуск не из этой сессии. За дверью чужой микшер — шагай назад к свету и к басу на улице.' },
    { title: 'VIP только для своих', text: 'Сюда пускают по знакомству с one drop. Ты пока с другой стороны ограды — лови грув снаружи.' },
    { title: 'Охрана в груве', text: 'Они качают головой в ритм и всё равно говорят «нет». Не спорь с гейтом — иди туда, где корень открыт.' },
    { title: 'Закрытый саундчек', text: 'За кулисами чужая вечеринка. Тебе сюда рано. Вернись на танцпол — или домой к CHECKago.' },
    { title: 'Riddim не для всех', text: 'Эта дверь знает только своих. Пройди мимо, включи стриминг и поймай такт без пропуска.' },
  ],
  404: [
    { title: 'Страница ушла в даб', text: 'Искали куплет — нашли эхо. Этой страницы нет в сети: она растворилась между offbeat и дымом. Лови ритм на площадках или иди домой к корню.' },
    { title: 'Сбились с размера', text: 'Адрес сбился с размера. Здесь пусто, как пауза перед drop’ом. Не стой в тишине — прыгай на стриминги или возвращайся к корню.' },
    { title: 'Riddim в даб-пространстве', text: 'Riddim ушёл в даб-пространство. Страницы нет, осталось только эхо баса. Слушай живое на площадках — или домой, пока one drop не остыл.' },
    { title: 'Дверь в никуда', text: 'Ты открыл дверь в никуда. За ней ни куплета, ни припева — только дым и offbeat. Лови треки снаружи или вернись на главную к свету неона.' },
    { title: 'Не в сет-листе', text: 'Этот URL не в сет-листе. Продюсер его вырезал ещё на сведении. Пока студия молчит — крути площадки или шагай домой к CHECKago.' },
    { title: 'Ушла в реверб', text: 'Страница ушла в реверб и не вернулась. Сеть пуста, грув снаружи. Жми на Яндекс, VK и компанию — или домой, где корень ещё держит такт.' },
  ],
  500: [
    { title: 'Студия перегрелась', text: 'Пульт задымился, инженер ушёл за кофе и one drop. Сервер сейчас не в груве — дай ему такт и возвращайся.' },
    { title: 'Фейдер на максимуме', text: 'Кто-то выкрутил громкость до красной зоны. Аппарат отдыхает. Пока — площадки, потом снова заглянем в студию.' },
    { title: 'Кабель выпал из баса', text: 'Внутри щёлкнуло не то гнездо. Мы уже ползаем под стойкой. А ты крути riddim снаружи.' },
    { title: 'Микшер на перерыве', text: 'Студия взяла tea-break. Не паника — просто тишина между дублями. Зайди чуть позже или слушай стриминги.' },
    { title: 'Сведение пошло дымом', text: 'Слишком много эффектов сразу. Сервер кашляет ревербом. Дай ему остыть — и возвращайся к корню.' },
    { title: 'Лампы поплыли', text: 'В аппаратной запахло жареным джемом. Чиним. Пока лови живые треки на площадках.' },
  ],
  502: [
    { title: 'Связь в облаках', text: 'Сигнал уплыл, как сплiff на ветру. Шлюз молчит, но бас ещё где-то рядом. Попробуй снова через пару ударов бочки.' },
    { title: 'Мост оборвался', text: 'Между тобой и сервером пустой такт. Не конец песни — просто обрыв. Обнови через момент.' },
    { title: 'Эхо без ответа', text: 'Крикнули в сторону бэкэнда — вернулось только эхо. Подожди drop и жми ещё раз.' },
    { title: 'Шлюз в дабе', text: 'Пакеты ушли в пространство и не нашлись. Сеть плывёт. Чуть позже — или сразу на площадки.' },
    { title: 'Провод на ветру', text: 'Связь гуляет, как гитарный шнур на сцене. Держи грув снаружи, мы подключим обратно.' },
    { title: 'Ответ задерживается', text: 'Сервер кивнул в такт и забыл ответить. Не обижайся — обнови страницу после пары ударов.' },
  ],
  503: [
    { title: 'Сервис на репите паузы', text: 'Площадка взяла break. Не тревога — просто тишина между куплетами. Загляни чуть позже или послушай живое на стримингах.' },
    { title: 'Технический one drop', text: 'Сервис присел на корточки вместе с басом. Скоро встанет. Пока — Яндекс, VK и остальная компания.' },
    { title: 'Зал на проветривании', text: 'Дым рассеиваем, свет включаем. Вернись через такт — или слушай снаружи.' },
    { title: 'Обслуживание в riddim', text: 'Крутим гайки под грув. Страница временно закрыта на саундчек. Лови треки на площадках.' },
    { title: 'Пауза перед припевом', text: 'Не ошибка судьбы — плановый break. Дождись вступления или иди домой к корню.' },
    { title: 'Сцена занята', text: 'Сейчас настраивают мониторы. Публику пока на улицу — там уже играет CHECKago.' },
  ],
}

const FALLBACK: ErrorCopy[] = [
  { title: 'Что-то сбилось с размера', text: 'Riddim поехал не туда. Мы уже чиним струны — а ты пока послушай что-нибудь корневое на площадках.' },
  { title: 'Не тот куплет', text: 'Система взяла не ту дорожку. Держи бас на стримингах — мы вернёмся в размер.' },
  { title: 'Глюк в offbeat', text: 'Что-то щёлкнуло не в ту долю. Пока чиним — лови живое на площадках или иди домой.' },
  { title: 'Сбой на сведении', text: 'Дорожки разъехались. Это временно. Слушай снаружи или возвращайся к корню.' },
  { title: 'Такт потерян', text: 'Метроном убежал. Мы его догоняем. А ты — на стриминги или на главную.' },
  { title: 'Неожиданный drop', text: 'Всё оборвалось на самом сочном месте. Дай нам такт — и страница оживёт.' },
]

function resolveCode(value?: number) {
  if (value && Number.isFinite(value)) return Math.trunc(value)
  const fromPath = window.location.pathname.match(/\/(40[034]|50[023])\/?$/)
  if (fromPath) return Number(fromPath[1])
  const fromQuery = Number(new URLSearchParams(window.location.search).get('code') || 0)
  if (fromQuery >= 400 && fromQuery < 600) return fromQuery
  return 404
}

function pickCopy(status: number): ErrorCopy {
  const list = COPY[status] || FALLBACK
  return list[Math.floor(Math.random() * list.length)] || list[0]
}

export default function ErrorPage({ code }: ErrorPageProps) {
  const status = resolveCode(code)
  const [copy] = useState(() => pickCopy(status))
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    document.title = `${status} · CHECKago`
    getSite()
      .then((data) => setProfile(data.profile))
      .catch(() => {})
  }, [status])

  const platforms = [
    profile && safeHref(profile.yandexUrl) && { key: 'yandex', href: safeHref(profile.yandexUrl)!, label: 'Яндекс.Музыка', tone: 'btn-yandex' },
    profile && safeHref(profile.vkUrl) && { key: 'vk', href: safeHref(profile.vkUrl)!, label: 'VK Музыка', tone: 'btn-vk' },
    profile && safeHref(profile.zvukUrl) && { key: 'zvuk', href: safeHref(profile.zvukUrl)!, label: 'Звук', tone: 'btn-zvuk' },
    profile && safeHref(profile.winkUrl) && { key: 'wink', href: safeHref(profile.winkUrl)!, label: profile.winkButton || 'WINK Music', tone: 'btn-wink' },
    profile && safeHref(profile.mtsUrl) && { key: 'mts', href: safeHref(profile.mtsUrl)!, label: profile.mtsButton || 'МТС Music', tone: 'btn-mts' },
  ].filter(Boolean) as { key: string; href: string; label: string; tone: string }[]

  return (
    <div className="error-page">
      <div className="bg-media" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="metadata" src="/media/bg.webm" />
      </div>
      <header className="nav error-nav">
        <a className="logo" href="/">
          <span className="logo-mark">{profile?.logoMark || 'CK'}</span>
          {profile?.name || 'CHECKago'}
        </a>
      </header>

      <main className="error-main wrap">
        <p className="error-code" aria-label={`Ошибка ${status}`}>
          <span className="error-code-wrap">
            <span className="error-code-shine">{status}</span>
            <span className="error-code-sheen" aria-hidden="true" />
          </span>
        </p>

        <section className="panel error-card glow-run">
          <span className="neon-ring" aria-hidden="true"><span className="neon-ring-spin" /></span>
          <p className="kicker">Ошибка {status}</p>
          <h1>{copy.title}</h1>
          <p className="error-text">{copy.text}</p>
          <div className="error-actions">
            <a className="btn btn-primary" href="/">На главную</a>
            <a className="btn btn-ghost" href="/#listen">Слушать</a>
          </div>
          {platforms.length > 0 && (
            <div className="error-platforms">
              <p className="error-platforms-label">Пока страница чиллит — лови треки:</p>
              <div className="platform-list">
                {platforms.map((item) => (
                  <a className={`btn ${item.tone}`} key={item.key} href={item.href} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
