import React from "react";
import { Metadata } from "next";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import {
  EnhancedCard,
  EnhancedCardContent,
  EnhancedCardDescription,
  EnhancedCardHeader,
  EnhancedCardTitle,
  EnhancedCardFooter,
} from "@/components/ui/enhanced-card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  BarChart3,
  PieChart,
  LineChart,
  Users,
  BookOpen,
  BookUp,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics | Librarian Dashboard",
  description: "Library usage statistics and data analysis",
};

// Mock data for charts and statistics
const mockOverviewStats = [
  {
    title: "Total Checkouts",
    value: "2,851",
    change: "+12.5%",
    trend: "up",
  },
  {
    title: "Active Borrowers",
    value: "487",
    change: "+4.2%",
    trend: "up",
  },
  {
    title: "Overdue Items",
    value: "32",
    change: "-8.1%",
    trend: "down",
  },
  {
    title: "New Acquisitions",
    value: "156",
    change: "+24.3%",
    trend: "up",
  },
];

const mockPopularCategories = [
  { category: "Fiction", count: 856, percentage: 30 },
  { category: "Science & Technology", count: 542, percentage: 19 },
  { category: "History", count: 389, percentage: 14 },
  { category: "Biography", count: 287, percentage: 10 },
  { category: "Art & Design", count: 245, percentage: 9 },
  { category: "Others", count: 532, percentage: 18 },
];

const mockBorrowerTypes = [
  { type: "Undergraduate Students", count: 1245, percentage: 48 },
  { type: "Graduate Students", count: 723, percentage: 28 },
  { type: "Faculty", count: 386, percentage: 15 },
  { type: "Staff", count: 158, percentage: 6 },
  { type: "External Members", count: 84, percentage: 3 },
];

const BorrowersChart = () => (
  <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-md">
    <div className="text-center flex flex-col items-center">
      <PieChart className="h-8 w-8 mb-2 text-slate-400" />
      <p className="text-sm text-slate-500">Borrower Type Distribution Chart</p>
      <p className="text-xs text-slate-400">(Chart visualization would render here)</p>
    </div>
  </div>
);

const CategoriesChart = () => (
  <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-md">
    <div className="text-center flex flex-col items-center">
      <BarChart3 className="h-8 w-8 mb-2 text-slate-400" />
      <p className="text-sm text-slate-500">Popular Categories Chart</p>
      <p className="text-xs text-slate-400">(Chart visualization would render here)</p>
    </div>
  </div>
);

const CirculationTrendsChart = () => (
  <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-md">
    <div className="text-center flex flex-col items-center">
      <LineChart className="h-8 w-8 mb-2 text-slate-400" />
      <p className="text-sm text-slate-500">Circulation Trends Chart</p>
      <p className="text-xs text-slate-400">(Chart visualization would render here)</p>
    </div>
  </div>
);

