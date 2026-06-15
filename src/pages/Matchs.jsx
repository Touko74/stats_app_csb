import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const C = {
  bg:     '#0F1C3F',
  card:   '#1B2E6B',
  dark:   '#111827',
  gold:   '#E0C96A',
  border: 'rgba(224,201,106,0.2)',
  muted:  'rgba(255,255,255,0.4)',
  white:  '#fff',
}

const EMPTY_MATCH = {
  equipe_adverse: '',
  date: new Date().toISOString().split('T')[0],
  lieu: 'Domicile',
  score_nous: '',
  score_eux: '',
}

const EMPTY_STAT = {
  points: 0, rebonds: 0, passes: 0, interceptions: 0,
  ballons_perdus: 0, tirs_tentes: 0, tirs_reussis: 0,
  minutes: 0, fautes: 0,
}

const STAT_FIELDS = [
  { key: 'points',        label: 'PTS',  full: 'Points' },
  { key: 'rebonds',       label: 'REB',  full: 'Rebonds' },
  { key: 'passes',        label: 'PAS',  full: 'Passes' },
  { key: 'interceptions', label: 'INT',  full: 'Interceptions' },
  { key: 'ballons_perdus',label: 'BP',   full: 'Ballons perdus' },
  { key: 'tirs_tentes',   label: 'TT',   full: 'Tirs tentés' },
  { key: 'tirs_reussis',  label: 'TR',   full: 'Tirs réussis' },
  { key: 'minutes',       label: 'MIN',  full: 'Minutes' },
  { key: 'fautes',        label: 'FT',   full: 'Fautes' },
]

function evalScore(s) {
  return s.points + s.rebonds + s.passes + s.interceptions
       - s.ballons_perdus - (s.tirs_tentes - s.tirs_reussis) - s.fautes
}

function adresse(s) {
  if (!s.tirs_tentes) return '—'
  return Math.round((s.tirs_reussis / s.tirs_tentes) * 100) + '%'
}

function initiales(nom, prenom) {
  return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase()
}

export default function Matchs() {
  const [matchs, setMatchs] = useState([])
  const [joueurs, setJoueurs] = useState([])
  const [equipeId, setEquipeId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [etape, setEtape] = useState('liste')
  const [matchForm, setMatchForm] = useState(EMPTY_MATCH)
  const [statsForm, setStatsForm] = useState({})
  const [matchCourant, setMatchCourant] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
const [scoreForm, setScoreForm] = useState({ score_nous: '', score_eux: '' })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: equipe } = await supabase
      .from('equipe').select('id, nom').eq('user_id', user.id).single()
    if (equipe) {
      setEquipeId(equipe.id)
      const [{ data: ms }, { data: js }] = await Promise.all([
        supabase.from('match').select('*').eq('equipe_id', equipe.id).order('date', { ascending: false }),
        supabase.from('joueur').select('*').eq('equipe_id', equipe.id).order('numero_maillot'),
      ])
      setMatchs(ms || [])
      setJoueurs(js || [])
    }
    setLoading(false)
  }

  async function handleCreerMatch() {
    if (!matchForm.equipe_adverse.trim() || !matchForm.date) {
      setError('Équipe adverse et date sont obligatoires.')
      return
    }
    setSaving(true); setError('')
    const { data, error: err } = await supabase.from('match')
      .insert([{ ...matchForm,
        score_nous: matchForm.score_nous !== '' ? Number(matchForm.score_nous) : null,
        score_eux:  matchForm.score_eux  !== '' ? Number(matchForm.score_eux)  : null,
        equipe_id: equipeId,
      }]).select().single()
    if (err) { setError('Erreur lors de la création du match.'); setSaving(false); return }
    setMatchCourant(data)
    const init = {}
    joueurs.forEach(j => { init[j.id] = { ...EMPTY_STAT } })
    setStatsForm(init)
    setSaving(false)
    setEtape('saisir_stats')
  }

  async function handleSauvegarderStats() {
  setSaving(true); setError('')
  const rows = joueurs.map(j => ({ joueur_id: j.id, match_id: matchCourant.id, ...statsForm[j.id] }))
  const { error: err } = await supabase.from('stats_match').insert(rows)
  if (err) { setError('Erreur lors de la sauvegarde des stats.'); setSaving(false); return }
  setSaving(false)
  setScoreForm({ score_nous: '', score_eux: '' })
  setEtape('saisir_score') // ← nouvelle étape
}

