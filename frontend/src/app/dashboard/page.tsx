'use client';

import { useAuth } from '@/context/AuthContext';
import { documentApi, DocumentData } from '@/lib/api';
import { useEffect, useState, useRef, useCallback } from 'react';

// ─── Helpers ─────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFileTypeInfo(mimeType: string): { icon: string; label: string; cssClass: string } {
  if (mimeType === 'application/pdf') return { icon: '📕', label: 'PDF', cssClass: 'pdf' };
  if (mimeType.includes('word') || mimeType.includes('document')) return { icon: '📘', label: 'DOC', cssClass: 'doc' };
  if (mimeType === 'text/plain') return { icon: '📝', label: 'TXT', cssClass: 'txt' };
  if (mimeType === 'text/csv') return { icon: '📊', label: 'CSV', cssClass: 'csv' };
  if (mimeType === 'text/markdown') return { icon: '📋', label: 'MD', cssClass: 'md' };
  return { icon: '📄', label: 'FILE', cssClass: 'default' };
}

// ─── Toast Component ─────────────────────────────
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <>
      {toasts.map((toast, idx) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          style={{ bottom: `${24 + idx * 64}px` }}
        >
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </>
  );
}

// ─── Main Dashboard ──────────────────────────────
export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef(0);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await documentApi.getAll();
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDocuments();
    }
  }, [isAuthenticated, fetchDocuments]);

  // ─── Polling Logic ─────────────────────────────
  // Automatically refresh document status if any are processing
  useEffect(() => {
    const hasPendingDocs = documents.some(
      (doc) => doc.status === 'processing' || doc.status === 'uploaded'
    );

    if (hasPendingDocs && isAuthenticated) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [documents, isAuthenticated, fetchDocuments]);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // ─── Upload Handler ────────────────────────────
  const handleUpload = async (file: File) => {
    // Validate on client side
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      showToast(`Unsupported file type. Please upload PDF, TXT, DOC, DOCX, MD, or CSV files.`, 'error');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast('File size exceeds 10MB limit.', 'error');
      return;
    }

    setUploadingFile(file.name);
    setUploadProgress(0);

    try {
      await documentApi.upload(file, (percent) => {
        setUploadProgress(percent);
      });

      setUploadProgress(100);
      showToast(`"${file.name}" uploaded successfully!`, 'success');

      // Small delay to show 100%, then refresh
      setTimeout(async () => {
        setUploadProgress(null);
        setUploadingFile(null);
        await fetchDocuments();
      }, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      showToast(message, 'error');
      setUploadProgress(null);
      setUploadingFile(null);
    }
  };

  // ─── Delete Handler ────────────────────────────
  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return;

    try {
      await documentApi.delete(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      showToast(`"${docName}" deleted.`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      showToast(message, 'error');
    }
  };

  // ─── Drag & Drop ──────────────────────────────
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Loading State ─────────────────────────────
  if (isLoading || !user) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="btn-primary" style={{
            width: '40px', height: '40px', borderRadius: '50%', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="spinner" style={{ margin: 0 }} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────
  return (
    <div className="dashboard page-enter">
      <div className="animated-bg" />
      <div className="dashboard-content">
        {/* ─── Top Navigation ─────────────────── */}
        <nav className="top-nav">
          <div className="top-nav-brand">
            <div className="auth-logo-icon" style={{ width: '36px', height: '36px', fontSize: '1.1rem' }}>📄</div>
            <span>DocReader AI</span>
          </div>
          <div className="top-nav-actions">
            <span className="top-nav-email">{user.email}</span>
            <button className="btn-logout" onClick={logout}>Sign Out</button>
          </div>
        </nav>

        {/* ─── Upload Zone ────────────────────── */}
        <div
          className={`upload-zone ${isDragActive ? 'drag-active' : ''} ${uploadProgress !== null ? 'uploading' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,.md,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="file-upload-input"
          />
          <span className="upload-icon">
            {isDragActive ? '📥' : '☁️'}
          </span>
          <div className="upload-title">
            {isDragActive ? 'Drop your file here' : 'Drag & drop a document, or click to browse'}
          </div>
          <div className="upload-subtitle">
            Maximum file size: 10MB
          </div>
          <div className="upload-formats">
            <span className="format-badge">PDF</span>
            <span className="format-badge">TXT</span>
            <span className="format-badge">DOC</span>
            <span className="format-badge">DOCX</span>
            <span className="format-badge">MD</span>
            <span className="format-badge">CSV</span>
          </div>
        </div>

        {/* ─── Upload Progress ────────────────── */}
        {uploadProgress !== null && uploadingFile && (
          <div className="upload-progress-container">
            <div className="upload-progress-card">
              <div className="upload-progress-header">
                <span className="upload-progress-filename">
                  📎 {uploadingFile}
                </span>
                <span className="upload-progress-percentage">{uploadProgress}%</span>
              </div>
              <div className="upload-progress-bar">
                <div
                  className="upload-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="upload-progress-status">
                {uploadProgress < 100 ? 'Uploading...' : 'Upload complete! Processing...'}
              </div>
            </div>
          </div>
        )}

        {/* ─── Documents Section ──────────────── */}
        <div className="section-header">
          <div>
            <h2 className="section-title">Your Documents</h2>
            <p className="section-subtitle">Upload documents and ask AI-powered questions</p>
          </div>
          {documents.length > 0 && (
            <span className="doc-count">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* ─── Documents Grid / Empty State ───── */}
        {docsLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{
              display: 'inline-block', width: '24px', height: '24px',
              border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%', animation: 'spin 0.6s linear infinite',
            }} />
            <p style={{ marginTop: '12px' }}>Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📂</span>
            <h3>No documents yet</h3>
            <p>Upload your first document above to start analyzing it with AI.</p>
          </div>
        ) : (
          <div className="documents-grid">
            {documents.map((doc) => {
              const typeInfo = getFileTypeInfo(doc.mimeType);
              return (
                <div key={doc.id} className="doc-card">
                  <div className="doc-card-header">
                    <div className={`doc-type-icon ${typeInfo.cssClass}`}>
                      {typeInfo.icon}
                    </div>
                    <div className="doc-card-info">
                      <div className="doc-card-name" title={doc.originalName}>
                        {doc.originalName}
                      </div>
                      <div className="doc-card-meta">
                        <span>📦 {formatFileSize(doc.size)}</span>
                        <span>📅 {formatDate(doc.createdAt)}</span>
                        <span>🏷️ {typeInfo.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="doc-card-footer">
                    <span className={`doc-status ${doc.status}`}>
                      <span className="status-dot" />
                      {doc.status}
                    </span>
                    <div className="doc-card-actions">
                      {doc.status === 'ready' && (
                        <a
                          href={`/document/${doc.id}`}
                          className="doc-chat-btn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          💬 Ask AI
                        </a>
                      )}
                      <button
                        className="doc-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id, doc.originalName);
                        }}
                        title="Delete document"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Toasts ──────────────────────────── */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
