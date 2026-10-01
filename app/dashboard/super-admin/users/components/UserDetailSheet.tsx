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
      <SheetContent className="w-full sm:max-w-md border-l border-slate-200/60 dark:border-slate-700/40 shadow-2xl p-0 overflow-y-auto bg-slate-50 dark:bg-[#0A0F1E]">
        {/* Accent strip */}
        <div className="absolute top-0 left-0 w-1 p-0 h-full bg-gradient-to-b from-[var(--deep-saffron)] to-[var(--gold)] opacity-80" />

        {/* Header with avatar */}
        <div className="p-6 pb-0 bg-white dark:bg-[#0F172A] border-b border-slate-200/60 dark:border-slate-700/40">
          <SheetHeader className="text-left">
            <div className="flex flex-col items-center text-center space-y-4 pt-6 pb-4">
              <Avatar className="h-24 w-24 ring-4 ring-[var(--deep-saffron)]/20 shadow-xl">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-[var(--deep-saffron)] to-[var(--saffron)] text-white font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  {user.name}
                </SheetTitle>
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="bg-[var(--deep-saffron)]/10 text-[var(--deep-saffron)] border border-[var(--deep-saffron)]/20 capitalize font-semibold">
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role?.replace('_', ' ') || 'User'}
                  </Badge>
                  <Badge
                    className={user.isActive 
                      ? 'bg-[var(--peacock-teal)]/15 text-[var(--peacock-teal)] dark:bg-[var(--peacock-teal)]/20 dark:text-emerald-300 border border-[var(--peacock-teal)]/20 font-semibold' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold'}
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
          <div className="bg-white dark:bg-[#0F172A] p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-sm space-y-4 relative overflow-hidden">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-white/30 flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-[var(--deep-saffron)]" /> Contact Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
                <div className="p-1.5 rounded-lg bg-[var(--deep-saffron)]/10 text-[var(--deep-saffron)] mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{user.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Primary Email</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Activity */}
          <div className="bg-white dark:bg-[#0F172A] p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-white/30 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--peacock-teal)]" /> Account Activity
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Joined
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                  {user.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Last Login
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                  {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yy HH:mm') : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Institution Memberships */}
          <div className="bg-white dark:bg-[#0F172A] p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-white/30 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--gold)]" /> Institution Access
              </h4>
              <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 font-bold text-xs">
                {user.tenantMemberships?.length || 0}
              </Badge>
            </div>

            {user.tenantMemberships && user.tenantMemberships.length > 0 ? (
              <div className="space-y-3 mt-2">
                {user.tenantMemberships.map((membership: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-200">
                      {membership.tenant?.name || 'Unknown Institution'}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-[var(--deep-saffron)] capitalize font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {membership.role.toLowerCase().replace('_', ' ')}
                      </p>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 rounded-md ${membership.status === 'ACTIVE' 
                        ? 'text-[var(--peacock-teal)] border-[var(--peacock-teal)]/30 bg-[var(--peacock-teal)]/10' 
                        : 'text-slate-500 border-slate-300 dark:border-slate-700'}`}>
                        {membership.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2 dark:text-slate-600" />
                <p className="text-sm text-slate-500 font-medium">No institution access</p>
                <p className="text-xs text-slate-400 mt-1">This user is not tied to any institutions yet.</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
