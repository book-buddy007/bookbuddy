'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminApi from '@/lib/api/adminApi';
import { SortableChapter } from './SortableChapter';
import { BookContextHeader } from './BookContextHeader';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { useToast } from '@/components/ui/use-toast';
import { Music, Plus, Save } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────

export type FlatChapter = {
  id: string;
  title: string;
  type: string;
  sortOrder: number;
};

export type FlatTrack = {
  id: string;
  gender: 'MALE' | 'FEMALE';
  fileUrl: string;
  durationMs: number | null;
};

export type FlatSection = {
  id: string;
  chapterId: string;
  title: string;
  sortOrder: number;
  durationMs: number | null;
  tracks?: FlatTrack[];
};

// ─── Component ────────────────────────────────────────────────────────

interface Props {
  bookId: string;
  initialBook: any; // Mapped from Context page
}

export default function AudiobookBuilder({ bookId, initialBook }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── State: flat arrays (correct shape for dnd-kit)
  const [chapters, setChapters] = useState<FlatChapter[]>([]);
  const [sections, setSections] = useState<FlatSection[]>([]);

  // ── Query 1: Audiobook structure
  const { data: structure, isLoading } = useQuery({
    queryKey: ['audiobook-structure', bookId],
    queryFn: () => adminApi.getAudiobookStructure(bookId),
  });

  useEffect(() => {
    if (structure?.data) {
      setChapters(structure.data.chapters || []);
      setSections(structure.data.sections || []);
    }
  }, [structure]);

  // ── Mutations ─────────────────────────────────────────────────────

  const addChapterMutation = useMutation({
    mutationFn: () => adminApi.createChapter(bookId),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setChapters((prev) => [...prev, { ...res.data, type: 'CHAPTER' }]);
      } else {
        toast({ title: 'Error', description: 'Failed to create chapter', variant: 'destructive' });
      }
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create chapter', variant: 'destructive' }),
  });

  const deleteChapterMutation = useMutation({
    mutationFn: (chapterId: string) => adminApi.deleteChapter(bookId, chapterId),
    onMutate: async (chapterId) => {
      // Optimistic removal
      const previousChapters = chapters;
      const previousSections = sections;
      const removedChapter = chapters.find((c) => c.id === chapterId);
      const removedSections = sections.filter((s) => s.chapterId === chapterId);

      setChapters((prev) => prev.filter((c) => c.id !== chapterId));
      setSections((prev) => prev.filter((s) => s.chapterId !== chapterId));

      toast({
        title: 'Chapter deleted',
        description: removedChapter?.title || 'Chapter removed safely',
      });
      // In a real sophisticated UI, use a custom action toast for undoing
      return { previousChapters, previousSections };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) {
        setChapters(ctx.previousChapters);
        setSections(ctx.previousSections);
      }
      toast({ title: 'Error', description: 'Failed to delete chapter', variant: 'destructive' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (data: { chapters: any[]; sections: any[] }) =>
      adminApi.reorderStructure(bookId, data),
    onSuccess: () => {
       toast({ title: 'Success', description: 'Order saved successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to save order.', variant: 'destructive' }),
  });

  // ── Drag & Drop ──────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex((c) => c.id === active.id);
    const newIndex = chapters.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(chapters, oldIndex, newIndex).map((c, i) => ({
      ...c,
      sortOrder: i,
    }));

    setChapters(reordered);
  };

  const saveOrder = () => {
    reorderMutation.mutate({
      chapters: chapters.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
      sections: sections.map((s) => ({ id: s.id, sortOrder: s.sortOrder })),
    });
  };

  // ── Inline edit callbacks (passed to SortableChapter) ────────────

  const handleChapterRename = (id: string, title: string) => {
    // Derive type similarly to backend to keep UI instant prefix update
    let derivedType = 'CHAPTER';
    const l = title.toLowerCase();
    if (l.includes('intro') || l.includes('foreword') || l.includes('preface')) derivedType = 'INTRO';
    else if (l.includes('appendix')) derivedType = 'APPENDIX';

    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, title, type: derivedType } : c)));
  };

  const handleChapterRenameSave = (id: string, title: string) => {
    adminApi.updateChapter(bookId, id, { title }).catch(() =>
      toast({ title: 'Error', description: 'Failed to save chapter name', variant: 'destructive' }),
    );
  };

  const handleAddSection = (chapterId: string) => {
    adminApi.createSection(bookId, chapterId).then((res) => {
      if (res.success && res.data) {
         setSections((prev) => [...prev, { ...res.data, chapterId, durationMs: null, tracks: [] }]);
      }
    });
  };

  const handleSectionRename = (id: string, title: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const handleSectionRenameSave = (
    sectionId: string,
    chapterId: string,
    title: string,
  ) => {
    adminApi.updateSection(bookId, chapterId, sectionId, { title }).catch(() =>
      toast({ title: 'Error', description: 'Failed to save section name', variant: 'destructive' }),
    );
  };

  const handleTrackUploadSuccess = (sectionId: string, trackInfo: any) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== sectionId) return s;
      const existingTracks = s.tracks || [];
      const idx = existingTracks.findIndex((t) => t.gender === trackInfo.gender);
      const newTracks = [...existingTracks];
      if (idx >= 0) {
        newTracks[idx] = { ...newTracks[idx], ...trackInfo };
      } else {
        newTracks.push({ ...trackInfo });
      }
      return { ...s, tracks: newTracks, durationMs: trackInfo.durationMs };
    }));
  };

  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto pr-2 pb-20">
      {/* ── Contextual Header ── */}
      <BookContextHeader book={initialBook} />

      {/* ── Toolbar ── */}
      <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Music className="w-5 h-5 text-amber-500" /> Audiobook Structure</h3>
          <p className="text-sm text-muted-foreground">Drag to reorder. Click titles to rename.</p>
        </div>
        <div className="flex gap-2">
          <EnhancedButton
            onClick={() => addChapterMutation.mutate()}
            loading={addChapterMutation.isPending}
            variant="outline"
            className="gap-2 rounded-xl border-slate-200 dark:border-slate-700"
          >
            {!addChapterMutation.isPending && <Plus className="w-4 h-4" />}
            Add Chapter
          </EnhancedButton>
          <EnhancedButton
            onClick={saveOrder}
            loading={reorderMutation.isPending}
            className="gap-2 rounded-xl bg-gradient-to-r from-[#006A6E] to-[#00897B] hover:from-[#005A5E] hover:to-[#007A6B] text-white shadow-md"
          >
            {!reorderMutation.isPending && <Save className="w-4 h-4" />}
            Save Order
          </EnhancedButton>
        </div>
      </div>

      {/* ── Chapter List ── */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
           <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
           <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </div>
      ) : chapters.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground border-slate-200 dark:border-slate-800">
           <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
           <p>No chapters yet. Add your first chapter to get started.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleChapterDragEnd}
        >
          <SortableContext
            items={chapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {chapters.map((chapter, index) => (
                <SortableChapter
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                  sections={sections.filter((s) => s.chapterId === chapter.id)}
                  bookId={bookId}
                  onRename={handleChapterRename}
                  onRenameSave={handleChapterRenameSave}
                  onDelete={(id) => deleteChapterMutation.mutate(id)}
                  onAddSection={handleAddSection}
                  onSectionRename={handleSectionRename}
                  onSectionRenameSave={handleSectionRenameSave}
                  onTrackUploadSuccess={handleTrackUploadSuccess}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
