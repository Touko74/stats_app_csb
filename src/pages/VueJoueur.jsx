import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const C = {
  bg:     '#0F1C3F',
  card:   '#1B2E6B',
  dark:   '#111827',
  gold:   '#E0C96A',
  border: 'rgba(224,201,106,0.2)',
  muted:  'rgba(255,255,255,0.4)',
  white:  '#fff',
}

function evalScore(s) {
  return (s.points || 0) + (s.rebonds || 0) + (s.passes || 0) + (s.interceptions || 0)
    - (s.ballons_perdus || 0) - ((s.tirs_tentes || 0) - (s.tirs_reussis || 0)) - (s.fautes || 0)
}

function avg(arr) {
  if (!arr.length) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10
}

function pct(reussis, tentes) {
  if (!tentes) return null
  return Math.round((reussis / tentes) * 100)
}

function initiales(nom, prenom) {
  return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase()
}

function genererMessages(statsTriees, moy, rangPts) {
  const msgs = []
  if (statsTriees.length < 2) return msgs

  const derniers = statsTriees.slice(-3)
  const moyDerniers = avg(derniers.map(s => s.points || 0))

  if (statsTriees.length >= 3) {
    if (moyDerniers > moy.points * 1.1)
      msgs.push({ type: 'success', texte: `Tu es en feu ! Tes ${derniers.length} derniers matchs (${moyDerniers} pts en moy.) sont au-dessus de ta moyenne de saison.` })
    else if (moyDerniers < moy.points * 0.85)
      msgs.push({ type: 'warning', texte: `Petite baisse sur tes derniers matchs. Reste concentré, ça va repartir.` })
  }

  const adresse = pct(moy.totalReussis, moy.totalTentes)
  if (adresse !== null && adresse < 35)
    msgs.push({ type: 'warning', texte: `Ton adresse au tir est à ${adresse}%. Travaille la qualité de tes tirs plutôt que la quantité.` })

  if (moy.passes > 0 && moy.ballons_perdus / moy.passes > 0.5)
    msgs.push({ type: 'warning', texte: `Tu perds beaucoup de ballons par rapport à tes passes. Sois plus sélectif dans tes décisions.` })

  if (rangPts === 1)
    msgs.push({ type: 'success', texte: `Tu es le meilleur scoreur de l'équipe cette saison. Continue comme ça !` })
  else if (rangPts === 2)
    msgs.push({ type: 'info', texte: `Tu es 2e scoreur de l'équipe. Le 1er n'est pas loin !` })

  if (moy.eval > 15)
    msgs.push({ type: 'success', texte: `Ton évaluation globale est excellente (+${moy.eval} moy.). Tu es un joueur impactant pour l'équipe.` })

  return msgs
}

const msgStyle = (type) => ({
  display: 'flex', alignItems: 'flex-start', gap: 10,
  padding: '10px 14px', borderRadius: 8, marginBottom: 8,
  background: type === 'success' ? 'rgba(46,125,50,0.15)' : type === 'warning' ? 'rgba(224,150,0,0.15)' : 'rgba(224,201,106,0.1)',
  border: `0.5px solid ${type === 'success' ? 'rgba(46,125,50,0.3)' : type === 'warning' ? 'rgba(224,150,0,0.3)' : C.border}`,
})

const cardStyle  = { background: C.card, borderRadius: 12, border: `0.5px solid ${C.border}`, padding: '1.25rem', marginBottom: '1rem' }
const darkStyle  = { background: C.dark, borderRadius: 12, border: `0.5px solid ${C.border}`, padding: '1.25rem', marginBottom: '1rem' }
const statBox    = { background: '#0A1128', borderRadius: 10, padding: '12px 8px', textAlign: 'center', border: `0.5px solid rgba(224,201,106,0.12)` }

