// Book Buddy icon set v3 — "2b: line + soft fill, glossy active". Data: ./bb-icons.json
// Drop-in for components/ui/icon.tsx: keeps the existing API (name, size, className, fillLayer)
// and adds tone + hue. BBIconName stays the exported type name so every call site compiles.
import * as React from 'react';
import ICONS from '@/shared/design/bb-icons.json';

type Glyph = { stroke: string; soft: string; solid: string; hue: 'a' | 'b' };
const SET = ICONS as Record<string, Glyph>;

/** Old v2 names → v3 glyphs. Keeps legacy call sites rendering while they migrate. */
const LEGACY: Record<string, string> = {
  read: 'book-open', audiobook: 'headphones', sanchika: 'flashcards', highlight: 'highlighter', goals: 'target',
  contents: 'list', streak: 'flame', class: 'users', profile: 'user', subscription: 'card', branding: 'palette',
  overdue: 'clock', admin: 'shield', pdf: 'file', edit: 'annotate', flashcard: 'flashcards', theme: 'moon',
  'shield-check': 'shield', x: 'close', 'arrow-left': 'chevron-left', settings2: 'settings',
};

export type BBIconName = keyof typeof ICONS | keyof typeof LEGACY | (string & {});
export type IconTone = 'line' | 'soft' | 'active' | 'onfill';

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name: BBIconName;
  size?: number;
  /** soft (default) · line · active (accent stroke) · onfill (white, for gradient chips/buttons) */
  tone?: IconTone;
  /** a = blaze (default), b = cobalt (AI). Defaults per glyph (Varta, sparkles, brain, lightbulb are b). */
  hue?: 'a' | 'b';
  /** Legacy v2 prop: false renders the plain line tone. */
  fillLayer?: boolean;
  strokeWidth?: number;
  title?: string;
}

export function Icon({ name, size = 24, tone, hue, fillLayer, strokeWidth, className, title, style, ...rest }: IconProps) {
  const g = SET[name as string] ?? SET[LEGACY[name as string] ?? ''];
  if (!g) {
    if (process.env.NODE_ENV !== 'production') console.warn('[Icon] unknown name:', name);
    return null;
  }
  const t: IconTone = tone ?? (fillLayer === false ? 'line' : 'soft');
  const h = hue ?? g.hue;
  const acc = h === 'b' ? 'var(--ic-accent-b, #3B5BDB)' : 'var(--ic-accent, #FF4D00)';
  const sw = strokeWidth ?? (size <= 18 ? 1.7 : size >= 40 ? 1.35 : 1.5);
  const ink = t === 'active' ? acc : t === 'onfill' ? '#fff' : 'currentColor';
  const softFill = t === 'onfill' ? '#fff' : acc;
  const solidFill = t === 'line' ? 'currentColor' : t === 'onfill' ? '#fff' : acc;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}
      style={{ display: 'block', overflow: 'visible', flex: 'none', ...style }} {...rest}>
      {t !== 'line' && g.soft && <g style={{ fill: softFill }} opacity={t === 'onfill' ? 0.24 : 0.16} stroke="none" dangerouslySetInnerHTML={{ __html: g.soft }} />}
      {g.stroke && <g style={{ stroke: ink }} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" dangerouslySetInnerHTML={{ __html: g.stroke }} />}
      {g.solid && <g style={{ fill: solidFill }} stroke="none" dangerouslySetInnerHTML={{ __html: g.solid }} />}
    </svg>
  );
}
export default Icon;
