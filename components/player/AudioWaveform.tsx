'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface AudioWaveformProps {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    onSeek: (time: number) => void;
    /** Colour of the bars that have not been played yet. */
    trackColor?: string;
    barCount?: number;
    /** Sized by CSS (height on this element); the canvas fills it. */
    className?: string;
}

// Procedural waveform shape, generated once per mount.
function generateWaveformData(count: number): number[] {
    const data: number[] = [];
    for (let i = 0; i < count; i++) {
        const base = 0.3 + Math.random() * 0.4;
        const wave = Math.sin(i * 0.15) * 0.15;
        const noise = (Math.random() - 0.5) * 0.2;
        data.push(Math.max(0.1, Math.min(1, base + wave + noise)));
    }
    return data;
}

// Design system: centred bars, radius 3, gap 3, played = peach→blaze vertical gradient.
const GAP = 3;
const RADIUS = 3;
const PLAYED_TOP = '#FFC58A';
const PLAYED_BOTTOM = '#FF5A0F';

/** Seekable waveform scrubber: click, drag or use the arrow keys. */
export function AudioWaveform({
    currentTime,
    duration,
    isPlaying,
    onSeek,
    trackColor = 'rgba(255,255,255,0.18)',
    barCount = 72,
    className = '',
}: AudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const waveformData = useRef<number[]>(generateWaveformData(barCount));
    const dragging = useRef(false);
    const [size, setSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            const dpr = window.devicePixelRatio || 1;
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = Math.round(width * dpr);
                canvas.height = Math.round(height * dpr);
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
            }
            setSize({ w: width, h: height });
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || size.w === 0 || size.h === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width;
        const h = canvas.height;
        const data = waveformData.current;
        const progress = duration > 0 ? currentTime / duration : 0;
        const gap = GAP * dpr;
        const barW = Math.max(2 * dpr, (w - gap * (data.length - 1)) / data.length);
        const maxH = h * 0.92;

        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < data.length; i++) {
            const x = i * (barW + gap);
            const barH = Math.max(4 * dpr, data[i] * maxH);
            const y = (h - barH) / 2;
            if (i / data.length <= progress) {
                const g = ctx.createLinearGradient(0, y, 0, y + barH);
                g.addColorStop(0, PLAYED_TOP);
                g.addColorStop(1, PLAYED_BOTTOM);
                ctx.fillStyle = g;
            } else {
                ctx.fillStyle = trackColor;
            }
            ctx.beginPath();
            const r = Math.min(barW / 2, RADIUS * dpr);
            ctx.roundRect(x, y, barW, barH, r);
            ctx.fill();
        }
    }, [size, currentTime, duration, trackColor]);

    // Redraw on every time/size change; no animation loop is needed (the playhead moves with timeupdate).
    useEffect(() => {
        draw();
    }, [draw, isPlaying]);

    const seekFromEvent = (clientX: number) => {
        const canvas = canvasRef.current;
        if (!canvas || duration <= 0) return;
        const rect = canvas.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        onSeek(p * duration);
    };

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: '100%', position: 'relative', touchAction: 'none' }}
            role="slider"
            aria-label="Audio progress"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 10));
                if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 10));
            }}
            onPointerDown={(e) => {
                dragging.current = true;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                seekFromEvent(e.clientX);
            }}
            onPointerMove={(e) => {
                if (dragging.current) seekFromEvent(e.clientX);
            }}
            onPointerUp={() => {
                dragging.current = false;
            }}
            onPointerCancel={() => {
                dragging.current = false;
            }}
        >
            <canvas ref={canvasRef} style={{ cursor: 'pointer', display: 'block' }} />
        </div>
    );
}
