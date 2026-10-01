export interface Chapter {
  id: string;
  title: string;
  startTime: number;
  duration: number;
}

export interface BookmarkType {
  id: string;
  time: number;
  note: string;
  chapter: string;
  createdAt: string;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface AudiobookMetadata {
  id: string;
  title: string;
  author: string;
  narrator: string;
  coverUrl: string;
  audioUrl?: string;
  duration: number;
  progress?: number;
  chapters: Chapter[];
  bookmarks?: BookmarkType[];
  transcript?: TranscriptSegment[];
  genres?: string[];
  isProtected?: boolean;
  isFavorite?: boolean;
  hasTranscript?: boolean;
  simulationMode?: boolean;
  description?: string;
  publishedYear?: number;
  publisher?: string;
  language?: string;
  isbn?: string;
}

export type PlaybackSpeed = 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export type SleepTimerDuration = number | null;

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackSpeed: PlaybackSpeed;
  sleepTimer: {
    duration: SleepTimerDuration;
    remainingTime: number | null;
  };
  activeChapter: Chapter | null;
  isTranscriptVisible: boolean;
  isAutoScrollEnabled: boolean;
  isBookmarksVisible: boolean;
  isChaptersVisible: boolean;
  isSettingsVisible: boolean;
} 