import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { User, Mail, Compass, Star, CheckCircle, Award, Calendar, DollarSign } from 'lucide-react';
import { useCurrency, convertFromINR } from '../lib/currency';
import './Profile.css';

const PREDEFINED_STYLES = ['Backpacker', 'Luxury Traveler', 'Adventure Seeker', 'Food Enthusiast', 'History Buff', 'Nature Lover', 'Slow Travel', 'Solo Wanderer'];

const Profile = () => {
  const { user } = useAuth();
  const currencySymbol = useCurrency();
  
  const [fullName, setFullName] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [selectedStyles, setSelectedStyles] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setDepartureCity(user.user_metadata?.preferences?.departure_city || 'New Delhi');
      setSelectedStyles(user.user_metadata?.preferences?.travel_styles || ['Adventure Seeker', 'Nature Lover']);
    }
  }, [user]);

  const toggleStyle = (style) => {
    setSelectedStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          preferences: {
            departure_city: departureCity,
            travel_styles: selectedStyles
          }
        }
      });

      if (error) throw error;
      setMessage('Profile settings saved successfully! ✨');
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Could not update profile metadata.');
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-header-title">
        <h2>User Profile</h2>
        <p>Manage your account settings and travel preferences</p>
      </div>

      <div className="profile-layout">
        <div className="profile-left glass-panel">
          <div className="profile-avatar-section">
            <div className="avatar-large">{initials}</div>
            <h3>{fullName || 'Wanderer'}</h3>
            <p className="user-email"><Mail size={14} style={{ marginRight: 6 }} /> {user?.email}</p>
            <div className="travel-badge">
              <Award size={14} /> Explorer Rank: Gold
            </div>
          </div>

          <div className="profile-stats">
            <h4>Travel Statistics</h4>
            <div className="stats-grid">
              <div className="stat-item glass-card">
                <Compass size={20} className="icon-blue" />
                <span className="num">6</span>
                <span className="lbl">Trips Planned</span>
              </div>
              <div className="stat-item glass-card">
                <Calendar size={20} className="icon-pink" />
                <span className="num">21</span>
                <span className="lbl">Total Days</span>
              </div>
              <div className="stat-item glass-card">
                <DollarSign size={20} className="icon-green" />
                <span className="num">{currencySymbol}{(convertFromINR(42500) / 1000).toFixed(1)}K</span>
                <span className="lbl">Budget Tracked</span>
              </div>
              <div className="stat-item glass-card">
                <Star size={20} className="icon-yellow" />
                <span className="num">8</span>
                <span className="lbl">Places Saved</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-right glass-panel">
          <h3>Preferences & Details</h3>
          <p className="subtitle">These preferences customize the AI itinerary recommendations</p>

          {message && (
            <div className="success-banner animate-fade-in">
              <CheckCircle size={16} /> {message}
            </div>
          )}
          
          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <User className="input-icon" size={16} />
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="e.g. Prabh J." 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Default Departure City</label>
              <div className="input-with-icon">
                <Compass className="input-icon" size={16} />
                <input 
                  type="text" 
                  value={departureCity} 
                  onChange={(e) => setDepartureCity(e.target.value)} 
                  placeholder="e.g. New Delhi" 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Travel Styles</label>
              <p className="sub-label">Select your favorite types of trips to custom-tailor recommendations</p>
              <div className="style-chips-grid">
                {PREDEFINED_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    className={`style-chip ${selectedStyles.includes(style) ? 'active' : ''}`}
                    onClick={() => toggleStyle(style)}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary save-profile-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
