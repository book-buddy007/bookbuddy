"use client"

import React from 'react'
import { useState } from "react"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { StatCard } from "@/components/ui/stat-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Bell, BookOpen, GraduationCap, Plus, Search, Users, BookMarked, BookCheck, Clock, CalendarDays, FileText, ChevronRight, Headphones, TrendingUp } from "@/components/ui/icons"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// Mock data for statistics and charts
const readingActivityData = [
  { month: 'Jan', books: 15 },
  { month: 'Feb', books: 18 },
  { month: 'Mar', books: 22 },
  { month: 'Apr', books: 19 },
  { month: 'May', books: 25 },
  { month: 'Jun', books: 28 },
  { month: 'Jul', books: 12 },
  { month: 'Aug', books: 20 },
  { month: 'Sep', books: 30 },
]

const resourcesUsageData = [
  { name: 'Physical Books', value: 45, color: '#0ea5e9' },
  { name: 'E-Books', value: 25, color: '#8b5cf6' },
  { name: 'Articles', value: 15, color: '#f97316' },
  { name: 'Other Resources', value: 15, color: '#10b981' },
]

const studentEngagementData = [
  { month: 'Apr', assignments: 85, readings: 65 },
  { month: 'May', assignments: 78, readings: 70 },
  { month: 'Jun', assignments: 90, readings: 75 },
  { month: 'Jul', assignments: 65, readings: 60 },
  { month: 'Aug', assignments: 70, readings: 58 },
  { month: 'Sep', assignments: 88, readings: 80 },
]

// Mock recent activities
const recentActivities = [
  {
    id: 1,
    type: 'bookReservation',
    title: 'Reserved 30 copies of "To Kill a Mockingbird"',
    time: '2 hours ago',
    class: 'English Literature',
    status: 'APPROVED',
  },
  {
    id: 2,
    type: 'assignmentCreated',
    title: 'Created "Cold War Research Paper" assignment',
    time: '1 day ago',
    class: 'World History',
    status: 'published',
  },
  {
    id: 3,
    type: 'readingList',
    title: 'Updated reading list for "Science" class',
    time: '3 days ago',
    class: 'Science',
    status: 'COMPLETED',
  },
  {
    id: 4, 
    type: 'studentRequest',
    title: 'Emma Watson requested access to "Calculus Advanced Topics"',
    time: '5 days ago',
    class: 'Mathematics',
    status: 'PENDING',
  },
  {
    id: 5,
    type: 'bookReservation',
    title: 'Reserved 25 copies of "Great Expectations"',
    time: '1 week ago',
    class: 'English Literature',
    status: 'APPROVED',
  },
]

// Mock upcoming events
const upcomingEvents = [
  {
    id: 1,
    title: 'Book collection: "To Kill a Mockingbird"',
    date: new Date(2023, 8, 20),
    class: 'English Literature',
  },
  {
    id: 2,
    title: 'Assignment due: "Cold War Research Paper"',
    date: new Date(2023, 8, 15),
    class: 'World History',
  },
  {
    id: 3,
    title: 'Assignment due: "Ecosystem Study Report"',
    date: new Date(2023, 8, 25),
    class: 'Science',
  },
  {
    id: 4,
    title: 'Book reservation expiry: "Great Expectations"',
    date: new Date(2023, 8, 30),
    class: 'English Literature',
  },
]

