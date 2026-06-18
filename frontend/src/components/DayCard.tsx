import React, { useState } from 'react';
import { Plus, RefreshCw, Trash2, GripVertical, Edit3, StickyNote, X } from 'lucide-react';
import type { ItineraryDay } from '../types';
import { ActivityCard } from './ActivityCard';
import { MapRegion } from './MapRegion';

interface DayCardProps {
  day: ItineraryDay;
  totalDays: number;
  onUpdateDay: (updatedDay: ItineraryDay) => void;
  onDeleteDay: () => void;
  onRegenerateDay: () => void;
  onEditActivity: (activityIndex: number) => void;
  onAddActivity: () => void;
  isRegenerating: boolean;
  currencySymbol: string;
  exchangeRate: number;
  // Drag handlers
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}

export const DayCard: React.FC<DayCardProps> = ({
  day,
  totalDays,
  onUpdateDay,
  onDeleteDay,
  onRegenerateDay,
  onEditActivity,
  onAddActivity,
  isRegenerating,
  currencySymbol,
  exchangeRate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}) => {
  const [isEditingTheme, setIsEditingTheme] = useState(false);
  const [editedTheme, setEditedTheme] = useState(day.theme);
  const [showNotes, setShowNotes] = useState(false);
  const [isEditingHotel, setIsEditingHotel] = useState(false);
  const [editedHotel, setEditedHotel] = useState(day.hotel_recommendation || '');
  const [newRestaurant, setNewRestaurant] = useState('');

  const completedCount = day.activities.filter((a) => a.completed).length;
  const totalActivities = day.activities.length;
  const progressPct = totalActivities > 0 ? (completedCount / totalActivities) * 100 : 0;

  const handleThemeSave = () => {
    if (editedTheme.trim()) {
      onUpdateDay({ ...day, theme: editedTheme.trim() });
    }
    setIsEditingTheme(false);
  };

  const handleHotelSave = () => {
    onUpdateDay({ ...day, hotel_recommendation: editedHotel.trim() });
    setIsEditingHotel(false);
  };

  const handleNotesChange = (newNotes: string) => {
    onUpdateDay({ ...day, notes: newNotes });
  };

  const handleDeleteActivity = (actIdx: number) => {
    const updated = { ...day, activities: day.activities.filter((_, i) => i !== actIdx) };
    updated.daily_budget_estimate = updated.activities.reduce((sum, a) => sum + a.cost, 0) + 40;
    onUpdateDay(updated);
  };

  const handleMoveActivity = (actIdx: number, direction: 'up' | 'down') => {
    const newActivities = [...day.activities];
    const swapIdx = direction === 'up' ? actIdx - 1 : actIdx + 1;
    if (swapIdx < 0 || swapIdx >= newActivities.length) return;
    [newActivities[actIdx], newActivities[swapIdx]] = [newActivities[swapIdx], newActivities[actIdx]];
    onUpdateDay({ ...day, activities: newActivities });
  };

  const handleToggleComplete = (actIdx: number) => {
    const newActivities = [...day.activities];
    newActivities[actIdx] = {
      ...newActivities[actIdx],
      completed: !newActivities[actIdx].completed,
      rating: !newActivities[actIdx].completed ? newActivities[actIdx].rating : null,
    };
    onUpdateDay({ ...day, activities: newActivities });
  };

  const handleRateActivity = (actIdx: number, rating: number) => {
    const newActivities = [...day.activities];
    newActivities[actIdx] = { ...newActivities[actIdx], rating };
    onUpdateDay({ ...day, activities: newActivities });
  };

  const handleAddRestaurant = () => {
    if (!newRestaurant.trim()) return;
    const updated = { ...day, restaurant_recommendation: [...day.restaurant_recommendation, newRestaurant.trim()] };
    onUpdateDay(updated);
    setNewRestaurant('');
  };

  const handleRemoveRestaurant = (idx: number) => {
    const updated = { ...day, restaurant_recommendation: day.restaurant_recommendation.filter((_, i) => i !== idx) };
    onUpdateDay(updated);
  };

  const convertedBudget = day.daily_budget_estimate * exchangeRate;

  return (
    <div
      className={`day-card glass-panel ${isDragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      {/* Day Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '14px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <div
            className="no-print drag-handle"
            style={{ cursor: 'grab', color: 'var(--text-muted)', display: 'flex' }}
            title="Drag to reorder days"
          >
            <GripVertical size={18} />
          </div>

          <div style={{ flex: 1 }}>
            {isEditingTheme ? (
              <input
                type="text"
                className="form-input"
                value={editedTheme}
                onChange={(e) => setEditedTheme(e.target.value)}
                onBlur={handleThemeSave}
                onKeyDown={(e) => e.key === 'Enter' && handleThemeSave()}
                autoFocus
                style={{ fontSize: '1.15rem', fontWeight: 700, padding: '4px 8px' }}
              />
            ) : (
              <h3
                style={{ fontSize: '1.2rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => { setEditedTheme(day.theme); setIsEditingTheme(true); }}
                title="Click to rename"
              >
                Day {day.day}: {day.theme}
                <Edit3 size={14} className="no-print" style={{ color: 'var(--text-muted)' }} />
              </h3>
            )}

            {/* Hotel */}
            {isEditingHotel ? (
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={editedHotel}
                  onChange={(e) => setEditedHotel(e.target.value)}
                  onBlur={handleHotelSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleHotelSave()}
                  autoFocus
                  style={{ fontSize: '0.82rem', padding: '4px 8px', flex: 1 }}
                  placeholder="Hotel name"
                />
              </div>
            ) : (
              <span
                style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'rgba(139, 92, 246, 0.08)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.15)' }}
                onClick={() => { setEditedHotel(day.hotel_recommendation || ''); setIsEditingHotel(true); }}
                title="Click to edit hotel"
              >
                🏨 Stay: <strong style={{ color: 'var(--text-primary)' }}>{day.hotel_recommendation || 'Click to set'}</strong>
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Circular Progress */}
          {totalActivities > 0 && (
            <div style={{ position: 'relative', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="38" height="38" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--success)" strokeWidth="3.5"
                  strokeDasharray="94.2" strokeDashoffset={94.2 - (94.2 * progressPct) / 100}
                  strokeLinecap="round" transform="rotate(-90 18 18)"
                  style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </svg>
              <div style={{ position: 'absolute', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {completedCount}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Est. Cost</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
              {currencySymbol}{convertedBudget.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={onAddActivity} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          <Plus size={14} /> Add Activity
        </button>
        <button
          onClick={onRegenerateDay}
          disabled={isRegenerating}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} className={isRegenerating ? 'spin-icon' : ''} /> Regenerate Day
        </button>
        <button onClick={() => setShowNotes(!showNotes)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          <StickyNote size={14} /> {showNotes ? 'Hide' : 'Show'} Notes
        </button>
        {totalDays > 1 && (
          <button onClick={onDeleteDay} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem', marginLeft: 'auto' }}>
            <Trash2 size={14} /> Remove Day
          </button>
        )}
      </div>

      {/* Grid Layout: Activities List on Left, Map on Right */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {day.activities.map((activity, aIdx) => (
            <React.Fragment key={aIdx}>
              <ActivityCard
                activity={activity}
                index={aIdx}
                totalActivities={totalActivities}
                onEdit={() => onEditActivity(aIdx)}
                onDelete={() => handleDeleteActivity(aIdx)}
                onMoveUp={() => handleMoveActivity(aIdx, 'up')}
                onMoveDown={() => handleMoveActivity(aIdx, 'down')}
                onToggleComplete={() => handleToggleComplete(aIdx)}
                onRate={(rating) => handleRateActivity(aIdx, rating)}
                currencySymbol={currencySymbol}
                exchangeRate={exchangeRate}
              />
              {activity.transit_to_next && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 20px',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  borderLeft: '2px dashed var(--border-color)',
                  marginLeft: '24px',
                  marginTop: '-8px',
                  marginBottom: '-8px'
                }}>
                  {activity.transit_to_next.mode === 'Walk' ? '🚶' : activity.transit_to_next.mode === 'Metro' ? '🚇' : '🚗'}
                  <span>
                    {activity.transit_to_next.mode}: <strong>{activity.transit_to_next.duration} mins</strong> to next destination
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ flex: '1 1 340px', minHeight: '350px', display: 'flex', flexDirection: 'column' }} className="no-print">
          <MapRegion activities={day.activities} destination={day.theme} />
        </div>
      </div>


      {/* Restaurant Recommendations */}
      {(day.restaurant_recommendation.length > 0 || true) && (
        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.01)',
            borderRadius: '8px',
            padding: '12px 16px',
          }}
        >
          <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            🍽️ Recommended Dining
          </h4>
          <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {day.restaurant_recommendation.map((rest, rIdx) => (
              <li key={rIdx} style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                <span><span style={{ color: 'var(--primary)' }}>•</span> {rest}</span>
                <button onClick={() => handleRemoveRestaurant(rIdx)} className="no-print icon-btn icon-btn-danger" style={{ flexShrink: 0 }}>
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
          <div className="no-print" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Add restaurant..."
              value={newRestaurant}
              onChange={(e) => setNewRestaurant(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRestaurant()}
              style={{ padding: '6px 10px', fontSize: '0.82rem', flex: 1 }}
            />
            <button onClick={handleAddRestaurant} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Notes section */}
      {showNotes && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📓 My Notes
          </h4>
          <textarea
            className="form-input"
            placeholder="Write personal notes, tips, or reminders for this day..."
            value={day.notes || ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={3}
            style={{ resize: 'vertical', width: '100%', fontSize: '0.88rem' }}
          />
        </div>
      )}
    </div>
  );
};
