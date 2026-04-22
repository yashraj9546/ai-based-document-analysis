'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, authLoading]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', class: 'weak' };
    if (score <= 3) return { score, label: 'Medium', class: 'medium' };
    return { score, label: 'Strong', class: 'strong' };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email, password, name || undefined);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <>
      <div className="animated-bg" />
      <div className="auth-layout page-enter">
        {/* Left - Register Form */}
        <div className="auth-left">
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-logo-icon">📄</div>
              <span className="auth-logo-text">DocReader AI</span>
            </div>

            <h1>Create your account</h1>
            <p className="subtitle">Get started with AI-powered document analysis. Free to sign up.</p>

            {error && (
              <div className="alert alert-error">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">Full Name <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <div className="form-input-wrapper">
                  <input
                    id="name"
                    type="text"
                    className="form-input"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    autoFocus
                  />
                  <span className="form-icon">👤</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <div className="form-input-wrapper">
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <span className="form-icon">✉️</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <div className="form-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <span className="form-icon">🔒</span>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {password && (
                  <>
                    <div className="password-strength">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`password-strength-bar ${i <= passwordStrength.score ? `active ${passwordStrength.class}` : ''}`}
                        />
                      ))}
                    </div>
                    <div className="password-strength-text">
                      Password strength: {passwordStrength.label}
                    </div>
                  </>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <div className="form-input-wrapper">
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <span className="form-icon">🔒</span>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <div className="password-strength-text" style={{ color: 'var(--error)' }}>
                    Passwords do not match
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || !email || !password || !confirmPassword || password !== confirmPassword}
              >
                {isSubmitting && <span className="spinner" />}
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account?{' '}
              <Link href="/login">Sign in</Link>
            </div>
          </div>
        </div>

        {/* Right - Branding Panel */}
        <div className="auth-right">
          <div className="floating-shapes">
            <div className="shape" />
            <div className="shape" />
            <div className="shape" />
          </div>
          <div className="auth-right-content">
            <h2>Start Analyzing<br />Documents Today</h2>
            <p>Join thousands of users who save hours by using AI to extract insights from their documents.</p>
            <ul className="features-list">
              <li>
                <span className="feature-icon">🚀</span>
                <span>Set up in under 30 seconds</span>
              </li>
              <li>
                <span className="feature-icon">📊</span>
                <span>Support for multiple file formats</span>
              </li>
              <li>
                <span className="feature-icon">💬</span>
                <span>Conversational Q&A with your docs</span>
              </li>
              <li>
                <span className="feature-icon">🛡️</span>
                <span>Enterprise-grade security</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
