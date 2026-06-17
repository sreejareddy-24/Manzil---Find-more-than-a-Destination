import React from 'react';

interface CurrencySelectorProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

// Static offline conversion rates relative to USD
export const CURRENCY_RATES: Record<string, { symbol: string; rate: number; name: string }> = {
  USD: { symbol: '$', rate: 1.0, name: 'US Dollar' },
  EUR: { symbol: '€', rate: 0.92, name: 'Euro' },
  GBP: { symbol: '£', rate: 0.79, name: 'British Pound' },
  INR: { symbol: '₹', rate: 83.5, name: 'Indian Rupee' },
  JPY: { symbol: '¥', rate: 149.5, name: 'Japanese Yen' },
  AUD: { symbol: 'A$', rate: 1.53, name: 'Australian Dollar' },
  CAD: { symbol: 'C$', rate: 1.36, name: 'Canadian Dollar' },
};

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ selectedCurrency, onCurrencyChange }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        💱 Currency
      </span>
      <select
        value={selectedCurrency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="form-input"
        style={{
          padding: '6px 10px',
          fontSize: '0.82rem',
          background: 'var(--bg-secondary)',
          width: 'auto',
          minWidth: '130px',
          cursor: 'pointer',
        }}
      >
        {Object.entries(CURRENCY_RATES).map(([code, info]) => (
          <option key={code} value={code}>
            {info.symbol} {code} — {info.name}
          </option>
        ))}
      </select>
    </div>
  );
};