export default function VueJoueur() {
  const [loading, setLoading] = useState(true)
  const [joueur, setJoueur] = useState(null)
  const [equipe, setEquipe] = useState(null)
  const [stats, setStats] = useState([])
  const [rangPts, setRangPts] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Récupérer le joueur lié à cet email
    const { data: j } = await supabase
      .from('joueur')
      .select('*, equipe(nom)')
      .eq('email', user.email)
      .single()

    if (!j) { setLoading(false); return }
    setJoueur(j)
    setEquipe(j.equipe)

    // Récupérer les stats de ce joueur
    const { data: st } = await supabase
      .from('stats_match')
      .select('*, match(date, equipe_adverse)')
      .eq('joueur_id', j.id)
      .order('match(date)', { ascending: true })

    setStats(st || [])

    // Calculer le rang dans l'équipe
    const { data: tousJoueurs } = await supabase
      .from('joueur').select('id').eq('equipe_id', j.equipe_id)

    const ids = tousJoueurs?.map(x => x.id) || []
    const { data: toutesStats } = await supabase
      .from('stats_match').select('joueur_id, points').in('joueur_id', ids)

    const moyParJoueur = ids.map(id => {
      const sj = (toutesStats || []).filter(s => s.joueur_id === id)
      const mj = sj.length
      return { id, moy: mj ? sj.reduce((a, b) => a + (b.points || 0), 0) / mj : 0 }
    }).sort((a, b) => b.moy - a.moy)

    setRangPts(moyParJoueur.findIndex(x => x.id === j.id) + 1)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>
      Chargement...
    </div>
  )

  if (!joueur) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: C.muted }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏀</div>
        <p style={{ fontSize: 14 }}>Aucun profil joueur associé à ce compte.</p>
        <p style={{ fontSize: 12, marginTop: 6 }}>Contacte ton coach pour être ajouté à l'équipe.</p>
      </div>
    </div>
  )

  const n = stats.length
  const totalTentes  = stats.reduce((a, b) => a + (b.tirs_tentes || 0), 0)
  const totalReussis = stats.reduce((a, b) => a + (b.tirs_reussis || 0), 0)

  const moy = n ? {
    points:         avg(stats.map(s => s.points || 0)),
    rebonds:        avg(stats.map(s => s.rebonds || 0)),
    passes:         avg(stats.map(s => s.passes || 0)),
    interceptions:  avg(stats.map(s => s.interceptions || 0)),
    ballons_perdus: avg(stats.map(s => s.ballons_perdus || 0)),
    tirs_tentes:    avg(stats.map(s => s.tirs_tentes || 0)),
    tirs_reussis:   avg(stats.map(s => s.tirs_reussis || 0)),
    minutes:        Math.round(avg(stats.map(s => s.minutes || 0))),
    eval:           avg(stats.map(s => evalScore(s))),
    totalTentes,
    totalReussis,
  } : null

  const adresse = pct(totalReussis, totalTentes)
  const evalTotal = stats.reduce((a, b) => a + evalScore(b), 0)

  const progression = stats.map((s, i) => ({
    name: `M${i + 1}`,
    pts: s.points || 0,
    adv: s.match?.equipe_adverse || ''
  }))

  const derniers = [...stats]
    .sort((a, b) => new Date(b.match?.date) - new Date(a.match?.date))
    .slice(0, 3)

  const messages = moy ? genererMessages(stats, moy, rangPts) : []

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.gold, color: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
              {initiales(joueur.nom, joueur.prenom)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{joueur.prenom} {joueur.nom}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{joueur.poste} · #{joueur.numero_maillot} · {equipe?.nom}</div>
            </div>
          </div>
          <span style={{ background: 'rgba(224,201,106,0.12)', color: C.gold, border: `0.5px solid rgba(224,201,106,0.3)`, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>
            Joueur
          </span>
        </div>

        {/* Messages motivation */}
        {messages.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {messages.map((m, i) => (
              <div key={i} style={msgStyle(m.type)}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>
                  {m.type === 'success' ? '🔥' : m.type === 'warning' ? '⚠️' : '💡'}
                </span>
                <span style={{ fontSize: 12, color: C.white, lineHeight: 1.5 }}>{m.texte}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats saison */}
        {!moy ? (
          <div style={{ ...darkStyle, textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏀</div>
            <p style={{ fontSize: 14, color: C.muted }}>Aucune statistique disponible pour le moment.</p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Tes stats apparaîtront ici après chaque match.</p>
          </div>
        ) : (
          <>
            <div style={darkStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.gold }}>Ma saison</div>
                <div style={{ fontSize: 11, color: C.muted }}>{n} match{n !== 1 ? 's' : ''} joué{n !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { val: moy.points,  label: 'Points / match' },
                  { val: moy.rebonds, label: 'Rebonds / match' },
                  { val: moy.passes,  label: 'Passes / match' },
                  { val: adresse !== null ? `${adresse}%` : '—', label: 'Adresse au tir' },
                ].map(s => (
                  <div key={s.label} style={statBox}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.gold }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
              <div style={{ background: C.dark, borderRadius: 12, border: `0.5px solid ${C.border}`, padding: '1.25rem' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.gold, marginBottom: 12 }}>Évaluation globale</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0.75rem 0' }}>
                  <div style={{ fontSize: 40, fontWeight: 700, color: C.gold }}>{evalTotal >= 0 ? '+' : ''}{evalTotal}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>sur la saison · moy. {moy.eval >= 0 ? '+' : ''}{moy.eval}/match</div>
                  {rangPts && (
                    <span style={{ background: rangPts === 1 ? 'rgba(46,125,50,0.2)' : 'rgba(224,201,106,0.1)', color: rangPts === 1 ? '#81C784' : C.gold, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 500, marginTop: 4 }}>
                      {rangPts === 1 ? 'Top scoreur de l\'équipe' : `${rangPts}e scoreur de l'équipe`}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: C.dark, borderRadius: 12, border: `0.5px solid ${C.border}`, padding: '1.25rem' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.gold, marginBottom: 12 }}>Stats complètes</div>
                {[
                  { label: 'Interceptions', val: moy.interceptions },
                  { label: 'Ballons perdus', val: moy.ballons_perdus },
                  { label: 'Tirs tentés',   val: moy.tirs_tentes },
                  { label: 'Minutes / match', val: moy.minutes },
                ].map((s, i, arr) => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: i < arr.length - 1 ? `0.5px solid rgba(255,255,255,0.06)` : 'none' }}>
                    <span style={{ color: C.muted }}>{s.label}</span>
                    <span style={{ color: C.white, fontWeight: 500 }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progression */}
            {progression.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.gold, marginBottom: 12 }}>Ma progression — points par match</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={progression} barCategoryGap="30%">
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
              </div>
            )}

            {/* Derniers matchs */}
            <div style={darkStyle}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.gold, marginBottom: 12 }}>Derniers matchs</div>
              {derniers.length === 0 ? (
                <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '1rem 0' }}>Aucun match enregistré.</p>
              ) : derniers.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < derniers.length - 1 ? `0.5px solid rgba(255,255,255,0.06)` : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.white }}>vs {s.match?.equipe_adverse}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {new Date(s.match?.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>
                      {s.points} pts · {s.rebonds} reb · {s.passes} pas
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>Eval {evalScore(s) >= 0 ? '+' : ''}{evalScore(s)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}