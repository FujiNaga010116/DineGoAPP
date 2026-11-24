import React, { useMemo } from 'react';
import { QrCode, ShieldCheck, Check } from 'lucide-react';

interface MockCateringQrCodeProps {
  amount: number;
  bookingCode: string;
  accountNo?: string;
  accountName?: string;
  bankName?: string;
  size?: number;
}

/**
 * Deterministic pseudo-random SVG QR Code generator.
 * Produces an ultra-crisp, realistic 29x29 VietQR pattern with proper finder patterns,
 * timing tracks, alignment markers and center logo badge.
 * 100% vector SVG, completely offline, instant 0ms render.
 */
export const MockCateringQrCode: React.FC<MockCateringQrCodeProps> = ({
  amount,
  bookingCode,
  accountNo = '0901000002',
  accountName = 'NHÀ HÀNG DINEGO CATERING',
  bankName = 'MB Bank',
  size = 220,
}) => {
  // Generate deterministic pseudo-random module matrix (29x29 QR version 3)
  const matrix = useMemo(() => {
    const N = 29;
    const grid: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

    // Helper: mark 7x7 finder pattern
    const drawFinder = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 || // outer 7x7
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)      // inner 3x3
          ) {
            grid[row + r][col + c] = true;
          }
        }
      }
    };

    // Draw 3 primary position finders
    drawFinder(0, 0);       // Top-Left
    drawFinder(0, N - 7);   // Top-Right
    drawFinder(N - 7, 0);   // Bottom-Left

    // Draw alignment pattern at (20, 20)
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2)) {
          grid[20 + r][20 + c] = true;
        }
      }
    }

    // Timing patterns
    for (let i = 8; i < N - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Seed hash based on bookingCode + amount
    const seedStr = `${bookingCode}-${amount}-${accountNo}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = ((hash << 5) - hash + seedStr.charCodeAt(i)) | 0;
    }

    // Pseudo-random fill remaining data areas (excluding finders, center badge, timing)
    const isReserved = (r: number, c: number) => {
      if (r < 9 && c < 9) return true;
      if (r < 9 && c >= N - 8) return true;
      if (r >= N - 8 && c < 9) return true;
      if (r >= 19 && r <= 25 && c >= 19 && c <= 25) return true; // alignment
      if (r === 6 || c === 6) return true; // timing
      if (r >= 12 && r <= 16 && c >= 12 && c <= 16) return true; // center logo
      return false;
    };

    let rng = Math.abs(hash);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!isReserved(r, c)) {
          rng = (rng * 1664525 + 1013904223) % 4294967296;
          grid[r][c] = rng % 100 < 48; // ~48% density
        }
      }
    }

    return grid;
  }, [bookingCode, amount, accountNo]);

  const N = matrix.length;
  const cellSize = 10;
  const svgDimension = N * cellSize;

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '12px 14px 14px 14px',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
        maxWidth: size + 36,
        width: '100%',
        margin: '0 auto',
      }}
    >
      {/* VietQR Header Bar */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1.5px solid #F1F5F9',
          paddingBottom: 8,
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              background: '#0054A6',
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: '0.72rem',
              padding: '2px 6px',
              borderRadius: 4,
              letterSpacing: 0.5,
            }}
          >
            MB
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>MBBank</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.7rem',
            fontWeight: 800,
            color: '#E11D48',
          }}
        >
          <span style={{ background: '#FFF1F2', padding: '2px 6px', borderRadius: 4 }}>
            VietQR / NAPAS 247
          </span>
        </div>
      </div>

      {/* SVG Vector QR Code Canvas */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          background: '#FFFFFF',
          borderRadius: 10,
          padding: 6,
          boxShadow: 'inset 0 0 0 1px #E2E8F0',
        }}
      >
        <svg
          viewBox={`0 0 ${svgDimension} ${svgDimension}`}
          width="100%"
          height="100%"
          shapeRendering="crispEdges"
          style={{ display: 'block' }}
        >
          {matrix.map((row, r) =>
            row.map((active, c) =>
              active ? (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#0F172A"
                />
              ) : null,
            ),
          )}
        </svg>

        {/* Center Badge Logo */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: size * 0.22,
            height: size * 0.22,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00B14F, #059669)',
            border: '3px solid #FFFFFF',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: size * 0.08,
          }}
        >
          <QrCode size={size * 0.12} strokeWidth={2.5} />
        </div>
      </div>

      {/* Footer Info inside Card */}
      <div
        style={{
          width: '100%',
          marginTop: 10,
          textAlign: 'center',
          fontSize: '0.72rem',
          color: '#475569',
          borderTop: '1px dashed #E2E8F0',
          paddingTop: 8,
        }}
      >
        <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.8rem' }}>
          {amount.toLocaleString('vi-VN')} đ
        </div>
        <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 2 }}>
          Nội dung: <strong style={{ color: '#D97706' }}>COC {bookingCode}</strong>
        </div>
      </div>
    </div>
  );
};
