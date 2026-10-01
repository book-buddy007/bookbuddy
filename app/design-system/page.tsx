"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SearchInput } from "@/components/ui/search-input"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Segmented } from "@/components/ui/segmented"
import { Chip } from "@/components/ui/chip"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { BookCover } from "@/components/ui/book-cover"
import { BookListCard } from "@/components/ui/book-list-card"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { SidebarNav, type NavItem } from "@/components/ui/sidebar-nav"
import { EmptyState } from "@/components/ui/empty-state"
import { Modal } from "@/components/ui/modal"
import { FormField } from "@/components/ui/form-field"
import { PageHeader } from "@/components/ui/page-header"
import { MiniPlayer } from "@/components/ui/mini-player"
import { CitationChip, VartaMessage, VartaOrb } from "@/components/ui/varta"
import { Skeleton } from "@/components/ui/skeleton"
import { Icon } from "@/components/ui/icon"
import { bbIcons, type BBIconName } from "@/lib/bb-icons"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/hooks/use-toast"

const SWATCHES: [string, string][] = [
  ["Ink Navy", "--bb-ink"], ["Navy 2", "--bb-navy-2"], ["Cobalt", "--bb-cobalt"], ["Cobalt Light", "--bb-cobalt-light"],
  ["Periwinkle", "--bb-periwinkle"], ["Blaze", "--bb-blaze"], ["Blaze Light", "--bb-blaze-light"], ["Blaze Dark", "--bb-blaze-dark"],
  ["Amber", "--bb-amber"], ["Cream", "--bb-cream"], ["Cloud", "--bb-cloud"],
]
const SEMANTIC = ["bg", "surface", "surface-2", "border", "text", "text-muted", "accent", "accent-soft", "info", "success", "warning", "danger"]
const COVERS = ["physics", "science", "english", "history", "hindi"]

const NAV: NavItem[] = [
  { label: "Home", href: "/design-system", icon: "home", match: "exact" },
  { label: "Library", href: "/design-system/library", icon: "library" },
  { label: "Listen", href: "/design-system/listen", icon: "audiobook" },
  { label: "Varta", href: "/design-system/varta", icon: "varta", badge: 3 },
  { label: "Goals", href: "/design-system/goals", icon: "goals" },
]

type Loan = { id: number; book: string; member: string; due: string; status: string }
const LOANS: Loan[] = [
  { id: 1, book: "Concepts of Physics", member: "Aarav Mehta", due: "12 Oct", status: "returned" },
  { id: 2, book: "Wings of Fire", member: "Isha Nair", due: "14 Oct", status: "due-soon" },
  { id: 3, book: "Discovery of India", member: "Kabir Rao", due: "02 Oct", status: "overdue" },
  { id: 4, book: "Malgudi Days", member: "Anaya Shah", due: "20 Oct", status: "pending" },
  { id: 5, book: "Godan", member: "Rohan Das", due: "22 Oct", status: "reserved" },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-6 font-display text-[28px] font-extrabold tracking-[-0.03em]">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  )
}

