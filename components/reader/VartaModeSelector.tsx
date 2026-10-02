import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  WandSparkles,
  HelpCircle,
  MessageCircleQuestion,
  Swords,
  ChevronDown,
  Check,
  X,
  type LucideIcon,
} from '@/components/ui/icons';
import type { DialogueMode } from '@/hooks/useBookChat';

/**
 * Mode switcher for Varta, ported from DigiClassroom's tutor AgentSelector.
 *
 * WHY A DROPDOWN AND NOT THE ROW OF PILLS IT REPLACES
 *
 * Varta previously rendered all four modes as pills in a row, directly beneath
 * the Study drawer's own tool tabs (Varta / Quiz / Graph / Digest). Two pill
 * rows stacked, in a drawer that is full-width on a phone and 420px at its
 * widest, read as one cluttered control — and because one row said "Quiz" and
 * the other "Quiz Me", it looked like the same thing twice.
 *
 * DigiClassroom solved the same problem for six tutor agents by collapsing them
 * into a single pill that opens a labelled list. That is worth more here than
 * there: the drawer is far narrower than a dashboard page, so the row this
 * removes is a whole row of vertical space returned to the conversation, which
 * is the thing students actually came for.
 *
 * The dropdown also carries each mode's description permanently. The pills
 * could only hold it in a `title` tooltip, which is invisible on touch — so on
 * a phone the difference between "Socratic" and "Explain" was undiscoverable.
 */

export interface VartaModeOption {
  id: DialogueMode;
  title: string;
  description: string;
  Icon: LucideIcon;
  /** Icon chip colours. Kept as literal Tailwind so each mode stays visually
      distinct, rather than every chip collapsing to the one accent token. */
  accent: string;
}

