import { EmptyState } from "@/components/ui/empty-state";

/** Shown by admin pages for an account that isn't an active member of any institution. */
export function NoInstitution() {
  return (
    <EmptyState
      icon="institution"
      title="No institution selected"
      description="Your account isn't linked to an institution yet. Platform administrators manage everyone from Super admin → Users."
    />
  );
}