const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-bb-lg bg-bb-surface p-6 shadow-e1 ${className}`}>{children}</div>
)

export default function DesignSystemPage() {
  const { toast } = useToast()
  const [seg, setSeg] = React.useState("read")
  const [speed, setSpeed] = React.useState("1")
  const [on, setOn] = React.useState(true)
  const [chip, setChip] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [playing, setPlaying] = React.useState(false)
  const [cite, setCite] = React.useState(0)

  return (
    <div className="min-h-screen bg-bb-bg">
      <div className="mx-auto max-w-6xl space-y-16 px-5 py-10 md:px-10 md:py-14">
        <PageHeader
          eyebrow="Book Buddy"
          title="Design system"
          description="Navy and blaze, three typefaces, duotone icons. Every screen is built from the pieces below."
          actions={<ThemeToggle />}
        />

        <Section id="color" title="Colour">
          <Panel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {SWATCHES.map(([n, v]) => (
                <div key={v}>
                  <div className="h-16 rounded-xl border border-bb-border" style={{ background: `var(${v})` }} />
                  <p className="mt-2 text-[13px] font-semibold">{n}</p>
                  <p className="text-xs text-bb-muted">{v}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">Semantic · follows the theme</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {SEMANTIC.map((s) => (
                <div key={s}>
                  <div className="h-12 rounded-xl border border-bb-border" style={{ background: `var(--bb-${s})` }} />
                  <p className="mt-1.5 text-xs font-semibold">{s}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="h-16 rounded-xl bg-bb-primary shadow-gloss" />
              <div className="h-16 rounded-xl bg-bb-navy shadow-[var(--bb-shadow-navy)]" />
              <div className="flex h-16 items-center gap-3 rounded-xl bg-bb-surface-2 px-4"><VartaOrb size={36} /><span className="text-sm font-semibold">Varta orb (chat avatar only)</span></div>
            </div>
          </Panel>
        </Section>

        <Section id="type" title="Typography">
          <Panel className="space-y-4">
            <p className="font-display text-[56px] font-extrabold leading-none tracking-[-0.035em]">Display 56</p>
            <p className="font-display text-[40px] font-extrabold tracking-[-0.03em]">Heading one · 40</p>
            <p className="font-display text-[28px] font-extrabold tracking-[-0.03em]">Heading two · 28</p>
            <p className="text-xl font-semibold tracking-[-0.01em]">Heading three · Familjen Grotesk 20/600</p>
            <p className="text-[15px] leading-relaxed">Body 15/1.55 — Familjen Grotesk is the UI face for everything except reading and display.</p>
            <p className="font-reading text-[19px] leading-[1.75]">Reading 19/1.75 — Newsreader sets long-form text in the eBook reader and the Varta source panel.</p>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">Eyebrow 12 · 700 · 0.1em</p>
          </Panel>
        </Section>

        <Section id="buttons" title="Buttons">
          <Panel className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">Primary large</Button>
              <Button>Primary</Button>
              <Button size="sm">Primary small</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger-soft">Danger soft</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="icon" aria-label="Play"><Icon name="play" size={24} fillLayer={false} /></Button>
              <Button size="icon-md" variant="secondary" aria-label="Search"><Icon name="search" size={20} /></Button>
              <Button size="icon-sm" variant="outline" aria-label="Bookmark"><Icon name="bookmark" size={18} /></Button>
            </div>
          </Panel>
        </Section>

        <Section id="forms" title="Inputs & controls">
          <Panel>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Full name" htmlFor="ds-name" hint="As it appears on your ID."><Input id="ds-name" placeholder="Aarav Mehta" /></FormField>
              <FormField label="Email" htmlFor="ds-email" error="Enter a valid email address."><Input id="ds-email" aria-invalid defaultValue="aarav@" /></FormField>
              <FormField label="Search" ><SearchInput placeholder="Search books, authors, topics" /></FormField>
              <FormField label="Notes" htmlFor="ds-notes"><Textarea id="ds-notes" placeholder="Anything the librarian should know" /></FormField>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-8">
              <Segmented value={seg} onValueChange={setSeg} options={[{ value: "read", label: "Read" }, { value: "pdf", label: "PDF" }, { value: "listen", label: "Listen" }]} />
              <Segmented size="sm" value={speed} onValueChange={setSpeed} options={["1", "1.25", "1.5", "1.75", "2"].map((v) => ({ value: v, label: `${v}×` }))} />
              <label className="flex items-center gap-3 text-sm font-semibold"><Switch checked={on} onCheckedChange={setOn} />Notifications</label>
              <label className="flex items-center gap-3 text-sm font-semibold"><Checkbox defaultChecked />Remember me</label>
              <RadioGroup defaultValue="a" className="flex gap-6">
                <label className="flex items-center gap-2 text-sm font-semibold"><RadioGroupItem value="a" />Female voice</label>
                <label className="flex items-center gap-2 text-sm font-semibold"><RadioGroupItem value="b" />Male voice</label>
              </RadioGroup>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Progress value={62} />
              <Progress value={30} className="h-1" />
            </div>
          </Panel>
        </Section>

        <Section id="chips" title="Chips, badges & status">
          <Panel className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Chip>eBook</Chip><Chip icon="audiobook">Audiobook</Chip><Chip icon="varta" selected={chip} onClick={() => setChip((v) => !v)}>Varta enabled</Chip>
              <Chip onRemove={() => undefined}>Physics</Chip>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>New</Badge><Badge variant="secondary">Draft</Badge><Badge variant="info">Info</Badge><Badge variant="warning">Trial</Badge><Badge variant="success">Paid</Badge><Badge variant="destructive">Blocked</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {["returned", "due-soon", "overdue", "pending", "reserved"].map((s) => <StatusBadge key={s} status={s} />)}
            </div>
          </Panel>
        </Section>

        <Section id="cards" title="Book cards & stats">
          <div className="flex flex-wrap items-end gap-6">
            {COVERS.map((c, i) => <BookCover key={c} title={["Physics Part 1", "Science 9", "Marigold", "Our Pasts", "Vasant"][i]} subject={c} width={i === 0 ? 150 : 84} />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <BookListCard interactive title="Concepts of Physics" publisher="Bharati Bhawan" subject="physics" progress={62} formats={[{ label: "eBook", icon: "read" }, { label: "Audiobook", icon: "audiobook" }]} />
            <BookListCard interactive title="Discovery of India" publisher="Penguin" subject="history" progress={18} formats={[{ label: "PDF", icon: "pdf" }, { label: "Varta", icon: "varta" }]} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard variant="featured" title="Books borrowed" value="1,284" icon="library" trend="up" trendValue="12%" />
            <StatCard title="Overdue" value={23} icon="overdue" trend="down" trendValue="4" />
            <StatCard title="Active readers" value="842" icon="class" />
            <StatCard loading title="Loading" value="" />
          </div>
        </Section>

        <Section id="table" title="Data table">
          <DataTable<Loan>
            columns={[
              { key: "book", header: "Book", cell: (r) => <span className="font-semibold">{r.book}</span> },
              { key: "member", header: "Member", cell: (r) => r.member },
              { key: "due", header: "Due", cell: (r) => r.due, className: "hidden sm:table-cell" },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={LOANS}
            rowKey={(r) => r.id}
            renderActions={() => <button>View</button>}
          />
          <DataTable<Loan> columns={[]} rows={[]} rowKey={(r) => r.id} emptyTitle="No loans yet" emptyDescription="Borrowed books appear here." />
        </Section>

        <Section id="nav" title="Navigation">
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <Panel><SidebarNav items={NAV} heading="Student" /></Panel>
            <Panel className="flex items-center"><p className="text-sm text-bb-muted">Active row uses the navy gradient; the icon keeps its orange fill layer. On phones this becomes the bottom tab bar with the MiniPlayer docked above it.</p></Panel>
          </div>
          <MiniPlayer className="max-w-md" title="Concepts of Physics" subtitle="Ch 7 · Laws of motion" subject="physics" playing={playing} progress={38} onToggle={() => setPlaying((p) => !p)} onSkipBack={() => undefined} onSkipForward={() => undefined} />
        </Section>

        <Section id="varta" title="Varta">
          <Panel className="space-y-4">
            <VartaMessage role="user">Why does a heavier object not fall faster?</VartaMessage>
            <VartaMessage citations={["Ch 7 · p. 142", "Ch 3 · p. 58"].map((l, i) => <CitationChip key={l} label={l} active={cite === i} onClick={() => setCite(i)} />)}>
              Because gravitational force grows with mass, but so does inertia — the two cancel, so every object accelerates at the same rate.
            </VartaMessage>
            <div className="flex items-center gap-2 text-sm text-bb-muted"><Icon name="varta" size={20} />Varta icon used in tabs, nav and buttons</div>
          </Panel>
        </Section>

        <Section id="feedback" title="Feedback & states">
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState icon="bookmark" title="No bookmarks yet" description="Tap the bookmark icon while reading to save a place." action={<Button size="sm">Browse library</Button>} />
            <Panel className="space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-24 w-full" /><Skeleton className="h-4 w-3/4" /></Panel>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => toast({ title: "Added to your library", description: "Concepts of Physics" })}>Show toast</Button>
            <Button variant="outline" onClick={() => setOpen(true)}>Open modal / sheet</Button>
          </div>
          <Modal open={open} onOpenChange={setOpen} title="Request this book?" description="The librarian will be notified." footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => setOpen(false)}>Send request</Button></>}>
            <p className="text-sm text-bb-muted">On desktop this is a centred dialog; on phones it becomes a bottom sheet.</p>
          </Modal>
        </Section>

        <Section id="icons" title={`Icons · ${Object.keys(bbIcons).length}`}>
          <Panel>
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {(Object.keys(bbIcons) as BBIconName[]).map((n) => (
                <div key={n} className="flex flex-col items-center gap-1.5 text-center">
                  <Icon name={n} size={28} />
                  <span className="text-[11px] text-bb-muted">{n}</span>
                </div>
              ))}
            </div>
          </Panel>
        </Section>
      </div>
    </div>
  )
}
