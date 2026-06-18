import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { ActivityDetail } from '../types';

interface EditActivityModalProps {
  activity: ActivityDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: ActivityDetail) => void;
  isNewActivity?: boolean;
}

export const EditActivityModal: React.FC<EditActivityModalProps> = ({
  activity,
  isOpen,
  onClose,
  onSave,
  isNewActivity = false,
}) => {
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('0');

  useEffect(() => {
    if (activity) {
      setTime(activity.time);
      setName(activity.name);
      setDescription(activity.description);
      setCost(String(activity.cost));
    } else {
      setTime('09:00 AM');
      setName('');
      setDescription('');
      setCost('0');
    }
  }, [activity, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      time: time.trim(),
      name: name.trim(),
      description: description.trim(),
      cost: parseFloat(cost) || 0,
      completed: activity?.completed || false,
      rating: activity?.rating || null,
    });
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '480px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isNewActivity ? '➕ Add New Activity' : '✏️ Edit Activity'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Time</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 09:00 AM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Activity Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Visit Eiffel Tower"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-input"
              placeholder="Describe the activity..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>Estimated Cost ($)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '8px' }}
          >
            <Save size={16} /> {isNewActivity ? 'Add Activity' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
