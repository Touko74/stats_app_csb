import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import logoCSBB from '../assets/CSBB.jpg'

function Login() {
  const [mode, setMode] = useState('connexion') // 'connexion' ou 'inscription'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [inscriptionSent, setInscriptionSent] = useState(false)
  const navigate = useNavigate()

  // Connexion classique
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  // Création de compte coach
  const handleSignup = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 6) { setError('Minimum 6 caractères'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError('Erreur lors de la création du compte')
      setLoading(false)
      return
    }
    setInscriptionSent(true)
    setLoading(false)
  }

  // Reset mot de passe
  const handleForgotPassword = async () => {
    if (!email) { setError('Entre ton email d\'abord puis clique sur "Mot de passe oublié ?"'); return }
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://stats-app-csb.vercel.app/reset-password'
    })
    setResetSent(true)
    setLoading(false)
  }

  // Reset les champs quand on change de mode
  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setResetSent(false)
    setInscriptionSent(false)
  }

  return (
    <div className="min-h-screen bg-[#1B2E6B] flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl p-10 w-full max-w-sm">

        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <img src={logoCSBB} alt="Logo CSB" className="w-14" />
        </div>

        <h1 className="text-lg font-bold text-[#1B2E6B] text-center mb-1">
          Courbevoie Sport Basket
        </h1>
        <p className="text-sm text-gray-400 text-center mb-6">
          {mode === 'connexion' ? 'Connectez-vous à votre espace équipe' : 'Créez votre espace équipe'}
        </p>

        {/* Toggle connexion / inscription */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => switchMode('connexion')}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              mode === 'connexion' ? 'bg-white text-[#1B2E6B] shadow-sm' : 'text-gray-400'
            }`}
          >
            Se connecter
          </button>
          <button
            onClick={() => switchMode('inscription')}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              mode === 'inscription' ? 'bg-white text-[#1B2E6B] shadow-sm' : 'text-gray-400'
            }`}
          >
            S'inscrire
          </button>
        </div>

        <hr className="border-gray-100 mb-6" />

        {/* Mail envoyé pour reset */}
        {resetSent ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-3">📧</div>
            <p className="text-sm text-[#1B2E6B] font-medium">Mail envoyé !</p>
            <p className="text-xs text-gray-400 mt-2">Vérifie ta boîte mail pour réinitialiser ton mot de passe.</p>
            <button onClick={() => setResetSent(false)} className="text-xs text-[#1B2E6B] font-medium mt-4 underline cursor-pointer">
              Retour à la connexion
            </button>
          </div>

        // Confirmation inscription
        ) : inscriptionSent ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-3">✅</div>
            <p className="text-sm text-[#1B2E6B] font-medium">Compte créé !</p>
            <p className="text-xs text-gray-400 mt-2">Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.</p>
            <button onClick={() => switchMode('connexion')} className="text-xs text-[#1B2E6B] font-medium mt-4 underline cursor-pointer">
              Se connecter
            </button>
          </div>

        // Formulaire connexion
        ) : mode === 'connexion' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Adresse email</label>
              <input
                type="email" placeholder="equipe@courbevoie.fr"
                value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-yellow-50 text-sm text-gray-800 outline-none focus:border-[#1B2E6B]"
              />
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Mot de passe</label>
              <input
                type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-yellow-50 text-sm text-gray-800 outline-none focus:border-[#1B2E6B]"
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#E0C96A] text-[#1B2E6B] font-bold rounded-lg text-sm mt-1 hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

        // Formulaire inscription
        ) : (
          <form onSubmit={handleSignup}>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Adresse email</label>
              <input
                type="email" placeholder="equipe@courbevoie.fr"
                value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-yellow-50 text-sm text-gray-800 outline-none focus:border-[#1B2E6B]"
              />
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Mot de passe</label>
              <input
                type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-yellow-50 text-sm text-gray-800 outline-none focus:border-[#1B2E6B]"
              />
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Confirmer le mot de passe</label>
              <input
                type="password" placeholder="••••••••"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-yellow-50 text-sm text-gray-800 outline-none focus:border-[#1B2E6B]"
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#E0C96A] text-[#1B2E6B] font-bold rounded-lg text-sm mt-1 hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>
        )}

        {/* Mot de passe oublié — seulement en mode connexion */}
        {mode === 'connexion' && !resetSent && (
          <p className="text-center mt-4 text-xs text-gray-400">
            <button onClick={handleForgotPassword} className="text-[#1B2E6B] font-medium bg-transparent border-none cursor-pointer">
              Mot de passe oublié ?
            </button>
          </p>
        )}

      </div>
    </div>
  )
}

export default Login