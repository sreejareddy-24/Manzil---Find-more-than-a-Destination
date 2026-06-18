import { useState, useEffect } from 'react';
import { MapPin, Calendar, DollarSign, Sparkles, Heart, Loader2, X, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateItinerary, listTrips } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency, convertToINR, convertFromINR } from '../lib/currency';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const currencySymbol = useCurrency();


  const [source, setSource] = useState('New Delhi');
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [recentTrips, setRecentTrips] = useState([]);

  const [budget, setBudget] = useState('Medium');
  const [interests, setInterests] = useState([]);
  const [travelType, setTravelType] = useState('Couple');

  // Prefill destination from Favorites if passed in location.state
  useEffect(() => {
    if (location.state?.prefilledDestination) {
      setDestination(location.state.prefilledDestination);
    }
  }, [location]);



  // Load user profile departure city default and recent trips
  useEffect(() => {
    if (user) {
      if (user.user_metadata?.preferences?.departure_city) {
        setSource(user.user_metadata.preferences.departure_city);
      }
      
      listTrips()
        .then(data => setRecentTrips(data.slice(0, 3)))
        .catch(err => console.warn('Could not fetch recent trips:', err.message));
    }
  }, [user]);
  const handlePlanTrip = async (e, overrideDest = null, overrideDays = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    const finalDest = overrideDest || destination;
    const finalDays = overrideDays || days;

    if (!finalDest.trim()) {
      setError('Please enter a destination.');
      return;
    }

    if (!finalDays || parseInt(finalDays, 10) <= 0) {
      setError('Please enter a valid number of days.');
      return;
    }

    setGenerating(true);
    try {
      const trip = await generateItinerary({
        source,
        destination: finalDest,
        days: parseInt(finalDays, 10),
        budget: null,
        interests: [...interests, `${budget} Budget`, `${travelType} Trip`],
      });

      navigate('/itinerary', { state: { trip } });
    } catch (err) {
      setError(err.message || 'Something went wrong while generating your itinerary.');
    } finally {
      setGenerating(false);
    }
  };



  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h2>Plan Your Perfect Trip</h2>
          <p>Tell us your preferences and let AI craft the perfect journey for you.</p>
        </div>
        <div className="header-actions">
          <button className="ai-mode-btn"><Sparkles size={16}/> AI Mode <span className="toggle-on">ON</span></button>
          <div className="user-avatar">{(user?.user_metadata?.full_name || user?.email || 'T').charAt(0).toUpperCase()}</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="plan-form glass-card">
          <div className="form-group">
            <label>Source</label>
            <div className="input-wrapper">
              <MapPin className="input-icon" size={18} />
              <input
                type="text"
                placeholder="Enter your departure city"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={generating}
              />
              <div className="target-icon">🎯</div>
            </div>
          </div>

          <div className="form-group">
            <label>Destination</label>
            <div className="input-wrapper">
              <MapPin className="input-icon" size={18} />
              <input
                type="text"
                placeholder="Enter your dream destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={generating}
              />
              <div className="target-icon">🎯</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ width: '100%' }}>
              <label>Days</label>
              <div className="input-wrapper">
                <Calendar className="input-icon" size={18} />
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  disabled={generating}
                  placeholder="e.g. 5"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Budget</label>
            <div className="input-wrapper">
              <DollarSign className="input-icon" size={18} />
              <select value={budget} onChange={(e) => setBudget(e.target.value)} disabled={generating}>
                <option value="Budget">Budget Friendly</option>
                <option value="Medium">Standard</option>
                <option value="Luxury">Luxury</option>
              </select>
            </div>
          </div>

          <div className="form-group interests-section">
            <label>Interests</label>
            <div className="interest-chips">
              {['Culture', 'Nature', 'Food', 'Adventure', 'Relaxation'].map(interest => (
                <button
                  key={interest}
                  className={`chip ${interests.includes(interest) ? 'active' : ''}`}
                  onClick={() => {
                    if (interests.includes(interest)) {
                      setInterests(interests.filter(i => i !== interest));
                    } else {
                      setInterests([...interests, interest]);
                    }
                  }}
                  disabled={generating}
                >
                  {interest}
                </button>
              ))}
              <button className="chip add-more" disabled={generating}><Plus size={14}/> Add More</button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 71, 111, 0.1)',
              border: '1px solid rgba(239, 71, 111, 0.3)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button className="btn-primary plan-btn" onClick={handlePlanTrip} disabled={generating}>
            {generating ? (
              <>
                <Loader2 size={18} className="spin" /> Crafting your itinerary...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Plan My Trip
              </>
            )}
          </button>

          {recentTrips.length > 0 && (
            <div className="recent-trips-selector">
              <span className="recent-lbl">Jump to saved trips:</span>
              <div className="recent-links">
                {recentTrips.map((rt) => (
                  <button 
                    key={rt.trip_id} 
                    className="btn-outline recent-trip-link"
                    onClick={() => navigate('/itinerary', { state: { trip: rt } })}
                  >
                    🌴 {rt.destination} ({rt.days}D)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-right">
          <div className="travel-types animate-fade-in">
            <h3>How are you traveling?</h3>
            <p className="subtitle">Select your travel style</p>
            <div className="type-grid">
              {['Solo', 'Couple', 'Family', 'Friends'].map(type => (
                <div 
                  key={type} 
                  className={`type-card glass-card ${travelType === type ? 'active' : ''}`}
                  onClick={() => setTravelType(type)}
                >
                   <div className="type-icon">
                     {type === 'Solo' ? '🚶' : type === 'Couple' ? '👫' : type === 'Family' ? '👨‍👩‍👧‍👦' : '🍻'}
                   </div>
                   <h4>{type}</h4>
                </div>
              ))}
            </div>
          </div>

          <div className="trending-destinations animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="section-header">
              <h3><MapPin size={24} color="var(--primary)" /> Trending Destinations</h3>
              <button className="btn-outline view-all">View All</button>
            </div>
            <div className="suggestion-cards">
              {[
                { name: 'Goa', image: '/goa.png', type: 'Beach', rating: 4.8, price: '₹15k' },
                { name: 'Manali', image: '/manali.png', type: 'Mountains', rating: 4.9, price: '₹12k' },
                { name: 'Kerala', image: '/kerala.png', type: 'Nature', rating: 4.7, price: '₹18k' },
                { name: 'Jaipur', image: '/jaipur.png', type: 'Heritage', rating: 4.6, price: '₹10k' }
              ].map(dest => (
                <div 
                  key={dest.name} 
                  className="suggestion-card glass-card clickable-suggestion"
                  onClick={() => {
                    setDestination(dest.name);
                    setDays('4');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="card-img-placeholder" style={{ backgroundImage: `url(${dest.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <Heart className="heart-icon" size={20} />
                    <div className="badge type-badge">{dest.type}</div>
                  </div>
                  <div className="card-info">
                    <h4>{dest.name}</h4>
                    <p className="meta">India • 3-5 days</p>
                    <div className="card-footer">
                      <span className="rating">★ {dest.rating}</span>
                      <span className="price">{dest.price} <span>/person</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
