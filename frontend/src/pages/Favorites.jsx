import { useState, useEffect } from 'react';
import { Heart, MapPin, Star, Trash2, Sparkles, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listFavorites, deleteFavorite, addFavorite } from '../lib/favorites';
import { useCurrency, convertFromINR, convertToINR } from '../lib/currency';
import './Favorites.css';

const DEFAULT_FAVORITE_MOCKS = [
  {
    id: 'fav-1',
    type: 'destination',
    title: 'Bali, Indonesia',
    location: 'Southeast Asia',
    image_url: '🏖️',
    rating: 4.8,
    price: 50000,
    description: 'Island of gods, famous for its forested volcanic mountains, iconic rice paddies, beaches, and coral reefs.'
  },
  {
    id: 'fav-2',
    type: 'hotel',
    title: 'Umaid Bhawan Palace',
    location: 'Jodhpur, Rajasthan, India',
    image_url: '🏰',
    rating: 4.9,
    price: 35000,
    description: 'A magnificent heritage hotel offering a glimpse into royal Rajput lifestyle with sprawling luxury gardens.'
  },
  {
    id: 'fav-3',
    type: 'restaurant',
    title: 'Brittos Bar and Restaurant',
    location: 'Baga, Goa, India',
    image_url: '🍹',
    rating: 4.5,
    price: 1500,
    description: 'Fabulous beachside hangout known for its seafood platter, Goan curries, vibrant music, and sunset view.'
  }
];

const Favorites = () => {
  const navigate = useNavigate();
  const currencySymbol = useCurrency();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [favType, setFavType] = useState('destination');
  const [favTitle, setFavTitle] = useState('');
  const [favLocation, setFavLocation] = useState('');
  const [favImage, setFavImage] = useState('📍');
  const [favPrice, setFavPrice] = useState('');
  const [favDesc, setFavDesc] = useState('');
  const [savingFav, setSavingFav] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const data = await listFavorites();
      if (data.length === 0) {
        setFavorites(DEFAULT_FAVORITE_MOCKS);
      } else {
        setFavorites(data);
      }
    } catch (err) {
      console.error(err);
      setFavorites(DEFAULT_FAVORITE_MOCKS);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this item from your favorites?')) return;
    
    try {
      if (!id.toString().startsWith('fav-')) {
        await deleteFavorite(id);
      }
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
      // Remove locally
      setFavorites(prev => prev.filter(f => f.id !== id));
    }
  };

  const handlePlanTrip = (destinationName) => {
    // Navigate to dashboard and pre-populate the destination input
    navigate('/', { state: { prefilledDestination: destinationName } });
  };

  const handleAddFavorite = async (e) => {
    e.preventDefault();
    if (!favTitle.trim()) return;
    
    setSavingFav(true);
    try {
      const newFav = await addFavorite({
        type: favType,
        title: favTitle,
        location: favLocation,
        image_url: favImage,
        rating: 5.0,
        price: favPrice ? convertToINR(parseFloat(favPrice)) : null,
        description: favDesc
      });
      
      setFavorites(prev => {
        const filtered = prev.filter(f => !f.id.toString().startsWith('fav-'));
        return [newFav, ...filtered];
      });
      
      setShowModal(false);
      setFavTitle('');
      setFavLocation('');
      setFavDesc('');
      setFavPrice('');
      setFavImage('📍');
    } catch (err) {
      alert(err.message || 'Failed to save favorite. Using local memory.');
      const localFav = {
        id: `fav-user-${Date.now()}`,
        type: favType,
        title: favTitle,
        location: favLocation,
        image_url: favImage,
        rating: 5.0,
        price: favPrice ? convertToINR(parseFloat(favPrice)) : null,
        description: favDesc
      };
      setFavorites(prev => [localFav, ...prev]);
      setShowModal(false);
    } finally {
      setSavingFav(false);
    }
  };

  return (
    <div className="favorites-page animate-fade-in">
      <div className="favorites-header">
        <div>
          <h2>Saved Favorites</h2>
          <p>Your curated bucket list of destinations, stays, and culinary spots</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Heart size={16} style={{marginRight: '6px'}} /> Add Favorite
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading your bucket list...</div>
      ) : favorites.length === 0 ? (
        <div className="empty-state-card glass-panel">
          <Heart size={48} className="empty-icon animate-pulse" style={{ color: 'var(--secondary)' }} />
          <h3>Bucket List Empty</h3>
          <p>You haven't saved any locations or travel tips yet. Ask the AI assistant for recommendations to add them here!</p>
          <button className="btn-outline" onClick={() => navigate('/chat')}>Talk to AI Assistant</button>
        </div>
      ) : (
        <div className="favorites-grid">
          {favorites.map((item) => (
            <div key={item.id} className="favorite-card glass-panel">
              <div className="fav-card-image">
                <span className="fav-emoji">{item.image_url || '📍'}</span>
                <button className="remove-btn" onClick={() => handleDelete(item.id)}>
                  <Trash2 size={16} />
                </button>
                <div className="fav-type-tag">{item.type.toUpperCase()}</div>
              </div>

              <div className="fav-card-content">
                <div className="title-row">
                  <h4>{item.title}</h4>
                  {item.rating && (
                    <span className="fav-rating">
                      <Star size={14} className="star-icon" /> {item.rating}
                    </span>
                  )}
                </div>

                {item.location && (
                  <p className="fav-location">
                    <MapPin size={12} /> {item.location}
                  </p>
                )}

                {item.description && <p className="fav-desc">{item.description}</p>}

                {item.price && (
                  <div className="fav-price-row">
                    <span className="lbl">Est. Price</span>
                    <span className="val text-gradient font-bold">{currencySymbol}{convertFromINR(item.price).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="fav-card-actions">
                <button 
                  className="btn-primary plan-trip-btn"
                  onClick={() => handlePlanTrip(item.location || item.title)}
                >
                  <Navigation size={14} /> Plan Trip Here
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <h3>Add Favorite</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddFavorite}>
              <div className="form-group">
                <label>Type *</label>
                <select value={favType} onChange={(e) => setFavType(e.target.value)}>
                  <option value="destination">Destination</option>
                  <option value="hotel">Hotel</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="activity">Activity</option>
                </select>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Eiffel Tower" 
                  value={favTitle} 
                  onChange={(e) => setFavTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Paris, France" 
                    value={favLocation} 
                    onChange={(e) => setFavLocation(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>Emoji Icon</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 🗼" 
                    value={favImage} 
                    onChange={(e) => setFavImage(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Estimated Price</label>
                <div className="price-input">
                  <span className="currency">{currencySymbol}</span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={favPrice} 
                    onChange={(e) => setFavPrice(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea 
                  rows="3"
                  placeholder="Why do you want to go here?"
                  value={favDesc}
                  onChange={(e) => setFavDesc(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px' }}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={savingFav}>
                  {savingFav ? 'Saving...' : 'Save Favorite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;
