import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ALL_GENRES,
  CATALOG_FORMATS,
  CATALOG_SORTS,
  DEFAULT_SORT,
  type CatalogFilters,
} from '@/lib/catalog-filters';

interface FilterBottomSheetProps {
  open: boolean;
  onClose: () => void;
  initialFilters: CatalogFilters;
  initialSort: string;
  genres: string[];
  onApply: (filters: CatalogFilters, sort: string) => void;
  onClear: () => void;
}

const sectionLabel = 'mb-3 text-xs font-bold uppercase tracking-[0.08em] text-bb-faint';
const pill = (active: boolean) =>
  cn(
    'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus',
    active ? 'border-bb-accent bg-bb-accent-soft text-bb-accent-ink' : 'border-bb-border text-bb-text hover:border-bb-accent/40',
  );

/** Phone filter sheet for the catalogue (format, genre, sort). Drafts until "Show results". */
export function FilterBottomSheet({ open, onClose, initialFilters, initialSort, genres, onApply, onClear }: FilterBottomSheetProps) {
  const [draft, setDraft] = useState<CatalogFilters>(initialFilters);
  const [sort, setSort] = useState(initialSort);

  // Reset the draft each time the sheet opens so a cancelled edit doesn't linger
  useEffect(() => {
    if (open) {
      setDraft(initialFilters);
      setSort(initialSort);
    }
  }, [open, initialFilters, initialSort]);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Filters"
      footer={
        <>
          <Button size="lg" onClick={() => { onApply(draft, sort); onClose(); }}>
            Show results
          </Button>
          <Button size="lg" variant="ghost" onClick={() => { onClear(); onClose(); }}>
            Clear all
          </Button>
        </>
      }
    >
      <div className="space-y-6 py-2">
        <section>
          <h4 className={sectionLabel}>Format</h4>
          <div className="flex flex-wrap gap-2">
            {CATALOG_FORMATS.map((f) => (
              <button
                key={f.label}
                type="button"
                aria-pressed={draft.format === f.value}
                className={pill(draft.format === f.value)}
                onClick={() => setDraft((p) => ({ ...p, format: f.value }))}
              >
                <Icon name={f.icon} size={16} />
                {f.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className={sectionLabel}>Genre</h4>
          <Select
            value={draft.category ?? ALL_GENRES}
            onValueChange={(v) => setDraft((p) => ({ ...p, category: v === ALL_GENRES ? null : v }))}
          >
            <SelectTrigger aria-label="Genre">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {genres.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section>
          <h4 className={sectionLabel}>Sort by</h4>
          <div className="grid grid-cols-2 gap-2">
            {CATALOG_SORTS.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={(sort || DEFAULT_SORT) === s.value}
                className={cn(pill((sort || DEFAULT_SORT) === s.value), 'rounded-bb-md')}
                onClick={() => setSort(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
