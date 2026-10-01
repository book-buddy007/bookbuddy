'use client';

import { useState, useEffect } from "react";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { useAdminState } from "@/hooks/use-admin-state";
import { LoadingSkeleton } from "@/components/admin/shared/Skeleton";
import { BarChart, LineChart, PieChart, TrendingUp, Users, BookOpen, Download } from "@/components/ui/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock data for analytics
const mockBorrowingTrends = [
  { month: "Jan", physical: 145, ebook: 82, audiobook: 37 },
  { month: "Feb", physical: 158, ebook: 97, audiobook: 42 },
  { month: "Mar", physical: 172, ebook: 105, audiobook: 48 },
  { month: "Apr", physical: 138, ebook: 112, audiobook: 51 },
  { month: "May", physical: 152, ebook: 127, audiobook: 59 },
  { month: "Jun", physical: 124, ebook: 135, audiobook: 64 },
];

const mockOverdueStats = [
  { name: "On Time", value: 78 },
  { name: "1-3 Days Late", value: 12 },
  { name: "4-7 Days Late", value: 6 },
  { name: "8+ Days Late", value: 4 },
];

const mockUserEngagement = [
  { day: "Mon", visitors: 243, actions: 452 },
  { day: "Tue", visitors: 278, actions: 512 },
  { day: "Wed", visitors: 296, actions: 538 },
  { day: "Thu", visitors: 287, actions: 501 },
  { day: "Fri", visitors: 268, actions: 473 },
  { day: "Sat", visitors: 187, actions: 318 },
  { day: "Sun", visitors: 152, actions: 286 },
];

// Bar Chart Component
const EngagementBarChart = () => {
  return (
    <div className="w-full h-72 relative">
      <div className="absolute bottom-0 left-0 right-0 h-64 flex items-end">
        {mockUserEngagement.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex flex-col items-center w-full gap-1">
              <div 
                className="w-5/6 bg-blue-500 rounded-t" 
                style={{ height: `${day.actions / 6}px` }}
                title={`${day.actions} actions`}
              />
              <div 
                className="w-5/6 bg-blue-300 rounded-t" 
                style={{ height: `${day.visitors / 3}px` }}
                title={`${day.visitors} visitors`}
              />
            </div>
            <span className="text-xs mt-1">{day.day}</span>
          </div>
        ))}
      </div>
      <div className="absolute top-0 right-2 flex gap-4">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1" />
          <span className="text-xs">Actions</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-300 mr-1" />
          <span className="text-xs">Visitors</span>
        </div>
      </div>
    </div>
  );
};

