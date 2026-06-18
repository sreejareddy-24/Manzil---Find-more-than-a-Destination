import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Share2, MapPin, Calendar, DollarSign, Heart, Map, Sun, Tag, Edit3, Sparkles, User, Loader2, Trash2, Plus, Download, Save, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getLatestItinerary, updateItinerary } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency, convertFromINR, convertToINR } from '../lib/currency';
import './Itinerary.css';

const DAY_EMOJIS = ['🏖️', '🏰', '🛍️', '⛰️', '🌅', '🍃', '🏛️'];

const mapTripToTimeline = (trip) =>
  (trip?.itinerary || []).map((day, idx) => ({
    id: `day-${day.day}-${idx}-${Date.now()}`, // unique draggable id
    day: day.day,
    title: day.title,
    location: day.location,
    desc: day.description,
    time: day.start_time,
    cost: Number(day.estimated_cost),
    img: DAY_EMOJIS[idx % DAY_EMOJIS.length],
  }));

const Itinerary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currencySymbol = useCurrency();

  const [trip, setTrip] = useState(location.state?.trip || null);
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(!location.state?.trip);
  const [error, setError] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [mapOpen, setMapOpen] = useState(true);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [editingId, setEditingId] = useState(null);
  
  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Load itinerary from trip state
  useEffect(() => {
    if (trip) {
      setItinerary(mapTripToTimeline(trip));
    }
  }, [trip]);

  // Fetch latest itinerary if accessed directly (no state)
  useEffect(() => {
    if (location.state?.trip) return;

    let isMounted = true;
    setLoading(true);

    const MOCK_TRIP = {
      trip_id: 'mock-trip-active',
      destination: 'Goa, India',
      days: 3,
      budget: 8000,
      interests: ['Beach', 'Nature'],
      itinerary: [
        { day: 1, title: 'Relax at Baga Beach', location: 'Baga Beach, Goa', description: 'Enjoy the waves, sunbathe on the sandy shore, and try Goan fish curry at beach shacks.', start_time: '10:00 AM', estimated_cost: 1500 },
        { day: 2, title: 'Visit Aguada Fort', location: 'Sinquerim, Goa', description: 'Explore the 17th-century Portuguese fort and lighthouse with scenic ocean panoramas.', start_time: '09:30 AM', estimated_cost: 800 },
        { day: 3, title: 'Dudhsagar Waterfalls Tour', location: 'Sanguem, Goa', description: 'Witness the spectacular four-tiered cascading waterfall and take a jeep safari through the sanctuary.', start_time: '08:00 AM', estimated_cost: 2500 }
      ]
    };

    getLatestItinerary()
      .then((data) => {
        if (!isMounted) return;
        setTrip(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Backend connection failed, using mock trip fallback:', err.message);
        setTrip(MOCK_TRIP);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [location]);

  // Auto-saves state to database
  const saveToDatabase = async (updatedTimeline) => {
    if (!trip?.trip_id) return;
    setSaving(true);
    try {
      const payload = updatedTimeline.map(item => ({
        day: item.day,
        title: item.title,
        location: item.location,
        description: item.desc,
        start_time: item.time,
        estimated_cost: Number(item.cost)
      }));
      const updatedTrip = await updateItinerary(trip.trip_id, payload);
      // Update local context
      setTrip(updatedTrip);
    } catch (err) {
      console.error('Failed to save itinerary changes:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(itinerary);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      day: index + 1,
    }));

    setItinerary(updatedItems);
    saveToDatabase(updatedItems);
  };

  // Inline editing actions
  const startEditing = (item) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditLocation(item.location);
    setEditTime(item.time);
    setEditCost(convertFromINR(item.cost).toString());
    setEditDesc(item.desc);
  };

  const saveEdit = () => {
    const updated = itinerary.map(item => {
      if (item.id === editingId) {
        return {
          ...item,
          title: editTitle,
          location: editLocation,
          time: editTime,
          cost: convertToINR(parseFloat(editCost) || 0),
          desc: editDesc
        };
      }
      return item;
    });
    setItinerary(updated);
    setEditingId(null);
    saveToDatabase(updated);
  };

  // Add / Delete Day activities
  const handleAddDay = () => {
    const newDayNum = itinerary.length + 1;
    const newDay = {
      id: `day-${newDayNum}-${Date.now()}`,
      day: newDayNum,
      title: `Explore ${trip?.destination || 'City'}`,
      location: trip?.destination || '',
      desc: 'Customize this day\'s descriptions to map your adventures.',
      time: '09:00 AM',
      cost: 1000,
      img: DAY_EMOJIS[newDayNum % DAY_EMOJIS.length]
    };
    const updated = [...itinerary, newDay];
    setItinerary(updated);
    saveToDatabase(updated);
  };

  const handleDeleteDay = (id) => {
    if (itinerary.length <= 1) {
      alert('Your trip must contain at least one day!');
      return;
    }
    if (!window.confirm('Delete this day from your trip?')) return;

    const filtered = itinerary.filter(item => item.id !== id);
    const reordered = filtered.map((item, idx) => ({
      ...item,
      day: idx + 1
    }));
    setItinerary(reordered);
    saveToDatabase(reordered);
  };

  // Export calendar .ics file
  const handleExportCalendar = () => {
    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Manzil AI//Travel Planner//EN\r\n";
    
    itinerary.forEach(item => {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // Placeholder date
      icsContent += "BEGIN:VEVENT\r\n";
      icsContent += `SUMMARY:Manzil: ${item.title}\r\n`;
      icsContent += `DESCRIPTION:${item.desc} (Est. Cost: INR ${item.cost})\r\n`;
      icsContent += `LOCATION:${item.location}\r\n`;
      icsContent += `DTSTART;VALUE=DATE:${dateStr}\r\n`; // simplified all-day event
      icsContent += "END:VEVENT\r\n";
    });
    
    icsContent += "END:VCALENDAR\r\n";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Itinerary_${trip?.destination || 'Trip'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate coordinates for SVG Vector Map visualizer
  const mapPoints = itinerary.map((item, idx) => {
    // Plots nodes dynamically along a sleek sine wave pattern
    const step = 450 / Math.max(itinerary.length - 1, 1);
    const x = 50 + idx * step;
    const y = 120 + Math.sin(idx * 1.5) * 45;
    return { ...item, x, y };
  });

  // SVG route path
  let pathD = "";
  mapPoints.forEach((pt, idx) => {
    if (idx === 0) {
      pathD = `M ${pt.x} ${pt.y}`;
    } else {
      pathD += ` L ${pt.x} ${pt.y}`;
    }
  });

  const totalCost = itinerary.reduce((sum, item) => sum + item.cost, 0);

  if (loading) {
    return (
      <div className="itinerary-container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: 'var(--text-muted)' }}>
        <Loader2 size={20} className="spin" /> Loading your itinerary...
      </div>
    );
  }

  if (error) {
    return (
      <div className="itinerary-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Go Plan a Trip</button>
      </div>
    );
  }

  return (
    <div className="itinerary-page-wrapper animate-fade-in">
      <div className="top-bar">
        <div className="top-left">
          <Link to="/" className="back-btn"><ArrowLeft size={20} /></Link>
          <div className="title-section">
            <h2>Your Trip Itinerary</h2>
            <div className="status-indicator">
              {saving ? (
                <span className="saving-badge"><Loader2 size={12} className="spin" /> Saving changes...</span>
              ) : (
                <span className="saved-badge">✓ Auto-saved to Cloud</span>
              )}
            </div>
          </div>
        </div>
        <div className="top-right">
          <button className="btn-outline print-btn" onClick={handlePrint}>Print View</button>
          <button className="btn-outline ics-btn" onClick={handleExportCalendar}>
            <Download size={14} /> Export Calendar
          </button>
          <div className="user-profile">
            <span>Hi, {(user?.user_metadata?.full_name || user?.email || 'Traveler').split(' ')[0]}!</span>
            <div className="avatar">{(user?.user_metadata?.full_name || user?.email || 'T').charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="hero-card glass-card">
        <div className="hero-details">
          <div className="destination-info">
            <span className="excited-text">🌴 Excited for your trip to</span>
            <h1>{trip?.destination || 'Your Destination'}</h1>
          </div>

          <div className="trip-stats">
            <div className="stat">
              <MapPin size={16} className="text-muted" />
              <div>
                <span className="label">Destination</span>
                <span className="value">{trip?.destination || '—'}</span>
              </div>
            </div>
            <div className="stat">
              <Calendar size={16} className="text-muted" />
              <div>
                <span className="label">Days</span>
                <span className="value">{itinerary.length} Days</span>
              </div>
            </div>
            <div className="stat">
              <DollarSign size={16} className="text-muted" />
              <div>
                <span className="label">AI Budget Target</span>
                <span className="value">{currencySymbol}{convertFromINR(trip?.budget).toLocaleString()}</span>
              </div>
            </div>
            <div className="stat">
              <Heart size={16} className="text-muted" />
              <div>
                <span className="label">Interests</span>
                <span className="value">{(trip?.interests || []).join(', ') || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ai-badge">
          <Sparkles size={24} className="text-gradient animate-pulse" />
          <span className="badge-title">AI Optimized</span>
          <span className="badge-desc">Fully customized itinerary</span>
        </div>
      </div>

      <div className="plan-header-controls">
        <div className="plan-title">
          <Calendar size={24} color="var(--primary)" />
          <div>
            <h3>Day-wise Plan</h3>
            <p>Drag elements to reorder sequences or click fields to edit inline</p>
          </div>
        </div>
        <button className={`btn-outline map-toggle ${mapOpen ? 'active' : ''}`} onClick={() => setMapOpen(!mapOpen)}>
          <Map size={16} /> {mapOpen ? 'Hide Map' : 'Show SVG Map'}
        </button>
      </div>

      <div className="itinerary-layout-split">
        <div className="itinerary-timeline-panel">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="itinerary">
              {(provided) => (
                <div
                  className="timeline"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  <div className="timeline-line"></div>

                  {itinerary.map((item, index) => {
                    const isEditing = editingId === item.id;
                    return (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided) => (
                          <div
                            className={`timeline-item ${activeDayIdx === index ? 'focused' : ''}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setActiveDayIdx(index)}
                          >
                            <div className="timeline-marker">
                              <div className="dot"></div>
                            </div>
                            <div className="day-indicator">
                              <span className="day-label">DAY</span>
                              <span className="day-number">{item.day}</span>
                            </div>

                            {isEditing ? (
                              <div className="activity-card glass-card editing-card">
                                <div className="edit-form">
                                  <div className="edit-row">
                                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" required />
                                    <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" required />
                                  </div>
                                  <div className="edit-row">
                                    <input type="text" value={editTime} onChange={(e) => setEditTime(e.target.value)} placeholder="Start Time (e.g. 9:00 AM)" />
                                    <input type="number" value={editCost} onChange={(e) => setEditCost(e.target.value)} placeholder="Est. Cost" />
                                  </div>
                                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description summary" rows={2}></textarea>
                                  <div className="edit-actions">
                                    <button className="btn-outline small" onClick={() => setEditingId(null)}><X size={12}/> Cancel</button>
                                    <button className="btn-primary small" onClick={saveEdit}><Save size={12}/> Save</button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="activity-card glass-card">
                                <div className="activity-img">
                                  <span className="emoji-huge">{item.img}</span>
                                </div>
                                <div className="activity-content">
                                  <h4>{item.title}</h4>
                                  <p className="location"><MapPin size={14} /> {item.location}</p>
                                  <p className="desc">{item.desc}</p>
                                </div>
                                <div className="activity-meta">
                                  <div className="meta-item">
                                    <Sun size={16} className="text-warning" />
                                    <div>
                                      <span className="meta-val">{item.time}</span>
                                      <span className="meta-lbl">Start Time</span>
                                    </div>
                                  </div>
                                  <div className="meta-item">
                                    <Tag size={16} className="text-muted" />
                                    <div>
                                      <span className="meta-val">{currencySymbol}{convertFromINR(item.cost).toLocaleString()}</span>
                                      <span className="meta-lbl">Est. Cost</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="activity-actions">
                                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); startEditing(item); }} title="Edit inline">
                                    <Edit3 size={16} />
                                  </button>
                                  <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDeleteDay(item.id); }} title="Delete Day">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <button className="btn-outline add-day-btn" onClick={handleAddDay}>
            <Plus size={16} /> Add Travel Day
          </button>
        </div>

        {mapOpen && (
          <div className="itinerary-map-panel glass-panel animate-fade-in">
            <h3 className="panel-title"><Map size={18}/> Neon Route Map</h3>
            <p className="panel-desc">Vector visualization of your trip itinerary days</p>
            
            <div className="svg-map-container">
              <svg viewBox="0 0 550 300" className="svg-canvas">
                {/* Neon route connector line */}
                {pathD && <path d={pathD} className="map-route-path" />}
                
                {/* Plot points */}
                {mapPoints.map((pt, index) => {
                  const isActive = activeDayIdx === index;
                  return (
                    <g 
                      key={pt.id} 
                      className={`map-node ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveDayIdx(index)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx={pt.x} cy={pt.y} r={isActive ? 12 : 8} className="node-circle" />
                      <circle cx={pt.x} cy={pt.y} r={isActive ? 6 : 4} className="node-center" />
                      <text x={pt.x} y={pt.y - 18} textAnchor="middle" className="node-label">
                        Day {pt.day}
                      </text>
                      <text x={pt.x} y={pt.y + 24} textAnchor="middle" className="node-title">
                        {pt.location.split(',')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            
            <div className="selected-node-details glass-card">
              <h4>Day {mapPoints[activeDayIdx]?.day}: {mapPoints[activeDayIdx]?.title}</h4>
              <p className="node-loc"><MapPin size={12}/> {mapPoints[activeDayIdx]?.location}</p>
              <p className="node-desc">{mapPoints[activeDayIdx]?.desc}</p>
            </div>
          </div>
        )}
      </div>

      <div className="itinerary-footer glass-panel">
        <div className="total-cost">
          <span className="label">Total Estimated Cost</span>
          <span className="value">{currencySymbol}{convertFromINR(totalCost).toLocaleString()}</span>
        </div>
        <div className="footer-stats">
          <div className="f-stat">
            <Calendar size={18} />
            <div>
              <span className="val">{itinerary.length} Days</span>
              <span className="lbl">Duration</span>
            </div>
          </div>
          <div className="f-stat">
            <User size={18} />
            <div>
              <span className="val">1 Person</span>
              <span className="lbl">Travelers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Itinerary;
