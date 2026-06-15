import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function AcceptInvitation() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase met automatiquement la session dans l'URL après clic sur le lien
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Session active, on peut laisser l'utilisateur définir son mot de passe
      }
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return }

    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) { setError('Erreur lors de la mise à jour.'); setLoading(false); return }

    navigate('/mon-profil', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1B2E6B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 400 }}>
        <div style={{ width: 56, height: 56, background: '#1B2E6B', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: 28 }}>🏀</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1B2E6B', textAlign: 'center', marginBottom: 6 }}>Bienvenue !</h1>
        <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: '2rem' }}>
          Crée ton mot de passe pour accéder à tes statistiques.
        </p>
        <hr style={{ borderColor: '#f0f0eb', marginBottom: '1.5rem' }} />

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#777', display: 'block', marginBottom: 5 }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 caractères"
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e5e0', fontSize: 14, background: '#fffbea', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#777', display: 'block', marginBottom: 5 }}>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répète ton mot de passe"
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e5e0', fontSize: 14, background: '#fffbea', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ fontSize: 12, color: '#c0392b', textAlign: 'center', marginBottom: 12 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#E0C96A', color: '#1B2E6B', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Création...' : 'Accéder à mes stats →'}
          </button>
        </form>
      </div>
    </div>
  )
}