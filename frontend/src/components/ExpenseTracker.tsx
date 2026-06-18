import React, { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import type { Trip } from '../types';
import { WeatherCard } from './WeatherCard';
import { MapRegion } from './MapRegion';

interface ExpenseTrackerProps {
  trip: Trip;
  onAddExpense: (expense: { title: string; amount: number; category: string; date: string }) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  transport: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' },
  accommodation: { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6' },
  food: { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316' },
  activities: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981' },
  other: { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b' }
};

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ trip, onAddExpense, onDeleteExpense }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(trip.start_date);

  const expenses = trip.expenses || [];
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const budget = trip.budget;
  const amountLeft = budget - totalSpent;
  const spentPct = budget > 0 ? (totalSpent / budget) * 100 : 0;

  // Group expenses by category for allocation bars
  const categoryTotals = expenses.reduce((acc, exp) => {
    const cat = exp.category.toLowerCase();
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    onAddExpense({
      title: title.trim(),
      amount: parseFloat(amount) || 0,
      category,
      date
    });

    setTitle('');
    setAmount('');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Title Header */}
      <div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Trip Budget: {trip.destination}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Manage your travel expenses and stay on track with AI-powered insights.
        </p>
      </div>

      {/* Top row: Metrics + Allocation + Weather */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '24px', alignItems: 'stretch' }}>
        
        {/* Metric 1: Total Spent */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', background: 'rgba(13, 20, 35, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#94a3b8', fontWeight: 600 }}>
              <span>Total Spent</span>
              <span style={{ color: '#0060d8' }}>${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            
            {/* Progress bar */}
            <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', marginTop: '12px', marginBottom: '8px' }}>
              <div style={{ width: `${Math.min(spentPct, 100)}%`, height: '100%', background: '#0060d8', borderRadius: '6px', transition: 'width 0.4s ease' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{Math.round(spentPct)}% of ${budget.toLocaleString()} limit</span>
              <span style={{ color: amountLeft >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                ${Math.abs(amountLeft).toLocaleString()} {amountLeft >= 0 ? 'left' : 'over limit'}
              </span>
            </div>
          </div>

          {/* AI Suggestion Alert */}
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem' }}>🤖</span>
            <div>
              <h5 style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Suggestion</h5>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4, marginTop: '2px' }}>
                You're spending 15% less on food than planned. Consider upgrading your last dinner!
              </p>
            </div>
          </div>
        </div>

        {/* Metric 2: Allocation */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(13, 20, 35, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>Budget Allocation</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {['transport', 'accommodation', 'food', 'activities'].map(cat => {
              const spent = categoryTotals[cat] || 0;
              const limit = cat === 'transport' ? budget * 0.25 : cat === 'accommodation' ? budget * 0.4 : cat === 'food' ? budget * 0.2 : budget * 0.15;
              const pct = limit > 0 ? (spent / limit) * 100 : 0;
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', textTransform: 'capitalize' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>{cat === 'food' ? 'Food & Dining' : cat}</span>
                    <span style={{ color: 'white', fontWeight: 700 }}>${spent.toFixed(0)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ ${limit.toFixed(0)}</span></span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: CATEGORY_COLORS[cat]?.text || '#64748b', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metric 3: Weather */}
        <WeatherCard forecast={trip.itinerary.weather_forecast} />

      </div>

      {/* Bottom Layout: Smart Expense table on Left, Payment forms + Map on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '30px', alignItems: 'stretch' }}>
        
        {/* Left: Table */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(13, 20, 35, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Smart Expense Tracker</h3>
            <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px' }}>
              <Download size={14} /> Export PDF
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 8px' }}>DATE</th>
                  <th style={{ padding: '12px 8px' }}>DESCRIPTION</th>
                  <th style={{ padding: '12px 8px' }}>CATEGORY</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>AMOUNT</th>
                  <th style={{ padding: '12px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No expenses logged yet. Add your first payment in the sidebar form!
                    </td>
                  </tr>
                ) : (
                  expenses.map(exp => {
                    const color = CATEGORY_COLORS[exp.category.toLowerCase()] || CATEGORY_COLORS.other;
                    return (
                      <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>
                          {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '14px 8px', fontWeight: 600, color: 'white' }}>{exp.title}</td>
                        <td style={{ padding: '14px 8px' }}>
                          <span style={{
                            background: color.bg,
                            color: color.text,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 700, color: 'white' }}>
                          ${exp.amount.toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                          <button onClick={() => onDeleteExpense(exp.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Payment Forms + Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Log payment Form */}
          <form onSubmit={handleFormSubmit} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(13, 20, 35, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Log Payment</h3>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Expense Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Sushi dinner" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Amount ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-input" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Category</label>
                <select 
                  className="form-input" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  style={{ appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="food">Food</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="transport">Transport</option>
                  <option value="activities">Activities</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontSize: '0.88rem', borderRadius: '8px', background: '#0060d8', display: 'flex', justifyContent: 'center' }}>
              Add Expense
            </button>
          </form>

          {/* Map Preview widget */}
          <div style={{ flex: 1, minHeight: '220px' }}>
            <MapRegion activities={trip.itinerary.days[0]?.activities || []} destination={trip.destination} />
          </div>

        </div>

      </div>
      
    </div>
  );
};
