'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface AudioWaveformProps {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    onSeek: (time: number) => void;
    accentColor?: string;
    barCount?: number;
    className?: string;
}

// Generate a deterministic procedural waveform
function generateWaveformData(count: number): number[] {
    const data: number[] = [];
    for (let i = 0; i < count; i++) {
        // Create a natural-looking waveform pattern
        const base = 0.3 + Math.random() * 0.4;
        const wave = Math.sin(i * 0.15) * 0.15;
        const noise = (Math.random() - 0.5) * 0.2;
        data.push(Math.max(0.1, Math.min(1, base + wave + noise)));
    }
    return data;
}

export function AudioWaveform({
    currentTime,
    duration,
    isPlaying,
    onSeek,
    accentColor = '#f59e0b',
    barCount = 100,
    className = '',
}: AudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const waveformData = useRef<number[]>(generateWaveformData(barCount));
    const animationRef = useRef<number | null>(null);
    const [hoverX, setHoverX] = useState<number | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // Resize observer
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            const { width } = entries[0].contentRect;
            const dpr = window.devicePixelRatio || 1;
            setCanvasSize({ width: width * dpr, height: 64 * dpr });

            if (canvasRef.current) {
                canvasRef.current.width = width * dpr;
                canvasRef.current.height = 64 * dpr;
                canvasRef.current.style.width = `${width}px`;
                canvasRef.current.style.height = '64px';
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Draw the waveform
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || canvasSize.width === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width;
        const h = canvas.height;
        const data = waveformData.current;
        const progress = duration > 0 ? currentTime / duration : 0;
        const hoverProgress = hoverX !== null ? hoverX / (w / dpr) : null;

        ctx.clearRect(0, 0, w, h);

        const gap = 2 * dpr;
        const barWidth = Math.max(2, (w - gap * (data.length - 1)) / data.length);
        const maxBarHeight = h * 0.85;

        for (let i = 0; i < data.length; i++) {
            const x = i * (barWidth + gap);
            const barProgress = i / data.length;
            const barH = data[i] * maxBarHeight;
            const y = (h - barH) / 2;

            const isPlayed = barProgress <= progress;
            const isHovered = hoverProgress !== null && barProgress <= hoverProgress;

            if (isPlayed) {
                const grad = ctx.createLinearGradient(x, y, x, y + barH);
                grad.addColorStop(0, accentColor);
                grad.addColorStop(1, adjustColor(accentColor, -30));
                ctx.fillStyle = grad;
                ctx.globalAlpha = 1;
            } else if (isHovered) {
                ctx.fillStyle = accentColor;
                ctx.globalAlpha = 0.35;
            } else {
                ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--p-text-muted').trim() || '#64748b';
                ctx.globalAlpha = 0.3;
            }

            ctx.beginPath();
            const radius = Math.min(barWidth / 2, 3 * dpr);
            roundRect(ctx, x, y, barWidth, barH, radius);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }, [canvasSize, currentTime, duration, hoverX, accentColor]);

    // Animation loop
    useEffect(() => {
        const animate = () => {
            draw();
            animationRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            draw();
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [draw, isPlaying]);

    // Also redraw when not playing but time changes (seeking)
    useEffect(() => {
        if (!isPlaying) draw();
    }, [currentTime, draw, isPlaying]);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || duration <= 0) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = x / rect.width;
        onSeek(Math.max(0, Math.min(duration, progress * duration)));
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        setHoverX(e.clientX - rect.left);
    };

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: '100%', position: 'relative' }}
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
        >
            <canvas
                ref={canvasRef}
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverX(null)}
                style={{ cursor: 'pointer', display: 'block', borderRadius: '8px' }}
            />
        </div>
    );
}

// Helper: round rectangle
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
}

// Helper: darken/lighten hex color
function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
