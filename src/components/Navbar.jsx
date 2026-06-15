import { Link } from 'react-router-dom'
import csb from '../assets/csb.jpg'

function Navbar() {
  return (
    <nav
      className="relative border-b border-gray-700 px-6 py-4 flex items-center justify-between overflow-hidden"
      style={{
        backgroundImage: `url(${csb})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        minHeight: '60px',
      }}
    >
      {/* Overlay sombre sur toute la navbar */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Logo */}
      <span className="relative z-10 font-bold text-orange-400 text-lg tracking-wide drop-shadow">
        CSB Stats
      </span>

      {/* Liens avec fond noir clair */}
      <div className="relative z-10 flex gap-3">
        <Link
          to="/dashboard"
          className="px-3 py-1 rounded bg-black/60 text-gray-200 hover:text-orange-400 hover:bg-black/80 text-sm transition-all"
        >
          Dashboard
        </Link>
        <Link
          to="/joueurs"
          className="px-3 py-1 rounded bg-black/60 text-gray-200 hover:text-orange-400 hover:bg-black/80 text-sm transition-all"
        >
          Joueurs
        </Link>
        <Link
          to="/match/nouveau"
          className="px-3 py-1 rounded bg-black/60 text-gray-200 hover:text-orange-400 hover:bg-black/80 text-sm transition-all"
        >
          Nouveau match
        </Link>
      </div>
    </nav>
  )
}

export default Navbar