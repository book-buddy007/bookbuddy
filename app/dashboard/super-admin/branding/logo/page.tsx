'use client';

import { useState } from 'react';
import { Loader2, ImageIcon, ArrowLeft, Info, Shield } from '@/components/ui/icons';
import { toast } from "@/components/ui/use-toast";
import { LogoUploader } from '@/components/branding/ImageUploader';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { useBrandingTenant } from '../BrandingProvider';
import { TenantSelector } from '../TenantSelector';
import { updateBranding, getBrandingUploadUrl, uploadFileToPresignedUrl } from '@/lib/api/adminApi';
import imageCompression from 'browser-image-compression';
import DOMPurify from 'dompurify';
import Link from 'next/link';

export default function LogoManagementPage() {
  const {
    selectedTenantId,
    currentBranding,
    setCurrentBranding,
    isLoadingBranding,
  } = useBrandingTenant();

  const [isUploading, setIsUploading] = useState(false);

  // Derive logo from branding context
  const logoUrl = currentBranding?.logo || '';

  /**
   * S3 Presigned URL upload flow:
   * 1. Compress non-SVG images with browser-image-compression (max 200KB)
   * 2. Get presigned URL from backend
   * 3. PUT file directly to S3
   * 4. Save the S3 key back to branding config via updateBranding
   */
  const handleLogoUpload = async (file: File) => {
    if (!selectedTenantId) {
      toast({ title: "Error", description: "Select an institution first", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      let uploadFile = file;

      // Compress raster images (skip SVG — it's already optimized)
      if (!file.type.includes('svg')) {
        toast({ title: 'Optimizing…', description: 'Compressing image for best performance.', duration: 1500 });
        uploadFile = await imageCompression(file, {
          maxSizeMB: 0.2, // 200KB
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });
      }

      // Step 1: Get presigned URL from backend
      const urlRes = await getBrandingUploadUrl(selectedTenantId, 'logo', uploadFile.type);
      if (!urlRes.success || !urlRes.data) {
        toast({ title: "Upload Failed", description: urlRes.error || "Could not get upload URL.", variant: "destructive" });
        return;
      }

      const { uploadUrl, key } = urlRes.data;

      // Step 2: PUT file directly to S3
      const uploadOk = await uploadFileToPresignedUrl(uploadUrl, uploadFile);
      if (!uploadOk) {
        toast({ title: "Upload Failed", description: "Could not upload file to storage.", variant: "destructive" });
        return;
      }

      // Step 3: Save S3 key in branding config
      // Construct the public URL from the key (the CDN prefix comes from env at render time)
      const payload = {
        ...currentBranding,
        logo: key, // Store the S3 key — the frontend resolves it via CDN prefix
        logoKey: key,
      };
      const res = await updateBranding(selectedTenantId, payload as any);

      if (res.success && res.data) {
        setCurrentBranding(res.data);
        toast({ title: "Logo Updated", description: "Your new logo has been uploaded to storage." });
      } else {
        toast({ title: "Save Failed", description: res.error || "Failed to save logo reference.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Logo upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Safely render logo — sanitize SVG to prevent XSS.
   */
  const renderLogo = (url: string) => {
    if (!url) return null;

    if (url.startsWith('<svg') || url.startsWith('<?xml')) {
      const sanitized = DOMPurify.sanitize(url, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'g', 'defs', 'linearGradient', 'stop', 'polygon', 'polyline', 'line', 'ellipse', 'text', 'tspan', 'use'],
        ADD_ATTR: ['viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'transform', 'class', 'style', 'offset', 'stop-color', 'stop-opacity', 'points', 'x1', 'y1', 'x2', 'y2', 'rx', 'ry', 'gradientUnits', 'gradientTransform'],
      });
      return <div dangerouslySetInnerHTML={{ __html: sanitized }} className="max-w-[200px]" />;
    }

    return <img src={url} alt="Live Logo" className="max-w-[200px] object-contain" />;
  };

  return (
    <div className="space-y-6 animate-vg-fade-in-up">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl border border-white/10" style={{background: 'linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)'}}>
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <Link href="/dashboard/super-admin/branding" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Branding
            </Link>
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[var(--deep-saffron)] mr-2 animate-pulse"></span>
              Visual Identity
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm font-display">
              Logo Management
            </h1>
            <p className="text-indigo-100/90 text-lg max-w-xl font-medium">
              Upload and manage the platform logo. SVG format recommended for optimal display.
            </p>
          </div>
        </div>
      </div>

      {/* Tenant Selector Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white/70 dark:bg-[#0A0F1E]/70 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-sm backdrop-blur-md">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 shrink-0">Configure for:</span>
        <TenantSelector />
      </div>

      {/* Content Split: Live vs Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Logo Display */}
        <div className="lg:col-span-4 rounded-2xl bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/40 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Logo
            </h2>
            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-emerald-500/10" title="SVG sanitized with DOMPurify">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/20">
            {isLoadingBranding ? (
              <Loader2 className="animate-spin h-6 w-6 text-slate-400" />
            ) : !selectedTenantId ? (
              <span className="text-sm text-slate-400 text-center">Select an institution</span>
            ) : logoUrl ? (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-full flex items-center justify-center">
                {renderLogo(logoUrl)}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <span className="text-sm text-slate-500">No logo configured</span>
              </div>
            )}
            
            {logoUrl && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-6 text-center max-w-[200px]">
                This is the logo currently displayed to users on your platform.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Upload Tool */}
        <div className="lg:col-span-8 rounded-2xl bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/40 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-[var(--peacock-teal)]/10 dark:bg-[var(--peacock-teal)]/20">
                <ImageIcon className="h-5 w-5 text-[var(--peacock-teal)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload New Logo</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Replace the current logo with a new file</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isLoadingBranding ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="animate-spin h-8 w-8 text-[var(--peacock-teal)]" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Loading branding configuration…</span>
              </div>
            ) : !selectedTenantId ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3 text-slate-400">
                <ImageIcon className="h-12 w-12 opacity-30" />
                <span className="text-sm">Select an institution above to manage its logo</span>
              </div>
            ) : (
              <LogoUploader
                currentLogo={logoUrl}
                onUpload={handleLogoUpload}
                constraints={{
                  maxSize: 2048, // 2MB
                  acceptedFormats: ['image/svg+xml', 'image/png', 'image/jpeg']
                }}
              />
            )}

            {isUploading && (
              <div className="mt-4 p-3 rounded-lg bg-[var(--peacock-teal)]/5 border border-[var(--peacock-teal)]/20 flex items-center gap-3">
                <Loader2 className="animate-spin h-4 w-4 text-[var(--peacock-teal)]" />
                <span className="text-sm text-[var(--peacock-teal)] font-medium">Uploading to cloud storage…</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Best Practices Card */}
      <div className="rounded-2xl bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/40 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--deep-saffron)]/10 dark:bg-[var(--deep-saffron)]/20">
            <Info className="h-4 w-4 text-[var(--deep-saffron)]" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Logo Best Practices</h3>
        </div>
        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2.5 ml-1">
          <li className="flex items-start gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--peacock-teal)] mt-1.5 shrink-0" />
            SVG format is recommended for crisp display at all sizes
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--peacock-teal)] mt-1.5 shrink-0" />
            If using SVG, include a <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">viewBox</code> attribute for responsive scaling
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--peacock-teal)] mt-1.5 shrink-0" />
            Set stroke/fill to <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">currentColor</code> for theme compatibility
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--peacock-teal)] mt-1.5 shrink-0" />
            Maintain a 3:1 or 4:1 width-to-height ratio
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--peacock-teal)] mt-1.5 shrink-0" />
            Non-SVG images are auto-compressed to ~200KB for optimal performance
          </li>
        </ul>
      </div>
    </div>
  );
}