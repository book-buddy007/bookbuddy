"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { authClient, useSession } from "@/lib/auth-client"
import { useAuthStore } from "@/store/useAuthStore"
import { useReaderStore } from "@/store/useReaderStore"
import { useAppStore } from "@/store/useAppStore"
import { toReaderKey } from "@/lib/reader-themes"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/ui/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Icon, type BBIconName } from "@/components/ui/icon"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReaderDisplayContent } from "@/components/reader/ReaderDisplayContent"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/* Settings used to be a mock-up: "John Doe" account details, an invented Google
   connection, iPhone and Firefox sessions, an API key, and Save buttons and switches
   that saved nothing. Everything here is now either real or labelled "Not available yet". */

function Section({ title, description, icon, children, className }: {
  title: string
  description?: React.ReactNode
  icon: BBIconName
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-bb-lg bg-bb-surface p-5 shadow-e1 sm:p-7", className)}>
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-bb-md bg-bb-accent-soft text-bb-accent-ink">
          <Icon name={icon} size={20} />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-bb-text">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-bb-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Row({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-bb-border py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-bb-text">{label}</p>
        {hint && <p className="mt-0.5 text-sm text-bb-muted">{hint}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  )
}

const NotYet = () => (
  <span className="inline-flex h-7 items-center rounded-lg bg-bb-surface-2 px-2.5 text-xs font-semibold text-bb-muted">Not available yet</span>
)

const titleCase = (s?: string | null) =>
  (s ?? "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

function describeAgent(ua?: string | null): string {
  if (!ua) return "Unknown device"
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /okhttp|Expo|ReactNative|Dart/i.test(ua) ? "Book Buddy app" : "Browser"
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : ""
  return os ? `${browser} on ${os}` : browser
}

const formatWhen = (d: string | Date) =>
  new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

type SessionRow = { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; updatedAt: string | Date; createdAt: string | Date }

/** Real sessions from better-auth: list, sign out one, sign out all others. */
function SessionsSection() {
  const { data: current } = useSession()
  const currentToken = current?.session?.token
  const [sessions, setSessions] = React.useState<SessionRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [confirmAll, setConfirmAll] = React.useState(false)

  const load = React.useCallback(async () => {
    setError(null)
    const res = await authClient.listSessions()
    if (res.error) {
      setError(res.error.message || "Couldn't load your sessions.")
      setSessions([])
      return
    }
    const rows = ((res.data ?? []) as unknown as SessionRow[]).slice()
    rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    setSessions(rows)
  }, [])

  React.useEffect(() => { load() }, [load])

  const revoke = async (token: string) => {
    setBusy(token)
    const res = await authClient.revokeSession({ token })
    setBusy(null)
    if (res.error) toast({ title: "Couldn't sign that device out", description: res.error.message, variant: "destructive" })
    else { toast({ title: "Signed out", description: "That device will need to sign in again." }); load() }
  }

  const revokeOthers = async () => {
    setBusy("others")
    const res = await authClient.revokeOtherSessions()
    setBusy(null)
    setConfirmAll(false)
    if (res.error) toast({ title: "Couldn't sign out other devices", description: res.error.message, variant: "destructive" })
    else { toast({ title: "Other devices signed out" }); load() }
  }

  const others = (sessions ?? []).filter((s) => s.token !== currentToken)

  return (
    <Section icon="shield-check" title="Where you're signed in" description="Devices with an active session on your account.">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <Icon name="alert-circle" fillLayer={false} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {sessions === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-14 animate-pulse rounded-bb-md bg-bb-surface-2" />)}
        </div>
      ) : (
        <ul>
          {sessions.map((s) => {
            const isCurrent = s.token === currentToken
            return (
              <li key={s.id} className="flex items-center gap-3 border-t border-bb-border py-3.5 first:border-t-0 first:pt-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-bb-surface-2 text-bb-muted">
                  <Icon name={/Android|iPhone|iPad|iOS|Book Buddy app/.test(describeAgent(s.userAgent)) ? "phone" : "globe"} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-bb-text">
                    {describeAgent(s.userAgent)}
                    {isCurrent && <span className="ml-2 rounded-md bg-bb-success-soft px-1.5 py-0.5 text-[11px] font-bold text-bb-success-ink">This device</span>}
                  </p>
                  <p className="truncate text-sm text-bb-muted">
                    Last active {formatWhen(s.updatedAt)}{s.ipAddress ? ` · ${s.ipAddress}` : ""}
                  </p>
                </div>
                {!isCurrent && (
                  <Button variant="outline" size="sm" onClick={() => revoke(s.token)} disabled={busy === s.token}>
                    {busy === s.token && <Icon name="loader" fillLayer={false} className="animate-spin" />}
                    Sign out
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {others.length > 0 && (
        <div className="mt-5 flex justify-end">
          <Button variant="outline" onClick={() => setConfirmAll(true)} disabled={busy === "others"}>
            Sign out all other devices
          </Button>
        </div>
      )}

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out {others.length} other device{others.length === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>They will need to sign in again. This device stays signed in.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revokeOthers}>Sign them out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  )
}

const APP_THEMES: { value: "light" | "dark" | "system"; label: string; swatch: string }[] = [
  { value: "light", label: "Light", swatch: "bg-[#F2F4F8]" },
  { value: "dark", label: "Dark", swatch: "bg-[#0A0F24]" },
  { value: "system", label: "System", swatch: "bg-[linear-gradient(135deg,#F2F4F8_50%,#0A0F24_50%)]" },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuthStore()
  const readerTheme = useReaderStore((s) => s.theme)
  const resetReaderSettings = useReaderStore((s) => s.resetSettings)
  const { reduceMotion, highContrast, setReduceMotion, setHighContrast, setTheme: setAppTheme } = useAppStore()

  // Keep the app store's copy of the theme in step with next-themes.
  React.useEffect(() => {
    if (theme) setAppTheme(theme as any)
  }, [theme, setAppTheme])

  const role = (user?.role ?? "").toLowerCase()
  const initials = (user?.name || user?.email || "?").split(/[\s@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader eyebrow="Account" title="Settings" description="Your account, sign-ins and how Book Buddy looks." />

      <Tabs defaultValue="account" className="space-y-6">
        <div className="-mx-1 overflow-x-auto px-1 scrollbar-hide">
          <TabsList className="w-max">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Data &amp; privacy</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Account ── */}
        <TabsContent value="account" className="space-y-6">
          <Section icon="profile" title="Your account" description="The details Book Buddy has for you.">
            <div className="mb-5 flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-bb-navy font-display text-xl font-extrabold text-white">{initials}</span>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-bold text-bb-text">{user?.name || "No name set"}</p>
                <p className="truncate text-sm text-bb-muted">{user?.email}</p>
              </div>
            </div>
            <dl className="grid gap-4 rounded-bb-md bg-bb-surface-2 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-faint">Role</dt>
                <dd className="mt-1 font-semibold text-bb-text">{titleCase(user?.role) || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-faint">Account type</dt>
                <dd className="mt-1 font-semibold text-bb-text">{user?.accountType === "INDEPENDENT" ? "Independent learner" : "Institution member"}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {role === "student" ? (
                <Button asChild>
                  <Link href="/dashboard/student/profile">
                    Edit profile
                    <Icon name="arrow-right" fillLayer={false} />
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-bb-muted">To change your name or email, ask your institution&apos;s administrator.</p>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security" className="space-y-6">
          <Section icon="lock" title="Password and sign-in">
            <Row label="Password" hint="We'll email you a link to set a new password.">
              <Button asChild variant="outline" size="sm">
                <Link href="/forgot-password">Reset password</Link>
              </Button>
            </Row>
            <Row label="Two-factor authentication" hint="An extra code when you sign in.">
              <NotYet />
            </Row>
          </Section>
          <SessionsSection />
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance" className="space-y-6">
          <Section icon="theme" title="App theme" description="Saved on this device as you choose.">
            <div role="radiogroup" aria-label="App theme" className="grid grid-cols-3 gap-3">
              {APP_THEMES.map((t) => {
                const on = theme === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-bb-md border-2 p-3 transition-colors duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus",
                      on ? "border-bb-accent" : "border-bb-border hover:border-bb-accent/40",
                    )}
                  >
                    <span className={cn("h-16 w-full rounded-lg border border-bb-border", t.swatch)} />
                    <span className="text-sm font-semibold text-bb-text">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section
            icon="read"
            title="Reader defaults"
            description="The same controls as the reader's Display panel. The preview follows your choice."
          >
            <div data-reader={toReaderKey(readerTheme)} className="rounded-bb-md border border-[color:var(--rd-border)] bg-[color:var(--rd-panel)] p-5 transition-colors duration-300">
              <ReaderDisplayContent />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={resetReaderSettings}>
                <Icon name="rotate-ccw" fillLayer={false} />
                Reset reader settings
              </Button>
            </div>
          </Section>

          <Section icon="eye" title="Accessibility" description="Applies across the whole app on this device.">
            <Row label="Reduce motion" hint="Turn off animations and transitions.">
              <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} aria-label="Reduce motion" />
            </Row>
            <Row label="High contrast" hint="Darker secondary text and stronger borders.">
              <Switch checked={highContrast} onCheckedChange={setHighContrast} aria-label="High contrast" />
            </Row>
          </Section>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="space-y-6">
          <Section icon="bell" title="Notifications" description="Due-date reminders, request updates and messages.">
            <div className="flex items-start gap-3 rounded-bb-md bg-bb-surface-2 p-4">
              <Icon name="info" size={18} fillLayer={false} className="mt-0.5 shrink-0 text-bb-muted" />
              <p className="text-sm text-bb-muted">
                Choosing which notifications you get isn&apos;t available yet. The bell in the top bar shows what has been sent to you.
              </p>
            </div>
          </Section>
        </TabsContent>

        {/* ── Data & privacy ── */}
        <TabsContent value="privacy" className="space-y-6">
          <Section icon="shield-check" title="Your data">
            <Row label="Download a copy of your data" hint="Reading history, notes and highlights.">
              <NotYet />
            </Row>
            <Row label="How we use your data" hint="What we collect and why.">
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="ghost" size="sm"><Link href="/privacy">Privacy</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link href="/terms">Terms</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link href="/cookies">Cookies</Link></Button>
              </div>
            </Row>
          </Section>

          <Section icon="trash" title="Delete your account" description="Permanently remove your account, reading history, notes and uploads." className="ring-1 ring-bb-danger/30">
            <Button asChild variant="destructive">
              <Link href="/delete-account">Request account deletion</Link>
            </Button>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
