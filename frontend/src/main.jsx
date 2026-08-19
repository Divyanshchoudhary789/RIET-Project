import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App.jsx';

// ── Top-level error boundary to prevent white-screen crashes ──────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16, padding: 24, background: '#f8fafc', fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0, textAlign: 'center', maxWidth: 400 }}>
            An unexpected error occurred. Please refresh the page. If the problem persists, contact your system administrator.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', background: '#1a2b4a', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: 12,
              borderRadius: 6, maxWidth: 600, overflow: 'auto', margin: 0,
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
