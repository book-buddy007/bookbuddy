import { useState,useEffect } from 'react';
import { useDebounce } from './useDebounce';

interface Page {
    number: number;
    content: string;
}

export interface SearchResult {
    pageIndex: number;
    charStart: number;
    charEnd: number;
    preview: string;
    chapterTitle: string;
}

/**
 * Hook to perform in-memory full-text search across book pages
 * @param pages The array of book pages
 * @param query The search query string
 * @returns Array of SearchResult objects
 */
export function useBookSearch(pages: Page[], query: string, bookId?: string) {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.trim().length < 2) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        // If book is large (>500 pages) and bookId is provided, use backend search
        if (bookId && pages && pages.length > 500) {
            const fetchServerSearch = async () => {
                try {
                    const response = await fetch(`/api/reader/books/${bookId}/search?q=${encodeURIComponent(debouncedQuery)}`);
                    if (response.ok) {
                        const data = await response.json();
                        setResults(data);
                    } else {
                        // Fallback to empty if server fails
                        setResults([]);
                    }
                } catch (e) {
                    console.error('Server search failed', e);
                    setResults([]);
                } finally {
                    setIsSearching(false);
                }
            };
            fetchServerSearch();
            return;
        }

        // In-memory fallback
        if (!pages || pages.length === 0) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        const timer = setTimeout(() => {
            const searchResults: SearchResult[] = [];
            const lowerQuery = debouncedQuery.toLowerCase();
            const queryLength = lowerQuery.length;
            let currentChapterTitle = 'Start of Book';

            const MAX_RESULTS = 200;

            for (let pIndex = 0; pIndex < pages.length; pIndex++) {
                if (searchResults.length >= MAX_RESULTS) break;

                const page = pages[pIndex];
                const content = page.content;
                const lowerContent = content.toLowerCase();

                const firstLine = content.split('\n')[0].trim();
                if (firstLine.length > 0 && firstLine.length < 100) {
                    currentChapterTitle = firstLine;
                }

                let startIndex = 0;
                let index;

                while ((index = lowerContent.indexOf(lowerQuery, startIndex)) > -1) {
                    if (searchResults.length >= MAX_RESULTS) break;

                    const previewStart = Math.max(0, index - 30);
                    const previewEnd = Math.min(content.length, index + queryLength + 30);

                    let preview = content.substring(previewStart, previewEnd);

                    if (previewStart > 0) preview = '...' + preview;
                    if (previewEnd < content.length) preview = preview + '...';

                    searchResults.push({
                        pageIndex: page.number,
                        charStart: index,
                        charEnd: index + queryLength,
                        preview,
                        chapterTitle: currentChapterTitle
                    });

                    startIndex = index + queryLength;
                }
            }

            setResults(searchResults);
            setIsSearching(false);
        }, 10);

        return () => clearTimeout(timer);
    }, [debouncedQuery, pages, bookId]);

    return { results, isSearching };
}
