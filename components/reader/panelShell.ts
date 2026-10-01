/* ── Reader panel shell ───────────────────────────────────────────────
   Audit fix 1. Every reader panel used to hand-roll its own outer div:
   its own width, its own side, its own z-index, its own slide
   transform. That is how they ended up in different shapes (sidebar /
   modal / bar / radial) and at z-40, z-42, z-45 and z-50 — four layers
   that could sit on top of one another because nothing coordinated
   them.

   Panels now come in exactly two forms and this function is the only
   place that knows the difference:

     standalone — the panel is the overlay. It positions itself, slides
                  in from a side, and draws its own header.
     embedded   — the panel is the body of a Study drawer tab. The
                  drawer owns the position, the header and the close
                  button, so the panel must contribute none of them and
                  simply fill the space it is given.

   Panels that support both take an `embedded` prop and pass it here,
   which keeps the branch out of their JSX and stops the two forms
   drifting apart. */

export interface PanelShellOptions {
  /** Standalone only — ignored when embedded, where the drawer decides. */
  isOpen: boolean;
  embedded?: boolean;
  /** Which edge a standalone panel slides in from. */
  side?: 'left' | 'right';
  /** Tailwind width class for the standalone form, e.g. 'w-80'. */
  width?: string;
  /** Border + background classes for the standalone form. */
  surface?: string;
}

export function panelShellClass({
  isOpen,
  embedded = false,
  side = 'right',
  width = 'w-80',
  surface = 'bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-slate-800/60',
}: PanelShellOptions): string {
  if (embedded) {
    /* No position, no transform, no z-index, no shadow, no border —
       an embedded panel is content, not chrome. `min-h-0` matters: it
       is what lets an inner ScrollArea actually scroll inside a flex
       column instead of growing the column forever. */
    return 'relative w-full h-full min-h-0 flex flex-col overflow-hidden';
  }

  const hidden = side === 'right' ? 'translate-x-full' : '-translate-x-full';
  const edge = side === 'right' ? 'right-0 border-l' : 'left-0 border-r';

  /* One z-index for every standalone panel. They are mutually exclusive
     now (see ReaderPanel in store/useReaderStore.ts), so there is
     nothing left for them to stack against and no reason for them to
     bid against each other. */
  return [
    width,
    'absolute top-0 bottom-0 z-40',
    edge,
    surface,
    'backdrop-blur-md shadow-xl overflow-hidden flex flex-col',
    'transition-transform duration-300',
    isOpen ? 'translate-x-0' : hidden,
  ].join(' ');
}
