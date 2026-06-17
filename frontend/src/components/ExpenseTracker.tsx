import React, { useState } from 'react';
import { Plus, Trash, DollarSign, PieChart, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Trip } from '../types';

interface ExpenseTrackerProps {
  trip: Trip;
  onAddExpense: (expense: { title: string; amount: number; category: string; date: string }) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  travel: { label: 'Transport & Flights', color: 'var(--color-travel)' },
  hotel: { label: 'Hotels & Lodging', color: 'var(--color-hotel)' },
  food: { label: 'Food & Dining', color: 'var(--color-food)' },
  activities: { label: 'Sightseeing & Activities', color: 'var(--color-activity)' },
  other: { label: 'Other Expenses', color: 'var(--color-other)' },
};

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ trip, onAddExpense, onDeleteExpense }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(trip.start_date);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSpent = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalBudget = trip.budget;
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Calculate spent by category
  const spentByCategory = trip.expenses.reduce((acc, exp) => {
    const cat = exp.category.toLowerCase();
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const allocation = trip.itinerary.budget_allocation || { travel: 0, hotel: 0, food: 0, activities: 0 };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddExpense({
        title: title.trim(),
        amount: parseFloat(amount),
        category,
        date,
      });
      setTitle('');
      setAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 100) return 'var(--danger)';
    if (pct >= 85) return 'var(--warning)';
    return 'var(--success)';
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ width: '100%' }}>
      <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
        <PieChart size={20} color="var(--primary)" /> Smart Expense Tracker
      </h3>

      {/* Overview Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Spending Limit</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              ${totalSpent.toLocaleString()} / <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 600 }}>${totalBudget.toLocaleString()}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Percentage Spent</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: getProgressBarColor(percentSpent) }}>
              {percentSpent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{
            width: `${Math.min(percentSpent, 100)}%`,
            height: '100%',
            background: getProgressBarColor(percentSpent),
            boxShadow: `0 0 10px ${getProgressBarColor(percentSpent)}40`,
            transition: 'width 0.5s ease-out-in'
          }} />
        </div>

        {percentSpent > 100 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginTop: '8px'
          }}>
            <AlertTriangle size={14} /> Warning: You have exceeded your overall budget limit!
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        {/* Left Side: Expense List */}
        <div>
          <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
            Expense log ({trip.expenses.length})
          </h4>

          {trip.expenses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: 'rgba(255, 255, 255, 0.01)',
              borderRadius: '12px',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)'
            }}>
              No expenses recorded yet. Use the form to log your payments.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {trip.expenses.map(exp => {
                const catInfo = CATEGORY_MAP[exp.category.toLowerCase()] || CATEGORY_MAP.other;
                return (
                  <div 
                    key={exp.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{exp.title}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          background: `${catInfo.color}18`,
                          color: catInfo.color,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          {catInfo.label}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{exp.date}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <button 
                        onClick={() => onDeleteExpense(exp.id)}
                        className="btn-danger"
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Log Expense Form & Category Budgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Form */}
          <div style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} color="var(--secondary)" /> Log Payment
            </h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Expense title (e.g. Taxi to hotel)"
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <DollarSign size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    className="form-input"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ paddingLeft: '24px', width: '100%' }}
                    required
                  />
                </div>

                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <select
                  className="form-input"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', width: '100%' }}
                >
                  <option value="travel">Transport & Flights</option>
                  <option value="hotel">Hotels & Lodging</option>
                  <option value="food">Food & Dining</option>
                  <option value="activities">Sightseeing & Activities</option>
                  <option value="other">Other Expenses</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }}
              >
                <Plus size={16} /> Log Expense
              </button>
            </form>
          </div>

          {/* Category Budgets */}
          <div style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Category thresholds
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.keys(allocation).map(catKey => {
                const catAlloc = allocation[catKey] || 0;
                const catSpent = spentByCategory[catKey] || 0;
                const catInfo = CATEGORY_MAP[catKey] || CATEGORY_MAP.other;
                const catPercent = catAlloc > 0 ? (catSpent / catAlloc) * 100 : 0;
                const isOver = catPercent > 100;

                return (
                  <div key={catKey}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: isOver ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {catInfo.label} {isOver && '⚠️'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ${catSpent.toLocaleString()} / ${catAlloc.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(catPercent, 100)}%`,
                        height: '100%',
                        background: isOver ? 'var(--danger)' : catInfo.color,
                        borderRadius: '2px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
