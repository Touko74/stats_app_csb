import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

// ---- Helpers ----
function evalScore(s) {
  return (s.points || 0) + (s.rebonds || 0) + (s.passes || 0) + (s.interceptions || 0)
    - (s.ballons_perdus || 0) - ((s.tirs_tentes || 0) - (s.tirs_reussis || 0)) - (s.fautes || 0)
}

function pctTir(tentes, reussis) {
  if (!tentes) return '—'
  return Math.round((reussis / tentes) * 100) + '%'
}

function moyenne(arr) {
  if (!arr.length) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10
}

function initiales(nom, prenom) {
  return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase()
}

const COLORS = {
  bg: '#0F1C3F',
  card: '#1B2E6B',
  cardDark: '#111827',
  gold: '#E0C96A',
  border: 'rgba(224,201,106,0.2)',
  textMuted: 'rgba(255,255,255,0.4)',
  textPrimary: '#fff',
}

const statBoxStyle = {
  background: '#0F1C3F',
  borderRadius: 10,
  padding: '12px 14px',
  textAlign: 'center',
  border: `0.5px solid rgba(224,201,106,0.12)`,
}

export default function Stats() {
  const [loading, setLoading] = useState(true)
  const [joueurs, setJoueurs] = useState([])
  const [statsParJoueur, setStatsParJoueur] = useState({})
  const [matchsParJoueur, setMatchsParJoueur] = useState({})
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: equipe } = await supabase
      .from('equipe').select('id').eq('user_id', user.id).single()

    if (!equipe) { setLoading(false); return }

    const { data: js } = await supabase
      .from('joueur').select('*').eq('equipe_id', equipe.id).order('numero_maillot')

    const ids = js?.map(j => j.id) || []

    const { data: st } = await supabase
      .from('stats_match')
      .select('*, match(id, date, equipe_adverse)')
      .in('joueur_id', ids)

    // Regrouper stats par joueur
    const parJoueur = {}
    const matchsJ = {}
    ids.forEach(id => {
      parJoueur[id] = (st || []).filter(s => s.joueur_id === id)
      matchsJ[id] = parJoueur[id]
        .slice()
        .sort((a, b) => new Date(a.match?.date) - new Date(b.match?.date))
    })

    setJoueurs(js || [])
    setStatsParJoueur(parJoueur)
    setMatchsParJoueur(matchsJ)
    setLoading(false)
  }

  // Calcul moyennes pour un joueur
  function moyennes(joueurId) {
    const st = statsParJoueur[joueurId] || []
    if (!st.length) return null
    const n = st.length
    return {
      points:         Math.round(st.reduce((a, b) => a + (b.points || 0), 0) / n * 10) / 10,
      rebonds:        Math.round(st.reduce((a, b) => a + (b.rebonds || 0), 0) / n * 10) / 10,
      passes:         Math.round(st.reduce((a, b) => a + (b.passes || 0), 0) / n * 10) / 10,
      interceptions:  Math.round(st.reduce((a, b) => a + (b.interceptions || 0), 0) / n * 10) / 10,
      ballons_perdus: Math.round(st.reduce((a, b) => a + (b.ballons_perdus || 0), 0) / n * 10) / 10,
      tirs_tentes:    Math.round(st.reduce((a, b) => a + (b.tirs_tentes || 0), 0) / n * 10) / 10,
      tirs_reussis:   Math.round(st.reduce((a, b) => a + (b.tirs_reussis || 0), 0) / n * 10) / 10,
      minutes:        Math.round(st.reduce((a, b) => a + (b.minutes || 0), 0) / n),
      fautes:         Math.round(st.reduce((a, b) => a + (b.fautes || 0), 0) / n * 10) / 10,
      eval:           Math.round(st.reduce((a, b) => a + evalScore(b), 0) / n * 10) / 10,
      matchsJoues:    n,
      totalTentes:    st.reduce((a, b) => a + (b.tirs_tentes || 0), 0),
      totalReussis:   st.reduce((a, b) => a + (b.tirs_reussis || 0), 0),
    }
  }

  // Progression points par match pour la fiche
  function progressionPts(joueurId) {
    return (matchsParJoueur[joueurId] || []).map((s, i) => ({
      name: `M${i + 1}`,
      pts: s.points || 0,
      adv: s.match?.equipe_adverse || ''
    }))
  }

  const filtered = joueurs.filter(j =>
    `${j.prenom} ${j.nom}`.toLowerCase().includes(search.toLowerCase()) ||
    j.poste?.toLowerCase().includes(search.toLowerCase())
  )

  // Trouver les meilleurs par colonne pour mettre en jaune
  function findBest(key) {
    let best = -Infinity
    let bestId = null
    joueurs.forEach(j => {
      const m = moyennes(j.id)
      if (m && m[key] > best) { best = m[key]; bestId = j.id }
    })
    return bestId
  }

  const bestPts   = findBest('points')
  const bestRebs  = findBest('rebonds')
  const bestPas   = findBest('passes')
  const bestInt   = findBest('interceptions')
  const bestEval  = findBest('eval')

  const selJoueur = selected ? joueurs.find(j => j.id === selected) : null
  const selMoy    = selected ? moyennes(selected) : null
  const selProg   = selected ? progressionPts(selected) : []

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.gold, margin: 0 }}>Statistiques</h1>
            <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
              Moyennes sur la saison · {joueurs.length} joueurs
            </p>
          </div>
        </div>

        {/* Recherche */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <input
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null) }}
            style={{
              width: '100%', padding: '10px 14px 10px 36px',
              background: COLORS.cardDark, border: `0.5px solid ${COLORS.border}`,
              borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(224,201,106,0.4)', fontSize: 15 }}>🔍</span>
        </div>

        {/* Tableau */}
        <div style={{ background: COLORS.cardDark, borderRadius: 12, border: `0.5px solid ${COLORS.border}`, overflow: 'hidden', marginBottom: '1.25rem' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
              Aucun joueur trouvé.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 700 }}>
                <thead>
                  <tr>
                    {[
                      { label: 'Joueur', w: 170 },
                      { label: 'Poste', w: 90 },
                      { label: 'MJ', w: 40 },
                      { label: 'PTS', w: 50 },
                      { label: 'REB', w: 50 },
                      { label: 'PAS', w: 50 },
                      { label: 'INT', w: 50 },
                      { label: 'BP', w: 50 },
                      { label: '%TIR', w: 55 },
                      { label: 'MIN', w: 50 },
                      { label: 'EVAL', w: 60 },
                    ].map(h => (
                      <th key={h.label} style={{
                        fontSize: 10, fontWeight: 500, color: 'rgba(224,201,106,0.6)',
                        padding: '10px 12px', textAlign: h.label === 'Joueur' || h.label === 'Poste' ? 'left' : 'center',
                        background: '#0A1128', borderBottom: `0.5px solid rgba(224,201,106,0.1)`,
                        width: h.w
                      }}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(j => {
                    const m = moyennes(j.id)
                    const isSelected = selected === j.id
                    return (
                      <tr
                        key={j.id}
                        onClick={() => setSelected(isSelected ? null : j.id)}
                        style={{ cursor: 'pointer', background: isSelected ? 'rgba(224,201,106,0.08)' : 'transparent' }}
                      >
                        <td style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: isSelected ? COLORS.gold : 'rgba(224,201,106,0.12)',
                              color: isSelected ? COLORS.card : COLORS.gold,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, flexShrink: 0
                            }}>
                              {initiales(j.nom, j.prenom)}
                            </div>
                            <span style={{ fontWeight: 500, color: '#fff', fontSize: 13 }}>
                              {j.prenom} {j.nom}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                          <span style={{
                            background: 'rgba(224,201,106,0.1)', color: COLORS.gold,
                            border: `0.5px solid rgba(224,201,106,0.3)`,
                            borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 500
                          }}>{j.poste}</span>
                        </td>
                        {/* MJ */}
                        <td style={{ textAlign: 'center', fontSize: 12, color: COLORS.textMuted, padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                          {m ? m.matchsJoues : '—'}
                        </td>
                        {/* Stats */}
                        {[
                          { val: m?.points,   best: bestPts === j.id },
                          { val: m?.rebonds,  best: bestRebs === j.id },
                          { val: m?.passes,   best: bestPas === j.id },
                          { val: m?.interceptions, best: bestInt === j.id },
                          { val: m?.ballons_perdus, best: false },
                        ].map((s, i) => (
                          <td key={i} style={{
                            textAlign: 'center', fontSize: 12, padding: '10px 12px',
                            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                            color: s.best ? COLORS.gold : 'rgba(255,255,255,0.8)',
                            fontWeight: s.best ? 700 : 400
                          }}>
                            {m ? s.val : '—'}
                          </td>
                        ))}
                        {/* %TIR */}
                        <td style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.8)', padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                          {m ? pctTir(m.totalTentes, m.totalReussis) : '—'}
                        </td>
                        {/* MIN */}
                        <td style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.8)', padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                          {m ? m.minutes : '—'}
                        </td>
                        {/* EVAL */}
                        <td style={{ textAlign: 'center', padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                          {m ? (
                            <span style={{
                              background: bestEval === j.id ? COLORS.gold : m.eval >= 0 ? 'rgba(46,125,50,0.2)' : 'rgba(192,57,43,0.2)',
                              color: bestEval === j.id ? COLORS.card : m.eval >= 0 ? '#81C784' : '#EF9A9A',
                              borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700
                            }}>
                              {m.eval >= 0 ? '+' : ''}{m.eval}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fiche individuelle */}
        {selJoueur && selMoy ? (
          <div style={{ background: COLORS.card, borderRadius: 12, border: `0.5px solid ${COLORS.border}`, padding: '1.25rem' }}>

            {/* Header joueur */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: `0.5px solid rgba(224,201,106,0.15)` }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: COLORS.gold, color: COLORS.card,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, flexShrink: 0
              }}>
                {initiales(selJoueur.nom, selJoueur.prenom)}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {selJoueur.prenom} {selJoueur.nom}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                  {selJoueur.poste} · #{selJoueur.numero_maillot} · {selMoy.matchsJoues} match{selMoy.matchsJoues !== 1 ? 's' : ''} joué{selMoy.matchsJoues !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <span style={{
                  background: COLORS.gold, color: COLORS.card,
                  borderRadius: 8, padding: '6px 14px', fontSize: 14, fontWeight: 700
                }}>
                  Eval {selMoy.eval >= 0 ? '+' : ''}{selMoy.eval}
                </span>
              </div>
            </div>

            {/* Stats principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 10 }}>
              {[
                { val: selMoy.points,        label: 'Points' },
                { val: selMoy.rebonds,       label: 'Rebonds' },
                { val: selMoy.passes,        label: 'Passes' },
                { val: selMoy.interceptions, label: 'Interceptions' },
                { val: pctTir(selMoy.totalTentes, selMoy.totalReussis), label: 'Adresse' },
              ].map(s => (
                <div key={s.label} style={statBoxStyle}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.gold }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Stats secondaires */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: '1.25rem' }}>
              {[
                { val: selMoy.ballons_perdus, label: 'Ballons perdus' },
                { val: selMoy.tirs_tentes,   label: 'Tirs tentés' },
                { val: selMoy.tirs_reussis,  label: 'Tirs réussis' },
                { val: selMoy.minutes,       label: 'Min / match' },
              ].map(s => (
                <div key={s.label} style={statBoxStyle}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Graphique progression */}
            {selProg.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(224,201,106,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Points par match
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={selProg} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: `0.5px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12, color: '#fff' }}
                      formatter={(v, _, props) => [`${v} pts vs ${props.payload.adv}`, '']}
                      labelStyle={{ color: COLORS.gold }}
                    />
                    <Bar dataKey="pts" fill={COLORS.gold} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}

          </div>
        ) : (
          <div style={{
            background: COLORS.cardDark, borderRadius: 12,
            border: `0.5px solid ${COLORS.border}`, padding: '2rem',
            textAlign: 'center', color: COLORS.textMuted, fontSize: 13
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👆</div>
            Cliquez sur un joueur pour voir sa fiche détaillée
          </div>
        )}

      </div>
    </div>
  )
}