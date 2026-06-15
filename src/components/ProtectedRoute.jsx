import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate('/')
        return
      }

      const { data: equipe } = await supabase
        .from('equipe')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      const { data: joueur } = await supabase
        .from('joueur')
        .select('id')
        .eq('email', session.user.email)
        .maybeSingle()

      if (joueur && window.location.pathname !== '/mon-profil') {
        navigate('/mon-profil')
      } else if (!equipe && window.location.pathname !== '/creer-equipe') {
        navigate('/creer-equipe')
      }

      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ minHeight: '100vh', background: '#1B2E6B' }} />
  return children
}

export default ProtectedRoute