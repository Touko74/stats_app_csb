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

const POSTES = ['Meneur', 'Arrière', 'Ailier', 'Ailier fort', 'Pivot']

const POSTE_STYLE = {
  'Meneur':      { bg: 'rgba(224,201,106,0.15)', color: '#E0C96A' },
  'Arrière':     { bg: 'rgba(74,222,128,0.12)',  color: '#4ADE80' },
  'Ailier':      { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA' },
  'Ailier fort': { bg: 'rgba(251,146,60,0.12)',  color: '#FB923C' },
  'Pivot':       { bg: 'rgba(196,181,253,0.12)', color: '#C4B5FD' },
}

const AVATAR_COLORS = [
  { bg: 'rgba(224,201,106,0.15)', color: '#E0C96A' },
  { bg: 'rgba(74,222,128,0.12)',  color: '#4ADE80' },
  { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA' },
  { bg: 'rgba(251,146,60,0.12)',  color: '#FB923C' },
  { bg: 'rgba(196,181,253,0.12)', color: '#C4B5FD' },
]

function initiales(nom, prenom) {
  return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase()
}
function avatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

const EMPTY_FORM = { nom: '', prenom: '', numero_maillot: '', poste: 'Meneur' }

const labelStyle = {
  fontSize: 10, fontWeight: 600, color: 'rgba(224,201,106,0.7)',
  display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase'
}
const inputStyle = {
  width: '100%', background: 'rgba(15,28,63,0.8)',
  border: '1px solid rgba(224,201,106,0.2)', borderRadius: 8,
  padding: '9px 11px', fontSize: 13, color: C.white,
  boxSizing: 'border-box', outline: 'none',
}

// Hook simple pour détecter mobile et réagir au resize
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  useEffect(() => {
    function handleResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return isMobile
}

export default function Joueurs() {
  const [joueurs, setJoueurs] = useState([])
  const [equipeId, setEquipeId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [inviteModal, setInviteModal] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const isMobile = useIsMobile()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: equipe } = await supabase
      .from('equipe').select('id').eq('user_id', user.id).single()
    if (equipe) {
      setEquipeId(equipe.id)
      const { data } = await supabase
        .from('joueur').select('*').eq('equipe_id', equipe.id).order('numero_maillot', { ascending: true })
      setJoueurs(data || [])
    }
    setLoading(false)
  }

  function openAdd() { setForm(EMPTY_FORM); setEditId(null); setError(''); setShowModal(true) }
  function openEdit(j) {
    setForm({ nom: j.nom, prenom: j.prenom, numero_maillot: j.numero_maillot, poste: j.poste })
    setEditId(j.id); setError(''); setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditId(null); setError('') }

  async function handleSave() {
    if (!form.nom.trim() || !form.prenom.trim() || !form.numero_maillot) {
      setError('Tous les champs sont obligatoires.'); return
    }
    setSaving(true); setError('')
    if (editId) {
      const { error: err } = await supabase.from('joueur')
        .update({ ...form, numero_maillot: Number(form.numero_maillot) }).eq('id', editId)
      if (err) { setError('Erreur lors de la modification.'); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('joueur')
        .insert([{ ...form, numero_maillot: Number(form.numero_maillot), equipe_id: equipeId }])
      if (err) { setError("Erreur lors de l'ajout."); setSaving(false); return }
    }
    setSaving(false); setShowModal(false); fetchData()
  }

  async function handleDelete(id) {
    await supabase.from('joueur').delete().eq('id', id)
    setDeleteConfirm(null); fetchData()
  }

  async function handleInviter() {
    if (!inviteEmail.trim()) { setInviteError('Email obligatoire.'); return }
    setInviting(true); setInviteError('')

    const { error: invErr } = await supabase.functions.invoke('invite-user', {
      body: { email: inviteEmail, joueur_id: inviteModal.id }
    })

    if (invErr) { setInviteError("Erreur lors de l'invitation."); setInviting(false); return }

    await supabase.from('joueur').update({ email: inviteEmail }).eq('id', inviteModal.id)

    setInviting(false)
    setInviteSuccess(true)
    setTimeout(() => {
      setInviteModal(null); setInviteEmail(''); setInviteSuccess(false); fetchData()
    }, 2000)
  }

  const filtered = joueurs.filter(j =>
    `${j.nom} ${j.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    String(j.numero_maillot).includes(search) ||
    j.poste?.toLowerCase().includes(search.toLowerCase())
  )

  const postes = [...new Set(joueurs.map(j => j.poste).filter(Boolean))]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: isMobile ? '1.25rem 1rem' : '2rem 1.5rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          justifyContent: 'space-between',
          gap: isMobile ? 12 : 0,
          marginBottom: '2rem',
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
              Gestion de l'effectif
            </div>
            <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: C.white, margin: 0, letterSpacing: '-0.02em' }}>Effectif</h1>
            <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
              {joueurs.length} joueur{joueurs.length !== 1 ? 's' : ''} enregistré{joueurs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={openAdd} style={{
            background: C.gold, color: C.dark, border: 'none',
            borderRadius: 10, padding: '10px 18px', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.01em',
            boxShadow: '0 4px 16px rgba(224,201,106,0.25)',
            width: isMobile ? '100%' : 'auto',
          }}>
            + Ajouter un joueur
          </button>
        </div>

        <div style={{ height: 1, background: C.border, marginBottom: '1.5rem' }} />

        {/* Stats rapides */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
          {[
            { label: 'Joueurs',          value: joueurs.length },
            { label: 'Postes',           value: postes.length },
            { label: 'Invités',          value: joueurs.filter(j => j.email).length },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(27,46,107,0.4)', borderRadius: 12,
              border: `1px solid ${C.border}`, padding: isMobile ? '10px 12px' : '14px 18px',
            }}>
              <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: C.gold, letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3, letterSpacing: '0.03em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tableau / Cartes */}
        <div style={{
          background: 'rgba(27,46,107,0.35)', borderRadius: 14,
          border: `1px solid ${C.border}`, overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 10 : 0,
            padding: '14px 18px', borderBottom: `1px solid ${C.border}`
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>Liste des joueurs</span>
            <input
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'rgba(15,28,63,0.8)',
                border: `1px solid rgba(224,201,106,0.2)`,
                borderRadius: 8, padding: '6px 12px', fontSize: 12,
                color: C.white, width: isMobile ? '100%' : 180, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted, fontSize: 13 }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>🏀</div>
              <p style={{ fontSize: 13, color: C.muted }}>
                {search ? 'Aucun joueur trouvé.' : 'Aucun joueur. Commencez par en ajouter un !'}
              </p>
            </div>
          ) : isMobile ? (
            // ---- VUE MOBILE : CARTES ----
            <div style={{ padding: '8px' }}>
              {filtered.map((j, i) => {
                const av = avatarColor(i)
                const ps = POSTE_STYLE[j.poste] || { bg: 'rgba(255,255,255,0.08)', color: C.muted }
                return (
                  <div key={j.id} style={{
                    background: 'rgba(15,28,63,0.6)', borderRadius: 12,
                    border: `1px solid ${C.border}`, padding: '12px 14px',
                    marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 8,
                  }}>
                    {/* Gauche : avatar + infos */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: av.bg, color: av.color,
                        border: `1px solid ${av.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                      }}>
                        {initiales(j.nom, j.prenom)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontWeight: 700, color: C.white, fontSize: 13,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {j.prenom} {j.nom}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{
                            background: 'rgba(224,201,106,0.12)', border: '1px solid rgba(224,201,106,0.25)',
                            color: C.gold, borderRadius: 5, padding: '1px 7px', fontSize: 11, fontWeight: 800,
                          }}>#{j.numero_maillot}</span>
                          <span style={{
                            background: ps.bg, color: ps.color,
                            borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 600,
                          }}>{j.poste}</span>
                          {j.email ? (
                            <span style={{ fontSize: 10, color: '#4ADE80' }}>● Invité</span>
                          ) : (
                            <span style={{ fontSize: 10, color: C.muted }}>● Non invité</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Droite : actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!j.email && (
                        <button onClick={() => { setInviteModal(j); setInviteEmail(''); setInviteError(''); setInviteSuccess(false) }} style={{
                          width: 32, height: 32, borderRadius: 7,
                          border: `1px solid rgba(224,201,106,0.3)`,
                          background: 'rgba(224,201,106,0.1)',
                          cursor: 'pointer', fontSize: 14,
                        }}>✉️</button>
                      )}
                      <button onClick={() => openEdit(j)} style={{
                        width: 32, height: 32, borderRadius: 7,
                        border: `1px solid rgba(224,201,106,0.2)`,
                        background: 'rgba(224,201,106,0.07)',
                        cursor: 'pointer', fontSize: 14,
                      }}>✏️</button>
                      <button onClick={() => setDeleteConfirm(j)} style={{
                        width: 32, height: 32, borderRadius: 7,
                        border: '1px solid rgba(248,113,113,0.2)',
                        background: 'rgba(248,113,113,0.07)',
                        cursor: 'pointer', fontSize: 14,
                      }}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // ---- VUE DESKTOP : TABLE ----
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    { label: 'Joueur',  w: 200 },
                    { label: '#',       w: 70  },
                    { label: 'Poste',   w: 130 },
                    { label: 'Statut',  w: 110 },
                    { label: 'Actions', w: 120, right: true },
                  ].map(h => (
                    <th key={h.label} style={{
                      padding: '10px 16px', textAlign: h.right ? 'right' : 'left',
                      fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
                      letterSpacing: '0.1em', textTransform: 'uppercase', width: h.w,
                    }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((j, i) => {
                  const av = avatarColor(i)
                  const ps = POSTE_STYLE[j.poste] || { bg: 'rgba(255,255,255,0.08)', color: C.muted }
                  return (
                    <tr key={j.id} style={{ borderBottom: `1px solid rgba(224,201,106,0.07)`, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,201,106,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: av.bg, color: av.color,
                            border: `1px solid ${av.color}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, flexShrink: 0,
                          }}>
                            {initiales(j.nom, j.prenom)}
                          </div>
                          <span style={{ fontWeight: 600, color: C.white, fontSize: 13 }}>{j.prenom} {j.nom}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: 'rgba(224,201,106,0.12)',
                          border: '1px solid rgba(224,201,106,0.25)',
                          color: C.gold, borderRadius: 6, padding: '3px 10px',
                          fontSize: 12, fontWeight: 800,
                        }}>
                          {j.numero_maillot}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: ps.bg, color: ps.color,
                          borderRadius: 6, padding: '3px 10px',
                          fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
                        }}>
                          {j.poste}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {j.email ? (
                          <span style={{ fontSize: 11, color: '#4ADE80', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }}></span>
                            Invité
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-block' }}></span>
                            Non invité
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {!j.email && (
                            <button onClick={() => { setInviteModal(j); setInviteEmail(''); setInviteError(''); setInviteSuccess(false) }} style={{
                              width: 30, height: 30, borderRadius: 7,
                              border: `1px solid rgba(224,201,106,0.3)`,
                              background: 'rgba(224,201,106,0.1)',
                              cursor: 'pointer', fontSize: 13,
                            }}>✉️</button>
                          )}
                          <button onClick={() => openEdit(j)} style={{
                            width: 30, height: 30, borderRadius: 7,
                            border: `1px solid rgba(224,201,106,0.2)`,
                            background: 'rgba(224,201,106,0.07)',
                            cursor: 'pointer', fontSize: 13,
                          }}>✏️</button>
                          <button onClick={() => setDeleteConfirm(j)} style={{
                            width: 30, height: 30, borderRadius: 7,
                            border: '1px solid rgba(248,113,113,0.2)',
                            background: 'rgba(248,113,113,0.07)',
                            cursor: 'pointer', fontSize: 13,
                          }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modale ajout / édition */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(9,16,36,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: '#162450', borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: '1.75rem', width: '100%', maxWidth: 420, margin: '1rem',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
              {editId ? 'Modifier' : 'Nouveau joueur'}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.white, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              {editId ? 'Modifier le joueur' : 'Ajouter un joueur'}
            </h2>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: '1.5rem' }}>
              Les informations seront sauvegardées dans votre effectif
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {[
                { label: 'Prénom', key: 'prenom', placeholder: 'Jean' },
                { label: 'Nom',    key: 'nom',    placeholder: 'Dupont' },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: error ? 12 : '1.5rem' }}>
              <div>
                <label style={labelStyle}>Numéro de maillot</label>
                <input
                  type="number" value={form.numero_maillot} min={0}
                  onChange={e => setForm(p => ({ ...p, numero_maillot: e.target.value }))}
                  placeholder="ex: 10"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Poste</label>
                <select
                  value={form.poste}
                  onChange={e => setForm(p => ({ ...p, poste: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {POSTES.map(p => <option key={p} style={{ background: '#162450' }}>{p}</option>)}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={closeModal} style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid rgba(255,255,255,0.12)`,
                borderRadius: 8, padding: '9px 16px', fontSize: 13,
                color: C.muted, cursor: 'pointer',
              }}>Annuler</button>
              <button onClick={handleSave} disabled={saving} style={{
                background: saving ? 'rgba(224,201,106,0.5)' : C.gold,
                border: 'none', borderRadius: 8, padding: '9px 20px',
                fontSize: 13, fontWeight: 700, color: C.dark,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 14px rgba(224,201,106,0.2)',
              }}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale invitation */}
      {inviteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(9,16,36,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: '#162450', borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: '1.75rem', width: '100%', maxWidth: 400, margin: '1rem',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
              Invitation
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.white, margin: '0 0 4px' }}>
              Inviter {inviteModal.prenom} {inviteModal.nom}
            </h2>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: '1.5rem' }}>
              Le joueur recevra un email pour créer son compte et accéder à ses statistiques.
            </p>

            {inviteSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <p style={{ fontSize: 14, color: '#4ADE80', fontWeight: 600 }}>Invitation envoyée !</p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{inviteEmail}</p>
              </div>
            ) : (
              <>
                <label style={labelStyle}>Email du joueur</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="joueur@email.com"
                  style={{ ...inputStyle, marginBottom: inviteError ? 8 : '1.5rem' }}
                />
                {inviteError && (
                  <div style={{
                    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                    borderRadius: 8, padding: '8px 12px', marginBottom: 14,
                    fontSize: 12, color: '#F87171'
                  }}>{inviteError}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setInviteModal(null)} style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid rgba(255,255,255,0.12)`,
                    borderRadius: 8, padding: '9px 16px', fontSize: 13,
                    color: C.muted, cursor: 'pointer',
                  }}>Annuler</button>
                  <button onClick={handleInviter} disabled={inviting} style={{
                    background: inviting ? 'rgba(224,201,106,0.5)' : C.gold,
                    border: 'none', borderRadius: 8, padding: '9px 20px',
                    fontSize: 13, fontWeight: 700, color: C.dark,
                    cursor: inviting ? 'not-allowed' : 'pointer',
                    boxShadow: inviting ? 'none' : '0 4px 14px rgba(224,201,106,0.2)',
                  }}>
                    {inviting ? 'Envoi...' : "Envoyer l'invitation"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modale confirmation suppression */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(9,16,36,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: '#162450', borderRadius: 16,
            border: '1px solid rgba(248,113,113,0.2)',
            padding: '2rem', width: '100%', maxWidth: 360, margin: '1rem',
            textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.8 }}>⚠️</div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: C.white, marginBottom: 8 }}>
              Supprimer ce joueur ?
            </h2>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: '1.5rem' }}>
              <strong style={{ color: C.white }}>{deleteConfirm.prenom} {deleteConfirm.nom}</strong> sera définitivement retiré de l'effectif.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid rgba(255,255,255,0.12)`,
                borderRadius: 8, padding: '9px 18px', fontSize: 13,
                color: C.muted, cursor: 'pointer',
              }}>Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} style={{
                background: '#F87171', border: 'none',
                borderRadius: 8, padding: '9px 18px', fontSize: 13,
                fontWeight: 700, color: '#fff', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(248,113,113,0.25)',
              }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}