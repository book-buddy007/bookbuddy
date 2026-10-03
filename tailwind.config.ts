import type { Config } from "tailwindcss";

/* Book Buddy palette scales.
 * Un-migrated pages still use Tailwind's default palettes (slate-*, indigo-*, amber-* …).
 * Redefining those names here re-themes them to the design system in one place:
 *   neutral → navy-tinted greys, indigo/violet/purple/blue/sky/cyan/teal → cobalt,
 *   amber/orange → blaze, red/rose/pink → danger, green/emerald → success.
 * New code uses the `bb-*` tokens instead; this block shrinks as pages are rebuilt. */
const neutral = { 50: '#F2F4F8', 100: '#E6EAF1', 200: '#DCE1EA', 300: '#C5CCDA', 400: '#8E9AB8', 500: '#5F6B8C', 600: '#4A5470', 700: '#2A3556', 800: '#18213C', 900: '#0E1530', 950: '#0A0F24' }
const cobalt = { 50: '#EEF3FF', 100: '#DCE8FF', 200: '#BFD2FF', 300: '#93AEFF', 400: '#7D97FF', 500: '#4C6FFF', 600: '#3B5BDB', 700: '#1E3A8A', 800: '#0F1F5C', 900: '#0B1640', 950: '#0A0F24' }
const blaze = { 50: '#FFF4EE', 100: '#FFE7DC', 200: '#FFD0B8', 300: '#FFB37A', 400: '#FF8A3D', 500: '#FF4D00', 600: '#D93A00', 700: '#B83300', 800: '#8F2800', 900: '#6B1E00', 950: '#3A1000' }
const amber = { 50: '#FFF8EB', 100: '#FFEFD1', 200: '#FFDDA0', 300: '#FFCB70', 400: '#FFB547', 500: '#F5A000', 600: '#D98300', 700: '#B36500', 800: '#8F4F00', 900: '#6B3B00', 950: '#3D2100' }
const gold = { 50: '#FFFBE6', 100: '#FFF4C2', 200: '#FFE98A', 300: '#FFDB4D', 400: '#FFD23F', 500: '#F5B800', 600: '#B88700', 700: '#8A6600', 800: '#7A5A00', 900: '#5C4300', 950: '#3A2A00' }
const danger = { 50: '#FFF1F2', 100: '#FFE1E4', 200: '#FFC2C9', 300: '#FF98A3', 400: '#FF5468', 500: '#E5283A', 600: '#C41E2E', 700: '#B0182A', 800: '#8A1222', 900: '#650D19', 950: '#3A060E' }
const success = { 50: '#EFFBF3', 100: '#DDF8E6', 200: '#B8F0CC', 300: '#7FE3A5', 400: '#3DDC84', 500: '#12B85A', 600: '#0E9A4A', 700: '#0B7A3B', 800: '#095E2E', 900: '#074524', 950: '#03281A' }
/** Token colour that still accepts Tailwind opacity modifiers (bg-bb-surface/80): a bare var() cannot. */
const a = (v: string) => `color-mix(in srgb, var(${v}) calc(<alpha-value> * 100%), transparent)`

const BB_PALETTE = {
	slate: neutral, gray: neutral, zinc: neutral, neutral, stone: neutral,
	indigo: cobalt, violet: cobalt, purple: cobalt, blue: cobalt, sky: cobalt, cyan: cobalt, teal: cobalt, fuchsia: cobalt,
	orange: blaze, amber, yellow: gold,
	red: danger, rose: danger, pink: danger,
	green: success, emerald: success, lime: success,
}

