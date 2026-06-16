import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Joueurs from '../pages/Joueurs'
import Matchs from '../pages/Matchs'
import Dashboard from '../pages/Dashboard'
import Stats from '../pages/ProfilJoueur'
import VueJoueur from '../pages/VueJoueur'
import csb from '../assets/csb.jpg'
import CSBB from '../assets/CSBB.jpg'

export default function Layout() {
  const [equipe, setEquipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchEquipe()
  }, [])

  async function fetchEquipe() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('equipe')
      .select('id, nom')
      .eq('user_id', user.id)
      .single()
    setEquipe(data)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navLinkStyle = ({ isActive }) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 10px', borderRadius: 8,
  color: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
  background: isActive ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)',
  fontSize: 18, textDecoration: 'none', fontWeight: isActive ? 500 : 400,
  transition: 'all 0.15s'
})

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1B2E6B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Chargement...</div>
    </div>
  )

 return (
  <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F6F2' }}>

    {/* Overlay mobile quand sidebar ouverte */}
    {sidebarOpen && (
      <div
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 40, display: window.innerWidth < 768 ? 'block' : 'none'
        }}
      />
    )}

    {/* Sidebar */}
    <div style={{
      width: 210,
      backgroundImage: `url(${csb})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '1.25rem 1rem',
      display: 'flex', flexDirection: 'column', gap: 4,
      flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh',
      zIndex: 50,
      transform: sidebarOpen || window.innerWidth >= 768 ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.25s ease',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.45)'
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>

        {/* Bouton fermer sur mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            display: window.innerWidth < 768 ? 'flex' : 'none',
            alignSelf: 'flex-end', background: 'rgba(255,255,255,0.1)',
            border: 'none', color: '#fff', borderRadius: 6,
            padding: '4px 8px', cursor: 'pointer', fontSize: 16, marginBottom: 8
          }}
        >✕</button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: '1.5rem' }}>
          <img src={CSBB} alt="logo" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
          <div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>CoachStats</div>
            {equipe && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{equipe.nom}</div>}
          </div>
        </div>

        <NavLink to="/joueurs" style={navLinkStyle} onClick={() => setSidebarOpen(false)}>
          <span style={{ fontSize: 17 }}>👥</span> Joueurs
        </NavLink>
        <NavLink to="/matchs" style={navLinkStyle} onClick={() => setSidebarOpen(false)}>
          <span style={{ fontSize: 17 }}>🏟</span> Matchs
        </NavLink>
        <NavLink to="/dashboard" style={navLinkStyle} onClick={() => setSidebarOpen(false)}>
          <span style={{ fontSize: 17 }}>📊</span> Dashboard
        </NavLink>
        <NavLink to="/stats" style={navLinkStyle} onClick={() => setSidebarOpen(false)}>
          <span style={{ fontSize: 17 }}>📈</span> Stats joueurs
        </NavLink>

        <button onClick={handleLogout} style={{
          marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 10px', borderRadius: 8, background: 'none',
          border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 13,
          cursor: 'pointer', width: '100%', textAlign: 'left'
        }}>
          <span style={{ fontSize: 17 }}>🚪</span> Déconnexion
        </button>
      </div>
    </div>

    {/* Contenu principal */}
    <div style={{ flex: 1, overflowY: 'auto', marginLeft: window.innerWidth >= 768 ? 210 : 0 }}>

      {/* Header mobile avec bouton hamburger */}
      <div style={{
        display: window.innerWidth < 768 ? 'flex' : 'none',
        alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: '#1B2E6B',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: 'none', border: 'none', color: '#fff',
            fontSize: 22, cursor: 'pointer', padding: 0,
          }}
        >☰</button>
        <img src={CSBB} alt="logo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>CoachStats</span>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/joueurs" replace />} />
        <Route path="/joueurs" element={<Joueurs />} />
        <Route path="/matchs" element={<Matchs />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/mon-profil" element={<VueJoueur />} />
      </Routes>
    </div>
  </div>
)
}