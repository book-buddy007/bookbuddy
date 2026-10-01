import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

interface LoadingSkeletonProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LoadingSkeleton({ loading, children, fallback }: LoadingSkeletonProps) {
  if (loading) {
    return (
      <div className="animate-pulse">
        {fallback || (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
      </div>
    );
  }
  
  return <>{children}</>;
}

export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      
      <div className="border rounded-md">
        <div className="p-4 border-b">
          <div className="grid grid-cols-5 gap-4">
            {Array(5).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        </div>
        
        {Array(5).fill(null).map((_, i) => (
          <div key={i} className="p-4 border-b">
            <div className="grid grid-cols-5 gap-4">
              {Array(5).fill(null).map((_, j) => (
                <Skeleton key={j} className="h-10" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 