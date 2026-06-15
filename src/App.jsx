import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import CreerEquipe from './pages/CreerEquipe'
import Layout from './components/layout'
import AcceptInvitation from './pages/Acceptinvitation'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/creer-equipe" element={
          <ProtectedRoute><CreerEquipe /></ProtectedRoute>
        } />
        <Route path="/*" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        } />
        <Route path="/invitation" element={<AcceptInvitation />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App