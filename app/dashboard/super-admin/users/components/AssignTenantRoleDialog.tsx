import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Institution } from '@/types/admin';
import { Building2 } from '@/components/ui/icons';

interface AssignTenantRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
  institutions: Institution[];
  onSubmit: (userId: string, tenantId: string, role: string) => Promise<void>;
  isLoading: boolean;
}

export function AssignTenantRoleDialog({
  open,
  onOpenChange,
  user,
  institutions,
  onSubmit,
  isLoading
}: AssignTenantRoleDialogProps) {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('student');

  useEffect(() => {
    if (open) {
      setSelectedTenant('');
      setSelectedRole('student');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !selectedTenant || !selectedRole) return;
    await onSubmit(user.id, selectedTenant, selectedRole);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-bb-bg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
            <div className="p-2 rounded-xl bg-bb-accent-soft text-bb-accent-ink">
              <Building2 className="h-4 w-4" />
            </div>
            Assign Institution Role
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Grant {user?.name || 'this user'} access to a specific institution. This will update their role if they are already a member.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tenant" className="text-slate-700 dark:text-slate-300 font-semibold">Institution</Label>
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger id="tenant" className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-bb-accent/40">
                <SelectValue placeholder="Select an institution" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-white dark:bg-bb-bg border-slate-200/60 dark:border-slate-700/40">
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role" className="text-slate-700 dark:text-slate-300 font-semibold">Role inside Institution</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role" className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-bb-accent/40">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-white dark:bg-bb-bg border-slate-200/60 dark:border-slate-700/40">
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="librarian">Librarian</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
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
            disabled={isLoading || !selectedTenant || !selectedRole}
            className="rounded-xl shadow-md"
          >
            {isLoading ? 'Assigning...' : 'Assign Role'}
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
