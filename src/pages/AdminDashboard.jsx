import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Mes couleurs globales
const C = {
  bg: '#0F1C3F', card: '#1B2E6B', dark: '#111827',
  gold: '#E0C96A', border: 'rgba(224,201,106,0.2)',
  muted: 'rgba(255,255,255,0.4)', white: '#fff',
}

// Styles réutilisables
const statBox = {
  background: '#0A1128', borderRadius: 10,
  padding: '12px 8px', textAlign: 'center',
  border: '0.5px solid rgba(224,201,106,0.12)'
}

// Calcul de l'évaluation d'un joueur sur un match
function evalScore(s) {
  return (s.points || 0) + (s.rebonds || 0) + (s.passes || 0) + (s.interceptions || 0)
    - (s.ballons_perdus || 0) - ((s.tirs_tentes || 0) - (s.tirs_reussis || 0)) - (s.fautes || 0)
}

// Calcul du pourcentage de tir
function pctTir(tentes, reussis) {
  if (!tentes) return '—'
  return Math.round((reussis / tentes) * 100) + '%'
}

// Moyenne d'un tableau de nombres
function avg(arr) {
  if (!arr.length) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10
}

// Initiales d'un joueur pour l'avatar
function initiales(nom, prenom) {
  return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase()
}

// Couleurs des postes
const POSTE_STYLE = {
  'Meneur':      { bg: 'rgba(224,201,106,0.15)', color: '#E0C96A' },
  'Arrière':     { bg: 'rgba(74,222,128,0.12)',  color: '#4ADE80' },
  'Ailier':      { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA' },
  'Ailier fort': { bg: 'rgba(251,146,60,0.12)',  color: '#FB923C' },
  'Pivot':       { bg: 'rgba(196,181,253,0.12)', color: '#C4B5FD' },
}

// Onglets disponibles dans la vue équipe
const ONGLETS = ['Joueurs', 'Matchs', 'Stats']

export default function AdminDashboard() {
  const [equipes, setEquipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEquipe, setSelectedEquipe] = useState(null)
  const [onglet, setOnglet] = useState('Joueurs')

  // Données de l'équipe sélectionnée
  const [joueurs, setJoueurs] = useState([])
  const [matchs, setMatchs] = useState([])
  const [statsParJoueur, setStatsParJoueur] = useState({})
  const [loadingEquipe, setLoadingEquipe] = useState(false)

  // Joueur sélectionné dans l'onglet Stats
  const [selectedJoueur, setSelectedJoueur] = useState(null)

  useEffect(() => { fetchEquipes() }, [])

  // Je charge toutes les équipes au démarrage
  async function fetchEquipes() {
    setLoading(true)
    const { data } = await supabase.from('equipe').select('*').order('nom')
    setEquipes(data || [])
    setLoading(false)
  }

  // Quand je clique sur une équipe, je charge ses données complètes
  async function openEquipe(equipe) {
    setSelectedEquipe(equipe)
    setSelectedJoueur(null)
    setOnglet('Joueurs')
    setLoadingEquipe(true)

    const [{ data: js }, { data: ms }] = await Promise.all([
      supabase.from('joueur').select('*').eq('equipe_id', equipe.id).order('numero_maillot'),
      supabase.from('match').select('*').eq('equipe_id', equipe.id).order('date', { ascending: false }),
    ])

    const joueursList = js || []
    const ids = joueursList.map(j => j.id)

    // Je charge les stats de tous les joueurs de cette équipe
    const { data: st } = await supabase
      .from('stats_match')
      .select('*, match(id, date, equipe_adverse)')
      .in('joueur_id', ids)

    // Je regroupe les stats par joueur
    const parJoueur = {}
    ids.forEach(id => {
      parJoueur[id] = (st || []).filter(s => s.joueur_id === id)
    })

    setJoueurs(joueursList)
    setMatchs(ms || [])
    setStatsParJoueur(parJoueur)
    setLoadingEquipe(false)
  }

  // Je calcule les moyennes d'un joueur sur la saison
  function moyennes(joueurId) {
    const st = statsParJoueur[joueurId] || []
    if (!st.length) return null
    const n = st.length
    const totalTentes  = st.reduce((a, b) => a + (b.tirs_tentes || 0), 0)
    const totalReussis = st.reduce((a, b) => a + (b.tirs_reussis || 0), 0)
    return {
      points:         avg(st.map(s => s.points || 0)),
      rebonds:        avg(st.map(s => s.rebonds || 0)),
      passes:         avg(st.map(s => s.passes || 0)),
      interceptions:  avg(st.map(s => s.interceptions || 0)),
      ballons_perdus: avg(st.map(s => s.ballons_perdus || 0)),
      tirs_tentes:    avg(st.map(s => s.tirs_tentes || 0)),
      tirs_reussis:   avg(st.map(s => s.tirs_reussis || 0)),
      minutes:        Math.round(avg(st.map(s => s.minutes || 0))),
      eval:           avg(st.map(s => evalScore(s))),
      matchsJoues:    n,
      totalTentes,
      totalReussis,
    }
  }

  // Données de progression points par match pour le graphique
  function progressionPts(joueurId) {
    return (statsParJoueur[joueurId] || [])
      .slice()
      .sort((a, b) => new Date(a.match?.date) - new Date(b.match?.date))
      .map((s, i) => ({
        name: `M${i + 1}`,
        pts: s.points || 0,
        adv: s.match?.equipe_adverse || ''
      }))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>

      {/* Sidebar gauche : liste des équipes */}
      <div style={{
        width: 220, background: 'rgba(27,46,107,0.6)',
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', flexShrink: 0,
      }}>
        {/* Header sidebar */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            Mode admin
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Toutes les équipes</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {equipes.length} équipe{equipes.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Liste des équipes cliquables */}
        <div style={{ flex: 1 }}>
          {equipes.map(e => (
            <div
              key={e.id}
              onClick={() => openEquipe(e)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: `1px solid rgba(224,201,106,0.08)`,
                background: selectedEquipe?.id === e.id ? 'rgba(224,201,106,0.12)' : 'transparent',
                borderLeft: selectedEquipe?.id === e.id ? `3px solid ${C.gold}` : '3px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e2 => e2.currentTarget.style.background = 'rgba(224,201,106,0.06)'}
              onMouseLeave={e2 => e2.currentTarget.style.background = selectedEquipe?.id === e.id ? 'rgba(224,201,106,0.12)' : 'transparent'}
            >
              <div style={{ fontWeight: 600, color: C.white, fontSize: 13 }}>{e.nom}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{e.categorie || 'Équipe'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem' }}>

        {/* Si aucune équipe sélectionnée */}
        {!selectedEquipe ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏀</div>
              <p style={{ fontSize: 14 }}>Sélectionne une équipe pour voir ses données</p>
            </div>
          </div>
        ) : loadingEquipe ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted }}>
            Chargement...
          </div>
        ) : (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>

            {/* Header équipe */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                Vue admin · lecture seule
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: C.white, margin: 0 }}>{selectedEquipe.nom}</h1>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {joueurs.length} joueur{joueurs.length !== 1 ? 's' : ''} · {matchs.length} match{matchs.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Onglets */}
            <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: 'rgba(27,46,107,0.3)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
              {ONGLETS.map(o => (
                <button
                  key={o}
                  onClick={() => { setOnglet(o); setSelectedJoueur(null) }}
                  style={{
                    padding: '7px 18px', borderRadius: 7, border: 'none',
                    background: onglet === o ? C.gold : 'transparent',
                    color: onglet === o ? C.dark : C.muted,
                    fontSize: 13, fontWeight: onglet === o ? 700 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {o}
                </button>
              ))}
            </div>

            {/* ---- ONGLET JOUEURS ---- */}
            {onglet === 'Joueurs' && (
              <div style={{ background: 'rgba(27,46,107,0.35)', borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>Effectif</span>
                </div>
                {joueurs.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Aucun joueur.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {['Joueur', '#', 'Poste', 'Statut'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {joueurs.map(j => {
                        const ps = POSTE_STYLE[j.poste] || { bg: 'rgba(255,255,255,0.08)', color: C.muted }
                        return (
                          <tr key={j.id} style={{ borderBottom: '1px solid rgba(224,201,106,0.07)' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%',
                                  background: 'rgba(224,201,106,0.12)', color: C.gold,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 800,
                                }}>
                                  {initiales(j.nom, j.prenom)}
                                </div>
                                <span style={{ fontWeight: 600, color: C.white }}>{j.prenom} {j.nom}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ background: 'rgba(224,201,106,0.12)', border: '1px solid rgba(224,201,106,0.25)', color: C.gold, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>
                                {j.numero_maillot}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ background: ps.bg, color: ps.color, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                                {j.poste}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {j.email ? (
                                <span style={{ fontSize: 11, color: '#4ADE80' }}>● Invité</span>
                              ) : (
                                <span style={{ fontSize: 11, color: C.muted }}>● Non invité</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ---- ONGLET MATCHS ---- */}
            {onglet === 'Matchs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {matchs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', color: C.muted }}>Aucun match enregistré.</div>
                ) : matchs.map(m => {
                  const gagne = m.score_nous != null && m.score_eux != null && m.score_nous > m.score_eux
                  const perdu = m.score_nous != null && m.score_eux != null && m.score_nous < m.score_eux
                  const resultColor = gagne ? '#4ADE80' : perdu ? '#F87171' : C.muted
                  return (
                    <div key={m.id} style={{
                      background: 'rgba(27,46,107,0.35)', border: `1px solid ${C.border}`,
                      borderRadius: 14, padding: '14px 18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 10,
                          background: gagne ? 'rgba(74,222,128,0.12)' : perdu ? 'rgba(248,113,113,0.12)' : 'rgba(224,201,106,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                        }}>
                          {gagne ? '✅' : perdu ? '❌' : '⏳'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: C.white, fontSize: 14 }}>vs {m.equipe_adverse}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                            {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            <span style={{ margin: '0 5px', opacity: 0.4 }}>·</span>{m.lieu}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {m.score_nous != null ? (
                          <div style={{ fontSize: 20, fontWeight: 800, color: resultColor }}>
                            {m.score_nous} – {m.score_eux}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Score non saisi</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ---- ONGLET STATS ---- */}
            {onglet === 'Stats' && (
              <div>
                {/* Tableau des moyennes */}
                <div style={{ background: C.dark, borderRadius: 12, border: `0.5px solid ${C.border}`, overflow: 'hidden', marginBottom: '1.25rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 650 }}>
                      <thead>
                        <tr>
                          {['Joueur', 'MJ', 'PTS', 'REB', 'PAS', 'INT', '%TIR', 'EVAL'].map(h => (
                            <th key={h} style={{
                              fontSize: 10, fontWeight: 500, color: 'rgba(224,201,106,0.6)',
                              padding: '10px 12px', textAlign: h === 'Joueur' ? 'left' : 'center',
                              background: '#0A1128', borderBottom: `0.5px solid rgba(224,201,106,0.1)`,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {joueurs.map(j => {
                          const m = moyennes(j.id)
                          const isSelected = selectedJoueur?.id === j.id
                          return (
                            <tr
                              key={j.id}
                              onClick={() => setSelectedJoueur(isSelected ? null : j)}
                              style={{ cursor: 'pointer', background: isSelected ? 'rgba(224,201,106,0.08)' : 'transparent' }}
                            >
                              <td style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: isSelected ? C.gold : 'rgba(224,201,106,0.12)',
                                    color: isSelected ? C.dark : C.gold,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, fontWeight: 700,
                                  }}>
                                    {initiales(j.nom, j.prenom)}
                                  </div>
                                  <span style={{ fontWeight: 500, color: C.white }}>{j.prenom} {j.nom}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', color: C.muted, padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>{m ? m.matchsJoues : '—'}</td>
                              {[m?.points, m?.rebonds, m?.passes, m?.interceptions].map((val, i) => (
                                <td key={i} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                                  {m ? val : '—'}
                                </td>
                              ))}
                              <td style={{ textAlign: 'center', color: C.gold, padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                                {m ? pctTir(m.totalTentes, m.totalReussis) : '—'}
                              </td>
                              <td style={{ textAlign: 'center', padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                                {m ? (
                                  <span style={{
                                    background: m.eval >= 0 ? 'rgba(46,125,50,0.2)' : 'rgba(192,57,43,0.2)',
                                    color: m.eval >= 0 ? '#81C784' : '#EF9A9A',
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
                </div>

                {/* Fiche détaillée du joueur sélectionné */}
                {selectedJoueur && (() => {
                  const m = moyennes(selectedJoueur.id)
                  const prog = progressionPts(selectedJoueur.id)
                  if (!m) return (
                    <div style={{ background: C.dark, borderRadius: 12, border: `0.5px solid ${C.border}`, padding: '2rem', textAlign: 'center', color: C.muted }}>
                      Aucune statistique pour ce joueur.
                    </div>
                  )
                  return (
                    <div style={{ background: C.card, borderRadius: 12, border: `0.5px solid ${C.border}`, padding: '1.25rem' }}>
                      {/* Header joueur */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: `0.5px solid rgba(224,201,106,0.15)` }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.gold, color: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                          {initiales(selectedJoueur.nom, selectedJoueur.prenom)}
                        </div>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 700, color: C.white }}>{selectedJoueur.prenom} {selectedJoueur.nom}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                            {selectedJoueur.poste} · #{selectedJoueur.numero_maillot} · {m.matchsJoues} match{m.matchsJoues !== 1 ? 's' : ''} joué{m.matchsJoues !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <span style={{ marginLeft: 'auto', background: C.gold, color: C.dark, borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>
                          Eval {m.eval >= 0 ? '+' : ''}{m.eval}
                        </span>
                      </div>

                      {/* Stats principales */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 10 }}>
                        {[
                          { val: m.points, label: 'Points' },
                          { val: m.rebonds, label: 'Rebonds' },
                          { val: m.passes, label: 'Passes' },
                          { val: m.interceptions, label: 'Interceptions' },
                          { val: pctTir(m.totalTentes, m.totalReussis), label: 'Adresse' },
                        ].map(s => (
                          <div key={s.label} style={statBox}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: C.gold }}>{s.val}</div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Stats secondaires */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: '1.25rem' }}>
                        {[
                          { val: m.ballons_perdus, label: 'Ballons perdus' },
                          { val: m.tirs_tentes,    label: 'Tirs tentés' },
                          { val: m.tirs_reussis,   label: 'Tirs réussis' },
                          { val: m.minutes,        label: 'Min / match' },
                        ].map(s => (
                          <div key={s.label} style={statBox}>
                            <div style={{ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{s.val}</div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Graphique progression points */}
                      {prog.length > 0 && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(224,201,106,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Points par match
                          </div>
                          <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={prog} barCategoryGap="30%">
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                              <Tooltip
                                contentStyle={{ background: C.dark, border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.white }}
                                formatter={(v, _, p) => [`${v} pts vs ${p.payload.adv}`, '']}
                                labelStyle={{ color: C.gold }}
                              />
                              <Bar dataKey="pts" fill={C.gold} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}