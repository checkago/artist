import Admin from './pages/Admin'
import ErrorPage from './pages/ErrorPage'
import Home from './pages/Home'
import MiniApp from './pages/MiniApp'

const KNOWN = new Set(['/', '/admin', '/app'])
const ERROR_PATH = /^\/(40[034]|50[023])$/

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin') return <Admin />
  if (path === '/app') return <MiniApp />
  if (ERROR_PATH.test(path)) return <ErrorPage code={Number(path.slice(1))} />
  if (!KNOWN.has(path)) return <ErrorPage code={404} />
  return <Home />
}
