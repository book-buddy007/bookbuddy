'use client';

import { useState,useEffect,useCallback } from 'react';
import { useForm,Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Segmented } from '@/components/ui/segmented';
import { toast } from "@/components/ui/use-toast";
import { Loader2,BookOpen,Search,X } from '@/components/ui/icons';
import { SectionEditor } from '@/components/branding/SectionEditor';
import { CharacterLimitedInput } from '@/components/branding/CharacterLimitedInput';
import { ImageUploader } from '@/components/branding/ContentImageUploader';
import { LivePreviewWindow } from '@/components/branding/LivePreviewWindow';
import { ImageGalleryEditor } from '@/components/branding/ImageGalleryEditor';
import { FeatureCardsEditor } from '@/components/branding/FeatureCardsEditor';
import { TestimonialsEditor } from '@/components/branding/TestimonialsEditor';
import { BrandingControlsEditor } from '@/components/branding/BrandingControlsEditor';
import { RichTextEditor } from '@/components/branding/RichTextEditor';
import { useOfflineAutoSave } from '@/components/branding/useOfflineAutoSave';
import { SectionOrderEditor } from '@/components/branding/SectionOrderEditor';
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
homepageSchema,
HOMEPAGE_TEXT_LIMITS,
} from '@/utils/content-validator';
import { useBrandingTenant } from '../BrandingProvider';
import { TenantSelector } from '../TenantSelector';
import {
updateBranding as apiBrandingUpdate,
publishBranding,
revertBranding,
getBrandingUploadUrl,
uploadFileToPresignedUrl,
} from '@/lib/api/adminApi';
import { useCatalogBooks } from '@/hooks/useCatalogBooks';
import type { HomepageContent,PageAction,BrandingColors } from '@/types/branding.types';
import Link from 'next/link';

// ─── S3 Image Upload ─────────────────────────────────────────────────────────

async function uploadImage(file: File, tenantId: string): Promise<string> {
  const urlRes = await getBrandingUploadUrl(tenantId, 'hero', file.type);
  if (!urlRes.success || !urlRes.data) throw new Error(urlRes.error || 'Could not get upload URL');

  const { uploadUrl, key } = urlRes.data;
  const ok = await uploadFileToPresignedUrl(uploadUrl, file);
  if (!ok) throw new Error('Failed to upload file to storage');

  return key; // Return S3 key — frontend resolves via CDN prefix at render time
}

// ─── Default Values ──────────────────────────────────────────────────────────

const defaultValues: HomepageContent = {
  hero: {
    title: 'Your Platform, Reimagined',
    subtitle: 'Access thousands of books, journals, and resources. Study smarter, not harder with Book Buddy - designed specifically for readers like you.',
    ctaButton: 'Get Started',
    image: '/hero-background.jpg'
  },
  featured: {
    books: [
      { id: 'book-1', title: 'Introduction to Library Science', image: '/books/book1.jpg' },
      { id: 'book-2', title: 'Digital Research Methods', image: '/books/book2.jpg' },
      { id: 'book-3', title: 'Academic Writing Essentials', image: '/books/book3.jpg' }
    ],
    layout: 'grid'
  },
  announcements: {
    title: 'Latest Updates',
    items: [
      'System maintenance scheduled for Sunday',
      'New arrivals in the History section',
      'Extended hours during finals week'
    ]
  },
  gallery: { images: [] },
  features: { cards: [] },
  testimonials: [],
  sectionsOrder: ['hero', 'features', 'featured', 'gallery', 'testimonials', 'announcements']
};

// ─── Featured Books Selector ─────────────────────────────────────────────────

