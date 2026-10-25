import Admin from './pages/Admin'
import Home from './pages/Home'
import MiniApp from './pages/MiniApp'

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin') return <Admin />
  if (path === '/app') return <MiniApp />
  return <Home />
}
