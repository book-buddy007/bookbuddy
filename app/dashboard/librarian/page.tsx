"use client"

import { useState } from "react"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { StatCard } from "@/components/ui/stat-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Bell,
  BookOpen,
  BookPlus,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Printer,
  Search,
  Tag,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Users,
  Boxes,
  Library,
  TrendingUp,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

// Mock data
const recentActivities = [
  { type: 'Book Return', user: 'Emma Wilson', item: 'The Great Gatsby', time: '10 minutes ago' },
  { type: 'Book Checkout', user: 'Michael Brown', item: 'To Kill a Mockingbird', time: '30 minutes ago' },
  { type: 'Renewal', user: 'Sophia Davis', item: 'Pride and Prejudice', time: '1 hour ago' },
  { type: 'Book Return', user: 'James Johnson', item: '1984', time: '2 hours ago' },
  { type: 'Fine Payment', user: 'William Taylor', item: '$5.50', time: '3 hours ago' },
]

const upcomingReturns = [
  { user: 'Emma Wilson', book: 'The Great Gatsby', dueDate: 'Tomorrow' },
  { user: 'Michael Brown', book: 'To Kill a Mockingbird', dueDate: 'In 2 days' },
  { user: 'Sophia Davis', book: 'Pride and Prejudice', dueDate: 'In 3 days' },
]

const pendingRequests = [
  { user: 'Emma Wilson', type: 'Borrow', book: 'The Great Gatsby', date: 'Today, 10:30 AM' },
  { user: 'Michael Brown', type: 'Return', book: 'To Kill a Mockingbird', date: 'Today, 9:15 AM' },
  { user: 'Sophia Davis', type: 'Renew', book: 'Pride and Prejudice', date: 'Yesterday, 3:45 PM' },
]

const inventoryAlerts = [
  { book: 'The Great Gatsby', issue: 'Missing', priority: 'High' },
  { book: 'To Kill a Mockingbird', issue: 'Damaged Cover', priority: 'Medium' },
  { book: '1984', issue: 'Water Damage', priority: 'High' },
]

