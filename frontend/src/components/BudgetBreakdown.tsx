import React from 'react';
import { Plane, Hotel, Utensils, Award } from 'lucide-react';

interface BudgetBreakdownProps {
  budget: number;
  allocation: {
    travel: number;
    hotel: number;
    food: number;
    activities: number;
    [key: string]: number;
  };
}

export const BudgetBreakdown: React.FC<BudgetBreakdownProps> = ({ budget, allocation }) => {
  const getPercentage = (amount: number) => {
    if (!budget) return '0%';
    return `${Math.round((amount / budget) * 100)}%`;
  };

  const categories = [
    { key: 'travel', name: 'Transport & Flights', amount: allocation.travel || 0, color: 'var(--color-travel)', icon: Plane },
    { key: 'hotel', name: 'Hotels & Accommodation', amount: allocation.hotel || 0, color: 'var(--color-hotel)', icon: Hotel },
    { key: 'food', name: 'Food & Dining', amount: allocation.food || 0, color: 'var(--color-food)', icon: Utensils },
    { key: 'activities', name: 'Sightseeing & Activities', amount: allocation.activities || 0, color: 'var(--color-activity)', icon: Award },
  ];

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <h3 style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
          <span>💰</span> Budget Allocation Optimization
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {categories.map(cat => {
            const Icon = cat.icon;
            const pct = getPercentage(cat.amount);
            return (
              <div key={cat.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      background: `rgba(${cat.key === 'travel' ? '59,130,246' : cat.key === 'hotel' ? '139,92,246' : cat.key === 'food' ? '244,63,94' : '16,185,129'}, 0.15)`,
                      color: cat.color,
                      padding: '8px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{cat.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct} of budget</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      ${cat.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                {/* Progress bar track */}
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: pct,
                    height: '100%',
                    background: cat.color,
                    borderRadius: '3px',
                    boxShadow: `0 0 8px ${cat.color}45`,
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Funds Allocated</span>
        <span style={{ 
          fontSize: '1.2rem', 
          fontWeight: 800, 
          color: 'var(--text-primary)', 
          background: 'linear-gradient(135deg, #ffffff 40%, var(--secondary) 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent' 
        }}>
          ${budget.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
