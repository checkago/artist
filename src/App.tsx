import Admin from './pages/Admin'
import Home from './pages/Home'

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin') return <Admin />
  return <Home />
}
