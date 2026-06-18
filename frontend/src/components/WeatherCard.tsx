import React from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudDrizzle, 
  CloudLightning, 
  Snowflake, 
  CloudFog, 
  CalendarRange
} from 'lucide-react';
import type { WeatherDay } from '../types';

interface WeatherCardProps {
  forecast: WeatherDay[];
}

const getWeatherIcon = (condition: string, size = 28) => {
  const cond = condition.toLowerCase();
  if (cond.includes('sunny') || cond.includes('clear')) {
    return <Sun size={size} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))' }} />;
  }
  if (cond.includes('partly')) {
    return <CloudSun size={size} color="#60a5fa" style={{ filter: 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.4))' }} />;
  }
  if (cond.includes('cloudy') || cond.includes('overcast')) {
    return <Cloud size={size} color="#94a3b8" />;
  }
  if (cond.includes('drizzle')) {
    return <CloudDrizzle size={size} color="#60a5fa" />;
  }
  if (cond.includes('rain') || cond.includes('shower')) {
    return <CloudRain size={size} color="#3b82f6" style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))' }} />;
  }
  if (cond.includes('lightning') || cond.includes('thunderstorm')) {
    return <CloudLightning size={size} color="#8b5cf6" style={{ filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.4))' }} />;
  }
  if (cond.includes('snow') || cond.includes('ice') || cond.includes('rime')) {
    return <Snowflake size={size} color="#93c5fd" style={{ filter: 'drop-shadow(0 0 6px rgba(147, 197, 253, 0.4))' }} />;
  }
  if (cond.includes('fog')) {
    return <CloudFog size={size} color="#64748b" />;
  }
  return <Sun size={size} color="#f59e0b" />;
};

const formatDayLabel = (dateStr: string) => {
  if (dateStr.startsWith('Day')) return dateStr;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ forecast }) => {
  if (!forecast || forecast.length === 0) return null;

  return (
    <div className="glass-panel" style={{ width: '100%', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)' }}>
      <h3 style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', fontWeight: 700 }}>
        <CalendarRange size={20} color="var(--secondary)" /> Weather Forecast
      </h3>
      
      {/* Horizontal scrolling weather cards */}
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'thin'
      }}>
        {forecast.map((day, idx) => (
          <div 
            key={idx} 
            style={{
              background: 'rgba(255, 255, 255, 0.015)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '14px 18px',
              minWidth: '110px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'center',
              flexShrink: 0,
              transition: 'var(--transition-smooth)',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--secondary)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)';
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {formatDayLabel(day.date)}
            </span>
            
            <div style={{ margin: '4px 0' }}>
              {getWeatherIcon(day.condition)}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {Math.round(day.temp_max)}°C
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {Math.round(day.temp_min)}°C
              </span>
            </div>
            
            <span style={{ 
              fontSize: '0.72rem', 
              fontWeight: 500, 
              color: 'var(--text-secondary)',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '90px'
            }}>
              {day.condition}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
