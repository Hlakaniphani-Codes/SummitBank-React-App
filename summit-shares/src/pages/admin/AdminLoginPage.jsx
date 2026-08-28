import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../api/admin';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await adminLogin(email, password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('adminRole', data.user.role);
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      fontFamily: "'Inter', 'Montserrat', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#151515',
        border: '1px solid #1e1e1e',
        borderRadius: 16,
        padding: '40px 36px',
        maxWidth: 400,
        width: '100%',
        margin: '0 16px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <svg viewBox="0 0 170 40" fill="none" style={{ height: 40, width: 'auto', margin: '0 auto 12px' }}>
            <path d="M10 30 L30 10 L50 30 L40 30 L30 18 L20 30 L10 30Z" fill="#C9A84C" />
            <rect x="32" y="24" width="2" height="6" fill="#C9A84C" />
            <rect x="34" y="26" width="2" height="4" fill="#C9A84C" />
            <rect x="36" y="28" width="2" height="2" fill="#C9A84C" />
            <text x="46" y="26" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="20" fill="#FFFFFF" letterSpacing="2">SUMMIT</text>
            <text x="46" y="36" fontFamily="Inter, sans-serif" fontWeight="500" fontSize="8" fill="#6b6b6b" letterSpacing="3">SHARES</text>
          </svg>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Admin Login</h1>
          <p style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>Sign in to the administration panel</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(217,67,82,0.1)',
            border: '1px solid rgba(217,67,82,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 12,
            color: '#D94352',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: '#6b6b6b',
              marginBottom: 6,
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@summitshares.com"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #2a2a2a',
                fontSize: 13,
                background: '#1a1a1a',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
              onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: '#6b6b6b',
              marginBottom: 6,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #2a2a2a',
                fontSize: 13,
                background: '#1a1a1a',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
              onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#8a7a3a' : '#C9A84C',
              color: '#000',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a
            href="/"
            style={{
              fontSize: 11,
              color: '#6b6b6b',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b6b6b'; }}
          >
            &larr; Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