export default function LibrarianDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="p-3 md:p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
          <Library className="h-10 w-10 text-blue-700 dark:text-blue-500" />
          Librarian Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage circulation, book entry, and library operations efficiently.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        <StatCard
          title="Pending Requests"
          value="24"
          description="12 borrow, 8 return, 4 renewal"
          icon={Clock}
          iconColor="text-vg-warning-600"
          iconBgColor="bg-vg-warning-50 dark:bg-vg-warning-900/20"
          variant="warning"
          trend="neutral"
        />

        <StatCard
          title="Books Checked Out"
          value="156"
          description="+12 from yesterday"
          icon={BookOpen}
          iconColor="text-vg-primary-600"
          iconBgColor="bg-vg-primary-50 dark:bg-vg-primary-900/20"
          variant="primary"
          trend="up"
          trendValue="+12"
        />

        <StatCard
          title="Overdue Items"
          value="18"
          description="Total fines: $45.50"
          icon={AlertTriangle}
          iconColor="text-vg-error-600"
          iconBgColor="bg-vg-error-50 dark:bg-vg-error-900/20"
          variant="error"
          trend="down"
          trendValue="-3"
        />

        <StatCard
          title="Total Collection"
          value="2,543"
          description="+45 new this month"
          icon={Boxes}
          iconColor="text-vg-success-600"
          iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
          variant="success"
          trend="up"
          trendValue="+45"
        />
      </div>

      {/* Quick Actions - keeping the existing Card structure below */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <EnhancedCard variant="elevated" interactive={true}>
          <EnhancedCardHeader>
            <EnhancedCardTitle className="text-base font-medium">Quick Actions</EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            {/* This will be replaced with proper quick action cards */}
          </EnhancedCardContent>
        </EnhancedCard>
      </div>

      {/* Quick Actions & Activity Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <EnhancedCard variant="elevated" className="md:col-span-2 lg:col-span-1">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
              Quick Actions
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent className="space-y-3">
            <Link href="/dashboard/librarian/cataloging">
              <EnhancedButton className="w-full justify-start" variant="outline" icon={<BookPlus className="h-4 w-4" />}>
                Add New Book
              </EnhancedButton>
            </Link>
            <Link href="/dashboard/librarian/circulation">
              <EnhancedButton className="w-full justify-start" variant="outline" icon={<Clock className="h-4 w-4" />}>
                Process Request
              </EnhancedButton>
            </Link>
            <Link href="/dashboard/librarian/bulk-upload">
              <EnhancedButton className="w-full justify-start" variant="outline" icon={<FileText className="h-4 w-4" />}>
                Bulk Upload Books
              </EnhancedButton>
            </Link>
            <Link href="/dashboard/librarian/label-generator">
              <EnhancedButton className="w-full justify-start" variant="outline" icon={<Tag className="h-4 w-4" />}>
                Generate Labels
              </EnhancedButton>
            </Link>
            <Link href="/dashboard/librarian/analytics">
              <EnhancedButton className="w-full justify-start" variant="outline" icon={<TrendingUp className="h-4 w-4" />}>
                View Reports
              </EnhancedButton>
            </Link>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="elevated">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="bg-gradient-to-r from-vg-success-600 to-vg-primary-600 bg-clip-text text-transparent">
              Recent Activity
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <div className="space-y-4">
              {recentActivities.slice(0, 3).map((activity, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className="min-w-5 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                  </div>
                  <div>
                    <p className="font-medium">{activity.type}</p>
                    <p className="text-muted-foreground">
                      {activity.user} - {activity.item}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
              <Link
                href="/dashboard/librarian/circulation"
                className="text-xs text-primary flex items-center mt-4 hover:underline"
              >
                View all activity <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="elevated">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="bg-gradient-to-r from-vg-warning-600 to-vg-error-600 bg-clip-text text-transparent">
              Inventory Alerts
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <div className="space-y-4">
              {inventoryAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className="min-w-5 mt-0.5">
                    <div className={`h-2 w-2 rounded-full ${
                      alert.priority === 'High' ? 'bg-destructive' : 'bg-amber-500'
                    }`}></div>
                  </div>
                  <div>
                    <p className="font-medium">{alert.book}</p>
                    <p className="text-muted-foreground">{alert.issue}</p>
                    <p className="text-xs text-muted-foreground">Priority: {alert.priority}</p>
                  </div>
                </div>
              ))}
              <Link
                href="/dashboard/librarian/inventory"
                className="text-xs text-primary flex items-center mt-4 hover:underline"
              >
                View all alerts <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
      
      <Tabs defaultValue="upcoming">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming Returns</TabsTrigger>
          <TabsTrigger value= "PENDING">Pending Requests</TabsTrigger>
          <TabsTrigger value="activity">Latest Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {upcomingReturns.map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.book}</p>
                      <p className="text-sm text-muted-foreground">{item.user}</p>
                    </div>
                    <div className="text-sm font-medium">Due: {item.dueDate}</div>
                  </div>
                ))}
                <Link 
                  href="/dashboard/librarian/circulation" 
                  className="text-xs text-primary flex items-center mt-4 hover:underline"
                >
                  View all upcoming returns <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value= "PENDING" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {pendingRequests.map((request, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{request.type}: {request.book}</p>
                      <p className="text-sm text-muted-foreground">{request.user}</p>
                      <p className="text-xs text-muted-foreground">{request.date}</p>
                    </div>
                    <div>
                      <Button size="sm" variant="outline">Process</Button>
                    </div>
                  </div>
                ))}
                <Link 
                  href="/dashboard/librarian/circulation" 
                  className="text-xs text-primary flex items-center mt-4 hover:underline"
                >
                  View all pending requests <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {recentActivities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="min-w-5 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <div>
                      <p className="font-medium">{activity.type}</p>
                      <p className="text-muted-foreground">
                        {activity.user} - {activity.item}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
