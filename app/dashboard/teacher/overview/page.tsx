'use client';

import React from 'react';
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from '@/components/ui/enhanced-card';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, ListChecks, Clock, CalendarDays, GraduationCap, ArrowUpRight, TrendingUp, LayoutDashboard } from '@/components/ui/icons';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function OverviewPage() {
  return (
    <div className="space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent flex items-center gap-3">
          <LayoutDashboard className="h-10 w-10 text-vg-primary-600" />
          Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome to your teacher dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Classes"
          value="4"
          description="128 students enrolled"
          icon={Users}
          iconColor="text-blue-700 dark:text-blue-500"
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          variant="primary"
        />

        <StatCard
          title="Reserved Books"
          value="36"
          description="For upcoming lessons"
          icon={BookOpen}
          iconColor="text-teal-600 dark:text-teal-500"
          iconBgColor="bg-teal-50 dark:bg-teal-900/20"
          variant="cultural"
        />

        <StatCard
          title="Assignment Submissions"
          value="74%"
          description="Average submission rate"
          icon={ListChecks}
          iconColor="text-vg-success-600"
          iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
          variant="success"
          trend="up"
          trendValue="+5%"
        />

        <StatCard
          title="Resource Access"
          value="82%"
          description="Students accessing resources"
          icon={ArrowUpRight}
          iconColor="text-vg-sanskrit-600"
          iconBgColor="bg-vg-sanskrit-50 dark:bg-vg-sanskrit-900/20"
          variant="default"
          trend="up"
          trendValue="+8%"
        />
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="classes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
          <TabsTrigger
            value="classes"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white"
          >
            Classes
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white"
          >
            Assignments
          </TabsTrigger>
          <TabsTrigger
            value="resources"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white"
          >
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
            Your Classes
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <EnhancedCard variant="elevated">
              <EnhancedCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <EnhancedCardTitle className="bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                    English Literature
                  </EnhancedCardTitle>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    32 Students
                  </Badge>
                </div>
                <EnhancedCardDescription>Advanced Placement, Grade 11</EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Resource Utilization</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2 mt-1" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assignment Completion</span>
                      <span className="font-medium">84%</span>
                    </div>
                    <Progress value={84} className="h-2 mt-1" />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>3 Upcoming Deadlines</span>
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <CalendarDays className="h-4 w-4" />
                      View Schedule
                    </Button>
                  </div>
                </div>
              </EnhancedCardContent>
            </EnhancedCard>

            <EnhancedCard variant="elevated">
              <EnhancedCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <EnhancedCardTitle className="bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                    World History
                  </EnhancedCardTitle>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    28 Students
                  </Badge>
                </div>
                <EnhancedCardDescription>Regular Track, Grade 10</EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Resource Utilization</span>
                      <span className="font-medium">65%</span>
                    </div>
                    <Progress value={65} className="h-2 mt-1" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assignment Completion</span>
                      <span className="font-medium">72%</span>
                    </div>
                    <Progress value={72} className="h-2 mt-1" />
                  </div>

                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>1 Upcoming Deadline</span>
                    <EnhancedButton variant="ghost" size="sm" className="h-8 gap-1">
                      <CalendarDays className="h-4 w-4" />
                      View Schedule
                    </EnhancedButton>
                  </div>
                </div>
              </EnhancedCardContent>
            </EnhancedCard>

            <EnhancedCard variant="elevated">
              <EnhancedCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <EnhancedCardTitle className="bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                    Science
                  </EnhancedCardTitle>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    35 Students
                  </Badge>
                </div>
                <EnhancedCardDescription>Advanced Placement, Grade 10</EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Resource Utilization</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2 mt-1" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assignment Completion</span>
                      <span className="font-medium">88%</span>
                    </div>
                    <Progress value={88} className="h-2 mt-1" />
                  </div>

                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>4 Upcoming Deadlines</span>
                    <EnhancedButton variant="ghost" size="sm" className="h-8 gap-1">
                      <CalendarDays className="h-4 w-4" />
                      View Schedule
                    </EnhancedButton>
                  </div>
                </div>
              </EnhancedCardContent>
            </EnhancedCard>

            <EnhancedCard variant="elevated">
              <EnhancedCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <EnhancedCardTitle className="bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                    Mathematics
                  </EnhancedCardTitle>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    33 Students
                  </Badge>
                </div>
                <EnhancedCardDescription>Honors, Grade 11</EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Resource Utilization</span>
                      <span className="font-medium">81%</span>
                    </div>
                    <Progress value={81} className="h-2 mt-1" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assignment Completion</span>
                      <span className="font-medium">79%</span>
                    </div>
                    <Progress value={79} className="h-2 mt-1" />
                  </div>

                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>2 Upcoming Deadlines</span>
                    <EnhancedButton variant="ghost" size="sm" className="h-8 gap-1">
                      <CalendarDays className="h-4 w-4" />
                      View Schedule
                    </EnhancedButton>
                  </div>
                </div>
              </EnhancedCardContent>
            </EnhancedCard>
          </div>
        </TabsContent>
        
        <TabsContent value="assignments" className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight mt-6">Recent Assignments</h2>
          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Assignment Status</CardTitle>
                <CardDescription>
                  Overview of your recent assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">Modernist Literature Analysis</div>
                        <div className="text-sm text-muted-foreground">English Literature • Due in 3 days</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">26/32 submitted</div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">81%</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">Cold War Research Paper</div>
                        <div className="text-sm text-muted-foreground">World History • Due tomorrow</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">14/28 submitted</div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">50%</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">Ecosystem Study Report</div>
                        <div className="text-sm text-muted-foreground">Science • Due in 5 days</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">29/35 submitted</div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">83%</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">Calculus Problem Set #4</div>
                        <div className="text-sm text-muted-foreground">Mathematics • Due in 2 days</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">18/33 submitted</div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">55%</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium">Lab Exercise: Chemical Reactions</div>
                        <div className="text-sm text-muted-foreground">Science • Due in 1 week</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">7/35 submitted</div>
                        <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">20%</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="resources" className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight mt-6">Resource Management</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Reading Lists</CardTitle>
                <CardDescription>
                  Curated resources for your classes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <div className="font-medium">20th Century American Literature</div>
                      <div className="text-sm text-muted-foreground">English Literature • 12 resources</div>
                    </div>
                    <Badge>Published</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <div className="font-medium">World War II Primary Sources</div>
                      <div className="text-sm text-muted-foreground">World History • 8 resources</div>
                    </div>
                    <Badge>Published</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">Climate Science Collection</div>
                      <div className="text-sm text-muted-foreground">Science • 15 resources</div>
                    </div>
                    <Badge variant="outline">Draft</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Reserved Books</CardTitle>
                <CardDescription>
                  Books reserved for classroom use
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <div className="font-medium">Class Set: To Kill a Mockingbird</div>
                      <div className="text-sm text-muted-foreground">English Literature • 35 copies</div>
                    </div>
                    <Badge className="bg-green-50 text-green-700 hover:bg-green-50">Confirmed</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <div className="font-medium">Historical Atlas Collection</div>
                      <div className="text-sm text-muted-foreground">World History • 15 copies</div>
                    </div>
                    <Badge className="bg-green-50 text-green-700 hover:bg-green-50">Confirmed</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">Physics Lab Manuals</div>
                      <div className="text-sm text-muted-foreground">Science • 20 copies</div>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Upcoming Schedule</CardTitle>
            <CardDescription>
              Your reservations and due dates for the week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center py-2">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Library Lab Session</div>
                  <div className="text-sm text-muted-foreground">Science Class • Today at 2:30 PM</div>
                </div>
                <Badge className="ml-2 bg-green-50 text-green-700 hover:bg-green-50">Confirmed</Badge>
              </div>
              
              <div className="flex items-center py-2">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Research Paper Due</div>
                  <div className="text-sm text-muted-foreground">World History • Tomorrow</div>
                </div>
                <Badge variant="outline" className="ml-2">Assignment</Badge>
              </div>
              
              <div className="flex items-center py-2">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Book Discussion Session</div>
                  <div className="text-sm text-muted-foreground">English Literature • Friday at 10:00 AM</div>
                </div>
                <Badge className="ml-2 bg-green-50 text-green-700 hover:bg-green-50">Confirmed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>
              Recent communications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start py-2">
                <GraduationCap className="h-5 w-5 mt-1 mr-3 text-muted-foreground" />
                <div>
                  <div className="font-medium">Ms. Johnson, Librarian</div>
                  <div className="text-sm text-muted-foreground">Your book reservation has been confirmed for Friday.</div>
                  <div className="text-xs text-muted-foreground mt-1">2 hours ago</div>
                </div>
              </div>
              
              <div className="flex items-start py-2">
                <GraduationCap className="h-5 w-5 mt-1 mr-3 text-muted-foreground" />
                <div>
                  <div className="font-medium">System Notification</div>
                  <div className="text-sm text-muted-foreground">5 students haven't accessed the required reading.</div>
                  <div className="text-xs text-muted-foreground mt-1">Yesterday</div>
                </div>
              </div>
              
              <div className="flex items-start py-2">
                <GraduationCap className="h-5 w-5 mt-1 mr-3 text-muted-foreground" />
                <div>
                  <div className="font-medium">Mr. Roberts, Principal</div>
                  <div className="text-sm text-muted-foreground">Please submit your resource needs for next semester.</div>
                  <div className="text-xs text-muted-foreground mt-1">2 days ago</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 