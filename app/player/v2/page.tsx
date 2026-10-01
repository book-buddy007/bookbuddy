import { Suspense } from 'react';
import { Icon } from '@/components/ui/icon';
import AudiobookPlayerV2 from './AudiobookPlayerV2';

export const metadata = {
  title: 'Audiobook player — Book Buddy',
  description: 'Listen to audiobooks with chapter navigation, narrator choice, sleep timer and read-along.',
};

export default function PlayerV2Page() {
  return (
    <Suspense
      fallback={
        <div role="status" className="fixed inset-0 grid place-items-center bg-bb-ink text-bb-dim">
          <span className="flex flex-col items-center gap-3 text-sm font-semibold">
            <Icon name="loader" size={28} fillLayer={false} className="animate-spin text-bb-blaze-light" />
            Loading the player…
          </span>
        </div>
      }
    >
      <AudiobookPlayerV2 />
    </Suspense>
  );
}