// Format date consistently
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export default function TeacherDashboard() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-bb-accent">
          <GraduationCap className="h-10 w-10 text-blue-700 dark:text-blue-500" />
          Teacher Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome back! Manage your classes, track student progress, and assign resources.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Reservations"
          value="24"
          description="+12% from last month"
          icon={BookMarked}
          iconColor="text-vg-primary-600"
          iconBgColor="bg-vg-primary-50 dark:bg-vg-primary-900/20"
          variant="primary"
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Books Assigned"
          value="145"
          description="+5% from last month"
          icon={BookOpen}
          iconColor="text-vg-sanskrit-600"
          iconBgColor="bg-vg-sanskrit-50 dark:bg-vg-sanskrit-900/20"
          variant="cultural"
          trend="up"
          trendValue="+5%"
        />
        <StatCard
          title="Active Students"
          value="128"
          description="+2% from last semester"
          icon={Users}
          iconColor="text-vg-success-600"
          iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
          variant="success"
          trend="up"
          trendValue="+2%"
        />
        <StatCard
          title="Reading Completion"
          value="78%"
          description="+8% from last month"
          icon={TrendingUp}
          iconColor="text-vg-cultural-600"
          iconBgColor="bg-vg-cultural-50 dark:bg-vg-cultural-900/20"
          variant="default"
          trend="up"
          trendValue="+8%"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <EnhancedCard
          variant="elevated"
          interactive={true}
          className="cursor-pointer"
          onClick={() => window.location.href = "/catalog"}
        >
          <EnhancedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <EnhancedCardTitle className="text-base font-medium">Browse Library</EnhancedCardTitle>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue-700 dark:text-blue-500" />
            </div>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <p className="text-sm text-muted-foreground">Explore the complete digital library</p>
            <EnhancedButton variant="ghost" size="sm" className="mt-2 px-0">
              View Library <ChevronRight className="ml-1 h-4 w-4" />
            </EnhancedButton>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard
          variant="elevated"
          interactive={true}
          className="cursor-pointer"
          onClick={() => window.location.href = "/dashboard/teacher/resources"}
        >
          <EnhancedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <EnhancedCardTitle className="text-base font-medium">Teaching Resources</EnhancedCardTitle>
            <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <p className="text-sm text-muted-foreground">Access and manage educational materials</p>
            <EnhancedButton variant="ghost" size="sm" className="mt-2 px-0">
              View Resources <ChevronRight className="ml-1 h-4 w-4" />
            </EnhancedButton>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard
          variant="elevated"
          interactive={true}
          className="cursor-pointer"
          onClick={() => window.location.href = "/player/v2"}
        >
          <EnhancedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <EnhancedCardTitle className="text-base font-medium">Audiobook Player</EnhancedCardTitle>
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
              <Headphones className="h-5 w-5 text-teal-600 dark:text-teal-500" />
            </div>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <p className="text-sm text-muted-foreground">Listen to audiobooks with our modern player</p>
            <EnhancedButton variant="ghost" size="sm" className="mt-2 px-0">
              Open Player <ChevronRight className="ml-1 h-4 w-4" />
            </EnhancedButton>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="activities" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white">
            Recent Activities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <EnhancedCard variant="elevated" className="col-span-1">
              <EnhancedCardHeader>
                <EnhancedCardTitle className="text-bb-accent">
                  Reading Activity
                </EnhancedCardTitle>
                <EnhancedCardDescription>Monthly book and resource usage</EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={readingActivityData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="books" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedCardContent>
            </EnhancedCard>

            <EnhancedCard variant="elevated" className="col-span-1">
              <EnhancedCardHeader>
                <EnhancedCardTitle className="text-bb-accent">
                  Resource Usage
                </EnhancedCardTitle>
                <EnhancedCardDescription>Distribution by resource type</EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={resourcesUsageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {resourcesUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 text-sm mt-4">
                  {resourcesUsageData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </EnhancedCardContent>
            </EnhancedCard>
          </div>

          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="text-bb-accent">
                Upcoming Events
              </EnhancedCardTitle>
              <EnhancedCardDescription>Books and assignments due dates</EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-vg-primary-100 to-vg-sanskrit-100 dark:from-vg-primary-900/30 dark:to-vg-sanskrit-900/30">
                      <CalendarDays className="h-6 w-6 text-vg-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.class}</p>
                    </div>
                    <div className="text-sm font-medium text-vg-primary-600">
                      {formatDate(event.date)}
                    </div>
                  </div>
                ))}
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="text-bb-accent">
                Student Engagement
              </EnhancedCardTitle>
              <EnhancedCardDescription>Assignment completion vs. reading progress</EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={studentEngagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="assignments"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="Assignment Completion"
                  />
                  <Line
                    type="monotone"
                    dataKey="readings"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="Reading Progress"
                  />
                </LineChart>
              </ResponsiveContainer>
            </EnhancedCardContent>
          </EnhancedCard>

          <div className="grid gap-4 md:grid-cols-2">
            <EnhancedCard variant="elevated">
              <EnhancedCardHeader>
                <EnhancedCardTitle className="text-bb-accent">
                  Top Performing Students
                </EnhancedCardTitle>
                <EnhancedCardDescription>Based on activity and completion rates</EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Emma Watson', class: 'Science', score: 94 },
                    { name: 'Thomas Anderson', class: 'Mathematics', score: 92 },
                    { name: 'Olivia Martinez', class: 'English Literature', score: 90 },
                    { name: 'James Wilson', class: 'World History', score: 88 },
                  ].map((student, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.class}</p>
                      </div>
                      <div className="font-semibold">{student.score}%</div>
                    </div>
                  ))}
                </div>
              </EnhancedCardContent>
            </EnhancedCard>

            <EnhancedCard variant="elevated">
              <EnhancedCardHeader>
                <EnhancedCardTitle className="text-bb-accent">
                  Most Popular Resources
                </EnhancedCardTitle>
                <EnhancedCardDescription>Based on usage analytics</EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <div className="space-y-4">
                  {[
                    { title: 'To Kill a Mockingbird', author: 'Harper Lee', views: 128 },
                    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', views: 114 },
                    { title: '1984', author: 'George Orwell', views: 96 },
                    { title: 'The Catcher in the Rye', author: 'J.D. Salinger', views: 82 },
                  ].map((book, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{book.title}</p>
                        <p className="text-sm text-muted-foreground">{book.author}</p>
                      </div>
                      <div className="font-medium text-sm">
                        {book.views} views
                      </div>
                    </div>
                  ))}
                </div>
              </EnhancedCardContent>
            </EnhancedCard>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Your recent library management activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      {activity.type === 'bookReservation' ? (
                        <BookMarked className="h-4 w-4 text-primary" />
                      ) : activity.type === 'assignmentCreated' ? (
                        <FileText className="h-4 w-4 text-primary" />
                      ) : activity.type === 'readingList' ? (
                        <BookOpen className="h-4 w-4 text-primary" />
                      ) : (
                        <Users className="h-4 w-4 text-primary" />
                      )}
                        </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{activity.title}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {activity.time}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.class}</p>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            activity.status === 'APPROVED'
                              ? 'bg-green-100 text-green-700'
                              : activity.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : activity.status === 'published'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {activity.status}
                        </span>
                      </div>
                        </div>
                      </div>
                    ))}
                  </div>
              <div className="mt-6 text-center">
                <Button variant="outline">View All Activities</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