async function handleSauvegarderScore() {
  setSaving(true)
  await supabase.from('match').update({
    score_nous: scoreForm.score_nous !== '' ? Number(scoreForm.score_nous) : null,
    score_eux:  scoreForm.score_eux  !== '' ? Number(scoreForm.score_eux)  : null,
  }).eq('id', matchCourant.id)
  setSaving(false)
  setEtape('liste')
  fetchData()
}

  function updateStat(joueurId, key, value) {
    setStatsForm(prev => ({ ...prev, [joueurId]: { ...prev[joueurId], [key]: Number(value) || 0 } }))
  }

  async function ouvrirDetail(match) {
    const { data: stats } = await supabase
      .from('stats_match').select('*, joueur(nom, prenom, numero_maillot, poste)').eq('match_id', match.id)
    setDetail({ match, stats: stats || [] }); setEtape('detail')
  }

  function retourListe() { setEtape('liste'); setMatchForm(EMPTY_MATCH); setError(''); setDetail(null) }

  // ---- LOADING ----
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontSize: 13, letterSpacing: '0.05em' }}>Chargement...</div>
    </div>
  )

  // ---- LISTE ----
  if (etape === 'liste') return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
              Saison en cours
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.white, margin: 0, letterSpacing: '-0.02em' }}>Matchs</h1>
            <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
              {matchs.length} match{matchs.length !== 1 ? 's' : ''} enregistré{matchs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => { setMatchForm(EMPTY_MATCH); setError(''); setEtape('creer_match') }} style={{
            background: C.gold, color: C.dark, border: 'none',
            borderRadius: 10, padding: '10px 18px', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.01em',
            boxShadow: '0 4px 16px rgba(224,201,106,0.25)',
          }}>
            + Nouveau match
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, marginBottom: '1.5rem' }} />

        {matchs.length === 0 ? (
          <div style={{
            background: 'rgba(27,46,107,0.4)', borderRadius: 16,
            border: `1px solid ${C.border}`, padding: '5rem', textAlign: 'center'
          }}>
            <div style={{ fontSize: 44, marginBottom: 16, opacity: 0.6 }}>🏀</div>
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Aucun match enregistré.</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>
              Créez votre premier match pour commencer la saisie des stats.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matchs.map(m => {
              const gagne = m.score_nous != null && m.score_eux != null && m.score_nous > m.score_eux
              const perdu = m.score_nous != null && m.score_eux != null && m.score_nous < m.score_eux
              const nul   = m.score_nous != null && m.score_eux != null && m.score_nous === m.score_eux
              const resultColor = gagne ? '#4ADE80' : perdu ? '#F87171' : nul ? C.gold : C.muted
              return (
                <div key={m.id} onClick={() => ouvrirDetail(m)} style={{
                  background: 'rgba(27,46,107,0.35)',
                  border: `1px solid ${C.border}`,
                  borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(27,46,107,0.65)'
                    e.currentTarget.style.borderColor = 'rgba(224,201,106,0.4)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(27,46,107,0.35)'
                    e.currentTarget.style.borderColor = C.border
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Badge résultat */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: gagne ? 'rgba(74,222,128,0.12)' : perdu ? 'rgba(248,113,113,0.12)' : 'rgba(224,201,106,0.1)',
                      border: `1px solid ${gagne ? 'rgba(74,222,128,0.3)' : perdu ? 'rgba(248,113,113,0.3)' : 'rgba(224,201,106,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {gagne ? '✅' : perdu ? '❌' : nul ? '🤝' : '⏳'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: C.white, fontSize: 14 }}>vs {m.equipe_adverse}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                        {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        <span style={{ margin: '0 5px', opacity: 0.4 }}>·</span>{m.lieu}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {m.score_nous != null && m.score_eux != null ? (
                      <div style={{ fontSize: 20, fontWeight: 800, color: resultColor, letterSpacing: '-0.01em' }}>
                        {m.score_nous} – {m.score_eux}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Score non saisi</div>
                    )}
                    <div style={{ fontSize: 10, color: 'rgba(224,201,106,0.5)', marginTop: 2, letterSpacing: '0.03em' }}>
                      Voir le détail →
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  // ---- CRÉER UN MATCH ----
  if (etape === 'creer_match') return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <button onClick={retourListe} style={{
          background: 'none', border: 'none', color: C.gold,
          fontSize: 12, cursor: 'pointer', marginBottom: '1.25rem', padding: 0,
          letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4,
        }}>← Retour</button>

        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
            Nouveau match
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, margin: 0, letterSpacing: '-0.02em' }}>
            Informations du match
          </h1>
          <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0' }}>
            Renseignez les informations avant de saisir les stats
          </p>
        </div>

        <div style={{
          background: 'rgba(27,46,107,0.4)', borderRadius: 16,
          border: `1px solid ${C.border}`, padding: '1.75rem'
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Équipe adverse</label>
            <input
              value={matchForm.equipe_adverse}
              onChange={e => setMatchForm(p => ({ ...p, equipe_adverse: e.target.value }))}
              placeholder="ex: Nanterre BC"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={matchForm.date}
                onChange={e => setMatchForm(p => ({ ...p, date: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Lieu</label>
              <select value={matchForm.lieu}
                onChange={e => setMatchForm(p => ({ ...p, lieu: e.target.value }))}
                style={inputStyle}
              >
                <option>Domicile</option>
                <option>Extérieur</option>
              </select>
            </div>
          </div>

          

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 8, padding: '8px 12px', marginBottom: 14,
              fontSize: 12, color: '#F87171'
            }}>{error}</div>
          )}

          <button onClick={handleCreerMatch} disabled={saving} style={{
            width: '100%', background: saving ? 'rgba(224,201,106,0.5)' : C.gold,
            border: 'none', borderRadius: 10, padding: 12, fontSize: 14,
            fontWeight: 700, color: C.dark, cursor: saving ? 'not-allowed' : 'pointer',
            letterSpacing: '0.01em', boxShadow: saving ? 'none' : '0 4px 16px rgba(224,201,106,0.2)',
            transition: 'all 0.15s',
          }}>
            {saving ? 'Création...' : 'Créer le match et saisir les stats →'}
          </button>
        </div>
      </div>
    </div>
  )

  // ---- SAISIR LES STATS ----
  if (etape === 'saisir_stats') return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
              Saisie des statistiques
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, margin: 0, letterSpacing: '-0.02em' }}>
              vs {matchCourant.equipe_adverse}
            </h1>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              {new Date(matchCourant.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {matchCourant.score_nous != null ? ` · ${matchCourant.score_nous} – ${matchCourant.score_eux}` : ''}
            </p>
          </div>
          <button onClick={handleSauvegarderStats} disabled={saving} style={{
            background: saving ? 'rgba(224,201,106,0.5)' : C.gold, color: C.dark,
            border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13,
            fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 16px rgba(224,201,106,0.2)',
          }}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder les stats'}
          </button>
        </div>

        <div style={{ height: 1, background: C.border, marginBottom: '1.25rem' }} />

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 14,
            fontSize: 12, color: '#F87171'
          }}>{error}</div>
        )}

        {joueurs.length === 0 ? (
          <div style={{
            background: 'rgba(27,46,107,0.4)', borderRadius: 16,
            border: `1px solid ${C.border}`, padding: '3rem', textAlign: 'center'
          }}>
            <p style={{ color: C.muted, fontSize: 13 }}>Aucun joueur dans l'effectif. Ajoutez des joueurs d'abord.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {joueurs.map(j => {
              const s = statsForm[j.id] || EMPTY_STAT
              return (
                <div key={j.id} style={{
                  background: 'rgba(27,46,107,0.35)', borderRadius: 14,
                  border: `1px solid ${C.border}`, padding: '14px 16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(224,201,106,0.12)',
                      border: `1px solid rgba(224,201,106,0.3)`,
                      color: C.gold, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>
                      {initiales(j.nom, j.prenom)}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, color: C.white, fontSize: 13 }}>{j.prenom} {j.nom}</span>
                      <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>#{j.numero_maillot} · {j.poste}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: C.muted }}>
                      Eval : <strong style={{ color: evalScore(s) >= 0 ? '#4ADE80' : '#F87171' }}>{evalScore(s)}</strong>
                      <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
                      Adresse : <strong style={{ color: C.gold }}>{adresse(s)}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6 }}>
                    {STAT_FIELDS.map(f => (
                      <div key={f.key} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: C.muted, marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          {f.label}
                        </div>
                        <input
                          type="number" min={0} value={s[f.key]}
                          onChange={e => updateStat(j.id, f.key, e.target.value)}
                          style={{
                            width: '100%', textAlign: 'center',
                            background: 'rgba(15,28,63,0.8)',
                            border: `1px solid rgba(224,201,106,0.15)`,
                            borderRadius: 7, padding: '7px 2px', fontSize: 13,
                            fontWeight: 600, color: C.white, outline: 'none',
                            boxSizing: 'border-box', transition: 'border-color 0.15s',
                          }}
                          onFocus={e => e.target.style.borderColor = 'rgba(224,201,106,0.5)'}
                          onBlur={e => e.target.style.borderColor = 'rgba(224,201,106,0.15)'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button onClick={handleSauvegarderStats} disabled={saving} style={{
            background: saving ? 'rgba(224,201,106,0.5)' : C.gold,
            color: C.dark, border: 'none', borderRadius: 10,
            padding: '12px 36px', fontSize: 14, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 20px rgba(224,201,106,0.25)',
          }}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder les stats'}
          </button>
        </div>
      </div>
    </div>
  )

  // ---- DETAIL MATCH ----
  if (etape === 'detail' && detail) {
    const { match: m, stats } = detail
    const gagne = m.score_nous != null && m.score_eux != null && m.score_nous > m.score_eux
    const perdu = m.score_nous != null && m.score_eux != null && m.score_nous < m.score_eux
    return (
      <div style={{ minHeight: '100vh', background: C.bg, padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <button onClick={retourListe} style={{
            background: 'none', border: 'none', color: C.gold,
            fontSize: 12, cursor: 'pointer', marginBottom: '1.25rem', padding: 0,
            letterSpacing: '0.04em',
          }}>← Retour aux matchs</button>

          {/* Match header card */}
          <div style={{
            background: 'rgba(27,46,107,0.5)', borderRadius: 16,
            border: `1px solid ${C.border}`, padding: '1.5rem', marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
                  {m.lieu}
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, margin: 0, letterSpacing: '-0.02em' }}>
                  vs {m.equipe_adverse}
                </h1>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                  {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              {m.score_nous != null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em',
                    color: gagne ? '#4ADE80' : perdu ? '#F87171' : C.gold
                  }}>
                    {m.score_nous} – {m.score_eux}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: gagne ? '#4ADE80' : perdu ? '#F87171' : C.gold, marginTop: 2, opacity: 0.8
                  }}>
                    {gagne ? 'Victoire' : perdu ? 'Défaite' : 'Match nul'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats table */}
          {stats.length === 0 ? (
            <div style={{
              background: 'rgba(27,46,107,0.4)', borderRadius: 16,
              border: `1px solid ${C.border}`, padding: '3rem', textAlign: 'center'
            }}>
              <p style={{ color: C.muted, fontSize: 13 }}>Aucune statistique enregistrée pour ce match.</p>
            </div>
          ) : (
            <div style={{
              background: 'rgba(27,46,107,0.35)', borderRadius: 14,
              border: `1px solid ${C.border}`, overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={thStyle}>Joueur</th>
                    {STAT_FIELDS.map(f => (
                      <th key={f.key} style={{ ...thStyle, textAlign: 'center' }}>{f.label}</th>
                    ))}
                    <th style={{ ...thStyle, textAlign: 'center', color: C.gold }}>Eval</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>%Tir</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, i) => (
                    <tr key={s.id} style={{
                      borderBottom: i < stats.length - 1 ? `1px solid rgba(224,201,106,0.08)` : 'none',
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,201,106,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: C.white, fontSize: 13 }}>
                          {s.joueur?.prenom} {s.joueur?.nom}
                        </span>
                        <span style={{ fontSize: 10, color: C.muted, marginLeft: 6 }}>
                          #{s.joueur?.numero_maillot}
                        </span>
                      </td>
                      {STAT_FIELDS.map(f => (
                        <td key={f.key} style={{ padding: '11px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                          {s[f.key]}
                        </td>
                      ))}
                      <td style={{
                        padding: '11px 8px', textAlign: 'center',
                        fontWeight: 800, fontSize: 13,
                        color: evalScore(s) >= 0 ? '#4ADE80' : '#F87171'
                      }}>
                        {evalScore(s)}
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'center', color: C.gold, fontWeight: 600, fontSize: 13 }}>
                        {adresse(s)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }
  if (etape === 'saisir_score') return (
  <div style={{ minHeight: '100vh', background: C.bg, padding: '2rem 1.5rem' }}>
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
          Score final
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, margin: 0 }}>
          vs {matchCourant.equipe_adverse}
        </h1>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          Stats sauvegardées ✅ — Entrez le score final du match
        </p>
      </div>

      <div style={{
        background: 'rgba(27,46,107,0.4)', borderRadius: 16,
        border: `1px solid ${C.border}`, padding: '1.75rem'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Notre score</label>
            <input
              type="number" min={0}
              value={scoreForm.score_nous}
              onChange={e => setScoreForm(p => ({ ...p, score_nous: e.target.value }))}
              placeholder="78"
              style={{ ...inputStyle, fontSize: 24, fontWeight: 800, textAlign: 'center', padding: '14px 12px' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Score adversaire</label>
            <input
              type="number" min={0}
              value={scoreForm.score_eux}
              onChange={e => setScoreForm(p => ({ ...p, score_eux: e.target.value }))}
              placeholder="65"
              style={{ ...inputStyle, fontSize: 24, fontWeight: 800, textAlign: 'center', padding: '14px 12px' }}
            />
          </div>
        </div>

        <button onClick={handleSauvegarderScore} disabled={saving} style={{
          width: '100%', background: saving ? 'rgba(224,201,106,0.5)' : C.gold,
          border: 'none', borderRadius: 10, padding: 12, fontSize: 14,
          fontWeight: 700, color: C.dark, cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: saving ? 'none' : '0 4px 16px rgba(224,201,106,0.2)',
        }}>
          {saving ? 'Sauvegarde...' : 'Terminer le match ✓'}
        </button>

        <button onClick={() => { setEtape('liste'); fetchData() }} style={{
          width: '100%', background: 'none', border: 'none',
          color: C.muted, fontSize: 12, cursor: 'pointer',
          marginTop: 12, padding: '6px 0',
        }}>
          Passer le score (saisir plus tard)
        </button>
      </div>
    </div>
  </div>
)

  return null
}

const labelStyle = {
  fontSize: 10, fontWeight: 600, color: 'rgba(224,201,106,0.7)',
  display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase'
}

const inputStyle = {
  width: '100%',
  background: 'rgba(15,28,63,0.8)',
  border: '1px solid rgba(224,201,106,0.2)',
  borderRadius: 8, padding: '10px 12px',
  fontSize: 13, color: '#fff',
  boxSizing: 'border-box', outline: 'none',
  transition: 'border-color 0.15s',
}

const thStyle = {
  padding: '10px 8px', textAlign: 'left',
  fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
  letterSpacing: '0.1em', textTransform: 'uppercase',
}