const config: Config = {
	darkMode: ["class"],
	// hover: variants only apply on devices that can hover, so touch screens never get stuck hover states.
	future: { hoverOnlyWhenSupported: true },
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"*.{js,ts,jsx,tsx,mdx}"
	],
	theme: {
		extend: {
			colors: {
				...BB_PALETTE,
				bb: {
				ink: '#0A0F24', cobalt: '#1E3A8A', 'cobalt-light': '#3B5BDB', periwinkle: '#5B7CFF',
				blaze: '#FF4D00', 'blaze-light': '#FF8A3D', 'blaze-dark': '#D93A00', amber: '#FFB547', cream: '#FFE3A3', cloud: '#F2F4F8',
				bg: a('--bb-bg'), surface: a('--bb-surface'), 'surface-2': a('--bb-surface-2'), border: a('--bb-border'),
				text: a('--bb-text'), muted: a('--bb-text-muted'), faint: a('--bb-text-faint'),
				accent: a('--bb-accent'), 'accent-soft': a('--bb-accent-soft'), 'accent-ink': a('--bb-accent-ink'),
				success: a('--bb-success'), 'success-soft': a('--bb-success-soft'), 'success-ink': a('--bb-success-ink'),
				warning: a('--bb-warning'), 'warning-soft': a('--bb-warning-soft'), 'warning-ink': a('--bb-warning-ink'),
				danger: a('--bb-danger'), 'danger-soft': a('--bb-danger-soft'), 'danger-ink': a('--bb-danger-ink'),
				info: a('--bb-info'), 'info-soft': a('--bb-info-soft'), 'info-ink': a('--bb-info-ink'),
				hover: a('--bb-hover'),
				// text/lines for content sitting on the always-navy bands (hero, CTA, footer)
				dim: '#A9B4D0', 'dim-2': '#B8C4E6', 'night-line': '#2A3556', 'night-line-2': '#3A4668', 'night-panel': '#18213C',
				peach: '#FFB37A',
				},
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// VG Educational Color System
				'vg-primary': {
					50: 'var(--vg-primary-50)',
					100: 'var(--vg-primary-100)',
					200: 'var(--vg-primary-200)',
					300: 'var(--vg-primary-300)',
					400: 'var(--vg-primary-400)',
					500: 'var(--vg-primary-500)',
					600: 'var(--vg-primary-600)',
					700: 'var(--vg-primary-700)',
					800: 'var(--vg-primary-800)',
					900: 'var(--vg-primary-900)',
				},
				'vg-sanskrit': {
					50: 'var(--vg-sanskrit-50)',
					100: 'var(--vg-sanskrit-100)',
					200: 'var(--vg-sanskrit-200)',
					300: 'var(--vg-sanskrit-300)',
					400: 'var(--vg-sanskrit-400)',
					500: 'var(--vg-sanskrit-500)',
					600: 'var(--vg-sanskrit-600)',
					700: 'var(--vg-sanskrit-700)',
					800: 'var(--vg-sanskrit-800)',
					900: 'var(--vg-sanskrit-900)',
				},
				'vg-cultural': {
					50: 'var(--vg-cultural-50)',
					100: 'var(--vg-cultural-100)',
					200: 'var(--vg-cultural-200)',
					300: 'var(--vg-cultural-300)',
					400: 'var(--vg-cultural-400)',
					500: 'var(--vg-cultural-500)',
					600: 'var(--vg-cultural-600)',
					700: 'var(--vg-cultural-700)',
					800: 'var(--vg-cultural-800)',
					900: 'var(--vg-cultural-900)',
				},
				'vg-success': {
					50: 'var(--vg-success-50)',
					100: 'var(--vg-success-100)',
					500: 'var(--vg-success-500)',
					600: 'var(--vg-success-600)',
					700: 'var(--vg-success-700)',
				},
				'vg-warning': {
					50: 'var(--vg-warning-50)',
					100: 'var(--vg-warning-100)',
					500: 'var(--vg-warning-500)',
					600: 'var(--vg-warning-600)',
					700: 'var(--vg-warning-700)',
				},
				'vg-error': {
					50: 'var(--vg-error-50)',
					100: 'var(--vg-error-100)',
					500: 'var(--vg-error-500)',
					600: 'var(--vg-error-600)',
					700: 'var(--vg-error-700)',
				},
				// Landing Page Color System
				'landing-orange': {
					50: 'var(--landing-orange-50)',
					100: 'var(--landing-orange-100)',
					200: 'var(--landing-orange-200)',
					300: 'var(--landing-orange-300)',
					400: 'var(--landing-orange-400)',
					500: 'var(--landing-orange-500)',
					600: 'var(--landing-orange-600)',
					700: 'var(--landing-orange-700)',
					800: 'var(--landing-orange-800)',
					900: 'var(--landing-orange-900)',
				},
				'landing-blue': {
					50: 'var(--landing-blue-50)',
					100: 'var(--landing-blue-100)',
					200: 'var(--landing-blue-200)',
					300: 'var(--landing-blue-300)',
					400: 'var(--landing-blue-400)',
					500: 'var(--landing-blue-500)',
					600: 'var(--landing-blue-600)',
					700: 'var(--landing-blue-700)',
					800: 'var(--landing-blue-800)',
					900: 'var(--landing-blue-900)',
				},
				'landing-purple': {
					50: 'var(--landing-purple-50)',
					100: 'var(--landing-purple-100)',
					200: 'var(--landing-purple-200)',
					300: 'var(--landing-purple-300)',
					400: 'var(--landing-purple-400)',
					500: 'var(--landing-purple-500)',
					600: 'var(--landing-purple-600)',
					700: 'var(--landing-purple-700)',
					800: 'var(--landing-purple-800)',
					900: 'var(--landing-purple-900)',
				},
				'landing-green': {
					50: 'var(--landing-green-50)',
					100: 'var(--landing-green-100)',
					500: 'var(--landing-green-500)',
					600: 'var(--landing-green-600)',
				},
			},
			fontFamily: {
				sans: ['var(--bb-font-ui)'],
				display: ['var(--bb-font-display)'],
				ui: ['var(--bb-font-ui)'],
				reading: ['var(--bb-font-reading)'],
				mono: ['var(--font-vg-mono)', 'ui-monospace', 'monospace'],
				'vg-primary': ['var(--bb-font-ui)'],
				'vg-cultural': ['var(--bb-font-display)'],
			},
			fontSize: {
				'display-xl': ['80px', { lineHeight: '0.96', letterSpacing: '-0.04em', fontWeight: '800' }],
				display: ['56px', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '800' }],
				h1: ['40px', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
				h2: ['28px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
				h3: ['20px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
				'body-lg': ['18px', { lineHeight: '1.55' }],
				body: ['15px', { lineHeight: '1.55' }],
				label: ['13px', { lineHeight: '1.3', letterSpacing: '0.02em', fontWeight: '600' }],
				reading: ['19px', { lineHeight: '1.75' }],
				'vg-xs': 'var(--vg-text-xs)',
				'vg-sm': 'var(--vg-text-sm)',
				'vg-base': 'var(--vg-text-base)',
				'vg-lg': 'var(--vg-text-lg)',
				'vg-xl': 'var(--vg-text-xl)',
				'vg-2xl': 'var(--vg-text-2xl)',
				'vg-3xl': 'var(--vg-text-3xl)',
				'vg-4xl': 'var(--vg-text-4xl)',
				'vg-5xl': 'var(--vg-text-5xl)',
			},
			spacing: {
				'vg-0': 'var(--vg-space-0)',
				'vg-1': 'var(--vg-space-1)',
				'vg-2': 'var(--vg-space-2)',
				'vg-3': 'var(--vg-space-3)',
				'vg-4': 'var(--vg-space-4)',
				'vg-5': 'var(--vg-space-5)',
				'vg-6': 'var(--vg-space-6)',
				'vg-8': 'var(--vg-space-8)',
				'vg-10': 'var(--vg-space-10)',
				'vg-12': 'var(--vg-space-12)',
				'vg-16': 'var(--vg-space-16)',
				'vg-20': 'var(--vg-space-20)',
			},
			boxShadow: {
				e0: 'var(--bb-shadow-e0)', e1: 'var(--bb-shadow-e1)', e2: 'var(--bb-shadow-e2)', gloss: 'var(--bb-shadow-gloss)', focus: 'var(--bb-focus-ring)',
				'card-hover': 'var(--bb-shadow-card-hover)', 'glow-blaze': 'var(--bb-shadow-glow-blaze)', 'glow-cobalt': 'var(--bb-shadow-glow-cobalt)', stage: 'var(--bb-shadow-stage)', navy: 'var(--bb-shadow-navy)',
				'vg-xs': 'var(--vg-shadow-xs)',
				'vg-sm': 'var(--vg-shadow-sm)',
				'vg-md': 'var(--vg-shadow-md)',
				'vg-lg': 'var(--vg-shadow-lg)',
				'vg-xl': 'var(--vg-shadow-xl)',
				'vg-2xl': 'var(--vg-shadow-2xl)',
				'vg-card': 'var(--vg-shadow-card)',
				'vg-card-hover': 'var(--vg-shadow-card-hover)',
				'vg-cultural': 'var(--vg-shadow-cultural)',
			},
			borderRadius: {
				'bb-xs': '6px', 'bb-sm': '10px', 'bb-md': '14px', 'bb-lg': '22px', 'bb-xl': '28px', 'bb-tile': '16px', 'bb-card': '26px',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'vg-sm': 'var(--vg-radius-sm)',
				'vg-md': 'var(--vg-radius-md)',
				'vg-lg': 'var(--vg-radius-lg)',
				'vg-xl': 'var(--vg-radius-xl)',
				'vg-2xl': 'var(--vg-radius-2xl)',
				'vg-3xl': 'var(--vg-radius-3xl)',
			},
			backgroundImage: {
				'bb-primary': 'var(--bb-grad-primary)', 'bb-navy': 'var(--bb-grad-navy)',
				'bb-progress': 'var(--bb-grad-progress)', 'bb-orb': 'var(--bb-varta-orb)',
				'bb-cobalt': 'var(--bb-grad-cobalt)', 'bb-stage': 'var(--bb-grad-stage)', 'bb-ai': 'var(--bb-grad-ai-card)', 'bb-ring': 'var(--bb-grad-ring)',
			},
			transitionTimingFunction: { bb: 'cubic-bezier(.2,.8,.2,1)', spring: 'cubic-bezier(.3,1.5,.5,1)' },
			transitionDuration: { 'bb-micro': '120ms', 'bb-ui': '240ms' },
			backdropBlur: {
				'vg-sm': 'var(--vg-blur-sm)',
				'vg-md': 'var(--vg-blur-md)',
				'vg-lg': 'var(--vg-blur-lg)',
				'vg-xl': 'var(--vg-blur-xl)',
			},
			keyframes: {
				'bb-shimmer': { '100%': { transform: 'translateX(100%)' } },
				'bb-loader': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(200%)' } },
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'landing-pulse': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' },
				},
				'landing-shimmer': {
					'0%': { backgroundPosition: '-1000px 0' },
					'100%': { backgroundPosition: '1000px 0' },
				},
			},
			animation: {
				'bb-shimmer': 'bb-shimmer 1.4s infinite',
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'landing-pulse': 'landing-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'landing-shimmer': 'landing-shimmer 2s linear infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
