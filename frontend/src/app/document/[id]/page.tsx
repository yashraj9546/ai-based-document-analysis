'use client';

import { useAuth } from '@/context/AuthContext';
import { queryApi, QueryData, documentApi, DocumentData } from '@/lib/api';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';

/**
 * Document Chat Page - allows users to ask AI questions about a specific document
 */
export default function DocumentChatPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [queries, setQueries] = useState<QueryData[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [docLoading, setDocLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  // Fetch document details and query history
  const fetchData = useCallback(async () => {
    try {
      const [docRes, queriesRes] = await Promise.all([
        documentApi.getById(documentId),
        queryApi.getByDocument(documentId),
      ]);
      setDocument(docRes.data);
      setQueries(queriesRes.data.reverse()); // oldest first for chat view
    } catch (err) {
      console.error('Failed to load document:', err);
      setError('Failed to load document');
    } finally {
      setDocLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isAuthenticated && documentId) {
      fetchData();
    }
  }, [isAuthenticated, documentId, fetchData]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [queries]);

  // Toggle source expansion
  const toggleSources = (queryId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(queryId)) {
        next.delete(queryId);
      } else {
        next.add(queryId);
      }
      return next;
    });
  };

  // Handle asking a question
  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;

    const q = question.trim();
    setQuestion('');
    setIsAsking(true);
    setError(null);

    // Optimistically add the question to the chat
    const tempId = `temp-${Date.now()}`;
    const optimisticQuery: QueryData = {
      id: tempId,
      question: q,
      answer: null,
      status: 'processing',
      documentId,
      createdAt: new Date().toISOString(),
    };
    setQueries((prev) => [...prev, optimisticQuery]);

    try {
      const res = await queryApi.ask(documentId, q);
      // Replace the optimistic entry with the real response
      setQueries((prev) =>
        prev.map((query) =>
          query.id === tempId ? res.data : query
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get answer';
      // Update the optimistic entry with error state
      setQueries((prev) =>
        prev.map((query) =>
          query.id === tempId
            ? { ...query, answer: message, status: 'error' }
            : query
        )
      );
      setError(message);
    } finally {
      setIsAsking(false);
      inputRef.current?.focus();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  // ─── Loading State ─────────────────────────────
  if (isLoading || !user) {
    return (
      <div className="chat-page-loading">
        <div className="chat-loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (docLoading) {
    return (
      <div className="chat-page-loading">
        <div className="chat-loading-spinner" />
        <p>Loading document...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="chat-page-loading">
        <p style={{ color: 'var(--danger)' }}>Document not found</p>
        <a href="/dashboard" className="chat-back-link">← Back to Dashboard</a>
      </div>
    );
  }

  const isReady = document.status === 'ready';

  // ─── Render ────────────────────────────────────
  return (
    <div className="chat-page page-enter">
      <div className="animated-bg" />

      {/* ─── Chat Header ─────────────────────────── */}
      <header className="chat-header">
        <div className="chat-header-left">
          <a href="/dashboard" className="chat-back-btn" title="Back to Dashboard">
            ←
          </a>
          <div className="chat-header-info">
            <h1 className="chat-header-title">{document.originalName}</h1>
            <div className="chat-header-meta">
              <span className={`doc-status ${document.status}`}>
                <span className="status-dot" />
                {document.status}
              </span>
              <span className="chat-header-sep">•</span>
              <span>DocReader AI</span>
            </div>
          </div>
        </div>
        <div className="chat-header-right">
          <span className="chat-header-email">{user.email}</span>
        </div>
      </header>

      {/* ─── Chat Messages Area ──────────────────── */}
      <main className="chat-messages">
        {/* Welcome message */}
        {queries.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">🤖</div>
            <h2>Ask me anything about this document</h2>
            <p>I&apos;ll search through the document content and provide answers based on what&apos;s in it.</p>
            {!isReady && (
              <div className="chat-welcome-warning">
                ⚠️ This document is still being processed (status: &quot;{document.status}&quot;). 
                Please wait until it&apos;s ready before asking questions.
              </div>
            )}
            {isReady && (
              <div className="chat-suggestions">
                <button
                  className="chat-suggestion-btn"
                  onClick={() => { setQuestion('What is this document about?'); inputRef.current?.focus(); }}
                >
                  📝 What is this document about?
                </button>
                <button
                  className="chat-suggestion-btn"
                  onClick={() => { setQuestion('Summarize the key points'); inputRef.current?.focus(); }}
                >
                  📋 Summarize the key points
                </button>
                <button
                  className="chat-suggestion-btn"
                  onClick={() => { setQuestion('What are the main conclusions?'); inputRef.current?.focus(); }}
                >
                  🎯 What are the main conclusions?
                </button>
              </div>
            )}
          </div>
        )}

        {/* Query/Answer pairs */}
        {queries.map((q) => (
          <div key={q.id} className="chat-exchange">
            {/* User Question */}
            <div className="chat-message chat-message-user">
              <div className="chat-avatar chat-avatar-user">
                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
              <div className="chat-bubble chat-bubble-user">
                <p>{q.question}</p>
              </div>
            </div>

            {/* AI Answer */}
            <div className="chat-message chat-message-ai">
              <div className="chat-avatar chat-avatar-ai">🤖</div>
              <div className="chat-bubble chat-bubble-ai">
                {q.status === 'processing' ? (
                  <div className="chat-typing">
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                  </div>
                ) : q.status === 'error' ? (
                  <div className="chat-error-msg">
                    <span>❌</span>
                    <p>{q.answer || 'Something went wrong'}</p>
                  </div>
                ) : (
                  <>
                    <div className="chat-answer-text">
                      {q.answer?.split('\n').map((line, i) => (
                        <p key={i}>{line || '\u00A0'}</p>
                      ))}
                    </div>

                    {/* Sources */}
                    {q.sources && q.sources.length > 0 && (
                      <div className="chat-sources">
                        <button
                          className="chat-sources-toggle"
                          onClick={() => toggleSources(q.id)}
                        >
                          📚 {q.sources.length} source{q.sources.length !== 1 ? 's' : ''} used
                          <span className={`chat-sources-arrow ${expandedSources.has(q.id) ? 'expanded' : ''}`}>
                            ▸
                          </span>
                        </button>
                        {expandedSources.has(q.id) && (
                          <div className="chat-sources-list">
                            {q.sources.map((s, i) => (
                              <div key={i} className="chat-source-item">
                                <div className="chat-source-header">
                                  <span className="chat-source-label">Chunk #{s.chunkIndex + 1}</span>
                                  <span className="chat-source-score">
                                    {Math.round(s.score * 100)}% match
                                  </span>
                                </div>
                                <p className="chat-source-text">{s.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Model info */}
                    {q.model && (
                      <div className="chat-model-info">
                        Powered by {q.model}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </main>

      {/* ─── Chat Input ──────────────────────────── */}
      <footer className="chat-input-container">
        {error && (
          <div className="chat-input-error">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isReady ? 'Ask a question about this document...' : 'Document is still processing...'}
            disabled={!isReady || isAsking}
            rows={1}
            id="chat-question-input"
          />
          <button
            className="chat-send-btn"
            onClick={handleAsk}
            disabled={!question.trim() || isAsking || !isReady}
            title="Send question"
            id="chat-send-button"
          >
            {isAsking ? (
              <span className="chat-send-spinner" />
            ) : (
              <span>↑</span>
            )}
          </button>
        </div>
        <p className="chat-input-hint">
          Press Enter to send, Shift+Enter for new line
        </p>
      </footer>
    </div>
  );
}
