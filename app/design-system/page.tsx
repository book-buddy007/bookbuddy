"use client"

import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { StatCard, CompactStatCard } from "@/components/ui/stat-card"
import { LoadingSkeleton, CardSkeleton, DashboardSkeleton } from "@/components/ui/loading-skeleton"
import { 
  BookOpen, 
  Users, 
  TrendingUp, 
  Award, 
  Activity,
  Download,
  Upload,
  Heart,
  Star,
  Zap
} from "@/components/ui/icons"
import { useState } from "react"

export default function DesignSystemPage() {
  const [loading, setLoading] = useState(false)

  const handleLoadingDemo = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vg-primary-50 via-white to-vg-cultural-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 animate-vg-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-vg-primary-600 via-vg-sanskrit-600 to-vg-cultural-600 bg-clip-text text-transparent">
            VG Educational Design System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The Book Buddy by VPD design system, featuring modern components, 
            smooth animations, and educational-focused styling.
          </p>
        </div>

        {/* Color Palette */}
        <section className="space-y-6 animate-vg-fade-in">
          <h2 className="text-3xl font-bold">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="h-24 rounded-vg-xl bg-vg-primary-500 shadow-vg-md" />
              <p className="text-sm font-medium">VG Primary</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-vg-xl bg-vg-sanskrit-500 shadow-vg-md" />
              <p className="text-sm font-medium">VG Sanskrit</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-vg-xl bg-vg-cultural-500 shadow-vg-md" />
              <p className="text-sm font-medium">VG Cultural</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-vg-xl bg-vg-success-500 shadow-vg-md" />
              <p className="text-sm font-medium">VG Success</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-vg-xl bg-vg-error-500 shadow-vg-md" />
              <p className="text-sm font-medium">VG Error</p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-6 animate-vg-fade-in">
          <h2 className="text-3xl font-bold">Enhanced Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <EnhancedButton variant="default">Default</EnhancedButton>
            <EnhancedButton variant="vg-primary">VG Primary</EnhancedButton>
            <EnhancedButton variant="vg-cultural">VG Cultural</EnhancedButton>
            <EnhancedButton variant="vg-success">Success</EnhancedButton>
            <EnhancedButton variant="vg-warning">Warning</EnhancedButton>
            <EnhancedButton variant="vg-error">Error</EnhancedButton>
            <EnhancedButton variant="vg-glass">Glass</EnhancedButton>
            <EnhancedButton variant="outline">Outline</EnhancedButton>
            <EnhancedButton variant="ghost">Ghost</EnhancedButton>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <EnhancedButton variant="vg-primary" size="sm">Small</EnhancedButton>
            <EnhancedButton variant="vg-primary" size="default">Default</EnhancedButton>
            <EnhancedButton variant="vg-primary" size="lg">Large</EnhancedButton>
            <EnhancedButton variant="vg-primary" size="xl">Extra Large</EnhancedButton>
          </div>

          <div className="flex flex-wrap gap-4">
            <EnhancedButton variant="vg-primary" loading={loading} onClick={handleLoadingDemo}>
              {loading ? "Loading..." : "Click to Load"}
            </EnhancedButton>
            <EnhancedButton variant="vg-cultural" icon={<Download />} iconPosition="left">
              Download
            </EnhancedButton>
            <EnhancedButton variant="vg-success" icon={<Upload />} iconPosition="right">
              Upload
            </EnhancedButton>
          </div>
        </section>

        {/* Stat Cards */}
        <section className="space-y-6 animate-vg-fade-in">
          <h2 className="text-3xl font-bold">Stat Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Books"
              value="12,543"
              description="Across all libraries"
              icon={BookOpen}
              iconColor="text-vg-primary-600"
              iconBgColor="bg-vg-primary-50 dark:bg-vg-primary-900/20"
              variant="primary"
              trend="up"
              trendValue="+12.5%"
            />
            <StatCard
              title="Active Users"
              value="8,234"
              description="Last 30 days"
              icon={Users}
              iconColor="text-vg-success-600"
              iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
              variant="success"
              trend="up"
              trendValue="+8.2%"
            />
            <StatCard
              title="Engagement Rate"
              value="94.2%"
              description="User satisfaction"
              icon={TrendingUp}
              iconColor="text-vg-cultural-600"
              iconBgColor="bg-vg-cultural-50 dark:bg-vg-cultural-900/20"
              variant="cultural"
              trend="up"
              trendValue="+2.4%"
            />
            <StatCard
              title="Achievements"
              value="1,234"
              description="Badges earned"
              icon={Award}
              iconColor="text-vg-sanskrit-600"
              iconBgColor="bg-vg-sanskrit-50 dark:bg-vg-sanskrit-900/20"
              variant="cultural"
              trend="neutral"
            />
          </div>

          <h3 className="text-2xl font-semibold mt-8">Compact Stat Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CompactStatCard
              title="Downloads"
              value="2,543"
              icon={Download}
              iconColor="text-vg-primary-600"
              iconBgColor="bg-vg-primary-50 dark:bg-vg-primary-900/20"
              trend="up"
              trendValue="+15%"
            />
            <CompactStatCard
              title="Favorites"
              value="1,234"
              icon={Heart}
              iconColor="text-vg-error-600"
              iconBgColor="bg-vg-error-50 dark:bg-vg-error-900/20"
              trend="up"
              trendValue="+8%"
            />
            <CompactStatCard
              title="Ratings"
              value="4.8"
              icon={Star}
              iconColor="text-vg-cultural-600"
              iconBgColor="bg-vg-cultural-50 dark:bg-vg-cultural-900/20"
              trend="neutral"
            />
          </div>
        </section>

        {/* Enhanced Cards */}
        <section className="space-y-6 animate-vg-fade-in">
          <h2 className="text-3xl font-bold">Enhanced Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <EnhancedCard variant="default">
              <EnhancedCardHeader>
                <EnhancedCardTitle>Default Card</EnhancedCardTitle>
                <EnhancedCardDescription>
                  Standard card with hover effects
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  This is a default enhanced card with smooth animations and hover effects.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>

            <EnhancedCard variant="cultural">
              <EnhancedCardHeader>
                <EnhancedCardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-vg-sanskrit-500" />
                  Cultural Card
                </EnhancedCardTitle>
                <EnhancedCardDescription>
                  Special cultural gradient styling
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  Features a beautiful gradient background with cultural colors.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>

            <EnhancedCard variant="glass">
              <EnhancedCardHeader>
                <EnhancedCardTitle>Glass Card</EnhancedCardTitle>
                <EnhancedCardDescription>
                  Glassmorphism effect
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  Modern glass effect with backdrop blur for a premium look.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
          </div>
        </section>

        {/* Loading States */}
        <section className="space-y-6 animate-vg-fade-in">
          <h2 className="text-3xl font-bold">Loading States</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Skeleton Loaders</h3>
              <LoadingSkeleton variant="default" />
              <LoadingSkeleton variant="text" />
              <LoadingSkeleton variant="button" />
              <LoadingSkeleton variant="circle" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Card Skeleton</h3>
              <CardSkeleton showHeader showFooter />
            </div>
          </div>
        </section>

        {/* Animations */}
        <section className="space-y-6 animate-vg-fade-in">
          <h2 className="text-3xl font-bold">Animations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <EnhancedCard className="animate-vg-fade-in">
              <EnhancedCardContent className="pt-6 text-center">
                <p className="font-medium">Fade In</p>
              </EnhancedCardContent>
            </EnhancedCard>
            <EnhancedCard className="animate-vg-scale-in">
              <EnhancedCardContent className="pt-6 text-center">
                <p className="font-medium">Scale In</p>
              </EnhancedCardContent>
            </EnhancedCard>
            <EnhancedCard className="animate-vg-float">
              <EnhancedCardContent className="pt-6 text-center">
                <p className="font-medium">Float</p>
              </EnhancedCardContent>
            </EnhancedCard>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            VG Educational Design System • Book Buddy by VPD
          </p>
          <a href="/dashboard/super-admin">
            <EnhancedButton variant="vg-primary" size="lg">
              View Dashboard
            </EnhancedButton>
          </a>
        </div>
      </div>
    </div>
  )
}

