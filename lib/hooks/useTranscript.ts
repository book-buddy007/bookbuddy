import { useState, useEffect, useRef } from 'react';
import { TranscriptSegment } from '@/types/audiobook';

export function useTranscript(
  transcript: TranscriptSegment[],
  currentTime: number,
  isAutoScrollEnabled: boolean
) {
  const [activeSegment, setActiveSegment] = useState<TranscriptSegment | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Find the active segment based on current time
  useEffect(() => {
    const segment = transcript.find(
      segment => currentTime >= segment.start && currentTime <= segment.end
    );
    setActiveSegment(segment || null);
  }, [currentTime, transcript]);

  // Handle auto-scrolling
  useEffect(() => {
    if (!isAutoScrollEnabled || !transcriptRef.current || !activeSegment) return;

    const container = transcriptRef.current;
    const activeElement = container.querySelector(`[data-segment-id="${activeSegment.id}"]`);
    
    if (activeElement) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();
      
      // Check if the element is outside the visible area
      if (
        elementRect.top < containerRect.top ||
        elementRect.bottom > containerRect.bottom
      ) {
        // Smooth scroll to the element
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeSegment, isAutoScrollEnabled]);

  // Highlight text based on current time
  const highlightText = (text: string, start: number, end: number) => {
    if (currentTime < start || currentTime > end) return text;

    const progress = (currentTime - start) / (end - start);
    const words = text.split(' ');
    const wordCount = words.length;
    const activeWordIndex = Math.floor(progress * wordCount);

    return words.map((word, index) => {
      if (index === activeWordIndex) {
        return `<span class="text-blue-600 dark:text-blue-400 font-medium">${word}</span>`;
      }
      return word;
    }).join(' ');
  };

  return {
    activeSegment,
    transcriptRef,
    highlightText,
  };
} 