export const VARTA_MODES: VartaModeOption[] = [
  {
    id: 'explain',
    title: 'Explain',
    description: 'A direct answer, cited to the page it came from',
    Icon: WandSparkles,
    accent: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  {
    id: 'quiz_me',
    title: 'Quiz Me',
    description: 'Varta asks first, then marks your answer',
    Icon: HelpCircle,
    accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  {
    id: 'socratic',
    title: 'Socratic',
    description: 'Guides you to the answer instead of giving it',
    Icon: MessageCircleQuestion,
    accent: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  {
    id: 'debate',
    title: 'Debate',
    description: 'Two sides argue a contested point, then you judge',
    Icon: Swords,
    accent: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
];

/**
 * Advisory mode suggestion, same shape as DigiClassroom's
 * `suggestAgentForMessage`: it never switches anything by itself, so a wrong
 * guess costs the student nothing but a glance.
 *
 * Order matters — the first match wins, so narrower intents come before broad
 * ones. `explain` has no patterns because it is the default; suggesting it
 * would be a no-op.
 */
const MODE_SUGGESTION_RULES: Array<{ mode: DialogueMode; patterns: RegExp[] }> = [
  {
    // Wants to be tested rather than told.
    mode: 'quiz_me',
    patterns: [
      /\b(quiz|test)\s+me\b/i,
      /\b(ask|give)\s+me\s+(a\s+)?(question|questions|mcq)/i,
      /\b(check|assess)\s+(my|if\s+i)\s+(understanding|know|remember)/i,
      /\bpractice\s+questions?\b/i,
    ],
  },
  {
    // Wants to work it out, not be handed it.
    mode: 'socratic',
    patterns: [
      /\b(help|guide)\s+me\s+(work|figure|think)\s+(it\s+)?(out|through)\b/i,
      /\b(don'?t|do\s+not)\s+(just\s+)?(tell|give)\s+me\s+the\s+answer\b/i,
      /\b(walk|talk)\s+me\s+through\b/i,
      /\bstep[-\s]?by[-\s]?step\b/i,
    ],
  },
  {
    // A contestable question rather than a factual one.
    mode: 'debate',
    patterns: [
      /\b(argue|debate|for\s+and\s+against|both\s+sides|pros\s+and\s+cons)\b/i,
      /\b(is\s+it\s+(right|fair|better)|should\s+\w+\s+have)\b/i,
      /\b(do\s+you\s+agree|what'?s\s+the\s+counter)\b/i,
    ],
  },
];

/**
 * Pure and side-effect free, so it can run on every keystroke. Returns null
 * when nothing matches, when the draft is too short to judge, or when the best
 * guess is already active.
 */
export function suggestModeForMessage(
  message: string,
  currentMode?: DialogueMode,
): VartaModeOption | null {
  if (!message) return null;
  const trimmed = message.trim();
  // Below ~4 words there is rarely enough signal, and suggesting on a
  // half-typed word is noise.
  if (trimmed.length < 12 || trimmed.split(/\s+/).length < 4) return null;

  for (const rule of MODE_SUGGESTION_RULES) {
    if (rule.patterns.some((p) => p.test(trimmed))) {
      if (rule.mode === currentMode) return null;
      return VARTA_MODES.find((m) => m.id === rule.mode) ?? null;
    }
  }
  return null;
}

interface VartaModeSelectorProps {
  value: DialogueMode;
  onChange: (mode: DialogueMode) => void;
  disabled?: boolean;
  /** The in-progress question. Supplying it enables the advisory chip. */
  draftMessage?: string;
}

export function VartaModeSelector({
  value,
  onChange,
  disabled = false,
  draftMessage,
}: VartaModeSelectorProps) {
  const active = VARTA_MODES.find((m) => m.id === value) ?? VARTA_MODES[0];
  const ActiveIcon = active.Icon;

  // Modes waved off for this draft, so a dismissed suggestion does not
  // reappear on the next keystroke.
  const [dismissed, setDismissed] = React.useState<DialogueMode[]>([]);

  const suggestion = React.useMemo(
    () => (draftMessage ? suggestModeForMessage(draftMessage, active.id) : null),
    [draftMessage, active.id],
  );
  const visible = suggestion && !dismissed.includes(suggestion.id) ? suggestion : null;

  // Clear dismissals once the draft is sent or emptied, so the next question
  // starts from a clean slate.
  React.useEffect(() => {
    if (!draftMessage) setDismissed([]);
  }, [draftMessage]);

  const SuggestionIcon = visible?.Icon;

  return (
    <div className="flex flex-col items-start gap-1.5">
      {visible && SuggestionIcon && (
        <div className="inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1 text-[11px] border border-[var(--accent-primary)]/30 bg-[var(--accent-soft)] dark:bg-[var(--bb-amber)]/10 text-[var(--accent-contrast)] dark:text-[var(--accent-primary-dark)]">
          <SuggestionIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Try <span className="font-semibold">{visible.title}</span>?
          </span>
          <button
            type="button"
            onClick={() => onChange(visible.id)}
            className="rounded-full bg-[var(--accent-strong)] px-2.5 py-0.5 text-[11px] font-semibold text-white hover:opacity-90"
          >
            Switch
          </button>
          <button
            type="button"
            onClick={() => setDismissed((prev) => [...prev, visible.id])}
            aria-label={`Dismiss ${visible.title} suggestion`}
            className="px-1 opacity-70 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Answer mode: ${active.title}. Change mode.`}
            className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-primary)]/30 bg-white/70 py-1 pl-1 pr-2 text-[11px] font-semibold text-[var(--accent-contrast)] transition-colors hover:border-[var(--accent-strong)] disabled:opacity-50 dark:border-[var(--bb-amber)]/20 dark:bg-slate-900/60 dark:text-[var(--accent-primary-dark)]"
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${active.accent}`}>
              <ActiveIcon className="h-3 w-3" />
            </span>
            {active.title}
            <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" sideOffset={6} className="w-[17rem] p-1.5">
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            How should Varta answer?
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {VARTA_MODES.map((m) => {
            const Icon = m.Icon;
            const isActive = m.id === active.id;
            return (
              <DropdownMenuItem
                key={m.id}
                onSelect={() => {
                  if (!isActive) onChange(m.id);
                }}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 ${
                  isActive ? 'bg-[var(--accent-soft)] dark:bg-[var(--bb-amber)]/10' : ''
                }`}
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${m.accent}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{m.title}</span>
                    {isActive && <Check className="h-3.5 w-3.5 text-[var(--accent-strong)]" />}
                  </div>
                  {/* Wraps rather than truncates. DigiClassroom's QuickReplyCard
                      carries a long comment about exactly this: a clipped
                      subtitle is how "Step-by-step gu…" shipped. */}
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 whitespace-normal break-words">
                    {m.description}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
