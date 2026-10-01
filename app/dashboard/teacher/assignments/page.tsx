'use client';

import React from 'react';
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from '@/components/ui/enhanced-card';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedButton } from '@/components/ui/enhanced-button';
const ResourceLinker = (props: any) => <div className="p-8 text-center text-muted-foreground bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed">Resource Linker (Under Construction)</div>;
import { CalendarDays, FileText, Plus, BookOpen, ClipboardList, TrendingUp } from 'lucide-react';

// Mock data for demo purposes
const mockAssignments = [
  {
    id: 'a1',
    title: 'Modernist Literature Analysis',
    description: 'Analyze the themes and techniques in modernist literature works.',
    classId: 'cl1',
    className: 'English Literature',
    dueDate: new Date(2023, 8, 20),
    status: 'published' as const,
    resourceIds: ['r1', 'r2', 'r3']
  },
  {
    id: 'a2',
    title: 'Cold War Research Paper',
    description: 'Research and write a paper on a specific aspect of the Cold War.',
    classId: 'cl2',
    className: 'World History',
    dueDate: new Date(2023, 8, 15),
    status: 'published' as const,
    resourceIds: ['r4', 'r5']
  },
  {
    id: 'a3',
    title: 'Ecosystem Study Report',
    description: 'Study and report on a local ecosystem.',
    classId: 'cl3',
    className: 'Science',
    dueDate: new Date(2023, 8, 25),
    status: 'published' as const,
    resourceIds: ['r6', 'r7', 'r8', 'r9']
  },
  {
    id: 'a4',
    title: 'Calculus Problem Set #4',
    description: 'Complete the problems in section 4.2 of the textbook.',
    classId: 'cl4',
    className: 'Mathematics',
    dueDate: new Date(2023, 8, 18),
    status: 'published' as const,
    resourceIds: ['r10']
  },
  {
    id: 'a5',
    title: 'Poetry Analysis Project',
    description: 'Select a poem and analyze its structure, language, and themes.',
    classId: 'cl1',
    className: 'English Literature',
    dueDate: new Date(2023, 9, 5),
    status: 'draft' as const,
    resourceIds: []
  }
];

// Mock resource search function
const mockGetResources = async (query: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Sample resources that would be returned from an API
  const mockResources = [
    {
      id: 'r1',
      title: 'The Waste Land',
      author: 'T.S. Eliot',
      cover: 'https://covers.openlibrary.org/b/id/581487-L.jpg',
      type: 'book' as const,
      available: true
    },
    {
      id: 'r2',
      title: 'Ulysses',
      author: 'James Joyce',
      cover: 'https://covers.openlibrary.org/b/id/8240642-L.jpg',
      type: 'book' as const,
      available: true
    },
    {
      id: 'r3',
      title: 'Mrs. Dalloway',
      author: 'Virginia Woolf',
      cover: 'https://covers.openlibrary.org/b/id/8231870-L.jpg',
      type: 'book' as const,
      available: true
    },
    {
      id: 'r4',
      title: 'The Cold War: A New History',
      author: 'John Lewis Gaddis',
      cover: 'https://covers.openlibrary.org/b/id/10110203-L.jpg',
      type: 'book' as const,
      available: true
    },
    {
      id: 'r5',
      title: 'Understanding the Modern World',
      author: 'Academic Journal',
      type: 'article' as const,
      available: true
    },
    {
      id: 'r6',
      title: 'Introduction to Ecology',
      author: 'American Ecological Society',
      type: 'ebook' as const,
      available: true
    },
    {
      id: 'r7',
      title: 'Local Ecosystems Database',
      type: 'website' as const,
      url: 'https://example.com/ecosystems',
      available: true
    }
  ];
  
  // Filter resources based on the query (case-insensitive)
  const lowercaseQuery = query.toLowerCase();
  return mockResources.filter(
    resource => 
      resource.title.toLowerCase().includes(lowercaseQuery) || 
      (resource.author && resource.author.toLowerCase().includes(lowercaseQuery))
  );
};

