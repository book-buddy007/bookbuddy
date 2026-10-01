"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useInstitutions } from '@/app/dashboard/super-admin/hooks/useSuperAdmin';

interface InstitutionsListProps {
  limit?: number;
}

export function InstitutionsList({ limit }: InstitutionsListProps) {
  const { data: institutionsData, isLoading, error } = useInstitutions();

  let institutions = institutionsData || [];
  
  // Sort by created date, newest first if available
  if (institutions.length > 0) {
    institutions = [...institutions].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (limit) {
      institutions = institutions.slice(0, limit);
    }
  }

  if (isLoading) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Loading institutions...</div>;
  }

  if (error) {
    return <div className="py-6 text-center text-sm text-red-500">{(error as Error).message}</div>;
  }

  if (institutions.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">No institutions found</div>;
  }

  return (
    <div className="space-y-4">
      {institutions.map((institution: any) => (
        <div key={institution.id} className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-8 w-8 ring-2 ring-amber-100">
              <AvatarFallback className="bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold">
                {institution.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-bold text-bb-text leading-none">{institution.name}</p>
              <p className="text-xs text-bb-muted font-medium">{institution.domain}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={institution.subscription?.active ? "success" : "destructive"}>
              {institution.subscription?.tier || 'No Subscription'}
            </Badge>
            <Button size="sm" variant="outline" className="border-amber-200 hover:bg-amber-50 hover:text-amber-900 text-amber-800" asChild>
              <Link href={`/dashboard/super-admin/institution/${institution.id}`}>
                View
              </Link>
            </Button>
          </div>
        </div>
      ))}

      {limit && institutions.length >= limit && (
        <div className="pt-2 text-center">
          <Button variant="link" className="text-amber-700 hover:text-amber-900 font-bold" asChild>
            <Link href="/dashboard/super-admin/institution">View all institutions</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
