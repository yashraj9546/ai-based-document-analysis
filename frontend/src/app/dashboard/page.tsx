'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || !user) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div className="btn-primary" style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span className="spinner" style={{ margin: 0 }}></span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '24px',
    }}>
      {/* Top Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        marginBottom: '32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="auth-logo-icon" style={{ width: '36px', height: '36px', fontSize: '1.1rem' }}>📄</div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>DocReader AI</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {user.email}
          </span>
          <button
            onClick={logout}
            style={{
              padding: '8px 20px',
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--error)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)';
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Welcome Section */}
      <div style={{
        textAlign: 'center',
        padding: '60px 24px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '12px' }}>
          Welcome{user.name ? `, ${user.name}` : ''}! 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
          You&apos;re all set. Document upload and AI analysis features are coming next.
        </p>
        <div style={{
          marginTop: '32px',
          display: 'inline-flex',
          gap: '12px',
          padding: '12px 20px',
          background: 'rgba(52, 211, 153, 0.1)',
          border: '1px solid rgba(52, 211, 153, 0.2)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--success)',
          fontSize: '0.9rem',
        }}>
          ✅ Authentication is working perfectly
        </div>
      </div>
    </div>
  );
}
