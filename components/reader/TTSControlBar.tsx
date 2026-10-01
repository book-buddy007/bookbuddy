'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Settings, 
  SkipForward, 
  SkipBack,
  X,
} from "@/components/ui/icons";
import { useTextToSpeech } from "@/lib/hooks/useTextToSpeech";
import { cn } from "@/lib/utils";

interface TTSControlBarProps {
  /** Text to speak when the bar's own play button is pressed (optional — 
   *  if the speech was already started externally, leave empty) */
  text?: string;
  /** Called when user hits Stop / X. Parent should set `stopReading()` */
  onClose?: () => void;
  className?: string;
  /** Optionally inject a shared TTS instance so state is in sync with parent.
   *  If omitted the bar creates its own instance (legacy behaviour). */
  ttsInstance?: ReturnType<typeof useTextToSpeech>;
}

export function TTSControlBar({ text = '', onClose, className, ttsInstance }: TTSControlBarProps) {
  // If the caller passed a shared instance, use it. Otherwise fall back to a local one.
  const localTts = useTextToSpeech();
  const tts = ttsInstance ?? localTts;

  const {
    voices,
    state,
    options,
    speak,
    pause,
    resume,
    stop,
    togglePlayPause,
    updateOptions,
    skipSentence,
  } = tts;

  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);

  // Update selected voice when voices load
  useEffect(() => {
    if (voices.length > 0 && options.voice) {
      const index = voices.findIndex(v => v.name === options.voice?.name);
      if (index !== -1) {
        setSelectedVoiceIndex(index);
      }
    }
  }, [voices, options.voice]);

  const handleVoiceChange = (value: string) => {
    const index = parseInt(value);
    setSelectedVoiceIndex(index);
    updateOptions({ voice: voices[index] });
  };

  const handleRateChange = (value: number[]) => {
    updateOptions({ rate: value[0] });
  };

  const handlePitchChange = (value: number[]) => {
    updateOptions({ pitch: value[0] });
  };

  const handleVolumeChange = (value: number[]) => {
    updateOptions({ volume: value[0] });
  };

  const handlePlayPause = () => {
    if (!state.isPlaying && !state.isPaused) {
      // Only speak if we have text and nothing is already playing
      if (text) speak(text);
    } else {
      togglePlayPause();
    }
  };

  const handleStop = () => {
    stop();
    onClose?.();
  };

  return (
    <div 
      className={cn(
        "z-50 transition-all duration-300",
        className
      )}
    >
      <div className="bg-[var(--night-ink)]/95 backdrop-blur-lg border border-[var(--gold)]/15 rounded-full shadow-[0_8px_32px_rgba(10,15,30,0.55)]">
        {/* Compact Controls */}
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3">
          {/* Skip Back */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => skipSentence('backward')}
            disabled={!state.isPlaying}
            className="h-10 w-10 hit-target rounded-full hover:bg-white/[0.06] hover:text-[var(--accent-primary-dark)] transition-all duration-300 disabled:opacity-30"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause Button */}
          <Button
            size="icon"
            onClick={handlePlayPause}
            className="h-12 w-12 rounded-full bg-[var(--accent-strong)] hover:bg-[var(--accent-contrast)] shadow-[0_8px_30px_rgba(180,83,9,0.35)] hover:scale-105 transition-all duration-300"
          >
            {state.isPlaying && !state.isPaused ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Skip Forward */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => skipSentence('forward')}
            disabled={!state.isPlaying}
            className="h-10 w-10 hit-target rounded-full hover:bg-white/[0.06] hover:text-[var(--accent-primary-dark)] transition-all duration-300 disabled:opacity-30"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="h-8 w-px bg-[var(--gold)]/15" />

          {/* Speed Control */}
          <Select value={options.rate.toString()} onValueChange={(v) => handleRateChange([parseFloat(v)])}>
            <SelectTrigger className="w-20 sm:w-24 h-10 rounded-lg bg-white/[0.06] border-[var(--gold)]/15 hover:bg-white/[0.08] hover:border-[var(--accent-primary-dark)]/60 transition-all duration-300 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--night-ink)]/95 backdrop-blur-lg border-[var(--gold)]/15">
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="0.95">0.95x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="1.75">1.75x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
            </SelectContent>
          </Select>

          {/* Voice Selection — hidden on very small screens */}
          <div className="hidden sm:block">
            <Select value={selectedVoiceIndex.toString()} onValueChange={handleVoiceChange}>
              <SelectTrigger className="w-40 h-9 rounded-lg bg-white/[0.06] border-[var(--gold)]/15 hover:bg-white/[0.08] hover:border-[var(--accent-primary-dark)]/60 transition-all duration-300 text-sm">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--night-ink)]/95 backdrop-blur-lg border-[var(--gold)]/15 max-h-60">
                {voices.map((voice, index) => (
                  <SelectItem key={voice.name} value={index.toString()}>
                    {voice.name} ({voice.lang})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-[var(--gold)]/15" />

          {/* Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 hit-target rounded-full hover:bg-white/[0.06] hover:text-[var(--accent-primary-dark)] transition-all duration-300"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-[var(--night-ink)]/95 backdrop-blur-lg border-[var(--gold)]/15 rounded-lg" side="top">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-200 mb-3 bg-[var(--accent-strong)] text-bb-accent">
                    Voice Settings
                  </h4>
                </div>

                {/* Pitch Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">Pitch</label>
                    <span className="text-xs text-slate-300">{options.pitch.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[options.pitch]}
                    min={0}
                    max={2}
                    step={0.1}
                    onValueChange={handlePitchChange}
                    className="accent-cyan-500"
                  />
                </div>

                {/* Volume Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">Volume</label>
                    <span className="text-xs text-slate-300">{Math.round(options.volume * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {options.volume === 0 ? (
                      <VolumeX className="h-4 w-4 text-slate-300" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-slate-300" />
                    )}
                    <Slider
                      value={[options.volume]}
                      min={0}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="flex-1 accent-cyan-500"
                    />
                  </div>
                </div>

                {/* Progress */}
                {state.isPlaying && (
                  <div className="space-y-2 pt-2 border-t border-[var(--gold)]/15">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-300">Progress</label>
                      <span className="text-xs text-slate-300">{Math.round(state.progress)}%</span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-2">
                      <div 
                        className="bg-[var(--accent-strong)] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${state.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Close Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleStop}
            className="h-10 w-10 hit-target rounded-full hover:bg-white/[0.06] hover:text-red-400 transition-all duration-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
