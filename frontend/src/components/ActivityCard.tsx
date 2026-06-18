import React from 'react';
import { Edit3, Trash2, ChevronUp, ChevronDown, Star } from 'lucide-react';
import type { ActivityDetail } from '../types';
import { getActivityImageUrl } from '../services/imageHelper';

interface ActivityCardProps {
  activity: ActivityDetail;
  index: number;
  totalActivities: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleComplete: () => void;
  onRate: (rating: number) => void;
  currencySymbol: string;
  exchangeRate: number;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  index,
  totalActivities,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleComplete,
  onRate,
  currencySymbol,
  exchangeRate,
}) => {
  const isCompleted = activity.completed || false;
  const rating = activity.rating || 0;

  const convertedCost = activity.cost * exchangeRate;
  const costDisplay = `${currencySymbol}${convertedCost.toFixed(convertedCost < 1 ? 2 : 0)}`;

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        position: 'relative',
        paddingLeft: '18px',
        borderLeft: isCompleted
          ? '2px solid rgba(16, 185, 129, 0.4)'
          : '2px solid rgba(139, 92, 246, 0.25)',
        opacity: isCompleted ? 0.65 : 1,
        transition: 'var(--transition-smooth)',
      }}
    >
      {/* Timeline dot */}
      <div
        style={{
          position: 'absolute',
          left: '-6px',
          top: '4px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isCompleted ? 'var(--success)' : 'var(--primary)',
          boxShadow: isCompleted ? '0 0 6px var(--success)' : '0 0 6px var(--primary)',
        }}
      />

      <div style={{ flex: 1 }}>
        {/* Time + Cost Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--secondary)',
              background: 'rgba(6, 182, 212, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            {activity.time}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {activity.cost > 0 ? costDisplay : 'Free'}
            </span>

            {/* Reorder buttons */}
            <div className="no-print" style={{ display: 'flex', gap: '2px' }}>
              {index > 0 && (
                <button onClick={onMoveUp} className="icon-btn" title="Move up">
                  <ChevronUp size={14} />
                </button>
              )}
              {index < totalActivities - 1 && (
                <button onClick={onMoveDown} className="icon-btn" title="Move down">
                  <ChevronDown size={14} />
                </button>
              )}
              <button onClick={onEdit} className="icon-btn" title="Edit">
                <Edit3 size={14} />
              </button>
              <button onClick={onDelete} className="icon-btn icon-btn-danger" title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Flex Wrapper for Description + Image */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginTop: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h4
              className={`completed-text ${isCompleted ? 'done' : ''}`}
              style={{
                fontSize: '1rem',
                marginBottom: '4px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onClick={onToggleComplete}
            >
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={() => {}}
                style={{ cursor: 'pointer', accentColor: 'var(--success)', width: '16px', height: '16px' }}
              />
              {activity.name}
            </h4>
            <p
              className={isCompleted ? 'completed-text done' : ''}
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              {activity.description}
            </p>
          </div>
          
          {/* Event Cover Image */}
          <div className="no-print" style={{ flexShrink: 0 }}>
            <img 
              src={getActivityImageUrl(activity.name)} 
              alt={activity.name}
              style={{
                width: '100px',
                height: '75px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
                opacity: isCompleted ? 0.6 : 1,
                transition: 'opacity 0.3s'
              }}
            />
          </div>
        </div>

        {/* Star rating (visible only after completion) */}
        {isCompleted && (
          <div className="no-print" style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRate(star)}
                className="star-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                title={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <Star
                  size={16}
                  fill={star <= rating ? '#f59e0b' : 'none'}
                  color={star <= rating ? '#f59e0b' : 'var(--text-muted)'}
                />
              </button>
            ))}
            {rating > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px', alignSelf: 'center' }}>
                ({rating}/5)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
