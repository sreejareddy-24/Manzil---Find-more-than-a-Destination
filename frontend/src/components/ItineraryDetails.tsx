import React, { useState } from 'react';
import { Download, Save, Calendar, Briefcase, CheckCircle, Plus, Minus } from 'lucide-react';
import type { Itinerary, ItineraryDay, ActivityDetail } from '../types';
import { DayCard } from './DayCard';
import { EditActivityModal } from './EditActivityModal';
import { CurrencySelector, CURRENCY_RATES } from './CurrencySelector';

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
  source,
  startDate,
  budget,
  interests,
  isSaved,
  onSave,
  isSaving,
  onItineraryChange,
  onRegenerateDay,
  regeneratingDay,
}) => {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [packedItems, setPackedItems] = useState<Record<string, boolean>>({});
  const [currency, setCurrency] = useState('USD');

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityDetail | null>(null);
  const [editingDayIndex, setEditingDayIndex] = useState<number>(0);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number>(-1);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Drag state
  const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);
  const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null);

  const currencyInfo = CURRENCY_RATES[currency] || CURRENCY_RATES['USD'];
  const currencySymbol = currencyInfo.symbol;
  const exchangeRate = currencyInfo.rate;

  const togglePacked = (item: string) => {
    setPackedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handlePrint = () => window.print();

  // Day update handler
  const handleUpdateDay = (dayIndex: number, updatedDay: ItineraryDay) => {
    const newDays = [...itinerary.days];
    newDays[dayIndex] = updatedDay;
    onItineraryChange({ ...itinerary, days: newDays });
  };

  // Delete a day
  const handleDeleteDay = (dayIndex: number) => {
    if (itinerary.days.length <= 1) return;
    const newDays = itinerary.days.filter((_, i) => i !== dayIndex).map((d, i) => ({ ...d, day: i + 1 }));
    onItineraryChange({ ...itinerary, days: newDays, duration: newDays.length });
    if (activeDay > newDays.length) setActiveDay(newDays.length);
  };

  // Add a new blank day
  const handleAddDay = () => {
    const newDay: ItineraryDay = {
      day: itinerary.days.length + 1,
      theme: `New Day ${itinerary.days.length + 1}`,
      activities: [
        { time: '09:00 AM', name: 'Morning Activity', description: 'Plan your morning activity here.', cost: 0, completed: false, rating: null },
        { time: '02:00 PM', name: 'Afternoon Activity', description: 'Plan your afternoon activity here.', cost: 0, completed: false, rating: null },
        { time: '07:00 PM', name: 'Evening Activity', description: 'Plan your evening activity here.', cost: 0, completed: false, rating: null },
      ],
      hotel_recommendation: '',
      restaurant_recommendation: [],
      daily_budget_estimate: 40,
      notes: '',
    };
    onItineraryChange({ ...itinerary, days: [...itinerary.days, newDay], duration: itinerary.days.length + 1 });
    setActiveDay(itinerary.days.length + 1);
  };

  // Edit activity modal handlers
  const openEditModal = (dayIndex: number, actIndex: number) => {
    setEditingDayIndex(dayIndex);
    setEditingActivityIndex(actIndex);
    setEditingActivity({ ...itinerary.days[dayIndex].activities[actIndex] });
    setIsAddingNew(false);
    setEditModalOpen(true);
  };

  const openAddModal = (dayIndex: number) => {
    setEditingDayIndex(dayIndex);
    setEditingActivityIndex(-1);
    setEditingActivity(null);
    setIsAddingNew(true);
    setEditModalOpen(true);
  };

  const handleSaveActivity = (updated: ActivityDetail) => {
    const newDays = [...itinerary.days];
    if (isAddingNew) {
      newDays[editingDayIndex].activities.push(updated);
    } else {
      newDays[editingDayIndex].activities[editingActivityIndex] = updated;
    }
    // Recalculate daily budget
    newDays[editingDayIndex].daily_budget_estimate = newDays[editingDayIndex].activities.reduce((sum, a) => sum + a.cost, 0) + 40;
    onItineraryChange({ ...itinerary, days: newDays });
  };

  // Drag and Drop handlers
  const handleDragStart = (dayIndex: number) => (e: React.DragEvent) => {
    setDraggedDayIndex(dayIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (dayIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDayIndex(dayIndex);
  };

  const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedDayIndex === null || draggedDayIndex === targetIndex) {
      setDraggedDayIndex(null);
      setDragOverDayIndex(null);
      return;
    }
    const newDays = [...itinerary.days];
    const [moved] = newDays.splice(draggedDayIndex, 1);
    newDays.splice(targetIndex, 0, moved);
    // Re-number days
    const renumbered = newDays.map((d, i) => ({ ...d, day: i + 1 }));
    onItineraryChange({ ...itinerary, days: renumbered });
    setActiveDay(targetIndex + 1);
    setDraggedDayIndex(null);
    setDragOverDayIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedDayIndex(null);
    setDragOverDayIndex(null);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Header card */}
      <div className="glass-panel" style={{ position: 'relative', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75), rgba(30, 41, 59, 0.5))', borderLeft: '4px solid var(--secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '50px', textTransform: 'uppercase' }}>
                ✏️ Interactive Itinerary
              </span>
              {isSaved && (
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={12} /> Saved
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', lineHeight: 1.2 }}>
              {source} ➔ <span style={{ color: 'var(--secondary)' }}>{itinerary.destination}</span>
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} /> {startDate} ({itinerary.days.length} Days)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={15} /> {interests.map((i) => i.charAt(0).toUpperCase() + i.slice(1)).join(', ')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <strong style={{ color: 'var(--success)' }}>$</strong> Budget: ${budget.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CurrencySelector selectedCurrency={currency} onCurrencyChange={setCurrency} />
            {!isSaved && (
              <button onClick={onSave} disabled={isSaving} className="btn btn-primary" style={{ background: 'var(--success)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
                {isSaving ? <div className="spinner-small" /> : <Save size={16} />}
                <span>Save Trip</span>
              </button>
            )}
            <button onClick={handlePrint} className="btn btn-secondary">
              <Download size={16} /> <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '30px' }}>
        {/* Left Side: Day-by-Day Itinerary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Day selection tabs + Add/Remove controls */}
          <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
            {itinerary.days.map((day) => (
              <button
                key={day.day}
                onClick={() => setActiveDay(day.day)}
                className="btn"
                style={{
                  background: activeDay === day.day ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                  border: activeDay === day.day ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  color: activeDay === day.day ? 'white' : 'var(--text-secondary)',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Day {day.day}
              </button>
            ))}

            {/* Add / Remove Day Buttons */}
            <button onClick={handleAddDay} className="btn btn-secondary" style={{ padding: '10px 12px', borderRadius: '10px', flexShrink: 0 }} title="Add a new day">
              <Plus size={16} />
            </button>
            {itinerary.days.length > 1 && (
              <button
                onClick={() => handleDeleteDay(itinerary.days.length - 1)}
                className="btn btn-danger"
                style={{ padding: '10px 12px', borderRadius: '10px', flexShrink: 0 }}
                title="Remove last day"
              >
                <Minus size={16} />
              </button>
            )}
          </div>

          {/* Render Day Cards */}
          {itinerary.days.map((day, idx) => {
            const isVisible = activeDay === day.day;
            return (
              <div key={`day-${day.day}`} style={{ display: isVisible ? 'block' : 'none' }}>
                <DayCard
                  day={day}
                  totalDays={itinerary.days.length}
                  onUpdateDay={(updated) => handleUpdateDay(idx, updated)}
                  onDeleteDay={() => handleDeleteDay(idx)}
                  onRegenerateDay={() => onRegenerateDay(day.day)}
                  onEditActivity={(actIdx) => openEditModal(idx, actIdx)}
                  onAddActivity={() => openAddModal(idx)}
                  isRegenerating={regeneratingDay === day.day}
                  currencySymbol={currencySymbol}
                  exchangeRate={exchangeRate}
                  onDragStart={handleDragStart(idx)}
                  onDragOver={handleDragOver(idx)}
                  onDrop={handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  isDragOver={dragOverDayIndex === idx}
                />
              </div>
            );
          })}
        </div>

        {/* Right Side: Packing List & Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Packing list */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              🎒 Smart Packing List
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Click items to track your packing progress.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {itinerary.packing_recommendations.map((item, idx) => {
                const packed = !!packedItems[item];
                return (
                  <div key={idx} onClick={() => togglePacked(item)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: packed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.01)', border: packed ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}>
                    <input type="checkbox" checked={packed} onChange={() => {}} style={{ cursor: 'pointer', accentColor: 'var(--success)' }} />
                    <span style={{ fontSize: '0.88rem', color: packed ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: packed ? 'line-through' : 'none' }}>
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggestions */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              💡 Destination Insights & Hacks
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {itinerary.smart_suggestions.map((suggestion, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  {suggestion}
                </div>
              ))}
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
