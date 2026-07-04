import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const C = {
  bg: '#0F1C3F', card: '#1B2E6B', dark: '#111827',
  gold: '#E0C96A', border: 'rgba(224,201,106,0.2)',
  muted: 'rgba(255,255,255,0.4)', white: '#fff',
}

export default function AdminDashboard() {
  const [equipes, setEquipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEquipe, setSelectedEquipe] = useState(null)
  const [joueurs, setJoueurs] = useState([])
  const [matchs, setMatchs] = useState([])

  useEffect(() => { fetchEquipes() }, [])

  async function fetchEquipes() {
    setLoading(true)
    const { data } = await supabase.from('equipe').select('*').order('nom')
    setEquipes(data || [])
    setLoading(false)
  }

  async function openEquipe(equipe) {
    setSelectedEquipe(equipe)
    const [{ data: js }, { data: ms }] = await Promise.all([
      supabase.from('joueur').select('*').eq('equipe_id', equipe.id).order('numero_maillot'),
      supabase.from('match').select('*').eq('equipe_id', equipe.id).order('date', { ascending: false }),
    ])
    setJoueurs(js || [])
    setMatchs(ms || [])
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
            Mode administrateur
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.white, margin: 0 }}>Toutes les équipes</h1>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {equipes.length} équipe{equipes.length !== 1 ? 's' : ''} enregistrée{equipes.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedEquipe ? '280px 1fr' : '1fr', gap: 16 }}>

          {/* Liste des équipes */}
          <div style={{
            background: 'rgba(27,46,107,0.35)', borderRadius: 14,
            border: `1px solid ${C.border}`, overflow: 'hidden'
          }}>
            {equipes.map(e => (
              <div
                key={e.id}
                onClick={() => openEquipe(e)}
                style={{
                  padding: '14px 18px', cursor: 'pointer',
                  borderBottom: `1px solid ${C.border}`,
                  background: selectedEquipe?.id === e.id ? 'rgba(224,201,106,0.1)' : 'transparent',
                }}
              >
                <div style={{ fontWeight: 700, color: C.white, fontSize: 14 }}>{e.nom}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{e.categorie || '—'}</div>
              </div>
            ))}
          </div>

          {/* Détail équipe sélectionnée */}
          {selectedEquipe && (
            <div style={{
              background: 'rgba(27,46,107,0.35)', borderRadius: 14,
              border: `1px solid ${C.border}`, padding: '1.5rem'
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.white, margin: '0 0 1rem' }}>
                {selectedEquipe.nom}
              </h2>

              <div style={{ fontSize: 12, fontWeight: 600, color: C.gold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Joueurs ({joueurs.length})
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                {joueurs.map(j => (
                  <div key={j.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 13, color: C.white,
                  }}>
                    <span>{j.prenom} {j.nom}</span>
                    <span style={{ color: C.muted }}>#{j.numero_maillot} · {j.poste}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: C.gold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Matchs ({matchs.length})
              </div>
              <div>
                {matchs.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 13, color: C.white,
                  }}>
                    <span>vs {m.equipe_adverse}</span>
                    <span style={{ color: C.gold }}>
                      {m.score_nous != null ? `${m.score_nous} – ${m.score_eux}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}