// Line Chart Component
const BorrowingTrendsChart = () => {
  return (
    <div className="w-full h-72 relative">
      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1 relative">
          {/* Y-axis labels */}
          <div className="absolute top-0 left-0 bottom-0 w-10 flex flex-col justify-between text-xs text-muted-foreground">
            <span>200</span>
            <span>150</span>
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
          
          {/* Grid lines */}
          <div className="absolute top-0 left-10 right-0 bottom-0">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="absolute w-full border-t border-gray-100" style={{ top: `${i * 25}%` }} />
            ))}
          </div>
          
          {/* Line chart paths */}
          <svg className="absolute top-0 left-10 right-0 bottom-0" viewBox="0 0 600 200" preserveAspectRatio="none">
            {/* Physical books line */}
            <polyline
              points="0,110 100,84 200,70 300,124 400,96 500,152"
              stroke="#0ea5e9"
              strokeWidth="2"
              fill="none"
            />
            
            {/* E-books line */}
            <polyline
              points="0,158 100,150 200,145 300,140 400,130 500,125"
              stroke="#8b5cf6"
              strokeWidth="2"
              fill="none"
            />
            
            {/* Audiobooks line */}
            <polyline
              points="0,180 100,178 200,176 300,174 400,170 500,168"
              stroke="#f59e0b"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          
          {/* Data points */}
          <div className="absolute top-0 left-10 right-0 bottom-0 pointer-events-none">
            {mockBorrowingTrends.map((point, idx) => {
              const x = `${(idx / (mockBorrowingTrends.length - 1)) * 100}%`;
              return (
                <div key={idx} className="absolute flex flex-col items-center" style={{ left: x }}>
                  <div 
                    className="absolute w-2 h-2 rounded-full bg-blue-500 border border-white"
                    style={{ top: `${(200 - point.physical) * 0.5}px` }}
                  />
                  <div 
                    className="absolute w-2 h-2 rounded-full bg-purple-500 border border-white"
                    style={{ top: `${(200 - point.ebook) * 0.5}px` }}
                  />
                  <div 
                    className="absolute w-2 h-2 rounded-full bg-amber-500 border border-white"
                    style={{ top: `${(200 - point.audiobook) * 0.5}px` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        {/* X-axis labels */}
        <div className="h-6 flex items-center pl-10">
          {mockBorrowingTrends.map((point, idx) => (
            <div key={idx} className="flex-1 text-center text-xs text-muted-foreground">
              {point.month}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute top-0 right-2 flex flex-col gap-1">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1" />
          <span className="text-xs">Physical</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-purple-500 mr-1" />
          <span className="text-xs">E-books</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-amber-500 mr-1" />
          <span className="text-xs">Audiobooks</span>
        </div>
      </div>
    </div>
  );
};

// Pie Chart Component
const OverduePieChart = () => {
  const total = mockOverdueStats.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  
  return (
    <div className="w-full h-72 flex items-center justify-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100">
          {mockOverdueStats.map((segment, index) => {
            const startAngle = currentAngle;
            const segmentPercent = segment.value / total;
            const segmentAngle = segmentPercent * 360;
            currentAngle += segmentAngle;
            
            // Convert to radians and calculate path
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (startAngle + segmentAngle - 90) * Math.PI / 180;
            const x1 = 50 + 48 * Math.cos(startRad);
            const y1 = 50 + 48 * Math.sin(startRad);
            const x2 = 50 + 48 * Math.cos(endRad);
            const y2 = 50 + 48 * Math.sin(endRad);
            
            // Determine if it's a large arc
            const largeArcFlag = segmentAngle > 180 ? 1 : 0;
            
            const pathData = [
              `M 50 50`,
              `L ${x1} ${y1}`,
              `A 48 48 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `Z`
            ].join(' ');
            
            // Assign different colors
            const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];
            
            return (
              <path
                key={index}
                d={pathData}
                fill={colors[index]}
                stroke="#fff"
                strokeWidth="0.5"
              />
            );
          })}
          <circle cx="50" cy="50" r="20" fill="white" />
        </svg>
        
        {/* Percentage in center */}
        <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
          {mockOverdueStats[0].value}%
          <span className="text-xs ml-1">On Time</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="ml-8 space-y-1">
        {mockOverdueStats.map((item, index) => {
          const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];
          return (
            <div key={index} className="flex items-center">
              <div className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: colors[index] }} />
              <span className="text-sm">{item.name}: {item.value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function AdminAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("engagement");
  const [timeRange, setTimeRange] = useState("week");
  
  // Simulate loading data from API
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
            <TrendingUp className="h-10 w-10 text-blue-700 dark:text-blue-500" />
            Analytics & Insights
          </h1>
          <p className="text-muted-foreground text-lg">
            Track library usage, borrowing trends, and user engagement
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <EnhancedButton variant="outline" icon={<Download className="h-4 w-4" />}>
            Export
          </EnhancedButton>
        </div>
      </div>

      <LoadingSkeleton loading={isLoading}>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Checkouts"
            value="2,874"
            description={`+12% from previous ${timeRange}`}
            icon={BookOpen}
            iconColor="text-blue-700 dark:text-blue-500"
            iconBgColor="bg-blue-50 dark:bg-blue-900/20"
            variant="primary"
            trend="up"
            trendValue="+12%"
          />

          <StatCard
            title="Active Users"
            value="843"
            description={`+5% from previous ${timeRange}`}
            icon={Users}
            iconColor="text-vg-success-600"
            iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
            variant="success"
            trend="up"
            trendValue="+5%"
          />

          <StatCard
            title="Overdue Items"
            value="37"
            description={`-8% from previous ${timeRange}`}
            icon={TrendingUp}
            iconColor="text-vg-warning-600"
            iconBgColor="bg-vg-warning-50 dark:bg-vg-warning-900/20"
            variant="warning"
            trend="down"
            trendValue="-8%"
          />
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="engagement" onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
            <TabsTrigger
              value="engagement"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white"
            >
              <BarChart className="w-4 h-4" />
              User Engagement
            </TabsTrigger>
            <TabsTrigger
              value="borrowing"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white"
            >
              <LineChart className="w-4 h-4" />
              Borrowing Trends
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white"
            >
              <PieChart className="w-4 h-4" />
              Return Compliance
            </TabsTrigger>
          </TabsList>

          <EnhancedCard variant="elevated">
            <EnhancedCardContent className="p-6">
              <TabsContent value="engagement" className="mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                    Daily User Activity
                  </h3>
                  <EnhancedButton variant="outline" size="sm" icon={<Download className="h-4 w-4" />}>
                    Export Data
                  </EnhancedButton>
                </div>
                <EngagementBarChart />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Avg. Daily Visitors</div>
                    <div className="text-xl font-semibold">244</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Avg. Actions/User</div>
                    <div className="text-xl font-semibold">1.8</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Busiest Day</div>
                    <div className="text-xl font-semibold">Wednesday</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Peak Hour</div>
                    <div className="text-xl font-semibold">2-3 PM</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="borrowing" className="mt-0">
                <div className="mb-2 flex justify-between">
                  <h3 className="text-lg font-medium">Material Borrowing by Type</h3>
                  <EnhancedButton variant="outline" size="sm">Export Data</EnhancedButton>
                </div>
                <BorrowingTrendsChart />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Physical Books</div>
                    <div className="text-xl font-semibold">889</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">E-Books</div>
                    <div className="text-xl font-semibold">658</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Audiobooks</div>
                    <div className="text-xl font-semibold">301</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Growth</div>
                    <div className="text-xl font-semibold">+8.4%</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="overdue" className="mt-0">
                <div className="mb-2 flex justify-between">
                  <h3 className="text-lg font-medium">Return Compliance Rate</h3>
                  <EnhancedButton variant="outline" size="sm">Export Data</EnhancedButton>
                </div>
                <OverduePieChart />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Compliance Rate</div>
                    <div className="text-xl font-semibold">78%</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Avg. Overdue Days</div>
                    <div className="text-xl font-semibold">2.3</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Total Fines</div>
                    <div className="text-xl font-semibold">$349.50</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-muted-foreground text-sm">Collected</div>
                    <div className="text-xl font-semibold">$287.25</div>
                  </div>
                </div>
              </TabsContent>
            </EnhancedCardContent>
          </EnhancedCard>
        </Tabs>
      </LoadingSkeleton>
    </div>
  );
}
