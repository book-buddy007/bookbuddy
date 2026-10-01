import React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Sparkles, ShieldCheck, Crown, Zap, X } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

const subscriptionSchema = z.object({
    tenantId: z.string().min(1, { message: "Institution is required" }),
    planId: z.string().min(1, { message: "Plan is required" }),
    status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED", "SUSPENDED"]).default("ACTIVE"),
    startDate: z.string().min(1, { message: "Start date is required" }),
    endDate: z.string().min(1, { message: "End date is required" }),
    autoRenew: z.boolean().default(true),
    maxUsers: z.number().int().positive().optional().or(z.literal('')),
    maxStorage: z.number().int().positive().optional().or(z.literal('')),
})

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>

interface SubscriptionFormProps {
    open: boolean
    onClose: () => void
    onSubmit: (values: SubscriptionFormValues) => void
    isLoading: boolean
    initialData?: any
    tenants: any[] // Needed to select a tenant
    plans: any[] // Dynamic subscription plans
}

// Visual options no longer needed statically as plans are fetched dynamically

export function SubscriptionForm({ open, onClose, onSubmit, isLoading, initialData, tenants, plans }: SubscriptionFormProps) {
    const isEditing = !!initialData

    const form = useForm<SubscriptionFormValues>({
        resolver: zodResolver(subscriptionSchema),
        defaultValues: initialData ? {
            tenantId: initialData.tenantId,
            planId: initialData.planId || "",
            status: initialData.status as any,
            startDate: new Date(initialData.startDate).toISOString().split('T')[0],
            endDate: new Date(initialData.endDate).toISOString().split('T')[0],
            autoRenew: initialData.autoRenew ?? true,
            maxUsers: initialData.maxUsers || '',
            maxStorage: initialData.maxStorage || '',
        } : {
            tenantId: "",
            planId: "",
            status: "ACTIVE",
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            autoRenew: true,
            maxUsers: '',
            maxStorage: '',
        }
    })

    React.useEffect(() => {
        if (initialData) {
            form.reset({
                tenantId: initialData.tenantId,
                planId: initialData.planId || "",
                status: initialData.status as any,
                startDate: new Date(initialData.startDate).toISOString().split('T')[0],
                endDate: new Date(initialData.endDate).toISOString().split('T')[0],
                autoRenew: initialData.autoRenew ?? true,
                maxUsers: initialData.maxUsers || '',
                maxStorage: initialData.maxStorage || '',
            });
        } else {
            form.reset({
                tenantId: "",
                planId: "",
                status: "ACTIVE",
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                autoRenew: true,
                maxUsers: '',
                maxStorage: '',
            });
        }
    }, [initialData, form, open]);

    const handleSubmit = (values: SubscriptionFormValues) => {
        const processedValues = {
            ...values,
            maxUsers: values.maxUsers === '' ? undefined : Number(values.maxUsers),
            maxStorage: values.maxStorage === '' ? undefined : Number(values.maxStorage),
        };
        onSubmit(processedValues as any);
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-slate-200/60 dark:border-white/[0.07] bg-[#FAFBFC] dark:bg-[var(--night-ink)] shadow-2xl flex flex-col max-h-[90dvh]">
                <div 
                    className="relative overflow-hidden px-6 pt-6 pb-8 shrink-0" 
                    style={{background: 'linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)'}}
                >
                    <div className="absolute inset-0 opacity-25 pointer-events-none" style={{backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(255,153,51,0.35) 0%, transparent 55%), radial-gradient(circle at 15% 60%, rgba(0,106,110,0.25) 0%, transparent 50%)'}} />
                    <div className="absolute -top-16 -right-16 w-40 h-40 bg-[var(--deep-saffron)]/[0.06] rounded-full blur-3xl opacity-50" />
                    
                    <button onClick={onClose} className="absolute right-4 top-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors z-20">
                        <X className="w-4 h-4" />
                    </button>

                    <div className="relative z-10">
                        <DialogHeader className="text-left space-y-1.5">
                            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2.5">
                                <div className="bg-white/15 backdrop-blur-sm rounded-lg p-1.5 border border-white/10 shadow-inner">
                                    <Crown className="h-5 w-5 text-[var(--deep-saffron)]" />
                                </div>
                                {isEditing ? "Edit Subscription" : "Create Subscription"}
                            </DialogTitle>
                            <DialogDescription className="text-white/70 text-sm">
                                {isEditing ? "Update existing institution subscription details and plan." : "Configure and grant a new subscription to an institution."}
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                            
                            {!isEditing && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/40 pb-2">
                                        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[var(--deep-saffron)] to-[var(--peacock-teal)]" />
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Institution Details</h3>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="tenantId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Select Institution</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[var(--night-ink)]/50 focus:ring-2 focus:ring-[var(--peacock-teal)]/30 focus:border-[var(--peacock-teal)] h-11 transition-all">
                                                            <SelectValue placeholder="Select an institution" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-white dark:bg-[var(--night-ink)] border-slate-200 dark:border-white/[0.07] shadow-xl">
                                                        {tenants.map((t) => (
                                                            <SelectItem key={t.id} value={t.id} className="focus:bg-[var(--peacock-teal)]/10 focus:text-[var(--peacock-teal)] cursor-pointer">
                                                                {t.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            <div className="space-y-4 pt-1">
                                <div className="flex items-center gap-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/40 pb-2">
                                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[var(--deep-saffron)] to-[var(--peacock-teal)]" />
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Plan & Access</h3>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="planId"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Subscription Plan</FormLabel>
                                            <FormControl>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    {plans.map((plan) => {
                                                        const isSelected = field.value === plan.id;
                                                        return (
                                                            <div 
                                                                key={plan.id}
                                                                onClick={() => field.onChange(plan.id)}
                                                                className={cn(
                                                                    "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all",
                                                                    isSelected ? `border-[var(--peacock-teal)] bg-[var(--peacock-teal)]/5 shadow-sm` : `border-transparent bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700`
                                                                )}
                                                            >
                                                                <div className={cn("p-1.5 rounded-full mb-1 border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400")}>
                                                                    <Crown className="w-4 h-4" />
                                                                </div>
                                                                <span className={cn("text-[10px] font-bold tracking-wider text-center line-clamp-1", isSelected ? "text-[var(--peacock-teal)]" : "text-slate-500 dark:text-slate-400")}>{plan.name || plan.tier}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <FormField
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Start Date</FormLabel>
                                                <FormControl>
                                                    <Input type="date" className="border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[var(--night-ink)]/50 focus-visible:ring-[var(--peacock-teal)]/30 focus-visible:border-[var(--peacock-teal)] h-11" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="endDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">End Date</FormLabel>
                                                <FormControl>
                                                    <Input type="date" className="border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[var(--night-ink)]/50 focus-visible:ring-[var(--peacock-teal)]/30 focus-visible:border-[var(--peacock-teal)] h-11" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-1">
                                <div className="flex items-center gap-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/40 pb-2">
                                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[var(--deep-saffron)] to-[var(--peacock-teal)]" />
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Quotas & Configuration</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="maxUsers"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Max Readers (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Unlimited" className="border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[var(--night-ink)]/50 focus-visible:ring-[var(--peacock-teal)]/30 focus-visible:border-[var(--peacock-teal)] h-11" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="maxStorage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Max Storage GB (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Unlimited" className="border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[var(--night-ink)]/50 focus-visible:ring-[var(--peacock-teal)]/30 focus-visible:border-[var(--peacock-teal)] h-11" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Account Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[var(--night-ink)]/50 focus:ring-2 focus:ring-[var(--peacock-teal)]/30 focus:border-[var(--peacock-teal)] h-11">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-white dark:bg-[var(--night-ink)] border-slate-200 dark:border-white/[0.07] shadow-xl">
                                                        <SelectItem value="ACTIVE" className="focus:bg-[var(--peacock-teal)]/10 focus:text-[var(--peacock-teal)] font-medium">Active</SelectItem>
                                                        <SelectItem value="EXPIRED" className="focus:bg-red-500/10 focus:text-red-500 font-medium">Expired</SelectItem>
                                                        <SelectItem value="CANCELLED" className="focus:bg-red-500/10 focus:text-red-500 font-medium">Cancelled</SelectItem>
                                                        <SelectItem value="SUSPENDED" className="focus:bg-amber-500/10 focus:text-amber-500 font-medium">Suspended</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="autoRenew"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 dark:border-white/[0.07] p-3.5 bg-white dark:bg-[var(--night-ink)]/50 shadow-sm overflow-hidden relative">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--peacock-teal)] opacity-50" />
                                                <div className="space-y-0.5 ml-2">
                                                    <FormLabel className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                        Auto-Renew
                                                    </FormLabel>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        className="data-[state=checked]:bg-[var(--peacock-teal)]"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                        </form>
                    </Form>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-200/60 dark:border-white/[0.07] bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    >
                        Cancel
                    </Button>
                    <EnhancedButton
                        onClick={form.handleSubmit(handleSubmit)}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-[var(--deep-saffron)] to-[#FFAE42] hover:from-[#E68A2E] hover:to-[#FF9933] text-black font-semibold shadow-md shadow-[var(--deep-saffron)]/20 border-transparent"
                    >
                        {isLoading ? "Saving..." : (isEditing ? "Update Plan" : "Create Plan")}
                    </EnhancedButton>
                </div>
            </DialogContent>
        </Dialog>
    )
}