// Mock AI recommendation function
const mockGetRecommendations = async (assignmentId: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Recommendations would depend on the assignment
  const assignment = mockAssignments.find(a => a.id === assignmentId);
  
  if (!assignment) return [];
  
  // Return different recommendations based on the class
  if (assignment.classId === 'cl1') { // English Literature
    return [
      {
        resource: {
          id: 'r20',
          title: 'A Reader\'s Guide to Modernism',
          author: 'Cambridge University Press',
          cover: 'https://covers.openlibrary.org/b/id/8294540-L.jpg',
          type: 'book' as const,
          available: true
        },
        relevanceScore: 0.95,
        reason: 'Comprehensive overview of modernist literature techniques and themes.'
      },
      {
        resource: {
          id: 'r21',
          title: 'The Modernist Movement',
          author: 'Literary Foundation',
          type: 'article' as const,
          available: true
        },
        relevanceScore: 0.88,
        reason: 'Provides historical context for the development of modernist literature.'
      }
    ];
  } else if (assignment.classId === 'cl2') { // World History
    return [
      {
        resource: {
          id: 'r22',
          title: 'Cold War: Primary Sources',
          author: 'National Archives',
          type: 'website' as const,
          available: true
        },
        relevanceScore: 0.92,
        reason: 'Collection of declassified documents from the Cold War era.'
      }
    ];
  } else {
    return [];
  }
};

// Mock function to link resources to assignments
const mockLinkResources = async (assignmentId: string, resourceIds: string[]) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  console.log(`Linked resources ${resourceIds.join(', ')} to assignment ${assignmentId}`);
  return;
};

export default function AssignmentsPage() {
  const publishedAssignments = mockAssignments.filter(a => a.status === 'published');
  const draftAssignments = mockAssignments.filter(a => a.status === 'draft');
  const totalResources = mockAssignments.reduce((sum, a) => sum + a.resourceIds.length, 0);

  return (
    <div className="space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent flex items-center gap-3">
            <ClipboardList className="h-10 w-10 text-vg-primary-600" />
            Assignments
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage assignments and attach library resources
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Assignments"
          value={mockAssignments.length.toString()}
          description="All assignments"
          icon={ClipboardList}
          iconColor="text-blue-700 dark:text-blue-500"
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          variant="primary"
        />
        <StatCard
          title="Published"
          value={publishedAssignments.length.toString()}
          description="Active assignments"
          icon={BookOpen}
          iconColor="text-vg-success-600"
          iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
          variant="success"
        />
        <StatCard
          title="Drafts"
          value={draftAssignments.length.toString()}
          description="Unpublished assignments"
          icon={FileText}
          iconColor="text-vg-warning-600"
          iconBgColor="bg-vg-warning-50 dark:bg-vg-warning-900/20"
          variant="warning"
        />
        <StatCard
          title="Linked Resources"
          value={totalResources.toString()}
          description="Total library resources"
          icon={BookOpen}
          iconColor="text-vg-cultural-600"
          iconBgColor="bg-vg-cultural-50 dark:bg-vg-cultural-900/20"
          variant="cultural"
        />
      </div>

      <Tabs defaultValue="resources" className="space-y-6">
        <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
          <TabsTrigger
            value="resources"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white"
          >
            Resource Linker
          </TabsTrigger>
          <TabsTrigger
            value="manage"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white"
          >
            Manage Assignments
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="resources" className="space-y-6">
          <ResourceLinker 
            assignments={mockAssignments}
            getResources={mockGetResources}
            getRecommendations={mockGetRecommendations}
            linkResources={mockLinkResources}
          />
        </TabsContent>
        
        <TabsContent value="manage" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
              Your Assignments
            </h2>
            <EnhancedButton variant="vg-primary" icon={<Plus className="h-4 w-4" />}>
              Create Assignment
            </EnhancedButton>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockAssignments.map(assignment => (
              <EnhancedCard key={assignment.id} variant="elevated" className="flex flex-col">
                <EnhancedCardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <EnhancedCardTitle className="font-semibold text-lg bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                      {assignment.title}
                    </EnhancedCardTitle>
                    <EnhancedButton variant="ghost" size="icon" className="h-8 w-8">
                      <FileText className="h-4 w-4" />
                    </EnhancedButton>
                  </div>
                  <EnhancedCardDescription className="text-teal-600 dark:text-teal-400 font-medium">
                    {assignment.className}
                  </EnhancedCardDescription>
                </EnhancedCardHeader>
                <EnhancedCardContent className="flex-grow pb-2">
                  <p className="text-sm line-clamp-2 text-muted-foreground">{assignment.description}</p>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <CalendarDays className="h-4 w-4 mr-1.5 text-vg-primary-500" />
                      <span>Due: {assignment.dueDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1.5 text-vg-cultural-500" />
                      <span className="font-medium">{assignment.resourceIds.length} resources</span>
                    </div>
                  </div>
                </EnhancedCardContent>
              </EnhancedCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 