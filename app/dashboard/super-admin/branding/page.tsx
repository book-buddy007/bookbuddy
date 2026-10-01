import Link from 'next/link';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Image as ImageIcon, Home, Paintbrush2, ArrowRight, Upload, Sparkles } from '@/components/ui/icons';

export default function BrandingPage() {
  return (
    <div className="space-y-6 animate-vg-fade-in-up">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl mb-8 border border-white/10" style={{background: 'linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)'}}>
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--deep-saffron)]/[0.15] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[var(--deep-saffron)] mr-2 animate-pulse"></span>
            Visual Identity
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm font-display">
            Branding Configuration
          </h1>
          <p className="text-indigo-100/90 text-lg max-w-xl font-medium">
            Manage your platform&apos;s visual identity, logos, themes, and homepage content across all tenants.
          </p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo Management Card */}
        <Link href="/dashboard/super-admin/branding/logo" className="group block">
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/40 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[var(--peacock-teal)]/30">
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--peacock-teal)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-[var(--peacock-teal)]/20 transition-colors duration-500" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--peacock-teal)] to-[var(--indigo-deep)] shadow-lg shadow-[var(--peacock-teal)]/20">
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Logo Management</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Upload and customize visual identity assets</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                <Upload className="h-4 w-4" />
                <span>SVG, PNG, JPEG supported</span>
                <ArrowRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Homepage Editor Card */}
        <Link href="/dashboard/super-admin/branding/homepage" className="group block">
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/40 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[var(--deep-saffron)]/30">
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--deep-saffron)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-[var(--deep-saffron)]/20 transition-colors duration-500" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--deep-saffron)] to-[#FFAE42] shadow-lg shadow-[var(--deep-saffron)]/20">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Homepage Editor</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Customize homepage content, banners, and sections</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                <Sparkles className="h-4 w-4" />
                <span>Hero, Features, Gallery, Testimonials</span>
                <ArrowRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}