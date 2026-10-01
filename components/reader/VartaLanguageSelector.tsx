import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Languages, ChevronDown, Check } from 'lucide-react';

/**
 * Which language Varta answers in. Two choices, English and Hindi — there is
 * deliberately no "match my question" / auto option any more.
 *
 * Auto was the default, and it meant the model was never told which language to
 * write in; it inferred one from the input. That inference is wrong often enough
 * to matter — the same unnamed-target instruction in the quiz generator produced
 * a full quiz in ITALIAN from an English anatomy page. A student who wants their
 * Hindi questions answered in Hindi picks Hindi here; the setting is remembered.
 *
 * The value is persisted server-side in User.metadata via
 * `/api/students/me/preferences`, so it self-loads and follows the student
 * across devices. The component owns its own fetch/save; the parent only needs
 * to mount it.
 */

export type AnswerLanguage = 'en' | 'hi';

interface LanguageOption {
  id: AnswerLanguage;
  title: string;
  description: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'en', title: 'English', description: 'Always answer in English' },
  { id: 'hi', title: 'हिन्दी', description: 'Always answer in Hindi (हिन्दी में उत्तर)' },
];

/** Short label for the collapsed pill — the full titles are too wide for it. */
const PILL_LABEL: Record<AnswerLanguage, string> = {
  en: 'English',
  hi: 'हिन्दी',
};

interface VartaLanguageSelectorProps {
  disabled?: boolean;
}

export function VartaLanguageSelector({ disabled = false }: VartaLanguageSelectorProps) {
  const [value, setValue] = React.useState<AnswerLanguage>('en');
  // Until the saved value has loaded, don't let a change fire (and don't flash a
  // wrong active state). Failure to load is non-fatal — it just leaves English.
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/students/me/preferences', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          // A stored 'auto' from before this setting closed to two languages
          // is ignored here and read back as 'en' by the server's coercion.
          if (!cancelled && (data?.answerLanguage === 'en' || data?.answerLanguage === 'hi')) {
            setValue(data.answerLanguage);
          }
        }
      } catch {
        /* non-fatal — the English default stands */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = LANGUAGE_OPTIONS.find((o) => o.id === value) ?? LANGUAGE_OPTIONS[0];

  const choose = async (next: AnswerLanguage) => {
    if (next === value) return;
    const previous = value;
    setValue(next); // optimistic — the control should feel instant
    setSaving(true);
    try {
      const res = await fetch('/api/students/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerLanguage: next }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
    } catch {
      setValue(previous); // roll back so the UI never lies about what was saved
    } finally {
      setSaving(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || !loaded || saving}>
        <button
          type="button"
          disabled={disabled || !loaded || saving}
          aria-label={`Answer language: ${active.title}. Change language.`}
          className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-primary)]/30 bg-white/70 py-1 pl-2 pr-2 text-[11px] font-semibold text-[var(--accent-contrast)] transition-colors hover:border-[var(--accent-strong)] disabled:opacity-50 dark:border-[var(--gold)]/20 dark:bg-slate-900/60 dark:text-[var(--accent-primary-dark)]"
        >
          <Languages className="h-3.5 w-3.5 opacity-80" />
          {PILL_LABEL[active.id]}
          <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={6} className="w-[16rem] p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Answer language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGE_OPTIONS.map((o) => {
          const isActive = o.id === active.id;
          return (
            <DropdownMenuItem
              key={o.id}
              onSelect={() => {
                if (!isActive) void choose(o.id);
              }}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 ${
                isActive ? 'bg-[var(--accent-soft)] dark:bg-[var(--gold)]/10' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{o.title}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-[var(--accent-strong)]" />}
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 whitespace-normal break-words">
                  {o.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
