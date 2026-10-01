import { useState, useEffect } from 'react';
import { SectionEditor } from './SectionEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Check } from '@/components/ui/icons';
import type { BrandingControlsEditorProps } from '@/types/branding.types';

const PRESET_THEMES = [
  { id: 'aurora', name: 'Aurora Spark', primary: '#4F46E5', secondary: '#9333EA', description: 'Indigo & Purple' },
  { id: 'sunset', name: 'Sunset Horizon', primary: '#D93A00', secondary: '#BE123C', description: 'Saffron & Crimson' },
  { id: 'ocean', name: 'Ocean Depths', primary: '#0F766E', secondary: '#06B6D4', description: 'Teal & Cyan' },
  { id: 'forest', name: 'Forest Canopy', primary: '#059669', secondary: '#65A30D', description: 'Emerald & Lime' },
  { id: 'midnight', name: 'Midnight Neon', primary: '#2E1065', secondary: '#DB2777', description: 'Violet & Pink' },
];

const FALLBACK_FONTS = [
  { family: 'Inter' },
  { family: 'Roboto' },
  { family: 'Outfit' },
  { family: 'Poppins' },
  { family: 'Noto Sans' },
];

/**
 * Pure controlled component. No API calls. No persistence.
 * All state changes flow upward via `onChange`. The parent owns saving.
 */
export function BrandingControlsEditor({ tenantId, branding, onChange }: BrandingControlsEditorProps) {
  const [primaryColor, setPrimaryColor] = useState(branding?.colors?.primary || '#6366f1');
  const [secondaryColor, setSecondaryColor] = useState(branding?.colors?.secondary || '#14b8a6');
  const [typography, setTypography] = useState(branding?.typography || 'Inter');
  const [fonts, setFonts] = useState<{ family: string }[]>([]);

  // Sync local state when branding prop changes (e.g. tenant switch)
  useEffect(() => {
    setPrimaryColor(branding?.colors?.primary || '#6366f1');
    setSecondaryColor(branding?.colors?.secondary || '#14b8a6');
    setTypography(branding?.typography || 'Inter');
  }, [branding?.colors?.primary, branding?.colors?.secondary, branding?.typography]);

  // Load available Google Fonts (non-critical, degrades to fallback list)
  useEffect(() => {
    fetch('/api/fonts')
      .then(res => res.json())
      .then(data => setFonts(data))
      .catch(() => setFonts(FALLBACK_FONTS));
  }, []);

  const handleThemeSelect = (theme: typeof PRESET_THEMES[0]) => {
    setPrimaryColor(theme.primary);
    setSecondaryColor(theme.secondary);
    onChange({
      ...branding,
      colors: { primary: theme.primary, secondary: theme.secondary },
    });
    toast({ title: 'Theme Applied', description: `Applied ${theme.name} colors.` });
  };

  return (
    <SectionEditor title="Branding Controls" description="Configure global platform branding." name="branding-controls">
      <div className="space-y-8">

        {/* 5 Preset Themes Selector */}
        <div className="rounded-2xl bg-bb-surface-2 p-4">
          <label className="mb-4 flex items-center text-sm font-bold">
            Quick Preset Themes
            <span className="ml-2 rounded-full bg-bb-accent-soft px-2.5 py-0.5 text-xs font-semibold text-bb-accent-ink">Recommended</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {PRESET_THEMES.map(theme => {
              const isSelected = primaryColor === theme.primary && secondaryColor === theme.secondary;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeSelect(theme)}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-3 transition-colors focus-visible:outline-none focus-visible:shadow-focus ${isSelected ? 'border-bb-accent bg-bb-accent-soft shadow-e1' : 'border-transparent bg-bb-surface shadow-e1 hover:border-bb-border'}`}
                >
                  {isSelected && (
                    <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-bb-primary text-white shadow-e1">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <div
                    className="w-full h-8 rounded-md mb-2 shadow-inner"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                  />
                  <span className="text-center text-xs font-bold">{theme.name}</span>
                  <span className="line-clamp-1 text-[11px] text-bb-muted">{theme.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual Colors — onChange-only, no API call */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-bb-surface-2 p-4">
            <label className="mb-3 block text-[13px] font-semibold">Primary Color</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={e => {
                  setPrimaryColor(e.target.value);
                  onChange({ ...branding, colors: { primary: e.target.value, secondary: secondaryColor } });
                }}
                className="h-10 w-16 cursor-pointer rounded-md border border-bb-border bg-bb-surface"
              />
              <span className="font-mono text-xs uppercase text-bb-muted">{primaryColor}</span>
            </div>
          </div>
          <div className="rounded-2xl bg-bb-surface-2 p-4">
            <label className="mb-3 block text-[13px] font-semibold">Secondary Color</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={secondaryColor}
                onChange={e => {
                  setSecondaryColor(e.target.value);
                  onChange({ ...branding, colors: { primary: primaryColor, secondary: e.target.value } });
                }}
                className="h-10 w-16 cursor-pointer rounded-md border border-bb-border bg-bb-surface"
              />
              <span className="font-mono text-xs uppercase text-bb-muted">{secondaryColor}</span>
            </div>
          </div>
        </div>

        {/* Typography — onChange-only, no Save button needed */}
        <div className="rounded-2xl bg-bb-surface-2 p-4">
          <label className="mb-3 block text-[13px] font-semibold">Typography / Fonts</label>
          <Select value={typography} onValueChange={(t) => {
            setTypography(t);
            onChange({ ...branding, typography: t });
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a Google Font" />
            </SelectTrigger>
            <SelectContent>
              {(fonts.length > 0 ? fonts : FALLBACK_FONTS).map(f => (
                <SelectItem key={f.family} value={f.family}>{f.family}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-bb-muted">Font selection auto-saves to your draft when changed.</p>
        </div>
      </div>
    </SectionEditor>
  );
}
