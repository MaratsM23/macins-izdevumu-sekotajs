
import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            gap: '16px',
            padding: '24px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '40px' }}>⚠</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Kaut kas nogāja greizi
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Lūdzu atsvaidzini lapu
          </p>
          {this.state.error && (
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0, maxWidth: '320px', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px',
              padding: '12px 28px',
              borderRadius: '14px',
              border: '1px solid var(--border-accent)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--accent-primary)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Atsvaidzināt
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
