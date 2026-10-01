import Link from 'next/link';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';

const cards: { href: string; icon: BBIconName; title: string; body: string; foot: string; footIcon: BBIconName }[] = [
  {
    href: '/dashboard/super-admin/branding/logo',
    icon: 'image',
    title: 'Logo management',
    body: 'Upload and customize visual identity assets',
    foot: 'SVG, PNG, JPEG supported',
    footIcon: 'upload',
  },
  {
    href: '/dashboard/super-admin/branding/homepage',
    icon: 'home',
    title: 'Homepage editor',
    body: 'Customize homepage content, banners, and sections',
    foot: 'Hero, features, gallery, testimonials',
    footIcon: 'sparkles',
  },
];

export default function BrandingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Super admin"
        title="Branding configuration"
        description="Manage your platform's visual identity, logos, themes, and homepage content across all tenants."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="bb-lift group block rounded-[22px] bg-bb-surface p-6 shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-bb-accent-soft">
                <Icon name={c.icon} size={24} />
              </span>
              <div>
                <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">{c.title}</h3>
                <p className="text-sm text-bb-muted">{c.body}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-bb-border pt-4 text-sm text-bb-muted">
              <Icon name={c.footIcon} size={16} />
              <span>{c.foot}</span>
              <Icon name="arrow-right" size={16} className="ml-auto" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
