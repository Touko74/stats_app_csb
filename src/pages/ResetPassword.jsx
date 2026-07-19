import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import logoCSBB from '../assets/CSBB.jpg'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  // Supabase injecte automatiquement la session depuis le lien du mail
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // session active, on peut changer le mot de passe
      }
    })
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 6) { setError('Minimum 6 caractères'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError('Erreur, réessaie.'); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => navigate('/'), 2000)
  }

  return (
    <div className="min-h-screen bg-[#1B2E6B] flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl p-10 w-full max-w-sm">

        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <img src={logoCSBB} alt="Logo CSB" className="w-14" />
        </div>

        <h1 className="text-lg font-bold text-[#1B2E6B] text-center mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-gray-400 text-center mb-8">Choisis un nouveau mot de passe pour ton compte.</p>

        <hr className="border-gray-100 mb-6" />

        {success ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-3">✅</div>
            <p className="text-sm text-[#1B2E6B] font-medium">Mot de passe mis à jour !</p>
            <p className="text-xs text-gray-400 mt-2">Redirection en cours...</p>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Nouveau mot de passe</label>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-yellow-50 text-sm text-gray-800 outline-none focus:border-[#1B2E6B]"
              />
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Confirmer le mot de passe</label>
              <input
                type="password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-yellow-50 text-sm text-gray-800 outline-none focus:border-[#1B2E6B]"
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#E0C96A] text-[#1B2E6B] font-bold rounded-lg text-sm mt-1 hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}