import { Suspense } from 'react';
import AudiobookPlayerV2 from './AudiobookPlayerV2';

export const metadata = {
  title: 'Audiobook Player – Vaajini',
  description: 'Listen to audiobooks with chapter navigation, gender voice toggle, and transcript support.',
};

export default function PlayerV2Page() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0a0a0f', color: '#a0a0b0',
        fontFamily: 'Inter, sans-serif', fontSize: 14,
      }}>
        Loading audiobook player…
      </div>
    }>
      <AudiobookPlayerV2 />
    </Suspense>
  );
}
