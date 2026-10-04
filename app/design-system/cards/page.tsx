"use client"

import * as React from "react"
import { CardGrid, SampleData } from "@/components/dashboard/cards/dash-card"
import { ContinueReadingCard } from "@/components/dashboard/cards/continue-reading-card"
import { GoalRingCard } from "@/components/dashboard/cards/goal-ring-card"
import { StreakCard } from "@/components/dashboard/cards/streak-card"
import { AskVartaCard } from "@/components/dashboard/cards/ask-varta-card"
import { SanchikaCard } from "@/components/dashboard/cards/sanchika-card"
import { NowListeningCard } from "@/components/dashboard/cards/now-listening-card"
import { AssignedCard } from "@/components/dashboard/cards/assigned-card"
import { WeeklyBarsCard } from "@/components/dashboard/cards/weekly-bars-card"
import { LatestHighlightCard } from "@/components/dashboard/cards/latest-highlight-card"
import { PlatformHealthCard } from "@/components/dashboard/cards/platform-health-card"
import { StatCard } from "@/components/ui/stat-card"
import { PageHeader } from "@/components/ui/page-header"
import { useAudioPlayerStore } from "@/store/useAudioPlayerStore"

/**
 * Dev-only preview of the dashboard card kit with SAMPLE data (no API calls), for reviewing the
 * populated states in light and dark:  /design-system/cards  (add ?audio=1 to load the player card).
 */
export default function CardsPreviewPage() {
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("audio") === "1") {
      const s = useAudioPlayerStore.getState()
      s.loadBook("demo", "Concepts of Physics", "H. C. Verma", "", [
        { id: "c1", bookId: "demo", title: "Laws of motion", sortOrder: 1, sections: [{ id: "s1", chapterId: "c1", title: "Ch 4 · Laws of Motion", sortOrder: 1, sectionType: "SECTION", durationSeconds: 700, tracks: [] }] },
      ], null)
      s.setPosition(192)
    }
  }, [])

  return (
    <div className="mx-auto max-w-[1320px] space-y-6 p-[clamp(20px,4vw,48px)]">
      <PageHeader eyebrow="Sample data" title="Dashboard card kit" description="Every figure on this page is sample data." actions={<SampleData />} />

      <CardGrid>
        <ContinueReadingCard index={0} book={{ id: "demo", title: "Physics · Class XI", author: "NCERT", percent: 64, page: 142, hasAudio: true, subject: "physics" }} />
        <GoalRingCard index={1} pagesToday={32} goalPages={45} minutesToday={22} />
        <StreakCard index={2} streak={5} readToday />
        <AskVartaCard index={3} />
        <SanchikaCard index={4} due={[{ id: "1", label: "Why does water take so long to heat up?", page: 142, bookTitle: "Physics · Class XI" }, { id: "2", label: "Latent heat" }]} highlights={48} flashcards={12} explanations={9} />
        <NowListeningCard index={5} />
        <AssignedCard
          index={6}
          items={[
            { id: "a", title: "Ch 7 · Heat & Thermodynamics", by: "Due Sat", due: "Today", urgent: true, icon: "book-open" },
            { id: "b", title: "Lab manual · Calorimetry", by: "Library loan", due: "Fri", icon: "file" },
            { id: "c", title: "Ch 4 · Laws of Motion", by: "Library loan", due: "12 Oct", icon: "headphones" },
          ]}
        />
        <WeeklyBarsCard
          index={7}
          days={[
            { label: "Mon", pages: 42 }, { label: "Tue", pages: 64 }, { label: "Wed", pages: 38 }, { label: "Thu", pages: 80 },
            { label: "Fri", pages: 92 }, { label: "Sat", pages: 30 }, { label: "Sun", pages: 12, today: true },
          ]}
        />
        <LatestHighlightCard
          index={8}
          highlight={{ text: "The specific heat capacity of water is 4186 J/kg·K, which makes it an excellent thermal buffer.", bookId: "demo", bookTitle: "Physics XI", page: 142 }}
        />
      </CardGrid>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-[18px]">
        <StatCard title="Active readers · 7d" value="12,480" icon="users" trend="up" trendValue="8.2%" sparkline={[20, 24, 22, 30, 28, 34, 38, 36, 44, 48]} />
        <StatCard title="Books in catalogue" value="3,912" icon="library" hue="ai" trend="up" trendValue="146" sparkline={[10, 12, 14, 15, 18, 20, 22, 25, 27, 30]} />
        <StatCard variant="featured" title="Varta questions · 7d" value="41.2k" icon="varta" trend="up" trendValue="21%" sparkline={[12, 18, 15, 26, 22, 30, 41, 36, 48, 55]} />
        <PlatformHealthCard
          status="ok"
          rows={[
            { icon: "database", label: "Database", hint: "18,240 total records", value: "Online" },
            { icon: "folder", label: "Media storage", hint: "3,912 files stored", value: "1.8 TB" },
            { icon: "analytics", label: "Active sessions", hint: "Currently active users", value: "1,208" },
          ]}
        />
      </div>
    </div>
  )
}
