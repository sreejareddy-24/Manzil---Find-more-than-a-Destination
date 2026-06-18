import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

interface NavbarProps {
  currentView: 'explore' | 'planner' | 'saved-trips' | 'trip-details';
  setView: (view: 'explore' | 'planner' | 'saved-trips' | 'trip-details') => void;
  hasSelectedTrip: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView, hasSelectedTrip }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="no-print" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 40px',
      background: 'rgba(7, 9, 14, 0.8)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      marginBottom: '16px'
    }}>
      {/* Brand logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setView('explore')}>
        <img src={logo} alt="Manzil" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', margin: 0 }}>
          Manzil
        </h2>
      </div>
      
      {/* Navigation center links */}
      <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
        <span 
          onClick={() => setView('explore')}
          style={{ 
            fontSize: '0.88rem', 
            fontWeight: currentView === 'explore' ? 700 : 500, 
            color: currentView === 'explore' ? '#0060d8' : '#94a3b8', 
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          Explore
        </span>
        <span 
          onClick={() => setView('planner')}
          style={{ 
            fontSize: '0.88rem', 
            fontWeight: currentView === 'planner' ? 700 : 500, 
            color: currentView === 'planner' ? '#0060d8' : '#94a3b8', 
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          Plan
        </span>
        <span 
          onClick={() => setView('saved-trips')}
          style={{ 
            fontSize: '0.88rem', 
            fontWeight: currentView === 'saved-trips' ? 700 : 500, 
            color: currentView === 'saved-trips' ? '#0060d8' : '#94a3b8', 
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          Saved
        </span>
        <span 
          onClick={() => {
            if (hasSelectedTrip) {
              setView('trip-details');
            } else {
              alert('Please select a saved trip first, or create a new trip to view its budget details!');
            }
          }}
          style={{ 
            fontSize: '0.88rem', 
            fontWeight: currentView === 'trip-details' ? 700 : 500, 
            color: currentView === 'trip-details' ? '#0060d8' : '#94a3b8', 
            cursor: 'pointer',
            opacity: hasSelectedTrip ? 1 : 0.5,
            transition: 'var(--transition-smooth)'
          }}
        >
          Budget
        </span>
      </div>

      {/* User Status / Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user && (
          <>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'none' }} className="md:inline">
              {user.email}
            </span>
            <button
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
