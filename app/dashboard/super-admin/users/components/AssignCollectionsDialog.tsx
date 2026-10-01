import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Institution } from '@/types/admin';
import { Shield } from '@/components/ui/icons';

interface AssignCollectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
  institutions: Institution[]; // We can map over the user's memberships to get valid tenants
  onSubmit: (userId: string, tenantId: string, collections: string[]) => Promise<void>;
  isLoading: boolean;
}

export function AssignCollectionsDialog({
  open,
  onOpenChange,
  user,
  institutions,
  onSubmit,
  isLoading
}: AssignCollectionsDialogProps) {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [collectionsInput, setCollectionsInput] = useState<string>('');

  // Extract user's active tenant memberships to populate the dropdown
  const userMemberships = user?.tenantMemberships || [];
  
  useEffect(() => {
    if (open) {
      if (userMemberships.length === 1) {
         setSelectedTenant(userMemberships[0].tenantId);
         const currentCols = userMemberships[0].assignedCollections || [];
         setCollectionsInput(Array.isArray(currentCols) ? currentCols.join(', ') : '');
      } else {
         setSelectedTenant('');
         setCollectionsInput('');
      }
    }
  }, [open, user]);

  // Needed dependency on userMemberships causes issues if not stable, but it's fine for simple dialog

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId);
    const membership = userMemberships.find((m: any) => m.tenantId === tenantId);
    if (membership && membership.assignedCollections) {
      setCollectionsInput(Array.isArray(membership.assignedCollections) ? membership.assignedCollections.join(', ') : '');
    } else {
      setCollectionsInput('');
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedTenant) return;
    
    // Parse collections input into an array of trimmed strings
    const collections = collectionsInput
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    await onSubmit(user.id, selectedTenant, collections);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-bb-bg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--gold)]/15 to-[var(--gold)]/5 text-[var(--gold)]">
              <Shield className="h-4 w-4" />
            </div>
            Assign Collections (RBAC)
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Grant {user?.name || 'this user'} granular access to specific collections within an institution.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tenant" className="text-slate-700 dark:text-slate-300 font-semibold">Institution Membership</Label>
            <Select value={selectedTenant} onValueChange={handleTenantChange}>
              <SelectTrigger id="tenant" className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--deep-saffron)]/40">
                <SelectValue placeholder="Select an institution" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-white dark:bg-bb-bg border-slate-200/60 dark:border-slate-700/40">
                {userMemberships.length === 0 ? (
                  <SelectItem value="none" disabled>No active memberships</SelectItem>
                ) : (
                  userMemberships.map((m: any) => (
                    <SelectItem key={m.tenantId} value={m.tenantId}>
                      {m.tenant?.name || 'Unknown Institution'} ({m.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="collections" className="text-slate-700 dark:text-slate-300 font-semibold">Assigned Collections (Comma-separated IDs)</Label>
            <Input 
              id="collections"
              placeholder="e.g. math_101, science_advanced, english_dept" 
              value={collectionsInput} 
              onChange={(e) => setCollectionsInput(e.target.value)}
              disabled={!selectedTenant || selectedTenant === 'none'}
              className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--deep-saffron)]/40 focus:border-[var(--deep-saffron)]/40"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">
               Enter the unique IDs of the collections this user should manage. Granular RBAC permissions will apply.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <EnhancedButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-xl border-slate-200 dark:border-slate-700"
          >
            Cancel
          </EnhancedButton>
          <EnhancedButton
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !selectedTenant || selectedTenant === 'none'}
            className="rounded-xl shadow-md"
          >
            {isLoading ? 'Saving...' : 'Save Collections'}
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
