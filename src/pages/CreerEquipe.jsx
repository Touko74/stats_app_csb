import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import logoCSBB from '../assets/CSBB.jpg' 

function CreerEquipe() {
  const [nom, setNom] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

 useEffect(() => {
  async function checkEquipe() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('equipe')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle() // ← remplace .single()

    if (data) {
      navigate('/joueurs', { replace: true })
    } else {
      setChecking(false)
    }
  }
  checkEquipe()
}, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase
      .from('equipe')
      .insert([{ nom, user_id: user.id }])

    if (insertError) {
      setError('Une erreur est survenue, réessayez.')
      setLoading(false)
    } else {
      navigate('/joueurs', { replace: true })
    }
  }

  if (checking) return (
    <div style={{
      minHeight: '100vh', background: '#1B2E6B',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1B2E6B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px'
      }}>

        <div
  style={{
    width: '56px',
    height: '56px',
    backgroundColor: '#1B2E6B',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
  }}
>
  <img
    src={logoCSBB}
    alt="Logo CSB"
    className="w-14 h-14 object-contain"
  />
</div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1B2E6B', textAlign: 'center', marginBottom: '6px' }}>
          Bienvenue !
        </h1>
        <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '2rem' }}>
          Commencez par définir votre équipe
        </p>

        <hr style={{ borderColor: '#f0f0eb', marginBottom: '1.5rem' }} />

        <form onSubmit={handleSubmit}>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#555', display: 'block', marginBottom: '6px' }}>
              Nom de l'équipe
            </label>
            <input
              type="text"
              placeholder="ex: Seniors Régional, U18..."
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px',
                borderRadius: '8px', border: '1.5px solid #e5e5e0',
                fontSize: '14px', background: '#fffbea',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#c0392b', textAlign: 'center', marginBottom: '12px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: '#E0C96A', color: '#1B2E6B',
              border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'transform 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {loading ? 'Création...' : 'Créer mon équipe →'}
          </button>

        </form>

        <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', marginTop: '1rem' }}>
          Vous pourrez modifier ces informations plus tard
        </p>

      </div>
    </div>
  )
}

export default CreerEquipe