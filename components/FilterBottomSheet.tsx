import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FilterOptions {
  categories: string[];
  languages: string[];
  formats: string[];
  availability: string[];
  minRating: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  yearRange: [number, number];
  minPages: number;
  maxPages: number;
  sort?: string;
}

interface FilterBottomSheetProps {
  open: boolean;
  onClose: () => void;
  initialFilters: FilterOptions;
  genres: string[];
  onApply: (filters: FilterOptions) => void;
  onClear: () => void;
}

const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'author-asc', label: 'Author A-Z' },
  { value: 'author-desc', label: 'Author Z-A' },
  { value: 'rating-desc', label: 'Rating ↓' },
  { value: 'rating-asc', label: 'Rating ↑' },
];

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All Formats' },
  { value: 'ebook', label: 'E-Book' },
  { value: 'audiobook', label: 'Audiobook' },
  { value: 'physical', label: 'Physical' },
  { value: 'PDF', label: 'PDF' },
];

export function FilterBottomSheet({ open, onClose, initialFilters, genres, onApply, onClear }: FilterBottomSheetProps) {
  const [draftFilters, setDraftFilters] = useState<FilterOptions>(initialFilters);

  // Reset draft on open so stale state doesn't persist
  useEffect(() => {
    if (open) {
      setDraftFilters(initialFilters);
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open, initialFilters]);

  // Backdrop tap → cancel (restore, don't apply)
  const handleBackdropClick = () => {
    setDraftFilters(initialFilters);
    onClose();
  };

  const handleApply = () => {
    onApply(draftFilters);
    onClose();
  };

  const currentFormat = draftFilters.formats.length === 0 ? 'all' : draftFilters.formats[0];
  const currentGenre = draftFilters.categories.length === 0 ? 'All Genres' : draftFilters.categories[0];
  const currentSort = draftFilters.sort || 'title-asc';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm cursor-pointer"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Filter options"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0F1E] border-t border-white/10 rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 flex-shrink-0 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b border-white/10">
              <h3 className="font-semibold text-white">Filters</h3>
              <button onClick={handleBackdropClick} className="text-white/40 hover:text-white/80 p-2 -mr-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter sections */}
            <div className="overflow-y-auto max-h-[70vh] px-5 py-4 space-y-6">
              
              {/* Format */}
              <section>
                <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Format
                </h4>
                <div className="flex flex-wrap gap-2">
                  {FORMAT_OPTIONS.map(f => {
                    const isActive = currentFormat === f.value;
                    return (
                      <button
                        key={f.value}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[var(--peacock-teal)]/20 border-[var(--peacock-teal)] text-[var(--peacock-teal)]'
                            : 'border-white/10 text-white/60 hover:text-white hover:border-white/20'
                        }`}
                        onClick={() => {
                          setDraftFilters(p => ({
                            ...p,
                            formats: f.value === 'all' ? [] : [f.value]
                          }));
                        }}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Genre */}
              <section>
                <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Genre
                </h4>
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-[var(--peacock-teal)]"
                  value={currentGenre}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftFilters(p => ({
                      ...p,
                      categories: val === 'All Genres' ? [] : [val]
                    }));
                  }}
                >
                  {genres.map(g => <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>)}
                </select>
              </section>

              {/* Sort By */}
              <section>
                <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Sort By
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map(s => {
                    const isActive = currentSort === s.value;
                    return (
                      <button
                        key={s.value}
                        className={`min-h-[56px] px-3 py-2 rounded-xl border text-sm font-medium text-center leading-tight transition-colors ${
                          isActive
                            ? 'bg-[var(--deep-saffron)]/20 border-[var(--deep-saffron)] text-[var(--deep-saffron)]'
                            : 'border-white/10 text-white/60 hover:text-white hover:border-white/20'
                        }`}
                        onClick={() => setDraftFilters(p => ({ ...p, sort: s.value }))}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>

            {/* Sticky footer CTAs */}
            <div className="flex gap-3 px-5 py-4 border-t border-white/10">
              <button
                onClick={onClear}
                className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleApply}
                className="flex-[2] px-8 py-3 rounded-xl bg-[var(--deep-saffron)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Show Results
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
