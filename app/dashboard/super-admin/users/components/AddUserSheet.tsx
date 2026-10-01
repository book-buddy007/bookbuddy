import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Institution } from '@/types/admin';
import { UserCircle } from 'lucide-react';

// The validation schema handles both Independent and Affiliated flows
const baseUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  role: z.enum(['student', 'teacher', 'librarian', 'admin', 'super-admin']),
  accountType: z.enum(['INDEPENDENT', 'INSTITUTIONAL']),
  subscriptionTier: z.string().optional(),
});

const affiliatedRefinements = z.object({
  tenantId: z.string().optional(),
  // Extended Metadata fields
  rollNo: z.string().optional(),
  admissionNumber: z.string().optional(),
  bloodGroup: z.string().optional(),
  aadharNumber: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  address: z.string().optional(),
});

const formSchema = baseUserSchema.merge(affiliatedRefinements).superRefine((data, ctx) => {
  if (data.accountType === 'INSTITUTIONAL' && !data.tenantId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Institution is required for affiliated users',
      path: ['tenantId'],
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

export interface AddUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutions: Institution[];
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function AddUserSheet({
  open,
  onOpenChange,
  institutions,
  onSubmit,
  isLoading,
}: AddUserSheetProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountType: 'INDEPENDENT',
      name: '',
      email: '',
      password: '',
      role: 'student',
      tenantId: '',
      subscriptionTier: 'basic',
    },
  });

  const accountType = form.watch('accountType');

  const handleSubmit = async (values: FormValues) => {
    // Map DTO payload
    const payload: any = {
      name: values.name,
      email: values.email,
      role: values.role.toUpperCase().replace('-', '_'), // 'super-admin' -> 'SUPER_ADMIN'
      accountType: values.accountType,
    };
    if (values.password) payload.password = values.password;

    if (values.accountType === 'INDEPENDENT') {
      payload.subscriptionTier = values.subscriptionTier;
    } else {
      payload.tenantId = values.tenantId;
      // Storing dense fields into metadata JSON payload
      payload.metadata = {
        rollNo: values.rollNo,
        admissionNumber: values.admissionNumber,
        bloodGroup: values.bloodGroup,
        aadharNumber: values.aadharNumber,
        fatherName: values.fatherName,
        motherName: values.motherName,
        address: values.address,
      };
    }

    await onSubmit(payload);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-white dark:bg-[#0F172A] border-l border-slate-200/60 dark:border-slate-700/40" side="right">
        <SheetHeader className="pb-6 border-b border-slate-200/60 dark:border-slate-700/40 mb-6">
          <SheetTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--deep-saffron)]/15 to-[var(--saffron)]/10 text-[var(--deep-saffron)]">
              <UserCircle className="h-5 w-5" />
            </div>
            Add New User
          </SheetTitle>
          <SheetDescription className="text-slate-500 dark:text-slate-400">
            Register a new user to the platform. Choose whether they are an independent subscriber or affiliated with an institution.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Account Type Toggle */}
            <div className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl inline-flex w-full">
              <button
                type="button"
                onClick={() => form.setValue('accountType', 'INDEPENDENT')}
                className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all duration-300 ${accountType === 'INDEPENDENT' 
                  ? 'bg-white dark:bg-[#0F172A] shadow-md text-[var(--deep-saffron)] border border-slate-200/60 dark:border-slate-700/40' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Independent User (B2C)
              </button>
              <button
                type="button"
                onClick={() => form.setValue('accountType', 'INSTITUTIONAL')}
                className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all duration-300 ${accountType === 'INSTITUTIONAL' 
                  ? 'bg-white dark:bg-[#0F172A] shadow-md text-[var(--deep-saffron)] border border-slate-200/60 dark:border-slate-700/40' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Affiliated User (B2B)
              </button>
            </div>

            {/* Core Basic Fields - Shared */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">Full Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--deep-saffron)]/40 focus:border-[var(--deep-saffron)]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">Email Address</FormLabel>
                    <FormControl><Input type="email" placeholder="john@example.com" className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--deep-saffron)]/40 focus:border-[var(--deep-saffron)]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">Password</FormLabel>
                    <FormControl><Input type="password" placeholder="********" className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--deep-saffron)]/40 focus:border-[var(--deep-saffron)]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">Primary Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select a role" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl bg-white dark:bg-[#0F172A] border-slate-200/60 dark:border-slate-700/40">
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="librarian">Librarian</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        {accountType === 'INDEPENDENT' && <SelectItem value="super-admin">Super Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t border-slate-200/60 dark:border-slate-700/40 pt-6 mt-6">
              <h3 className="text-base font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                {accountType === 'INDEPENDENT' ? 'Subscription Details' : 'Institutional Onboarding Details'}
              </h3>

              {accountType === 'INDEPENDENT' ? (
                // Independent Specific Fields
                <FormField
                  control={form.control}
                  name="subscriptionTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300">B2C Subscription Tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select a tier" /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl bg-white dark:bg-[#0F172A] border-slate-200/60 dark:border-slate-700/40">
                          <SelectItem value="trial">Free Trial</SelectItem>
                          <SelectItem value="basic">Basic Plan</SelectItem>
                          <SelectItem value="premium">Premium Plan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                // Affiliated Specific Fields
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300">Select Institution</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"><SelectValue placeholder="Search or select an institution" /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl bg-white dark:bg-[#0F172A] border-slate-200/60 dark:border-slate-700/40">
                            {institutions.map(inst => (
                              <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-4 border border-slate-200/60 dark:border-slate-700/40">
                    <h4 className="font-bold text-sm text-[var(--deep-saffron)]">Academic & Personal Metadata</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="rollNo" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700 dark:text-slate-300">Roll No / Student ID</FormLabel><FormControl><Input placeholder="e.g. 101" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="admissionNumber" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700 dark:text-slate-300">Admission Number</FormLabel><FormControl><Input placeholder="e.g. ADM-2023-001" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700 dark:text-slate-300">Blood Group</FormLabel><FormControl><Input placeholder="e.g. O+" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="aadharNumber" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700 dark:text-slate-300">Aadhar Number</FormLabel><FormControl><Input placeholder="12-digit number" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-4 border border-slate-200/60 dark:border-slate-700/40">
                    <h4 className="font-bold text-sm text-[var(--peacock-teal)]">Family & Contact Metadata</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="fatherName" render={({ field }) => (
                          <FormItem><FormLabel className="text-slate-700 dark:text-slate-300">Father's Name</FormLabel><FormControl><Input placeholder="" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="motherName" render={({ field }) => (
                          <FormItem><FormLabel className="text-slate-700 dark:text-slate-300">Mother's Name</FormLabel><FormControl><Input placeholder="" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700 dark:text-slate-300">Complete Address</FormLabel><FormControl><Input placeholder="123 Street Name, City, State" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6">
              <EnhancedButton 
                type="submit" 
                className="w-full !bg-gradient-to-r !from-[var(--deep-saffron)] !to-[var(--saffron)] hover:!from-[var(--saffron)] hover:!to-[var(--gold)] !text-white shadow-lg hover:shadow-[var(--saffron)]/20 transition-all duration-300 rounded-xl h-11 text-base font-semibold" 
                disabled={isLoading}
              >
                {isLoading ? 'Creating User...' : 'Create Account'}
              </EnhancedButton>
            </div>

          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
