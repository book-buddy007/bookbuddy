'use client';
import { useState, useEffect, useCallback } from 'react';

interface DynamicWatermarkProps {
  userName: string | null;
  userEmail: string;
  userId?: string;
}

/**
 * DynamicWatermark — Anti-piracy overlay for reader shells.
 *
 * Renders a SINGLE semi-transparent watermark label containing the user's
 * identity. The label randomly repositions itself every 7 seconds with a
 * smooth fade transition, so that screenshots always capture it somewhere
 * on the page but it never stays in one spot long enough to be easily
 * cropped or masked out.
 *
 * Design decisions:
 *  • `pointer-events: none` — won't intercept scroll, click, or selection.
 *  • `z-index: 9999`        — sits above canvases but below modals.
 *  • 8% opacity              — visible on screenshots, unobtrusive during reading.
 *  • Single label            — clean look, no grid spam.
 *  • Random reposition       — defeats static-crop removal attempts.
 */
export function DynamicWatermark({ userName, userEmail, userId }: DynamicWatermarkProps) {
  const displayName = userName || userEmail.split('@')[0];
  const label = userId
    ? `${displayName} • ${userEmail} • ${userId}`
    : `${displayName} • ${userEmail}`;

  // Random position state (percentages)
  const getRandomPosition = useCallback(() => ({
    top: 10 + Math.random() * 70,   // 10% – 80% (avoids edges)
    left: 5 + Math.random() * 60,   // 5% – 65% (avoids overflow)
    rotate: -25 + Math.random() * 15, // -25° to -10°
  }), []);

  const [position, setPosition] = useState(getRandomPosition);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out, reposition, then fade back in
      setVisible(false);
      setTimeout(() => {
        setPosition(getRandomPosition());
        setVisible(true);
      }, 600); // 600ms fade-out before repositioning
    }, 7000); // Every 7 seconds

    return () => clearInterval(interval);
  }, [getRandomPosition]);

  return (
    <div
      aria-hidden="true"
      data-testid="dynamic-watermark"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: `${position.top}%`,
          left: `${position.left}%`,
          whiteSpace: 'nowrap',
          fontSize: '15px',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'rgba(0, 0, 0, 0.08)',
          transform: `rotate(${position.rotate}deg)`,
          transition: 'opacity 0.6s ease, top 0.8s ease, left 0.8s ease, transform 0.8s ease',
          opacity: visible ? 1 : 0,
        }}
      >
        {label}
      </span>
    </div>
  );
}
