import { Routes, Route, Navigate } from 'react-router-dom'
import { PageClient as Clients } from './pages/Clients'
import ClientDetailPage from './pages/ClientDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Clients />} />
      <Route path="/c/:id" element={<ClientDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
