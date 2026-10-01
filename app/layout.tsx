import type React from "react"
import type { Viewport } from "next"
import { Bricolage_Grotesque, Familjen_Grotesk, Newsreader } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/providers"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { Toaster } from "@/components/ui/toaster"
import { PwaRegister } from "@/components/pwa/pwa-register"
import { Splash } from "@/components/pwa/splash"
import { AudioSessionBridge } from "@/components/player/audio-session-bridge"
import { A11yPreferences } from "@/components/a11y-preferences"
import "@/app/globals.css"
// Must stay after globals.css: it re-points the shadcn variables, body and heading
// rules at the design-system tokens (see the note in globals.css).
import "@/styles/bb-tokens.css"

// Design-system typefaces. Each sets a CSS variable that styles/bb-tokens.css
// maps onto --bb-font-display / --bb-font-ui / --bb-font-reading.
const bricolage = Bricolage_Grotesque({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
})

const familjen = Familjen_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-familjen",
  display: "swap",
})

const newsreader = Newsreader({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
})

export const metadata = {
  title: "Book Buddy by VPD - Digital Library",
  description: "Book Buddy by VPD — the digital library and reading platform for educational institutions",
  // `generator: 'v0.dev'` was here — it renders as
  // <meta name="generator" content="v0.dev"> on every page, including
  // the one being shown to institutions during procurement. Removed
  // per the landing audit (finding 9).
  icons: {
    icon: "/favicon.svg",
    apple: "/pwa-icon/180",
  },
  // iOS standalone: full-screen with a translucent status bar over the navy header.
  appleWebApp: {
    capable: true,
    title: "Book Buddy",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
}

// viewport-fit=cover lets the PWA draw under the notch; safe-area insets are
// applied by the shells (see --bb-safe-* in styles/bb-tokens.css).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0F24",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${familjen.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@300;400;600;700&family=Tiro+Devanagari+Hindi&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <QueryProvider>
            {/* next-themes writes both data-theme="dark" (design tokens) and the
                `dark` class (Tailwind dark: variants) on <html>. */}
            <ThemeProvider
              attribute={["class", "data-theme"]}
              defaultTheme="system"
              enableSystem
              storageKey="bb-theme"
              disableTransitionOnChange
            >
              {children}
              <Toaster />
              <Splash />
              <PwaRegister />
              <AudioSessionBridge />
              <A11yPreferences />
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