function FeaturedBooksSelector({
  selectedBooks,
  onChange,
}: {
  selectedBooks: HomepageContent['featured']['books'];
  onChange: (books: HomepageContent['featured']['books']) => void;
}) {
  const [search, setSearch] = useState('');
  const { books: catalogBooks, isLoading } = useCatalogBooks({ search, enabled: true });

  const addBook = (book: { id: string; title: string; coverUrl?: string }) => {
    if (selectedBooks.some(b => b.id === book.id)) return;
    onChange([...selectedBooks, { id: book.id, title: book.title, image: book.coverUrl }]);
  };

  const removeBook = (id: string) => {
    onChange(selectedBooks.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Selected Books */}
      {selectedBooks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedBooks.map(book => (
            <span
              key={book.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bb-accent-soft text-bb-accent-ink text-sm font-medium border border-bb-accent/20"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {book.title}
              <button type="button" onClick={() => removeBook(book.id)} className="hover:text-bb-danger-ink transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search + Add */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bb-faint" />
        <input
          type="text"
          placeholder="Search library to add books…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-bb-border bg-bb-surface text-sm text-bb-text dark:text-white placeholder:text-bb-faint focus:ring-2 focus:ring-bb-accent/30 focus:border-bb-accent outline-none transition-all"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-bb-faint">
          <Loader2 className="animate-spin h-3 w-3" /> Searching library…
        </div>
      )}

      {search && catalogBooks.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-bb-border divide-y divide-bb-border">
          {catalogBooks.slice(0, 10).map(book => {
            const isSelected = selectedBooks.some(b => b.id === book.id);
            return (
              <button
                key={book.id}
                type="button"
                disabled={isSelected}
                onClick={() => addBook(book)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${isSelected ? 'opacity-50 cursor-not-allowed bg-bb-surface-2' : 'hover:bg-bb-surface-2'}`}
              >
                <BookOpen className="h-4 w-4 text-bb-faint shrink-0" />
                <span className="font-medium text-bb-text">{book.title}</span>
                {book.author && <span className="text-xs text-bb-faint ml-auto">{book.author}</span>}
                {isSelected && <span className="text-xs text-bb-success-ink ml-auto">Added</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function HomepageEditorPage() {
  const {
    selectedTenantId,
    currentBranding,
    setCurrentBranding,
    isLoadingBranding,
  } = useBrandingTenant();

  // Single enum replaces 3 booleans (isSaving / isPublishing / isReverting)
  const [pageAction, setPageAction] = useState<PageAction>('idle');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [liveHtml, setLiveHtml] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'draft' | 'live'>('draft');

  // Form setup with validation
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm<HomepageContent>({
    defaultValues,
    resolver: zodResolver(homepageSchema)
  });

  const formValues = watch();

  // Update preview when form values change
  useEffect(() => {
    const html = generatePreviewHtml(formValues, currentBranding?.colors as BrandingColors | undefined);
    setPreviewHtml(html);
  }, [formValues, currentBranding?.colors]);

  // Update live preview when branding context updates
  useEffect(() => {
    const hp = (currentBranding as any)?.homepage || defaultValues;
    const html = generatePreviewHtml(hp, currentBranding?.colors as BrandingColors | undefined);
    setLiveHtml(html);
  }, [currentBranding]);

  // Reset form when branding data loads from context
  useEffect(() => {
    if (currentBranding) {
      const hp = (currentBranding as any).homepage;
      if (hp) {
        reset(hp, { keepDefaultValues: false });
      } else {
        reset(defaultValues);
      }
    }
  }, [currentBranding, reset]);

  // Auto-save — uses adminApi via injected saveAction
  const autoSaveAction = useCallback(async (data: any): Promise<boolean> => {
    if (!selectedTenantId || !currentBranding) return false;
    try {
      const payload = { ...currentBranding, homepage: data };
      const res = await apiBrandingUpdate(selectedTenantId, payload as any);
      return res.success;
    } catch {
      return false;
    }
  }, [selectedTenantId, currentBranding]);

  const { isOnline, isSaving: isAutoSaving, lastSaved } = useOfflineAutoSave(
    formValues,
    autoSaveAction,
    selectedTenantId,
    isDirty
  );

  // S3 image upload for hero/gallery images
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    if (!selectedTenantId) throw new Error('Select an institution first');
    return uploadImage(file, selectedTenantId);
  }, [selectedTenantId]);

  // Save Draft
  const onSubmit = async (data: HomepageContent) => {
    if (!selectedTenantId || !currentBranding) {
      toast({ title: "Error", description: "Select an institution first", variant: "destructive" });
      return;
    }

    setPageAction('saving');
    try {
      const payload = { ...currentBranding, homepage: data };
      const res = await apiBrandingUpdate(selectedTenantId, payload as any);

      if (res.success && res.data) {
        setCurrentBranding(res.data);
        reset(data);
        toast({ title: "Draft Saved", description: "Your changes have been saved as a draft." });
      } else {
        toast({ title: "Save Failed", description: res.error || "Failed to save changes.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Save Failed", description: "Failed to save changes. Please try again.", variant: "destructive" });
    } finally {
      setPageAction('idle');
    }
  };

  // Publish
  const onPublish = async () => {
    if (!selectedTenantId) return;
    setPageAction('publishing');
    try {
      const res = await publishBranding(selectedTenantId);
      if (res.success && res.data) {
        setCurrentBranding(res.data);
        toast({ title: "Published", description: "Your homepage layout is now live." });
      } else {
        toast({ title: "Publish Failed", description: res.error || "Could not publish changes.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Publish Failed", description: "Could not publish changes.", variant: "destructive" });
    } finally {
      setPageAction('idle');
    }
  };

  // Revert — triggered by AlertDialog confirmation
  const onRevert = async () => {
    if (!selectedTenantId) return;

    setPageAction('reverting');
    try {
      const res = await revertBranding(selectedTenantId);
      if (res.success && res.data) {
        setCurrentBranding(res.data);
        const hp = (res.data as any).homepage;
        if (hp) reset(hp);
        toast({ title: "Reverted", description: "Draft changes discarded. Viewing the published layout." });
      } else {
        toast({ title: "Revert Failed", description: res.error || "Could not revert changes.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Revert Failed", description: "Could not revert. There might not be a published version.", variant: "destructive" });
    } finally {
      setPageAction('idle');
    }
  };

  // Generate preview HTML
  function generatePreviewHtml(data: HomepageContent, colors?: BrandingColors): string {
    const defaultSections = ['hero', 'features', 'featured', 'gallery', 'testimonials', 'announcements'];
    const activeSections = data.sectionsOrder?.length ? data.sectionsOrder : defaultSections;

    const primary = colors?.primary || '#16213e';
    const secondary = colors?.secondary || '#0f3460';
    const accent = '#D93A00';

    const builders: Record<string, () => string> = {
      hero: () => `
        <section style="background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); padding: 60px 20px; text-align: center; color: white;">
          <h1 style="font-size: 36px; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.5px;">${data.hero?.title || 'Hero Title'}</h1>
          <p style="font-size: 16px; max-width: 600px; margin: 0 auto 24px; opacity: 0.85;">${data.hero?.subtitle || ''}</p>
          <button style="background: linear-gradient(135deg, ${accent}, ${secondary}); color: white; border: none; padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer;">${data.hero?.ctaButton || 'Click Here'}</button>
        </section>
      `,
      featured: () => `
        <section style="padding: 48px 20px; background: #f8fafc;">
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center; color: #1e293b;">Featured Books</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
            ${data.featured?.books?.map(book => `
              <div style="width: 200px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white;">
                <div style="height: 120px; background: linear-gradient(135deg, ${primary}22, ${secondary}22);"></div>
                <div style="padding: 12px;">
                  <h3 style="font-size: 14px; font-weight: 600; color: #334155;">${book.title}</h3>
                </div>
              </div>
            `).join('') || ''}
          </div>
        </section>
      `,
      announcements: () => `
        <section style="background: #f1f5f9; padding: 48px 20px;">
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center; color: #1e293b;">${data.announcements?.title || 'Announcements'}</h2>
          <ul style="max-width: 600px; margin: 0 auto; list-style-type: none; padding: 0;">
            ${data.announcements?.items?.map(item => `
              <li style="margin-bottom: 12px; padding: 12px 16px; background: white; border-radius: 8px; border-left: 3px solid ${primary}; font-size: 14px; color: #475569;">${item}</li>
            `).join('') || ''}
          </ul>
        </section>
      `,
      features: () => `
        <section style="padding: 48px 20px; text-align: center;">
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #1e293b;">Features</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
            ${data.features?.cards?.map(card => `
              <div style="width: 250px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; text-align: left;">
                <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #1e293b;">${card.title}</h3>
                <p style="font-size: 13px; color: #64748b;">${card.description}</p>
              </div>
            `).join('') || ''}
          </div>
        </section>
      `,
      gallery: () => `
        <section style="background: #f8fafc; padding: 48px 20px;">
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center; color: #1e293b;">Image Gallery</h2>
          <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; justify-content: center;">
            ${data.gallery?.images?.map(() => `
              <div style="min-width: 150px; height: 100px; background: linear-gradient(135deg, ${primary}22, ${secondary}22); border-radius: 8px;"></div>
            `).join('') || ''}
          </div>
        </section>
      `,
      testimonials: () => `
        <section style="padding: 48px 20px;">
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center; color: #1e293b;">Testimonials</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
            ${data.testimonials?.map(t => `
              <div style="width: 300px; padding: 24px; background: #f8fafc; border-radius: 12px; font-style: italic; border: 1px solid #e2e8f0;">
                <p style="font-size: 14px; color: #475569; margin-bottom: 12px;">"${t.quote}"</p>
                <p style="font-size: 13px; font-weight: 600; color: #1e293b;">— ${t.name}, <span style="font-weight: 400; color: #64748b;">${t.role}</span></p>
              </div>
            `).join('') || ''}
          </div>
        </section>
      `
    };

    return activeSections.map(section => builders[section] ? builders[section]() : '').join('');
  }

  const isAnyActionLoading = pageAction !== 'idle' || isAutoSaving || isLoadingBranding;

  return (
    <div className="space-y-8">
      <Link href="/dashboard/super-admin/branding" className="inline-flex items-center gap-1.5 text-sm font-semibold text-bb-muted hover:text-bb-text">
        <Icon name="arrow-left" size={16} /> Back to branding
      </Link>

      <PageHeader
        className="mb-0"
        eyebrow="Content management"
        title="Homepage editor"
        description="Manage the content displayed on the main public homepage."
        actions={
          <>
            {/* Revert — AlertDialog instead of window.confirm() */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isAnyActionLoading || !selectedTenantId}>
                  {pageAction === 'reverting' ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="rotate-ccw" size={16} />}
                  Revert
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Icon name="alert" size={20} />
                    Revert to published version?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will discard all draft changes and restore the last published homepage layout.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onRevert} className="bg-bb-danger text-white hover:brightness-95">
                    Yes, revert changes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleSubmit(onSubmit)}
              disabled={isAnyActionLoading || !isDirty || !selectedTenantId}
            >
              {pageAction === 'saving' || isAutoSaving ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="save" size={16} />}
              Save draft
            </Button>
            <Button size="sm" onClick={onPublish} disabled={isAnyActionLoading || !selectedTenantId}>
              {pageAction === 'publishing' ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="send" size={16} />}
              Publish
            </Button>
          </>
        }
      />

      {/* Tenant selector + status bar */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-[18px] bg-bb-surface p-4 shadow-e1 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-sm font-semibold text-bb-muted">Configure for</span>
          <TenantSelector />
        </div>
        <div className="flex items-center gap-3 text-xs text-bb-muted">
          {!isOnline && (
            <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-bb-warning-soft px-3 py-1 font-semibold text-bb-warning-ink">
              <Icon name="wifi" size={14} />
              Offline: changes saved locally
            </span>
          )}
          {isOnline && lastSaved && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="wifi" size={14} />
              Last saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Main editor */}
      <section className="overflow-hidden rounded-[22px] bg-bb-surface shadow-e1">
        <div className="flex items-center gap-3 border-b border-bb-border p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-bb-accent-soft">
            <Icon name="home" size={20} />
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-[-0.02em]">Homepage sections</h2>
            <p className="text-sm text-bb-muted">Configure each section of the public homepage</p>
          </div>
        </div>

        <div className="p-6">
          {isLoadingBranding ? (
            <div role="status" className="flex flex-col items-center justify-center gap-3 p-12">
              <Icon name="loader" size={32} className="animate-spin" />
              <span className="text-sm text-bb-muted">Loading homepage configuration…</span>
            </div>
          ) : !selectedTenantId ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-bb-muted">
              <Icon name="home" size={48} className="opacity-40" />
              <span className="text-sm">Select an institution above to manage its homepage</span>
            </div>
          ) : (
            <form className="space-y-6">
              {/* Global Branding Controls */}
              <SectionEditor
                title="Global Branding Controls"
                description="Customize the look and feel across the platform"
                name="branding"
              >
                <BrandingControlsEditor
                  tenantId={selectedTenantId}
                  branding={currentBranding as any}
                  onChange={(b: any) => setCurrentBranding(b)}
                />
              </SectionEditor>

              {/* Section Order Editor */}
              <Controller
                name="sectionsOrder"
                control={control}
                render={({ field }) => (
                  <SectionOrderEditor
                    sectionsOrder={field.value || []}
                    onChange={field.onChange}
                  />
                )}
              />

              {/* Hero Section */}
              <SectionEditor
                title="Hero Section"
                description="The main banner section at the top of the homepage"
                name="hero"
              >
                <Controller
                  name="hero.title"
                  control={control}
                  render={({ field }) => (
                    <CharacterLimitedInput
                      id="hero-title"
                      label="Hero Title"
                      maxLength={HOMEPAGE_TEXT_LIMITS.heroTitle}
                      value={field.value}
                      onChange={field.onChange}
                      rules={{ allowedCharacters: /[\w\s,.!-]/ }}
                      error={errors.hero?.title?.message}
                      description="Use title case for better visual appeal"
                      showRequiredIndicator
                    />
                  )}
                />

                <Controller
                  name="hero.subtitle"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      id="hero-subtitle"
                      label="Hero Subtitle"
                      maxLength={HOMEPAGE_TEXT_LIMITS.heroSubtitle}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.hero?.subtitle?.message}
                    />
                  )}
                />

                <Controller
                  name="hero.ctaButton"
                  control={control}
                  render={({ field }) => (
                    <CharacterLimitedInput
                      id="hero-cta"
                      label="Call to Action Button"
                      maxLength={HOMEPAGE_TEXT_LIMITS.ctaButton}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.hero?.ctaButton?.message}
                      description="Avoid punctuation in button text"
                    />
                  )}
                />

                <Controller
                  name="hero.image"
                  control={control}
                  render={({ field }) => (
                    <ImageUploader
                      label="Hero Background Image"
                      value={field.value || ''}
                      onChange={field.onChange}
                      onUpload={handleImageUpload}
                      aspectRatio="16:9"
                      recommendedSize="1920x1080"
                      formats={['jpg', 'webp', 'png']}
                      error={errors.hero?.image?.message}
                    />
                  )}
                />
              </SectionEditor>

              {/* Announcements Section */}
              <SectionEditor
                title="Announcements"
                description="Important messages displayed on the homepage"
                name="announcements"
              >
                <Controller
                  name="announcements.title"
                  control={control}
                  render={({ field }) => (
                    <CharacterLimitedInput
                      id="announcements-title"
                      label="Section Title"
                      maxLength={HOMEPAGE_TEXT_LIMITS.announcementTitle}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.announcements?.title?.message}
                    />
                  )}
                />

                <div className="space-y-4">
                  <label className="text-sm font-medium text-bb-text">Announcement Items</label>
                  {formValues.announcements.items.map((item, index) => (
                    <Controller
                      key={index}
                      name={`announcements.items.${index}`}
                      control={control}
                      render={({ field }) => (
                        <div className="flex gap-2">
                          <CharacterLimitedInput
                            id={`announcement-${index}`}
                            maxLength={HOMEPAGE_TEXT_LIMITS.announcementText}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.announcements?.items?.[index]?.message}
                          />

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentItems = [...formValues.announcements.items];
                              currentItems.splice(index, 1);
                              setValue('announcements.items', currentItems as [string, ...string[]], {
                                shouldDirty: true,
                                shouldValidate: true
                              });
                            }}
                            className="shrink-0 border-bb-danger/30 text-bb-danger-ink hover:bg-bb-danger-soft"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    />
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const currentItems = [...formValues.announcements.items];
                      currentItems.push(`New Announcement ${currentItems.length + 1}`);
                      setValue('announcements.items', currentItems as [string, ...string[]], {
                        shouldDirty: true,
                        shouldValidate: true
                      });
                    }}
                    className="border-bb-border text-bb-text hover:bg-bb-surface-2"
                  >
                    Add Announcement
                  </Button>
                </div>
              </SectionEditor>

              {/* Featured Books Section — REAL selector, not placeholder */}
              <SectionEditor
                title="Featured Books"
                description="Showcase important books on the homepage"
                name="featured"
              >
                <Controller
                  name="featured.books"
                  control={control}
                  render={({ field }) => (
                    <FeaturedBooksSelector
                      selectedBooks={field.value || []}
                      onChange={field.onChange}
                    />
                  )}
                />

                <Controller
                  name="featured.layout"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2 mt-4">
                      <label className="text-sm font-medium text-bb-text">Display Layout</label>
                      <div className="flex gap-4">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="layout-grid"
                            value="grid"
                            checked={field.value === 'grid'}
                            onChange={() => field.onChange('grid')}
                            className="mr-2 accent-[var(--bb-accent)]"
                          />
                          <label htmlFor="layout-grid" className="text-sm text-bb-muted">Grid</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="layout-carousel"
                            value="carousel"
                            checked={field.value === 'carousel'}
                            onChange={() => field.onChange('carousel')}
                            className="mr-2 accent-[var(--bb-accent)]"
                          />
                          <label htmlFor="layout-carousel" className="text-sm text-bb-muted">Carousel</label>
                        </div>
                      </div>
                    </div>
                  )}
                />
              </SectionEditor>

              {/* Feature Cards Section */}
              <FeatureCardsEditor
                control={control}
                formValues={formValues}
                setValue={setValue}
                errors={errors}
              />

              {/* Image Gallery Section */}
              <ImageGalleryEditor
                control={control}
                formValues={formValues}
                setValue={setValue}
                uploadImage={handleImageUpload}
              />

              {/* Testimonials Section */}
              <TestimonialsEditor
                control={control}
                formValues={formValues}
                setValue={setValue}
                errors={errors}
              />
            </form>
          )}
        </div>
      </section>

      {/* Live preview window */}
      <section id="preview-anchor" className="overflow-hidden rounded-[22px] bg-bb-surface shadow-e1">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-bb-border p-4 sm:flex-row sm:items-center">
          <h3 className="flex items-center gap-3 font-display text-base font-extrabold tracking-[-0.02em]">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-bb-accent-soft">
              <Icon name="eye" size={16} />
            </span>
            Workspace preview
          </h3>

          <Segmented
            size="sm"
            aria-label="Preview version"
            value={previewMode}
            onValueChange={setPreviewMode}
            options={[
              { value: 'draft', label: 'Draft preview' },
              { value: 'live', label: 'Currently live' },
            ]}
          />
        </div>

        <div className="relative">
          {previewMode === 'draft' ? (
            <LivePreviewWindow htmlContent={previewHtml} />
          ) : (
            <div className="relative">
              <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md bg-bb-ink/90 px-2 py-1 text-[10px] font-bold uppercase text-white">
                Live version
              </div>
              <LivePreviewWindow htmlContent={liveHtml} />
            </div>
          )}
        </div>
      </section>

      {/* Content guidelines */}
      <section className="rounded-[22px] bg-bb-surface p-6 shadow-e1">
        <h3 className="mb-4 font-display text-lg font-extrabold tracking-[-0.02em]">Content guidelines</h3>
        <ul className="space-y-2.5 text-sm text-bb-muted">
          {[
            'Use title case for all section headers (e.g., "Library Resources" not "library resources")',
            'Keep hero titles under 60 characters for optimal display on all devices',
            'Use action verbs in CTA buttons to encourage engagement',
            'Maintain 16:9 aspect ratio for hero images for consistent display',
            'Limit announcements to 3–5 items for better readability',
            'Use high-contrast images that work well with overlay text',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bb-accent" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
