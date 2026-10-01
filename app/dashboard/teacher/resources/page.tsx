'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/ui/stat-card';
const ReadingListEditor = (props: any) => <div className="p-8 text-center text-muted-foreground bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed">Reading List Editor (Under Construction)</div>;
const ReservationManager = (props: any) => <div className="p-8 text-center text-muted-foreground bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed">Reservation Manager (Under Construction)</div>;
import { BookOpen, ListChecks, Calendar, Library } from '@/components/ui/icons';

// Mock data for demo purposes
const mockClasses = [
  { id: 'cl1', name: 'English Literature', studentCount: 32 },
  { id: 'cl2', name: 'World History', studentCount: 28 },
  { id: 'cl3', name: 'Science', studentCount: 35 },
  { id: 'cl4', name: 'Mathematics', studentCount: 33 }
];

// Mock book search function
const mockSearchBooks = async (query: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Sample books that would be returned from an API
  const mockBooks = [
    {
      id: 'b1',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      cover: 'https://covers.openlibrary.org/b/id/8276532-L.jpg',
      isbn: '9780061120084',
      available: 15
    },
    {
      id: 'b2',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      cover: 'https://covers.openlibrary.org/b/id/8417576-L.jpg',
      isbn: '9780743273565',
      available: 8
    },
    {
      id: 'b3',
      title: '1984',
      author: 'George Orwell',
      cover: 'https://covers.openlibrary.org/b/id/8575708-L.jpg',
      isbn: '9780451524935',
      available: 12
    },
    {
      id: 'b4',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      cover: 'https://covers.openlibrary.org/b/id/8364399-L.jpg',
      isbn: '9780141439518',
      available: 5
    },
    {
      id: 'b5',
      title: 'The Catcher in the Rye',
      author: 'J.D. Salinger',
      cover: 'https://covers.openlibrary.org/b/id/8231432-L.jpg',
      isbn: '9780316769488',
      available: 10
    }
  ];
  
  // Filter books based on the query (case-insensitive)
  const lowercaseQuery = query.toLowerCase();
  return mockBooks.filter(
    book => 
      book.title.toLowerCase().includes(lowercaseQuery) || 
      book.author.toLowerCase().includes(lowercaseQuery) ||
      book.isbn.includes(query)
  );
};

// Mock reservation functions
const mockBooks = [
  {
    id: 'book1',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    cover: 'https://covers.openlibrary.org/b/id/8276532-L.jpg',
    copies: 35,
    availableCopies: 20
  },
  {
    id: 'book2',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    cover: 'https://covers.openlibrary.org/b/id/8417576-L.jpg',
    copies: 25,
    availableCopies: 12
  },
  {
    id: 'book3',
    title: '1984',
    author: 'George Orwell',
    cover: 'https://covers.openlibrary.org/b/id/8575708-L.jpg',
    copies: 30,
    availableCopies: 18
  }
];

const mockReservations = [
  {
    id: 'res1',
    bookId: 'book1',
    book: mockBooks[0],
    classId: 'cl1',
    className: 'English Literature',
    startDate: new Date(2023, 8, 10),
    endDate: new Date(2023, 8, 17),
    copies: 30,
    status: 'APPROVED' as const
  },
  {
    id: 'res2',
    bookId: 'book2',
    book: mockBooks[1],
    classId: 'cl2',
    className: 'World History',
    startDate: new Date(2023, 8, 15),
    endDate: new Date(2023, 8, 22),
    copies: 15,
    status: 'PENDING' as const
  }
];

const mockGetBooks = async (query: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockBooks.filter(book => 
    book.title.toLowerCase().includes(query.toLowerCase()) || 
    book.author.toLowerCase().includes(query.toLowerCase())
  );
};

const mockGetReservations = async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockReservations;
};

const mockCreateReservation = async (reservation: any) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    id: `res${Math.floor(Math.random() * 1000)}`,
    ...reservation,
    status: 'PENDING' as const
  };
};

const mockCancelReservation = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return;
};

const mockCheckConflicts = async (bookId: string, startDate: Date, endDate: Date, copies: number) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [];
};

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<string>('reading-lists');

  return (
    <div className="space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-bb-accent">
          <Library className="h-10 w-10 text-vg-primary-600" />
          Resource Management
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage reading lists and book reservations for your classes
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Reading Lists"
          value={mockClasses.length.toString()}
          description="Across all classes"
          icon={ListChecks}
          iconColor="text-blue-700 dark:text-blue-500"
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          variant="primary"
        />
        <StatCard
          title="Reserved Books"
          value="24"
          description="Current reservations"
          icon={BookOpen}
          iconColor="text-teal-600 dark:text-teal-500"
          iconBgColor="bg-teal-50 dark:bg-teal-900/20"
          variant="cultural"
        />
        <StatCard
          title="Upcoming Pickups"
          value="8"
          description="This week"
          icon={Calendar}
          iconColor="text-vg-success-600"
          iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
          variant="success"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
          <TabsTrigger
            value="reading-lists"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            Reading Lists
          </TabsTrigger>
          <TabsTrigger
            value="reservations"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            Book Reservations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="reading-lists" className="space-y-6">
          <ReadingListEditor 
            classes={mockClasses}
            searchBooks={mockSearchBooks}
            onSave={async (list: any) => {
              console.log('Saving list:', list);
              await new Promise(resolve => setTimeout(resolve, 1000));
              return;
            }}
          />
        </TabsContent>
        
        <TabsContent value="reservations" className="space-y-6">
          <ReservationManager 
            classes={mockClasses}
            getBooks={mockGetBooks}
            getReservations={mockGetReservations}
            createReservation={mockCreateReservation}
            cancelReservation={mockCancelReservation}
            checkConflicts={mockCheckConflicts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 