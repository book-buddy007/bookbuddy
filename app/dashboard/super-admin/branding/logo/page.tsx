'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from "@/components/ui/use-toast";
import { LogoUploader } from '@/components/branding/ImageUploader';
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
    <div className="space-y-8">
      <Link href="/dashboard/super-admin/branding" className="inline-flex items-center gap-1.5 text-sm font-semibold text-bb-muted hover:text-bb-text">
        <Icon name="arrow-left" size={16} /> Back to branding
      </Link>

      <PageHeader
        className="mb-0"
        eyebrow="Visual identity"
        title="Logo management"
        description="Upload and manage the platform logo. SVG format recommended for optimal display."
      />

      <div className="flex flex-col items-start gap-3 rounded-[18px] bg-bb-surface p-4 shadow-e1 sm:flex-row sm:items-center">
        <span className="shrink-0 text-sm font-semibold text-bb-muted">Configure for</span>
        <TenantSelector />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="flex flex-col overflow-hidden rounded-[22px] bg-bb-surface shadow-e1 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-bb-border p-5">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]">
              <span className="h-2 w-2 rounded-full bg-bb-success" />
              Live logo
            </h2>
            <span title="SVG sanitized with DOMPurify" className="flex h-7 w-7 items-center justify-center rounded-lg bg-bb-success-soft text-bb-success-ink">
              <Icon name="shield-check" size={16} />
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center bg-bb-bg p-6">
            {isLoadingBranding ? (
              <Icon name="loader" size={24} className="animate-spin" />
            ) : !selectedTenantId ? (
              <span className="text-center text-sm text-bb-muted">Select an institution</span>
            ) : logoUrl ? (
              <div className="flex w-full items-center justify-center rounded-2xl bg-bb-surface p-4 shadow-e1">
                {renderLogo(logoUrl)}
              </div>
            ) : (
              <div className="rounded-2xl border-[1.5px] border-dashed border-bb-border p-8 text-center">
                <span className="text-sm text-bb-muted">No logo configured</span>
              </div>
            )}

            {logoUrl && (
              <p className="mt-6 max-w-[200px] text-center text-xs text-bb-muted">
                This is the logo currently displayed to users on your platform.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[22px] bg-bb-surface shadow-e1 lg:col-span-8">
          <div className="flex items-center gap-3 border-b border-bb-border p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-bb-accent-soft">
              <Icon name="image" size={20} />
            </span>
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-[-0.02em]">Upload new logo</h2>
              <p className="text-sm text-bb-muted">Replace the current logo with a new file</p>
            </div>
          </div>

          <div className="p-6">
            {isLoadingBranding ? (
              <div role="status" className="flex flex-col items-center justify-center gap-3 p-12">
                <Icon name="loader" size={32} className="animate-spin" />
                <span className="text-sm text-bb-muted">Loading branding configuration…</span>
              </div>
            ) : !selectedTenantId ? (
              <div className="flex flex-col items-center justify-center gap-3 p-12 text-bb-muted">
                <Icon name="image" size={48} className="opacity-40" />
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
              <div role="status" className="mt-4 flex items-center gap-3 rounded-xl bg-bb-accent-soft px-4 py-3">
                <Icon name="loader" size={16} className="animate-spin" />
                <span className="text-sm font-semibold text-bb-accent-ink">Uploading to cloud storage…</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[22px] bg-bb-surface p-6 shadow-e1">
        <h3 className="mb-4 flex items-center gap-3 font-display text-lg font-extrabold tracking-[-0.02em]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-bb-accent-soft">
            <Icon name="lightbulb" size={18} />
          </span>
          Logo best practices
        </h3>
        <ul className="space-y-2.5 text-sm text-bb-muted">
          {[
            'SVG format is recommended for crisp display at all sizes',
            <>If using SVG, include a <code className="rounded bg-bb-surface-2 px-1 py-0.5 text-xs">viewBox</code> attribute for responsive scaling</>,
            <>Set stroke/fill to <code className="rounded bg-bb-surface-2 px-1 py-0.5 text-xs">currentColor</code> for theme compatibility</>,
            'Maintain a 3:1 or 4:1 width-to-height ratio',
            'Non-SVG images are auto-compressed to ~200KB for optimal performance',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bb-accent" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
