import { Suspense } from 'react';
import AudiobookBuilder from './AudiobookBuilder';
import { serverAdminApi } from '@/lib/api/serverAdminApi';

interface Props {
  params: { bookId: string };
}

// Ensure dynamic rendering and no caching at Next.js edge
export const dynamic = 'force-dynamic';

export default async function AudiobookBuilderPage({ params }: Props) {
  // Await the params Promise in Next.js 15
  const resolvedParams = await params;
  
  // Fetch book metadata server-side: header renders instantly, avoiding layout shift
  let book = null;
  try {
    book = await serverAdminApi.getBook(resolvedParams.bookId);
  } catch (error) {
    console.error('Failed to pre-fetch book metadata for Audiobook Builder:', error);
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col p-6 overflow-hidden">
      <Suspense fallback={<div className="flex h-full items-center justify-center">Loading Builder...</div>}>
        <AudiobookBuilder bookId={resolvedParams.bookId} initialBook={book} />
      </Suspense>
    </div>
  );
}
