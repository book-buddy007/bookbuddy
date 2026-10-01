import { useEffect, useRef } from 'react';
import { useReaderStore } from '@/store/useReaderStore';

/**
 * Hook to track reading progress and time spent per page.
 * Calculates reading speed and updates the reader store.
 */
export function useReadingProgress() {
    const { currentPage, updateSessionPageSeconds, sessionStartTime, setSessionStartTime } = useReaderStore();
    const lastUpdateRef = useRef<number>(Date.now());
    const isActiveRef = useRef<boolean>(true);

    // Handle visibility and focus changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            isActiveRef.current = document.visibilityState === 'visible';
            if (isActiveRef.current) {
                lastUpdateRef.current = Date.now();
            }
        };

        const handleFocus = () => {
            isActiveRef.current = true;
            lastUpdateRef.current = Date.now();
        };

        const handleBlur = () => {
            isActiveRef.current = false;
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // Main tracking interval
    useEffect(() => {
        // Initialize session if needed
        if (!sessionStartTime) {
            setSessionStartTime(Date.now());
        }

        // Reset last update when page changes
        lastUpdateRef.current = Date.now();

        const intervalId = setInterval(() => {
            if (isActiveRef.current) {
                const now = Date.now();
                const deltaSeconds = Math.floor((now - lastUpdateRef.current) / 1000);

                if (deltaSeconds >= 1) { // Apply every 1+ seconds passed
                    updateSessionPageSeconds(currentPage, deltaSeconds);
                    lastUpdateRef.current = now;
                }
            }
        }, 5000); // Check every 5 seconds to reduce state updates

        // Force an update on unmount or page change
        return () => {
            clearInterval(intervalId);
            if (isActiveRef.current) {
                const now = Date.now();
                const deltaSeconds = Math.floor((now - lastUpdateRef.current) / 1000);
                if (deltaSeconds > 0) {
                    updateSessionPageSeconds(currentPage, deltaSeconds);
                }
            }
        };
    }, [currentPage, updateSessionPageSeconds, sessionStartTime, setSessionStartTime]);

    return null;
}
