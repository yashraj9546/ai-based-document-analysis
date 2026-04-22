'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
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
        {/* Left - Login Form */}
        <div className="auth-left">
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-logo-icon">📄</div>
              <span className="auth-logo-text">DocReader AI</span>
            </div>

            <h1>Welcome back</h1>
            <p className="subtitle">Sign in to your account to continue analyzing your documents with AI.</p>

            {error && (
              <div className="alert alert-error">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
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
                    autoFocus
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || !email || !password}
              >
                {isSubmitting && <span className="spinner" />}
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-footer">
              Don&apos;t have an account?{' '}
              <Link href="/register">Create one</Link>
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
            <h2>AI-Powered<br />Document Analysis</h2>
            <p>Upload any document and get instant, intelligent answers to your questions.</p>
            <ul className="features-list">
              <li>
                <span className="feature-icon">📤</span>
                <span>Upload PDFs, Word docs, and text files</span>
              </li>
              <li>
                <span className="feature-icon">🤖</span>
                <span>Ask questions in natural language</span>
              </li>
              <li>
                <span className="feature-icon">⚡</span>
                <span>Get accurate answers in seconds</span>
              </li>
              <li>
                <span className="feature-icon">🔒</span>
                <span>Your documents are private and secure</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
