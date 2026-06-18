import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';

export const AuthScreen: React.FC = () => {
  const { login, register, error, clearError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ email, password });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setPassword('');
    setConfirmPassword('');
    setLocalError(null);
    clearError();
  };

  const displayedError = localError || error;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#07090e',
      padding: '20px'
    }}>
      {/* Background blobs for rich aesthetics */}
      <div className="floating-blob blob-primary" style={{ top: '20%', left: '20%', width: '400px', height: '400px' }} />
      <div className="floating-blob blob-secondary" style={{ bottom: '20%', right: '20%', width: '400px', height: '400px' }} />

      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
          <img src={logo} alt="Manzil Logo" style={{ height: '70px', width: 'auto', marginBottom: '8px' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'white' }}>
            {isLogin ? 'Welcome to Manzil' : 'Create an Account'}
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            {isLogin 
              ? 'Sign in to access your custom travel itineraries and budget trackers.' 
              : 'Sign up to start planning, saving, and sharing your dream journeys.'}
          </p>
        </div>

        {displayedError && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'start',
            gap: '10px',
            color: 'var(--text-primary)',
            fontSize: '0.88rem'
          }}>
            <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{displayedError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="form-input"
              required
              style={{ padding: '12px 16px' }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="form-input"
                required
                style={{ padding: '12px 40px 12px 16px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="form-input"
                required
                style={{ padding: '12px 16px' }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '14px',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 600,
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn size={18} />
                Sign In
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Create Account
              </>
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '20px',
          marginTop: '8px'
        }}>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={switchMode}
              style={{
                background: 'none',
                border: 'none',
                color: '#0060d8',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '6px',
                padding: 0
              }}
            >
              {isLogin ? 'Create one now' : 'Sign in instead'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
