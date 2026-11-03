// ==============================================================================
// DineGo Frontend — Global Error Boundary Component
// ==============================================================================

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DineGo ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0e17',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 540,
              width: '100%',
              background: '#111726',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <AlertTriangle size={36} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: '#fff' }}>
              Đã xảy ra lỗi giao diện hiển thị
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: 20, lineHeight: 1.6 }}>
              Dữ liệu bộ nhớ tạm (cache/localStorage) có thể đang không tương thích với phiên bản mới.
            </p>

            {this.state.error && (
              <pre
                style={{
                  background: '#0a0e17',
                  padding: 14,
                  borderRadius: 10,
                  fontSize: '0.78rem',
                  color: '#ef4444',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: 24,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #FF5722 0%, #FF7043 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RefreshCw size={18} /> Đặt lại dữ liệu & Tải lại ứng dụng
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
