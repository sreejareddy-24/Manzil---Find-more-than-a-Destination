import React from 'react';
import { Sparkles } from 'lucide-react';

interface ExploreScreenProps {
  onPlanNextTrip: () => void;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ onPlanNextTrip }) => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <div style={{ 
          background: 'rgba(0, 96, 216, 0.1)', 
          border: '1px solid rgba(0, 96, 216, 0.2)',
          borderRadius: '50px',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#0060d8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <Sparkles size={12} /> AI-Powered Travel
        </div>
        
        <h1 style={{ 
          fontSize: '3.6rem', 
          fontWeight: 900, 
          letterSpacing: '-0.04em', 
          lineHeight: 1.1,
          background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Find More Than Destination 
        </h1>
        
        <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: '600px' }}>
          Manzil leverages advanced neural networks to design personalized itineraries that balance your thirst for adventure with the precision of logistics.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          <button onClick={onPlanNextTrip} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '0.95rem', borderRadius: '10px' }}>
            Plan Your Next Trip →
          </button>
          <button className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '0.95rem', borderRadius: '10px', background: '#ffffff', color: '#0f172a', border: 'none' }}>
            View Demo
          </button>
        </div>
      </div>

      {/* Trending Destinations */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Trending Destinations</h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>Curated by our community and AI travel experts.</p>
          </div>
          <span style={{ fontSize: '0.88rem', color: '#0060d8', fontWeight: 600, cursor: 'pointer' }}>View All ↗</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Card 1: Tokyo */}
          {/*<div style={{
            position: 'relative',
            height: '240px',
            borderRadius: '16px',
            overflow: 'hidden',
            cursor: 'pointer'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=600&q=80" 
              alt="Tokyo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
              <span style={{ background: '#f59e0b', color: 'black', fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', marginRight: '6px' }}>Hot</span>
              <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>★ 4.9</span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '4px', color: 'white' }}>Tokyo, Japan</h3>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                Experience the neon-lit futuristic streets and serene ancient temples of the world's most dynamic metropolis.
              </p>
            </div>
          </div>

          {/* Card 2: Santorini */}
          <div style={{
            position: 'relative',
            height: '240px',
            borderRadius: '16px',
            overflow: 'hidden',
            cursor: 'pointer'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80" 
              alt="Santorini" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'white' }}>Santorini, Greece</h3>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px' }}>Mediterranean Paradise</p>
            </div>
          </div>

          {/* Card 3: Marrakesh */}
          <div style={{
            position: 'relative',
            height: '240px',
            borderRadius: '16px',
            overflow: 'hidden',
            cursor: 'pointer'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=600&q=80" 
              alt="Marrakesh" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'white' }}>Marrakesh</h3>
            </div>
          </div>

          {/* Card 4: Swiss Alps */}
          <div style={{
            position: 'relative',
            height: '240px',
            borderRadius: '16px',
            overflow: 'hidden',
            cursor: 'pointer'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80" 
              alt="Swiss Alps" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'white' }}>Swiss Alps</h3>
            </div>
          </div>
        </div>
      </div>

      {/* AI Concierge Section */}
      <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', padding: '48px', borderRadius: '24px', background: 'rgba(13, 20, 35, 0.4)', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '16px' }}>Your AI Concierge</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '32px' }}>
            Skip the hours of research. Manzil's concierge learns your travel style—whether you're a luxury lounge seeker or a hidden-alley foodie—to suggest things you'll actually love.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '1.5rem' }}>🧭</div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Generate Itinerary</h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>A complete day-by-day plan in seconds.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '1.5rem' }}>💰</div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Smart Budgeting</h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>Real-time expense tracking and budget hacks.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot mock widget */}
        <div style={{ background: '#07090e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '360px', justifyContent: 'space-between', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            <div style={{ background: '#0060d8', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>M</div>
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Manzil AI</h4>
              <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>● Online Concierge</span>
            </div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', padding: '8px 0' }}>
            <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', maxWidth: '85%', lineHeight: 1.4 }}>
              Hi there! Where are we heading next? I can help you plan flights, stays, or hidden gems.
            </div>
            <div style={{ alignSelf: 'flex-end', background: '#0060d8', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', maxWidth: '85%', color: 'white', lineHeight: 1.4 }}>
              I want a 4-day trip to Tokyo focused on photography and street food.
            </div>
            <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', maxWidth: '85%', lineHeight: 1.4 }}>
              Perfect. I'll include Shinjuku's neon alleys and a Tsukiji market guide.
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Type your destination..." 
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 40px 10px 12px', fontSize: '0.8rem', outline: 'none' }}
              disabled
            />
            <button style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: '#0060d8', border: 'none', width: '24px', height: '24px', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
              ➔
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
