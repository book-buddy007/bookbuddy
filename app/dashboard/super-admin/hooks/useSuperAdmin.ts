import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Define typed interfaces for expected payload and response

export interface InstitutionData {
  id?: string;
  name: string;
  domain?: string;
  type: string;
  adminEmail: string;
  adminPassword?: string;
  description?: string;
  location?: string;
  logoUrl?: string;
  allowJoinRequests?: boolean;
}

// Global fetcher using native fetch with Next.js specific headers if needed
const fetcher = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await res.json();
      errorMsg = errorData.message || errorMsg;
    } catch (e) { }
    throw new Error(errorMsg);
  }
  return res.json();
};

export function useInstitutions() {
  return useQuery({
    queryKey: ['super-admin', 'institutions'],
    queryFn: () => fetcher('/api/admin/institutions'),
    retry: 3,
    retryDelay: 2000,
    staleTime: 30000,
  });
}

export function useMutateInstitution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InstitutionData) => {
      const isEdit = !!data.id;
      const url = isEdit
        ? `/api/admin/institutions/${data.id}`
        : `/api/admin/institutions`;
      return fetcher(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onMutate: async (newInstitution) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['super-admin', 'institutions'] });

      // Snapshot the previous value
      const previousInstitutions = queryClient.getQueryData(['super-admin', 'institutions']);

      // Optimistically update to the new value
      queryClient.setQueryData(['super-admin', 'institutions'], (old: any) => {
        if (!old) return [];
        if (newInstitution.id) {
          // Update existing
          return old.map((inst: any) =>
            inst.id === newInstitution.id ? { ...inst, ...newInstitution } : inst
          );
        } else {
          // Add new (with a fake ID until server responds)
          return [...old, { ...newInstitution, id: 'temp-id-' + Date.now() }];
        }
      });

      // Return a context object with the snapshotted value
      return { previousInstitutions };
    },
    onError: (err, newInstitution, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['super-admin', 'institutions'], context?.previousInstitutions);
      toast.error(err.message || 'Failed to save institution');
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'institutions'] });
    },
    onSuccess: () => {
      toast.success('Institution saved successfully');
    }
  });
}

export function useOverviewStats() {
  return useQuery({
    queryKey: ['super-admin', 'overview'],
    queryFn: () => fetcher('/api/admin/overview/stats'),
    // Refresh stats every minute
    refetchInterval: 60000,
    // Retry 3 times with 2s delay if backend isn't ready yet
    retry: 3,
    retryDelay: 2000,
    staleTime: 30000,
  });
}
