'use client';
import React from 'react';

// Assuming BookDto shape based on the backend entity
interface BookDto {
  title: string;
  author: string;
  publisher?: string;
  coverUrl?: string;
}

interface Props {
  book: BookDto | null;
}

export function BookContextHeader({ book }: Props) {
  if (!book) return <div className="mb-6 h-28 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 shadow-lg border border-white/10 mb-6"
      style={{
        background:
          'linear-gradient(135deg, var(--night-ink, #0f172a) 0%, var(--indigo-deep, #312e81) 50%, var(--peacock-teal, #0f766e) 100%)',
      }}
    >
      {/* Grain overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'url("/noise.svg")' }}
      />

      {/* Book cover — right-anchored */}
      {book.coverUrl && (
        <img
          src={book.coverUrl}
          alt={`${book.title} cover`}
          width={48}
          height={64}
          loading="lazy"
          className="absolute right-5 top-1/2 -translate-y-1/2 h-16 w-12 object-cover
 rounded-lg shadow-xl opacity-90 ring-1 ring-white/20"
        />
      )}

      {/* Text content */}
      <p className="text-white/50 text-xs uppercase tracking-widest mb-1.5 font-medium">
        Building Audio For
      </p>
      <h1 className="text-white font-bold text-xl truncate max-w-[75%] leading-tight">
        {book.title}
      </h1>
      <p className="text-white/60 text-sm mt-1">
        {book.author}
        {book.publisher ? ` · ${book.publisher}` : ''}
      </p>
    </div>
  );
}
