"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AvatarTile } from '@/components/ui/data-table';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
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
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-[42px] w-[42px] rounded-[13px]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p role="alert" className="py-6 text-center text-sm font-semibold text-bb-danger-ink">{(error as Error).message}</p>;
  }

  if (institutions.length === 0) {
    return <p className="py-6 text-center text-sm text-bb-muted">No institutions found</p>;
  }

  const TONES = ['cobalt', 'blaze', 'periwinkle', 'navy'] as const;

  return (
    <div>
      {institutions.map((institution: any, i: number) => (
        <div key={institution.id} className="flex items-center justify-between gap-3 border-t border-bb-border py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarTile
              initials={institution.name.substring(0, 2).toUpperCase()}
              tone={TONES[i % TONES.length]}
              className="h-[42px] w-[42px] rounded-[13px] font-display shadow-[inset_0_1px_0_rgba(255,255,255,.4)]"
            />
            <div className="min-w-0">
              <p className="truncate font-bold">{institution.name}</p>
              <p className="truncate text-xs text-bb-muted">{institution.domain}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {institution.subscription?.active ? (
              <StatusBadge status="returned" label={institution.subscription?.tier || 'Active'} />
            ) : (
              <Chip>{institution.subscription?.tier || 'No subscription'}</Chip>
            )}
            <Button size="sm" variant="soft" asChild>
              <Link href={`/dashboard/super-admin/institution/${institution.id}`}>View</Link>
            </Button>
          </div>
        </div>
      ))}

      {limit && institutions.length >= limit && (
        <div className="pt-1 text-center">
          <Button variant="link" asChild>
            <Link href="/dashboard/super-admin/institution">View all institutions</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
