'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LayoutDashboard as DashboardIcon, BookOpen as BookOpenIcon, Library as LibraryIcon, Settings as SettingsIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { toast } = useToast();
  // NOTE: Auth redirects to /login are handled by middleware.ts (single source of truth).
  // No client-side redirect here — this prevents the infinite loop.

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }

  // Get user initials for avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleCardClick = (path: string) => {
    try {
      // For now, just show a toast message for routes that don't exist yet
      toast({
        title: "Coming Soon",
        description: `The ${path} section is under development.`,
        duration: 3000,
      });
      // Only navigate to reader since it's implemented
      if (path === 'reader') {
        router.push(`/${path}`);
      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast({
        title: "Navigation Error",
        description: "This section is currently unavailable.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div className="container mx-auto p-3 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name || 'User'}</p>
        </div>

        <div className="flex items-center mt-4 md:mt-0">
          <Avatar className="h-10 w-10 mr-2">
            <AvatarImage src={user?.avatar || ''} alt={user?.name || 'User'} />
            <AvatarFallback>{getInitials(user?.name || null)}</AvatarFallback>
          </Avatar>
          <div className="ml-2">
            <p className="text-sm font-medium">{user?.email}</p>
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCardClick('catalog')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <BookOpenIcon className="mr-2 h-5 w-5 text-primary" />
              Library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Browse books, journals, and other resources</CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCardClick('reader')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <DashboardIcon className="mr-2 h-5 w-5 text-primary" />
              My Reading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Continue reading where you left off</CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCardClick('branches')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <LibraryIcon className="mr-2 h-5 w-5 text-primary" />
              Library Branches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Find libraries and study spaces near you</CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCardClick('settings')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <SettingsIcon className="mr-2 h-5 w-5 text-primary" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Manage your account and preferences</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 