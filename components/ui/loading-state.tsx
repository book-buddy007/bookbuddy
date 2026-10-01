import React from 'react';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type LoadingStateProps = {
  isLoading?: boolean;
  isError?: boolean;
  isSuccess?: boolean;
  loadingText?: string;
  errorText?: string;
  successText?: string;
  errorDetails?: string;
  onRetry?: () => void;
  children: React.ReactNode;
};

/**
 * A component to handle loading, error, and success states.
 * 
 * Usage examples:
 * 
 * - Basic loading:
 * <LoadingState isLoading={isLoading}>
 *   <YourContent />
 * </LoadingState>
 * 
 * - With error handling:
 * <LoadingState isLoading={isLoading} isError={isError} errorText="Failed to load data" onRetry={refetch}>
 *   <YourContent />
 * </LoadingState>
 * 
 * - Complete with success state:
 * <LoadingState isLoading={isLoading} isError={isError} isSuccess={isSuccess} 
 *   errorText="Failed to load data" successText="Data loaded successfully" onRetry={refetch}>
 *   <YourContent />
 * </LoadingState>
 */
export function LoadingState({
  isLoading = false,
  isError = false,
  isSuccess = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred',
  successText = 'Success!',
  errorDetails,
  onRetry,
  children,
}: LoadingStateProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full p-8 text-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{loadingText}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="ml-3">{errorText}</AlertTitle>
        {errorDetails && <AlertDescription className="ml-3">{errorDetails}</AlertDescription>}
        {onRetry && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
      </Alert>
    );
  }

  if (isSuccess) {
    return (
      <>
        <Alert variant="default" className="bg-green-50 text-green-800 border-green-200 mb-4">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="ml-3">{successText}</AlertTitle>
        </Alert>
        {children}
      </>
    );
  }

  return <>{children}</>;
}

/**
 * A simpler loading spinner component for inline or localized loading states.
 */
export function LoadingSpinner({ size = 'medium', text }: { size?: 'small' | 'medium' | 'large', text?: string }) {
  const sizeClasses = {
    small: 'h-3 w-3',
    medium: 'h-5 w-5',
    large: 'h-8 w-8'
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

/**
 * Component for a skeletal loading state (for content that hasn't loaded yet).
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
      {...props}
    />
  );
} 