import type React from "react"
import { Plus_Jakarta_Sans, Yatra_One } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/providers"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { Toaster } from "@/components/ui/toaster"
import "@/app/globals.css"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const yatraOne = Yatra_One({
  weight: "400",
  subsets: ["latin", "devanagari"],
  variable: "--font-display",
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
    // Mandala mark, generated from the Indic tokens
    // (shared/design/indic/build-indic-css.mjs).
    icon: "/favicon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${plusJakarta.variable} ${yatraOne.variable} ${plusJakarta.className}`} suppressHydrationWarning>
        <AuthProvider>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>

  )
}

