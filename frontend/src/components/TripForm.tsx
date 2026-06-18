import React, { useState } from 'react';
import { Sparkles, Calendar, DollarSign, MapPin } from 'lucide-react';
import type { TripGenerateInput } from '../types';

interface TripFormProps {
  onSubmit: (data: TripGenerateInput) => void;
  isLoading: boolean;
}

const STYLE_OPTIONS = [
  { id: 'beach', label: 'Beach', icon: '🏖️' },
  { id: 'adventure', label: 'Adventure', icon: '🏔️' },
  { id: 'culture', label: 'Culture', icon: '🏛️' },
  { id: 'food', label: 'Foodie', icon: '🍜' },
  { id: 'nightlife', label: 'Nightlife', icon: '🍷' },
  { id: 'wellness', label: 'Wellness', icon: '💆' },
];

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading }) => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [duration, setDuration] = useState(5);
  const [budget, setBudget] = useState(1500);
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggleInterest = (id: string) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!source.trim()) return setError('Please enter a source location.');
    if (!destination.trim()) return setError('Please enter a destination.');
    if (!startDate) return setError('Please choose a start date.');
    if (duration < 1 || duration > 14) return setError('Duration must be between 1 and 14 days.');
    if (budget <= 0) return setError('Budget must be greater than $0.');
    if (interests.length === 0) return setError('Please select at least one travel interest.');

    onSubmit({
      source: source.trim(),
      destination: destination.trim(),
      start_date: startDate,
      duration,
      budget,
      interests
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '40px', flexWrap: 'wrap' }}>
      
      {/* Left Form Panel */}
      <div>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px' }}>
            Create Your Next Chapter
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Tell us where your heart wants to go, and our AI will map the perfect journey.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: '8px', padding: '12px', fontSize: '0.88rem', marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass-panel" style={{ background: 'rgba(13, 20, 35, 0.45)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          
          {/* Source and Destination row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                <MapPin size={14} color="#0060d8" /> Source Location
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. San Francisco, USA"
                value={source}
                onChange={e => setSource(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.015)' }}
                required
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                <MapPin size={14} color="#0060d8" /> Destination City
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Tokyo, Japan"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.015)' }}
                required
              />
            </div>
          </div>

          {/* Date, Duration, Budget row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                <Calendar size={14} color="#0060d8" /> Start Date
              </label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.015)' }}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Duration</label>
              <select
                className="form-input"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value) || 5)}
                style={{ background: 'rgba(255,255,255,0.015)', appearance: 'none', cursor: 'pointer' }}
              >
                {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(d => (
                  <option key={d} value={d} style={{ background: '#0d111c' }}>{d} Days</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                <DollarSign size={14} color="#0060d8" /> Total Budget
              </label>
              <input
                type="number"
                className="form-input"
                value={budget}
                onChange={e => setBudget(parseInt(e.target.value) || 0)}
                style={{ background: 'rgba(255,255,255,0.015)' }}
                placeholder="$ 5000"
                required
              />
            </div>
          </div>

          {/* Travel Style Pills */}
          <div className="form-group" style={{ marginBottom: '36px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
              Travel Style & Interests
            </label>
            <div className="tag-grid">
              {STYLE_OPTIONS.map(opt => {
                const active = interests.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    className={`tag-item ${active ? 'active' : ''}`}
                    onClick={() => toggleInterest(opt.id)}
                    style={{ borderRadius: '20px' }}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '10px', background: '#0060d8', display: 'flex', justifyContent: 'center' }}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="spinner-small" />
                <span>Generating My Itinerary...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Generate My Itinerary</span>
                <Sparkles size={16} />
              </div>
            )}
          </button>
        </form>
      </div>

      {/* Right Sidebar Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Trending Now */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Trending Now</h3>
            <span style={{ fontSize: '0.78rem', color: '#0060d8', cursor: 'pointer' }}>View All</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Card 1: Amalfi Coast */}
            <div style={{ position: 'relative', height: '110px', borderRadius: '12px', overflow: 'hidden' }}>
              <img 
                src="https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=300&q=80" 
                alt="Amalfi Coast"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <span style={{ background: '#ef4444', color: 'white', fontSize: '0.55rem', fontWeight: 800, padding: '1px 4px', borderRadius: '2px', textTransform: 'uppercase' }}>Top Pick</span>
                <h4 style={{ fontSize: '0.9rem', color: 'white', marginTop: '2px' }}>Amalfi Coast, Italy</h4>
                <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>📈 1.2k planned this month</span>
              </div>
            </div>

            {/* Card 2: Seoul */}
            <div style={{ position: 'relative', height: '110px', borderRadius: '12px', overflow: 'hidden' }}>
              <img 
                src="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=300&q=80" 
                alt="Seoul"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'white' }}>Seoul, South Korea</h4>
                <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>⏱ Recently visited by 800+</span>
              </div>
            </div>

            {/* Card 3: Male, Maldives */}
            <div style={{ position: 'relative', height: '110px', borderRadius: '12px', overflow: 'hidden' }}>
              <img 
                src="https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=300&q=80" 
                alt="Maldives"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'white' }}>Male, Maldives</h4>
                <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>☆ Featured Wellness Retreat</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendation Panel */}
        <div className="glass-panel" style={{ display: 'flex', gap: '14px', background: 'rgba(0, 96, 216, 0.05)', borderColor: 'rgba(0, 96, 216, 0.15)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '1.25rem' }}>🤖</div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>AI Recommendation</h4>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4, marginTop: '4px' }}>
              Based on your recent saves, Tokyo's cherry blossom season is currently trending for early April departures. Consider booking soon!
            </p>
          </div>
        </div>

      </div>
      
    </div>
  );
};
