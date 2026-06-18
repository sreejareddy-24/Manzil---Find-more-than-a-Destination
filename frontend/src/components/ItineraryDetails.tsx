import React, { useState } from 'react';
import { RefreshCw, Edit3, Trash2 } from 'lucide-react';
import type { Itinerary, ItineraryDay, ActivityDetail } from '../types';
import { MapRegion } from './MapRegion';
import { EditActivityModal } from './EditActivityModal';
import { getActivityImageUrl } from '../services/imageHelper';

interface ItineraryDetailsProps {
  itinerary: Itinerary;
  source: string;
  startDate: string;
  budget: number;
  interests: string[];
  isSaved: boolean;
  onSave: () => void;
  isSaving: boolean;
  onItineraryChange: (updated: Itinerary) => void;
  onRegenerateDay: (dayNumber: number) => void;
  regeneratingDay: number | null;
}

export const ItineraryDetails: React.FC<ItineraryDetailsProps> = ({
  itinerary,
  isSaved,
  onSave,
  isSaving,
  onItineraryChange,
  onRegenerateDay,
  regeneratingDay,
  source: _source,
  startDate: _startDate,
  budget: _budget,
  interests: _interests,
}) => {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [packedItems, setPackedItems] = useState<string[]>(['Universal Power Adapter', 'Hand Sanitizer & Masks']);
  const [newItem, setNewItem] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  // Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityDetail | null>(null);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number>(-1);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const activeDayIndex = activeDay - 1;
  const currentDay = itinerary.days[activeDayIndex] || itinerary.days[0];

  const handleUpdateDay = (updatedDay: ItineraryDay) => {
    const newDays = [...itinerary.days];
    newDays[activeDayIndex] = updatedDay;
    onItineraryChange({ ...itinerary, days: newDays });
  };

  const handleToggleComplete = (actIdx: number) => {
    const newActivities = [...currentDay.activities];
    newActivities[actIdx] = {
      ...newActivities[actIdx],
      completed: !newActivities[actIdx].completed
    };
    handleUpdateDay({ ...currentDay, activities: newActivities });
  };

  const handleDeleteActivity = (actIdx: number) => {
    const newActivities = currentDay.activities.filter((_, i) => i !== actIdx);
    handleUpdateDay({ ...currentDay, activities: newActivities });
  };

  const openEditModal = (actIdx: number) => {
    setEditingActivityIndex(actIdx);
    setEditingActivity({ ...currentDay.activities[actIdx] });
    setIsAddingNew(false);
    setEditModalOpen(true);
  };

  const openAddModal = () => {
    setEditingActivityIndex(-1);
    setEditingActivity(null);
    setIsAddingNew(true);
    setEditModalOpen(true);
  };

  const handleSaveActivity = (updated: ActivityDetail) => {
    const newActivities = [...currentDay.activities];
    if (isAddingNew) {
      newActivities.push(updated);
    } else {
      newActivities[editingActivityIndex] = updated;
    }
    handleUpdateDay({ ...currentDay, activities: newActivities });
    setEditModalOpen(false);
  };

  const handleAddPackedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setPackedItems(prev => [...prev, newItem.trim()]);
    setNewItem('');
    setShowAddInput(false);
  };

  const togglePacked = (item: string) => {
    setPackedItems(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  // Mock hacks for high-fidelity rendering
  const LOCAL_HACKS = [
    { num: '01', title: 'Download the Delhi Metro Rail app for the fastest transit avoiding traffic.' },
    { num: '02', title: 'Visit Chandni Chowk before 11 AM to beat the massive afternoon crowds.' },
    { num: '03', title: 'Always carry small Cash Notes (₹10-100) for tips and small market purchases.' }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Active Day Selector Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {itinerary.destination} Day {activeDay}
          </h2>
          <span style={{ background: '#ef4444', color: 'white', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
            AI Optimized
          </span>
        </div>

        {/* Day selection pill tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {itinerary.days.map((day) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(day.day)}
              className="btn"
              style={{
                background: activeDay === day.day ? '#0060d8' : 'rgba(255,255,255,0.02)',
                border: activeDay === day.day ? 'none' : '1px solid rgba(255,255,255,0.06)',
                color: activeDay === day.day ? 'white' : 'var(--text-secondary)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                fontWeight: 600
              }}
            >
              Day {day.day}
            </button>
          ))}
          {!isSaved && (
            <button onClick={onSave} disabled={isSaving} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px', background: '#10b981' }}>
              Save Trip
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Timeline (1.2fr) | Center Map (1.8fr) | Right smart panels (1.2fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 1.2fr', gap: '24px', alignItems: 'stretch' }}>
        
        {/* Left Column: Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Schedule</h3>
            <button onClick={openAddModal} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}>
              + Add Stop
            </button>
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '14px', borderLeft: '2px solid rgba(255, 255, 255, 0.05)' }}>
            {currentDay.activities.map((act, idx) => {
              const isCompleted = act.completed || false;
              return (
                <div key={idx} style={{ position: 'relative', background: '#ffffff', color: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'var(--transition-smooth)' }}>
                  
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '20px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isCompleted ? '#10b981' : '#0060d8',
                    border: '2px solid #07090e',
                    boxShadow: isCompleted ? '0 0 6px #10b981' : '0 0 6px #0060d8'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0060d8' }}>
                      {act.time}
                    </span>
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input 
                        type="checkbox" 
                        checked={isCompleted} 
                        onChange={() => handleToggleComplete(idx)}
                        style={{ accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      <button onClick={() => openEditModal(idx)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}>
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => handleDeleteActivity(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', textDecoration: isCompleted ? 'line-through' : 'none', margin: 0 }}>
                        {act.name}
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '4px', lineHeight: 1.3, margin: '4px 0 0 0' }}>
                        {act.description}
                      </p>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <img 
                        src={getActivityImageUrl(act.name)} 
                        alt={act.name} 
                        style={{
                          width: '70px',
                          height: '52px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid rgba(0,0,0,0.08)',
                          opacity: isCompleted ? 0.6 : 1,
                          transition: 'opacity 0.3s'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '6px' }}>
                    <span>{act.cost > 0 ? `Cost: $${act.cost}` : 'Free'}</span>
                    <span>60 mins</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => onRegenerateDay(currentDay.day)} disabled={regeneratingDay === currentDay.day} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '10px' }}>
            <RefreshCw size={14} className={regeneratingDay === currentDay.day ? 'spin-icon' : ''} /> Regenerate Plan
          </button>
        </div>

        {/* Center Column: Map Display + HUD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* HUD Status Bar */}
          <div className="glass-panel" style={{ display: 'flex', gap: '24px', padding: '12px 20px', background: 'rgba(13, 20, 35, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Distance</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#06b6d4' }}>24.5 km</div>
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Travel Time</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#06b6d4' }}>2h 15m</div>
            </div>
          </div>

          {/* Large Google Map */}
          <div style={{ flex: 1, minHeight: '380px' }}>
            <MapRegion activities={currentDay.activities} destination={itinerary.destination} />
          </div>

          {/* Navigation Card HUD */}
          <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#0d111c', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>NEXT LOCATION</span>
              <h4 style={{ fontSize: '0.88rem', color: 'white', marginTop: '2px' }}>Route Navigation Path</h4>
            </div>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.78rem', background: '#0060d8', borderRadius: '6px' }}>
              Start Nav
            </button>
          </div>
        </div>

        {/* Right Column: Smart Packing + hacks + widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Smart Packing */}
          <div className="glass-panel" style={{ background: 'rgba(13, 20, 35, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>Smart Packing</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {packedItems.map((item, idx) => (
                <div key={idx} onClick={() => togglePacked(item)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={packedItems.includes(item)} onChange={() => {}} style={{ accentColor: '#0060d8' }} />
                  <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{item}</span>
                </div>
              ))}

              {showAddInput ? (
                <form onSubmit={handleAddPackedItem} style={{ marginTop: '8px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newItem} 
                    onChange={e => setNewItem(e.target.value)} 
                    placeholder="Add item name..."
                    autoFocus 
                    style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  />
                </form>
              ) : (
                <button onClick={() => setShowAddInput(true)} style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', marginTop: '4px' }}>
                  + Add Item
                </button>
              )}
            </div>
          </div>

          {/* Local Hacks */}
          <div className="glass-panel" style={{ background: 'rgba(13, 20, 35, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>Local Hacks</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {LOCAL_HACKS.map(hack => (
                <div key={hack.num} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#0060d8', fontSize: '0.82rem', fontWeight: 800 }}>{hack.num}</span>
                  <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>{hack.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom weather / aqi metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(13, 20, 35, 0.45)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Temperature</span>
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>32°C</span>
            </div>
            <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(13, 20, 35, 0.45)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>AQI Index</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>142 (Mod)</span>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Activity Modal */}
      <EditActivityModal
        activity={editingActivity}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveActivity}
        isNewActivity={isAddingNew}
      />
      
    </div>
  );
};
