import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import CreerEquipe from './pages/CreerEquipe'
import Layout from './components/layout'
import AcceptInvitation from './pages/Acceptinvitation'
import AdminDashboard from './pages/AdminDashboard'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/creer-equipe" element={
          <ProtectedRoute><CreerEquipe /></ProtectedRoute>
        } />
        <Route path="/invitation" element={<AcceptInvitation />} />
        <Route path="/admin" element={
          <ProtectedRoute><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/*" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App