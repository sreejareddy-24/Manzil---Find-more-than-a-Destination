import React, { useState } from 'react';
import { Sparkles, Calendar, DollarSign, MapPin, Check } from 'lucide-react';
import type { TripGenerateInput } from '../types';

interface TripFormProps {
  onSubmit: (data: TripGenerateInput) => void;
  isLoading: boolean;
}

const INTERESTS_OPTIONS = [
  { id: 'beach', label: 'Beach & Sun', icon: '🏖️' },
  { id: 'adventure', label: 'Adventure Sports', icon: '🏔️' },
  { id: 'nature', label: 'Nature & Wildlife', icon: '🌲' },
  { id: 'city', label: 'City Sightseeing', icon: '🏙️' },
  { id: 'culture', label: 'History & Culture', icon: '🏛️' },
  { id: 'food', label: 'Food & Culinary', icon: '🍜' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'wellness', label: 'Wellness & Spa', icon: '💆' },
];

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading }) => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // Default tomorrow
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
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ 
          fontSize: '2rem', 
          marginBottom: '10px', 
          background: 'linear-gradient(135deg, #ffffff 30%, var(--secondary) 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.03em'
        }}>
          Plan Your Next Adventure
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Let our AI engine build a fully optimized day-by-day travel plan matching your wallet and tastes.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          color: 'var(--danger)',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '0.9rem',
          marginBottom: '20px',
          fontWeight: 500,
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '10px' }}>
          <div className="form-group">
            <label>Source Location</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="e.g. New York, USA"
                value={source}
                onChange={e => setSource(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Destination City</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Tokyo, Japan"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%' }}
                required
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '20px', marginBottom: '10px' }}>
          <div className="form-group">
            <label>Journey Start Date</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Duration (Days)</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="14"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value) || 0)}
              style={{ width: '100%' }}
              required
            />
          </div>

          <div className="form-group">
            <label>Total Budget ($)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <DollarSign size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="number"
                className="form-input"
                min="1"
                value={budget}
                onChange={e => setBudget(parseInt(e.target.value) || 0)}
                style={{ paddingLeft: '40px', width: '100%' }}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '10px', marginBottom: '30px' }}>
          <label>Travel Interests (Select one or more)</label>
          <div className="tag-grid">
            {INTERESTS_OPTIONS.map(opt => {
              const active = interests.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  className={`tag-item ${active ? 'active' : ''}`}
                  onClick={() => toggleInterest(opt.id)}
                >
                  <span style={{ fontSize: '1.05rem' }}>{opt.icon}</span>
                  <span style={{ fontSize: '0.88rem' }}>{opt.label}</span>
                  {active && <Check size={14} style={{ color: 'var(--success)' }} />}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
          style={{ width: '100%', padding: '14px', fontSize: '1.05rem', display: 'flex', justifyContent: 'center' }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255, 255, 255, 0.25)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin-anim 0.8s linear infinite'
              }} />
              <span>Analyzing destination & crafting itinerary...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} />
              <span>Create Travel Plan</span>
            </div>
          )}
        </button>
      </form>

      <style>{`
        @keyframes spin-anim {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
