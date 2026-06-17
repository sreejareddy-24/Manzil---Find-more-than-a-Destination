import React from 'react';
import { Compass, History, Sparkles, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: 'planner' | 'saved-trips';
  setView: (view: 'planner' | 'saved-trips') => void;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView, savedCount }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="no-print" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 40px',
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(11, 15, 25, 0.45)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      marginBottom: '30px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setView('planner')}>
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          padding: '10px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)'
        }}>
          <Compass size={22} color="white" />
        </div>
        <div>
          <h2 style={{ 
            fontSize: '1.35rem', 
            fontWeight: 800, 
            background: 'linear-gradient(to right, #ffffff, #cbd5e1)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            AI Travel Planner
          </h2>
          <span style={{ 
            fontSize: '0.75rem', 
            color: 'var(--secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            marginTop: '1px', 
            fontWeight: 600,
            letterSpacing: '0.02em'
          }}>
            <Sparkles size={10} /> AI Planning Engine
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            className={`btn ${currentView === 'planner' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('planner')}
            style={{ padding: '10px 20px', fontSize: '0.9rem' }}
          >
            <Sparkles size={16} /> New Trip
          </button>
          <button 
            className={`btn ${currentView === 'saved-trips' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('saved-trips')}
            style={{ padding: '10px 20px', fontSize: '0.9rem', position: 'relative' }}
          >
            <History size={16} /> Saved Trips
            {savedCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: 'var(--danger)',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(244, 63, 94, 0.4)'
              }}>
                {savedCount}
              </span>
            )}
          </button>
        </div>

        {user && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            borderLeft: '1px solid var(--border-color)', 
            paddingLeft: '20px' 
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-color)', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <User size={14} style={{ color: 'var(--primary)' }} />
                {user.email.split('@')[0]}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Logged In
              </span>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary"
              title="Logout"
              style={{
                padding: '10px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: 'transparent',
                background: 'rgba(244, 63, 94, 0.1)',
                color: 'var(--danger)'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
