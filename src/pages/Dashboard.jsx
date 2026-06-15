import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

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
function adresse(tires, reussis) { if (!tires) return null; return Math.round((reussis / tires) * 100) }
function avg(arr) { if (!arr.length) return 0; return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 }
function initiales(nom, prenom) { return `${(prenom||'')[0]||''}${(nom||'')[0]||''}`.toUpperCase() }

const cardStyle = { background: C.card, borderRadius: 12, border: `0.5px solid ${C.border}`, padding: '14px 16px' }
const cardDarkStyle = { background: C.dark, borderRadius: 12, border: `0.5px solid ${C.border}`, padding: '14px 16px' }

const emptyBlock = (icon, text) => (
  <div style={{ background: C.bg, borderRadius: 8, height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, border: `0.5px solid ${C.border}` }}>
    <span style={{ fontSize: 24 }}>{icon}</span>
    <span style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>{text}</span>
  </div>
)

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [matchs, setMatchs] = useState([])
  const [stats, setStats] = useState([])
  const [joueurs, setJoueurs] = useState([])
  const navigate = useNavigate()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: equipe } = await supabase.from('equipe').select('id').eq('user_id', user.id).single()
    if (!equipe) { setLoading(false); return }
    const [{ data: ms }, { data: js }, { data: st }] = await Promise.all([
      supabase.from('match').select('*').eq('equipe_id', equipe.id).order('date', { ascending: true }),
      supabase.from('joueur').select('*').eq('equipe_id', equipe.id),
      supabase.from('stats_match')
        .select('*, match(date, equipe_adverse, score_nous, score_eux), joueur(nom, prenom, poste)')
        .in('joueur_id', (await supabase.from('joueur').select('id').eq('equipe_id', equipe.id)).data?.map(j => j.id) || [])
    ])
    setMatchs(ms || []); setJoueurs(js || []); setStats(st || [])
    setLoading(false)
  }

  if (loading) return <div style={{ background: C.bg, minHeight: '100vh', padding: '3rem', textAlign: 'center', color: C.muted, fontSize: 13 }}>Chargement...</div>

  const aucunMatch   = matchs.length === 0
  const victories    = matchs.filter(m => m.score_nous != null && m.score_nous > m.score_eux).length
  const defaites     = matchs.filter(m => m.score_nous != null && m.score_nous < m.score_eux).length
  const moyPts       = avg(matchs.map(m => stats.filter(s => s.match_id === m.id).reduce((a, b) => a + (b.points || 0), 0)))
  const moyRebs      = avg(matchs.map(m => stats.filter(s => s.match_id === m.id).reduce((a, b) => a + (b.rebonds || 0), 0)))
  const totalTires   = stats.reduce((a, b) => a + (b.tirs_tentes || 0), 0)
  const totalReussis = stats.reduce((a, b) => a + (b.tirs_reussis || 0), 0)
  const pctTir       = adresse(totalTires, totalReussis)
  const moyEval      = stats.length ? Math.round(stats.reduce((a, b) => a + evalScore(b), 0) / stats.length * 10) / 10 : null
  const courbeData   = matchs.map((m, i) => ({ name: `M${i+1}`, pts: stats.filter(s => s.match_id === m.id).reduce((a, b) => a + (b.points || 0), 0) }))
  const scoreurs     = joueurs.map(j => {
    const sj = stats.filter(s => s.joueur_id === j.id)
    const mj = [...new Set(sj.map(s => s.match_id))].length
    return { ...j, moyPts: mj ? Math.round(sj.reduce((a,b)=>a+(b.points||0),0)/mj*10)/10 : 0, moyRebs: mj ? Math.round(sj.reduce((a,b)=>a+(b.rebonds||0),0)/mj*10)/10 : 0, eval: sj.reduce((a,b)=>a+evalScore(b),0) }
  }).sort((a, b) => b.moyPts - a.moyPts)
  const maxRebs       = Math.max(...scoreurs.map(s => s.moyRebs), 1)
  const maxEval       = Math.max(...scoreurs.map(s => s.eval), 1)
  const dernierMatchs = [...matchs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4)

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.gold, margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Saison 2025/26 · {matchs.length} match{matchs.length!==1?'s':''} joué{matchs.length!==1?'s':''}</p>
          </div>
          {!aucunMatch && (
            <span style={{ background: victories>defaites?'rgba(46,125,50,0.2)':'rgba(192,57,43,0.2)', color: victories>defaites?'#81C784':'#EF9A9A', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 500, border: `0.5px solid ${victories>defaites?'rgba(46,125,50,0.3)':'rgba(192,57,43,0.3)'}` }}>
              {victories}V – {defaites}D
            </span>
          )}
        </div>

        {aucunMatch && (
          <div style={{ ...cardDarkStyle, textAlign: 'center', padding: '2rem', marginBottom: '1rem' }}>
            <div style={{ width: 52, height: 52, background: 'rgba(224,201,106,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 10px' }}>🏀</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 6 }}>Aucune statistique disponible</p>
            <p style={{ fontSize: 12, color: C.muted, maxWidth: 320, margin: '0 auto 16px' }}>Les statistiques s'afficheront ici au fur et à mesure que vous saisissez les résultats de vos matchs.</p>
            <button onClick={() => navigate('/matchs')} style={{ background: C.gold, color: C.card, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Créer un premier match</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1rem' }}>
          {[
            { label: 'Moy. points / match',  value: aucunMatch ? '—' : moyPts },
            { label: 'Moy. rebonds / match', value: aucunMatch ? '—' : moyRebs },
            { label: 'Adresse au tir',       value: aucunMatch || pctTir===null ? '—' : `${pctTir}%` },
            { label: 'Éval. moyenne',        value: aucunMatch || moyEval===null ? '—' : moyEval },
          ].map(m => (
            <div key={m.label} style={cardDarkStyle}>
              <div style={{ fontSize: 24, fontWeight: 700, color: aucunMatch ? C.muted : C.gold }}>{m.value}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: '1rem' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.gold, marginBottom: 12 }}>Points marqués par match</div>
            {aucunMatch ? emptyBlock('📈', 'La courbe apparaîtra\naprès le 1er match') : (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={courbeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: C.dark, border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.white }} formatter={(v) => [`${v} pts`, 'Points']} />
                  <Line type="monotone" dataKey="pts" stroke={C.gold} strokeWidth={2} dot={{ r: 3, fill: C.gold }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.gold, marginBottom: 12 }}>Bilan saison</div>
            {aucunMatch ? emptyBlock('🏆', 'Victoires / Défaites\nà venir') : (
              <>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie data={[{name:'Victoires',value:victories},{name:'Défaites',value:defaites}]} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" startAngle={90} endAngle={-270}>
                      <Cell fill="#4CAF50" /><Cell fill="#c0392b" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: 11, color: C.muted }}>
                  <span style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'#4CAF50',display:'inline-block' }}></span>Victoires {victories}</span>
                  <span style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'#c0392b',display:'inline-block' }}></span>Défaites {defaites}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.gold, marginBottom: 12 }}>Top scoreurs (moy. pts/match)</div>
            {aucunMatch || scoreurs.every(s=>s.moyPts===0) ? emptyBlock('👤','Le classement apparaîtra\naprès le 1er match') : scoreurs.slice(0,5).map((j,i)=>(
              <div key={j.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<4?`0.5px solid rgba(255,255,255,0.06)`:'none' }}>
                <span style={{ fontSize:11,color:C.muted,width:16,textAlign:'center' }}>{i+1}</span>
                <div style={{ width:30,height:30,borderRadius:'50%',background:i===0?C.gold:'rgba(224,201,106,0.12)',color:i===0?C.card:C.gold,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0 }}>{initiales(j.nom,j.prenom)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:500,color:C.white }}>{j.prenom} {j.nom}</div>
                  <div style={{ fontSize:10,color:C.muted }}>{j.poste}</div>
                </div>
                <span style={{ fontSize:13,fontWeight:700,color:C.gold }}>{j.moyPts}</span>
              </div>
            ))}
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize:12,fontWeight:500,color:C.gold,marginBottom:12 }}>Moy. rebonds / match</div>
            {aucunMatch||scoreurs.every(s=>s.moyRebs===0)?emptyBlock('📊','Les stats rebonds\napparaîtront ici'):scoreurs.slice(0,5).map((j,i)=>(
              <div key={j.id} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                <span style={{ fontSize:11,color:C.muted,width:90,flexShrink:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{j.prenom[0]}. {j.nom}</span>
                <div style={{ flex:1,background:'rgba(255,255,255,0.06)',borderRadius:4,height:7 }}><div style={{ width:`${Math.round((j.moyRebs/maxRebs)*100)}%`,height:7,borderRadius:4,background:C.gold }} /></div>
                <span style={{ fontSize:11,fontWeight:700,color:C.gold,width:28,textAlign:'right' }}>{j.moyRebs}</span>
              </div>
            ))}
            <div style={{ fontSize:12,fontWeight:500,color:C.gold,margin:'14px 0 12px' }}>Top évaluation globale</div>
            {aucunMatch||scoreurs.every(s=>s.eval===0)?<div style={{ fontSize:12,color:C.muted,textAlign:'center',padding:'1rem 0' }}>Aucune donnée</div>:[...scoreurs].sort((a,b)=>b.eval-a.eval).slice(0,3).map((j,i)=>(
              <div key={j.id} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                <span style={{ fontSize:11,color:C.muted,width:90,flexShrink:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{j.prenom[0]}. {j.nom}</span>
                <div style={{ flex:1,background:'rgba(255,255,255,0.06)',borderRadius:4,height:7 }}><div style={{ width:`${Math.round((j.eval/maxEval)*100)}%`,height:7,borderRadius:4,background:C.gold }} /></div>
                <span style={{ fontSize:11,fontWeight:700,color:C.gold,width:32,textAlign:'right' }}>+{j.eval}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={cardDarkStyle}>
          <div style={{ fontSize:12,fontWeight:500,color:C.gold,marginBottom:12 }}>Derniers matchs</div>
          {aucunMatch ? emptyBlock('📋','Aucun match enregistré') : dernierMatchs.map((m,i)=>{
            const gagne = m.score_nous!=null && m.score_nous>m.score_eux
            const perdu = m.score_nous!=null && m.score_nous<m.score_eux
            return (
              <div key={m.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:i<dernierMatchs.length-1?`0.5px solid rgba(255,255,255,0.06)`:'none' }}>
                <div>
                  <div style={{ fontWeight:500,color:C.white,fontSize:13 }}>vs {m.equipe_adverse}</div>
                  <div style={{ fontSize:11,color:C.muted }}>{new Date(m.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})} · {m.lieu}</div>
                </div>
                {m.score_nous!=null ? (
                  <span style={{ borderRadius:6,padding:'3px 10px',fontSize:12,fontWeight:700,background:gagne?'rgba(46,125,50,0.2)':perdu?'rgba(192,57,43,0.2)':'rgba(224,201,106,0.1)',color:gagne?'#81C784':perdu?'#EF9A9A':C.gold }}>
                    {m.score_nous} – {m.score_eux}
                  </span>
                ) : <span style={{ fontSize:12,color:C.muted }}>—</span>}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}