const AnalyticsPage = () => {
  const getStatIcon = (title: string) => {
    if (title.includes('Checkouts')) return BookOpen;
    if (title.includes('Borrowers')) return Users;
    if (title.includes('Overdue')) return ArrowDownRight;
    if (title.includes('Acquisitions')) return BookUp;
    return TrendingUp;
  };

  return (
    <div className="p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
            <TrendingUp className="h-10 w-10 text-blue-700 dark:text-blue-500" />
            Analytics
          </h1>
          <p className="text-muted-foreground text-lg">
            Library usage statistics and data analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="30">
            <SelectTrigger className="w-[180px] bg-white/70 dark:bg-gray-800/70 backdrop-blur-md">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <EnhancedButton variant="outline" icon={<Download className="h-4 w-4" />}>
            Export
          </EnhancedButton>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {mockOverviewStats.map((stat, i) => (
          <StatCard
            key={i}
            title={stat.title}
            value={stat.value}
            description={`${stat.change} from last month`}
            icon={getStatIcon(stat.title)}
            iconColor={stat.trend === 'up' ? 'text-vg-success-600' : 'text-vg-error-600'}
            iconBgColor={stat.trend === 'up' ? 'bg-vg-success-50 dark:bg-vg-success-900/20' : 'bg-vg-error-50 dark:bg-vg-error-900/20'}
            variant={stat.trend === 'up' ? 'success' : 'error'}
            trend={stat.trend === 'up' ? 'up' : 'down'}
            trendValue={stat.change}
          />
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="circulation"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            Circulation
          </TabsTrigger>
          <TabsTrigger
            value="collection"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            Collection
          </TabsTrigger>
          <TabsTrigger
            value="borrowers"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            Borrowers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <EnhancedCard>
              <EnhancedCardHeader>
                <EnhancedCardTitle className="text-lg">Circulation Trends</EnhancedCardTitle>
                <EnhancedCardDescription>
                  Checkouts and returns over time
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <CirculationTrendsChart />
              </EnhancedCardContent>
            </EnhancedCard>

            <EnhancedCard>
              <EnhancedCardHeader>
                <EnhancedCardTitle className="text-lg">Popular Categories</EnhancedCardTitle>
                <EnhancedCardDescription>
                  Most borrowed categories
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <CategoriesChart />
              </EnhancedCardContent>
              <EnhancedCardFooter>
                <div className="w-full space-y-2">
                  {mockPopularCategories.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="text-sm">{item.category}</div>
                      <div className="text-sm text-muted-foreground">{item.count} checkouts</div>
                    </div>
                  ))}
                </div>
              </EnhancedCardFooter>
            </EnhancedCard>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <EnhancedCard className="col-span-1">
              <EnhancedCardHeader>
                <EnhancedCardTitle className="text-lg">Borrower Types</EnhancedCardTitle>
                <EnhancedCardDescription>
                  Distribution of borrower categories
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <BorrowersChart />
              </EnhancedCardContent>
              <EnhancedCardFooter>
                <div className="w-full space-y-2">
                  {mockBorrowerTypes.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="text-sm">{item.type}</div>
                      <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                    </div>
                  ))}
                </div>
              </EnhancedCardFooter>
            </EnhancedCard>

            <EnhancedCard className="col-span-2">
              <EnhancedCardHeader>
                <EnhancedCardTitle className="text-lg">Key Insights</EnhancedCardTitle>
                <EnhancedCardDescription>
                  Important trends and observations
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <BookOpen className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Fiction Dominates Borrowing</h4>
                      <p className="text-sm text-muted-foreground">Fiction represents 30% of all checkouts, with mystery and thriller sub-genres being the most popular.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Users className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Undergraduate Usage Increased</h4>
                      <p className="text-sm text-muted-foreground">Undergraduate student borrowing has increased by 15% compared to the previous semester.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-100 p-2 rounded-full">
                      <BookUp className="h-5 w-5 text-yellow-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Digital Resources Adoption</h4>
                      <p className="text-sm text-muted-foreground">E-book and digital resource usage has increased by 28% in the past quarter.</p>
                    </div>
                  </div>
                </div>
              </EnhancedCardContent>
            </EnhancedCard>
          </div>
        </TabsContent>

        <TabsContent value="circulation" className="space-y-4 mt-4">
          <EnhancedCard>
            <EnhancedCardHeader>
              <EnhancedCardTitle>Circulation Statistics</EnhancedCardTitle>
              <EnhancedCardDescription>
                Detailed analysis of library circulation
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="flex items-center justify-center h-80 bg-slate-50 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground">Detailed circulation analytics will be shown here</p>
                </div>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="collection" className="space-y-4 mt-4">
          <EnhancedCard>
            <EnhancedCardHeader>
              <EnhancedCardTitle>Collection Analysis</EnhancedCardTitle>
              <EnhancedCardDescription>
                Statistics about your library collection
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="flex items-center justify-center h-80 bg-slate-50 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground">Collection analytics will be shown here</p>
                </div>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="borrowers" className="space-y-4 mt-4">
          <EnhancedCard>
            <EnhancedCardHeader>
              <EnhancedCardTitle>Borrower Analytics</EnhancedCardTitle>
              <EnhancedCardDescription>
                Patron usage patterns and demographics
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="flex items-center justify-center h-80 bg-slate-50 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground">Borrower analytics will be shown here</p>
                </div>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage; 