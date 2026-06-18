import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Itinerary from './pages/Itinerary';
import ChatAssistant from './pages/ChatAssistant';
import Budget from './pages/Budget';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Placeholder from './pages/Placeholder';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes (wrapped in a layout with Sidebar) */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="app-container" style={{ display: 'flex' }}>
              <Sidebar />
              <main className="main-content" style={{ flex: 1, padding: '24px', overflowY: 'auto', height: '100vh' }}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/itinerary" element={<Itinerary />} />
                  <Route path="/chat" element={<ChatAssistant />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}


export default App;
