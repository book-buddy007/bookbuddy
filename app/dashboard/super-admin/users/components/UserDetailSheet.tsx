import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Mail, 
  Phone, 
  Shield, 
  Building2, 
  UserCircle, 
  Clock 
} from '@/components/ui/icons';

interface UserDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
}

export function UserDetailSheet({ open, onOpenChange, user }: UserDetailSheetProps) {
  if (!user) return null;

  const getInitials = (name: string) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2) || 'U';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md border-l border-bb-border/60 shadow-2xl p-0 overflow-y-auto bg-bb-surface-2 dark:bg-bb-bg">
        {/* Accent strip */}
        <div className="absolute top-0 left-0 w-1 p-0 h-full bg-bb-progress opacity-80" />

        {/* Header with avatar */}
        <div className="p-6 pb-0 bg-bb-surface dark:bg-bb-bg border-b border-bb-border/60">
          <SheetHeader className="text-left">
            <div className="flex flex-col items-center text-center space-y-4 pt-6 pb-4">
              <Avatar className="h-24 w-24 ring-4 ring-bb-accent/20 shadow-xl">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                <AvatarFallback className="text-2xl bg-bb-progress text-white font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-2xl font-bold text-bb-text dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  {user.name}
                </SheetTitle>
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="bg-bb-accent-soft text-bb-accent-ink border border-bb-accent/20 capitalize font-semibold">
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role?.replace('_', ' ') || 'User'}
                  </Badge>
                  <Badge
                    className={user.isActive 
                      ? 'bg-bb-accent-soft text-bb-accent-ink  border border-bb-accent/20 font-semibold' 
                      : 'bg-bb-surface-2 text-bb-muted border border-bb-border font-semibold'}
                  >
                    {user.isActive ? 'Active' : 'Suspended'}
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact Info */}
          <div className="bg-bb-surface dark:bg-bb-bg p-5 rounded-2xl border border-bb-border/60 shadow-sm space-y-4 relative overflow-hidden">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-bb-faint dark:text-white/30 flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-bb-accent-ink" /> Contact Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-bb-surface-2 border border-bb-border">
                <div className="p-1.5 rounded-lg bg-bb-accent-soft text-bb-accent-ink mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-bb-text">{user.email}</p>
                  <p className="text-xs text-bb-muted">Primary Email</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Activity */}
          <div className="bg-bb-surface dark:bg-bb-bg p-5 rounded-2xl border border-bb-border/60 shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-bb-faint dark:text-white/30 flex items-center gap-2">
              <Clock className="w-4 h-4 text-bb-accent-ink" /> Account Activity
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-bb-surface-2 border border-bb-border">
                <span className="text-sm text-bb-muted flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Joined
                </span>
                <span className="text-sm font-semibold text-bb-text">
                  {user.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-bb-surface-2 border border-bb-border">
                <span className="text-sm text-bb-muted flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Last Login
                </span>
                <span className="text-sm font-semibold text-bb-text">
                  {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yy HH:mm') : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Institution Memberships */}
          <div className="bg-bb-surface dark:bg-bb-bg p-5 rounded-2xl border border-bb-border/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-bb-faint dark:text-white/30 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-bb-accent-ink" /> Institution Access
              </h4>
              <Badge variant="secondary" className="rounded-full bg-bb-surface-2 text-bb-muted border border-bb-border font-bold text-xs">
                {user.tenantMemberships?.length || 0}
              </Badge>
            </div>

            {user.tenantMemberships && user.tenantMemberships.length > 0 ? (
              <div className="space-y-3 mt-2">
                {user.tenantMemberships.map((membership: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-1 p-3 rounded-xl bg-bb-surface-2 border border-bb-border">
                    <p className="font-semibold text-sm text-bb-text">
                      {membership.tenant?.name || 'Unknown Institution'}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-bb-accent-ink capitalize font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {membership.role.toLowerCase().replace('_', ' ')}
                      </p>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 rounded-md ${membership.status === 'ACTIVE' 
                        ? 'text-bb-accent-ink border-bb-accent/30 bg-bb-accent-soft' 
                        : 'text-bb-muted border-bb-border'}`}>
                        {membership.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 bg-bb-surface-2 rounded-xl border border-dashed border-bb-border">
                <Building2 className="w-8 h-8 text-bb-faint mx-auto mb-2" />
                <p className="text-sm text-bb-muted font-medium">No institution access</p>
                <p className="text-xs text-bb-faint mt-1">This user is not tied to any institutions yet.</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
