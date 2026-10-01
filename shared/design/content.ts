/**
 * Book Buddy by VPD — CANONICAL COPY / BRANDING (single source of truth)
 * ---------------------------------------------------------------------------
 * Consumed by both app/ (web) and mobile/. Change a string here and it changes
 * on both platforms.
 *
 * Decisions (confirmed):
 *   • Brand name  = "Book Buddy by VPD" everywhere (web navbar previously said "Book Buddy").
 *   • Funnel      = HYBRID: self-serve primary (Sign In / Create Account /
 *                   Guest Library) + a "Book a Demo" SECONDARY on both apps.
 *
 * ⚠ STILL NEEDS YOUR CONFIRMATION (headline + eyebrow differ across platforms):
 *   Proposed canonical below uses WEB's copy (more specific/on-brand). Mobile's
 *   old copy is kept in comments. Tell me if you prefer mobile's or a blend.
 */

export const brand = {
  name: 'Book Buddy by VPD',
  // Short tagline used in footers / meta.
  tagline: 'AI-powered digital library for Indian institutions & students',
} as const;

export const landing = {
  // ⚠ eyebrow — web: "Multi-tenant · AI-safe by design" | mobile: "NEXT-GEN DIGITAL LIBRARY"
  eyebrow: 'Multi-tenant · AI-safe by design',

  // ⚠ headline — web: below | mobile: "Your Knowledge Library, Everywhere"
  //   'accent' is rendered in the gradient/display treatment (web wraps it in a span).
  headline: {
    lead: 'AI-Powered Digital Library for',
    accent: 'Indian Institutions',
  },

  subhead:
    'Read, listen, and chat with your books. Responsive EPUBs, page-accurate PDFs, natural text-to-speech, and Varta — the study assistant that answers with strict textbook citations.',

  builtFor: ['Universities', 'Colleges', 'Coaching Institutes'],

  /**
   * HYBRID funnel. `primary`/`secondary`/`tertiary` are the self-serve set;
   * `demo` is the secondary "Book a Demo" surfaced on both apps.
   * `href` = web route; `route` = Expo Router path (mobile).
   */
  ctas: {
    primary:   { label: 'Sign In to Library',    icon: 'log-in',    href: '/login',    route: '/(auth)/login' },
    secondary: { label: 'Create Free Account',   icon: 'user-plus', href: '/register', route: '/(auth)/register' },
    tertiary:  { label: 'Explore Guest Library', icon: 'compass',   href: '/catalog',  route: '/(tabs)' },
    demo:      { label: 'Book a Demo',           icon: 'rocket',    href: '/register', route: '/(auth)/register' },
  },
} as const;

/**
 * Landing "Platform Capabilities" section. Copy is canonical here; each platform
 * maps `key` → its own icon + gradient styling (web keeps mandala classes,
 * mobile keeps its color map) so styling stays platform-native while copy is shared.
 */
export const features = {
  label: 'Platform Capabilities',
  headingLead: 'A Complete',
  headingAccent: 'Ecosystem',
  subhead: 'Everything your institution needs to deliver a modern, AI-powered reading experience.',
  items: [
    { key: 'library',   title: 'Multi-Format Library',      tag: 'Core Reader',
      description: 'One source, four modes. Students choose: responsive EPUB, page-accurate PDF, natural Text-to-Speech audiobooks, or AI-embedded chat via Varta.' },
    { key: 'varta',     title: 'Varta Study Assistant',  tag: 'Varta',
      description: 'Students can chat with any textbook. Get instant explanations, generate practice questions, create flashcards, and view precise paragraph-level citations.' },
    { key: 'pdf',       title: 'Built-in PDF Studio',       tag: 'Annotation & Sync',
      description: 'Drawboard-like features inside the app. Freehand ink, smart shapes, highlights, redaction, OCR, and audio notes — all directly on your PDFs.' },
    { key: 'sanchika',  title: 'Sanchika',                  tag: 'Smart Notebook',
      description: 'Your evolving study archive. Sanchika automatically collects highlights, Varta explanations, and annotations across every book — revisit flashcards, summaries, and key points anytime.' },
    { key: 'dashboards',title: 'Institutional Dashboards',  tag: 'For Admins & Teachers',
      description: 'Detailed usage analytics. Track most-read books, identify struggling chapters across batches, and monitor overall AI usage statistics.' },
    { key: 'secure',    title: 'Secure for Bharat',         tag: 'Enterprise Grade',
      description: 'Multi-tenant architecture ensuring data isolation. Custom SSO, strict role-based access controls, and compliance-ready infrastructure.' },
  ],
} as const;

export const nav = {
  brandName: brand.name,
  links: [
    { label: 'Features',      href: '#features',      anchor: 'features' },
    { label: 'Reading Modes', href: '#reading-modes', anchor: 'reading-modes' },
    { label: 'Varta',      href: '#varta',         anchor: 'varta' },
    { label: 'FAQ',           href: '#faq',           anchor: 'faq' },
  ],
  signIn:    { label: 'Sign In',     href: '/login',    route: '/(auth)/login' },
  getStarted:{ label: 'Get Started', href: '/register', route: '/(auth)/register' },
} as const;
