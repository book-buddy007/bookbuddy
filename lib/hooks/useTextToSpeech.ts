import { useState, useEffect, useCallback, useRef } from 'react';

export interface TTSOptions {
  voice: SpeechSynthesisVoice | null;
  rate: number; // 0.5 to 2.0
  pitch: number; // 0 to 2
  volume: number; // 0 to 1
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentChunkIndex: number;
  totalChunks: number;
  progress: number; // 0 to 100
}

/**
 * Split text into sentence-sized chunks.
 * This is critical because Android Chrome / iOS Safari silently kill
 * utterances longer than ~14 seconds. By feeding sentences one at a time
 * the engine stays alive indefinitely.
 */
function splitIntoChunks(text: string, maxLen = 200): string[] {
  // First split on sentence boundaries
  const sentences = text.split(/(?<=[.!?।\n])\s+/).filter(s => s.trim().length > 0);

  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    // If a single sentence is too long, split it further on commas / semicolons
    if (sentence.length > maxLen) {
      if (buffer) { chunks.push(buffer.trim()); buffer = ''; }
      const subParts = sentence.split(/(?<=[,;:])\s+/);
      let sub = '';
      for (const part of subParts) {
        if ((sub + ' ' + part).length > maxLen && sub) {
          chunks.push(sub.trim());
          sub = part;
        } else {
          sub = sub ? sub + ' ' + part : part;
        }
      }
      if (sub) chunks.push(sub.trim());
      continue;
    }

    if ((buffer + ' ' + sentence).length > maxLen && buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = buffer ? buffer + ' ' + sentence : sentence;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Pick the best available voice, prioritising Indian English.
 * Falls back to any english, then first voice.
 */
function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return (
    voices.find(v => v.lang === 'en-IN') ||
    voices.find(v => v.name.toLowerCase().includes('india')) ||
    voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0]
  );
}

export function useTextToSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    currentChunkIndex: 0,
    totalChunks: 0,
    progress: 0,
  });

  const [options, setOptions] = useState<TTSOptions>({
    voice: null,
    rate: 0.95,
    pitch: 1,
    volume: 1,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunksRef = useRef<string[]>([]);
  const chunkIdxRef = useRef(0);
  const stoppedRef = useRef(false); // flag to prevent chain-speaking after stop
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullTextRef = useRef('');

  // ── Initialise voices ──
  useEffect(() => {
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const available = synth.getVoices();
      if (!available.length) return;
      setVoices(available);
      setOptions(prev => {
        if (prev.voice) return prev;            // already set
        return { ...prev, voice: pickBestVoice(available) };
      });
    };

    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices);
      synth.cancel();
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    };
  }, []);

  // ── Keep-alive ping (Android Chrome pause/resume hack) ──
  const startKeepAlive = useCallback(() => {
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    keepAliveRef.current = setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10_000); // every 10 s — well under the 14 s Android cutoff
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  // ── Speak a single chunk, then chain to the next one ──
  const speakChunk = useCallback((index: number) => {
    if (stoppedRef.current) return;
    if (index >= chunksRef.current.length) {
      // All chunks done
      stopKeepAlive();
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        progress: 100,
      }));
      return;
    }

    const text = chunksRef.current[index];
    const utt = new SpeechSynthesisUtterance(text);
    if (options.voice) utt.voice = options.voice;
    utt.lang = options.voice?.lang || 'en-IN';
    utt.rate = options.rate;
    utt.pitch = options.pitch;
    utt.volume = options.volume;

    chunkIdxRef.current = index;

    utt.onstart = () => {
      setState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        currentChunkIndex: index,
        progress: Math.round((index / chunksRef.current.length) * 100),
      }));
    };

    utt.onend = () => {
      if (stoppedRef.current) return;
      // Chain to next chunk with a slight delay to bypass Chrome speech synthesis queue bugs
      setTimeout(() => speakChunk(index + 1), 10);
    };

    utt.onerror = (evt) => {
      // 'interrupted' is normal when user stops
      if (evt.error === 'interrupted' || evt.error === 'canceled') return;
      console.error('SpeechSynthesis error:', evt.error);
      stopKeepAlive();
      setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
    };

    utt.onpause = () => setState(prev => ({ ...prev, isPaused: true }));
    utt.onresume = () => setState(prev => ({ ...prev, isPaused: false }));

    // Word-level progress within chunk
    utt.onboundary = (evt) => {
      if (evt.name === 'word') {
        // Compute global progress across all chunks
        let charsBeforeChunk = 0;
        for (let i = 0; i < index; i++) charsBeforeChunk += chunksRef.current[i].length;
        const globalChar = charsBeforeChunk + evt.charIndex;
        const totalChars = fullTextRef.current.length || 1;
        setState(prev => ({
          ...prev,
          progress: Math.min(Math.round((globalChar / totalChars) * 100), 100),
        }));
      }
    };

    utteranceRef.current = utt;
    // Prevent garbage collection in Chrome which causes SpeechSynthesis to halt unexpectedly
    if (typeof window !== 'undefined') {
      (window as any).__speeches = (window as any).__speeches || [];
      (window as any).__speeches.push(utt);
      if ((window as any).__speeches.length > 20) {
        (window as any).__speeches.shift(); // keep it small
      }
    }

    window.speechSynthesis.speak(utt);
  }, [options, stopKeepAlive]);

  // ── Public: speak ──
  const speak = useCallback((text: string) => {
    if (!text.trim()) return;

    window.speechSynthesis.cancel();
    stoppedRef.current = false;

    fullTextRef.current = text;
    const chunks = splitIntoChunks(text);
    chunksRef.current = chunks;

    setState({
      isPlaying: true,
      isPaused: false,
      currentChunkIndex: 0,
      totalChunks: chunks.length,
      progress: 0,
    });

    startKeepAlive();
    speakChunk(0);
  }, [speakChunk, startKeepAlive]);

  // ── Public: stop ──
  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    stopKeepAlive();
    setState({
      isPlaying: false,
      isPaused: false,
      currentChunkIndex: 0,
      totalChunks: 0,
      progress: 0,
    });
  }, [stopKeepAlive]);

  // ── Public: pause / resume ──
  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, []);

  // ── Public: togglePlayPause ──
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying && !state.isPaused) {
      pause();
    } else if (state.isPaused) {
      resume();
    }
  }, [state.isPlaying, state.isPaused, pause, resume]);

  // ── Public: skip sentence (chunk) forward / backward ──
  const skipSentence = useCallback((direction: 'forward' | 'backward') => {
    const cur = chunkIdxRef.current;
    const next = direction === 'forward'
      ? Math.min(cur + 1, chunksRef.current.length - 1)
      : Math.max(cur - 1, 0);

    if (next !== cur) {
      window.speechSynthesis.cancel();
      stoppedRef.current = false;
      speakChunk(next);
    }
  }, [speakChunk]);

  // ── Public: updateOptions ──
  const updateOptions = useCallback((newOpts: Partial<TTSOptions>) => {
    setOptions(prev => ({ ...prev, ...newOpts }));

    // If currently speaking, restart from current chunk with new settings
    if (state.isPlaying && chunksRef.current.length > 0) {
      window.speechSynthesis.cancel();
      stoppedRef.current = false;
      // Give the engine a tick to process cancellation before re-speaking
      setTimeout(() => {
        speakChunk(chunkIdxRef.current);
      }, 50);
    }
  }, [state.isPlaying, speakChunk]);

  return {
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

    // Backward compat
    currentWords: [] as string[],
    currentSentences: chunksRef.current,
  };
}
