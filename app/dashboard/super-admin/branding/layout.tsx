'use client';

import { BrandingProvider } from './BrandingProvider';

export default function BrandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      {children}
    </BrandingProvider>
  );
}
