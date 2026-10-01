'use client';

import { useEffect, useRef, useState } from 'react';
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { cn } from '@/lib/utils';
import { PlaybackSpeed } from '@/types/audiobook';

interface FloatingAudioPlayerProps {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  coverUrl: string;
  audioUrl: string;
  chapters?: Array<{ id: string; title: string; startTime: number; duration: number }>;
  onClose: () => void;
}

export function FloatingAudioPlayer({
  bookId,
  bookTitle,
  bookAuthor,
  coverUrl,
  audioUrl,
  chapters = [],
  onClose,
}: FloatingAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startLeft: number; startTop: number }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
  });

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Position state
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: window.innerHeight - 200 });

  // Load saved state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(`floating_audio_${bookId}`);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setCurrentTime(parsed.currentTime || 0);
          setVolume(parsed.volume || 1);
          setPlaybackSpeed(parsed.playbackSpeed || 1);
          setIsMinimized(parsed.isMinimized || false);
        } catch (error) {
          console.error('Failed to parse saved audio state:', error);
        }
      }
    }
  }, [bookId]);

  // Save state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stateToSave = {
        currentTime,
        volume,
        playbackSpeed,
        isMinimized,
        lastPlayedAt: new Date().toISOString(),
      };
      localStorage.setItem(`floating_audio_${bookId}`, JSON.stringify(stateToSave));
    }
  }, [currentTime, volume, playbackSpeed, isMinimized, bookId]);

  // Audio event handlers
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setError('Failed to load audio');
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Playback controls
  const handlePlayPause = async () => {
    if (!audioRef.current || isLoading) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Playback error:', error);
      setError('Failed to play audio');
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleSpeedChange = () => {
    if (!audioRef.current) return;
    const speeds: PlaybackSpeed[] = [0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!playerRef.current) return;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: position.x,
      startTop: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 350, dragRef.current.startLeft + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.startTop + deltaY)),
      });
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position]);

  return (
    <>
      <div
        ref={playerRef}
        className={cn(
          "fixed z-50 transition-all duration-300",
          isMinimized ? "w-80" : "w-96"
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Glassmorphic Container */}
        <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-slate-700/50 rounded-lg shadow-[0_16px_48px_rgba(15,23,42,0.8)] overflow-hidden">
          {/* Drag Handle */}
          <div
            className="flex items-center justify-between p-3 bg-slate-800/60 cursor-move border-b border-slate-700/50"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">Audiobook Player</span>
            </div>
            <div className="flex items-center gap-1">
              <EnhancedButton
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-7 w-7 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
              >
                {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </EnhancedButton>
              <EnhancedButton
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </EnhancedButton>
            </div>
          </div>

          {/* Player Content */}
          {!isMinimized && (
            <div className="p-4 space-y-4">
              {/* Book Info */}
              <div className="flex items-center gap-3">
                <img
                  src={coverUrl}
                  alt={bookTitle}
                  className="w-16 h-16 rounded-md object-cover border-2 border-slate-700/50 shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-200 truncate">{bookTitle}</h3>
                  <p className="text-xs text-slate-400 truncate">{bookAuthor}</p>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded-md border border-red-800/30">
                  {error}
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-1">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-3">
                <EnhancedButton
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSkip(-15)}
                  className="h-10 w-10 rounded-full border border-slate-600 hover:border-slate-500 bg-slate-800/60 hover:bg-slate-700/80 text-slate-300"
                  disabled={isLoading}
                >
                  <Rewind className="h-4 w-4" />
                </EnhancedButton>

                <EnhancedButton
                  size="icon"
                  onClick={handlePlayPause}
                  className="h-12 w-12 rounded-full bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 shadow-lg"
                  disabled={isLoading}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </EnhancedButton>

                <EnhancedButton
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSkip(15)}
                  className="h-10 w-10 rounded-full border border-slate-600 hover:border-slate-500 bg-slate-800/60 hover:bg-slate-700/80 text-slate-300"
                  disabled={isLoading}
                >
                  <FastForward className="h-4 w-4" />
                </EnhancedButton>
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-between gap-3">
                {/* Volume Control */}
                <div className="flex items-center gap-2 flex-1">
                  <EnhancedButton
                    variant="ghost"
                    size="icon"
                    onClick={handleMuteToggle}
                    className="h-8 w-8 rounded-md hover:bg-slate-700/50 text-slate-400"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </EnhancedButton>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="flex-1 cursor-pointer"
                  />
                </div>

                {/* Speed Control */}
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={handleSpeedChange}
                  className="h-8 px-3 rounded-md hover:bg-slate-700/50 text-slate-300 text-xs font-medium"
                >
                  {playbackSpeed}x
                </EnhancedButton>
              </div>
            </div>
          )}

          {/* Minimized View */}
          {isMinimized && (
            <div className="p-3 flex items-center gap-3">
              <EnhancedButton
                size="icon"
                onClick={handlePlayPause}
                className="h-10 w-10 rounded-full bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400"
                disabled={isLoading}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </EnhancedButton>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{bookTitle}</p>
                <p className="text-xs text-slate-400">{formatTime(currentTime)} / {formatTime(duration)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
    </>
  );
}

