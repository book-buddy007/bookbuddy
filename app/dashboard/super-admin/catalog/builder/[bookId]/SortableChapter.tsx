'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronUp, ListPlus, Trash2, Pencil, Check } from 'lucide-react';
import type { FlatChapter, FlatSection } from './AudiobookBuilder';
import { UploadSlot } from './UploadSlot';

interface Props {
  chapter: FlatChapter;
  index: number;
  sections: FlatSection[];
  bookId: string;
  onRename: (id: string, title: string) => void;
  onRenameSave: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onAddSection: (chapterId: string) => void;
  onSectionRename: (id: string, title: string) => void;
  onSectionRenameSave: (sectionId: string, chapterId: string, title: string) => void;
  onTrackUploadSuccess: (sectionId: string, trackInfo: any) => void;
}

export function SortableChapter({
  chapter, index, sections, bookId,
  onRename, onRenameSave, onDelete, onAddSection,
  onSectionRename, onSectionRenameSave, onTrackUploadSuccess
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chapter.id });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(chapter.title);
  const [isExpanded, setIsExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local edits if DB forces an update
  useEffect(() => {
    if (!isEditingTitle) {
      setLocalTitle(chapter.title);
    }
  }, [chapter.title, isEditingTitle]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const chapterPrefix = chapter.type === 'INTRO'
    ? ''
    : chapter.type === 'APPENDIX'
    ? 'Appendix: '
    : `Chapter ${index + 1}: `;

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (localTitle.trim() !== chapter.title && localTitle.trim() !== '') {
      onRename(chapter.id, localTitle.trim());
      onRenameSave(chapter.id, localTitle.trim());
    } else {
      setLocalTitle(chapter.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') inputRef.current?.blur();
    if (e.key === 'Escape') {
      setLocalTitle(chapter.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700/50 overflow-hidden shadow-sm transition-all duration-200
        ${isDragging ? 'shadow-xl scale-[1.01] opacity-90' : 'hover:shadow-md'}`}
    >
      {/* ── Chapter Bar ── */}
      <div className="flex items-center gap-3 p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/40 group">
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 text-muted-foreground hover:bg-muted rounded cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* ── Title: display or input ── */}
        <div className="flex-1 font-medium flex items-center gap-2 text-slate-800 dark:text-slate-100">
          {isEditingTitle ? (
            <input
              ref={inputRef}
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="flex-1 bg-transparent border-b-2 border-peacock-teal outline-none
                         font-medium py-0.5 focus:border-indigo-deep
                         transition-colors duration-150"
              aria-label="Chapter title"
            />
          ) : (
            <span
              className="flex-1 cursor-text"
              onDoubleClick={() => setIsEditingTitle(true)}
            >
              {chapterPrefix}{chapter.title}
            </span>
          )}

          {/* Edit pencil — visible on group hover */}
          {!isEditingTitle && (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg
                         hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
              aria-label="Rename chapter"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {isEditingTitle && (
            <button
              onClick={handleTitleBlur}
              className="p-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
              aria-label="Confirm rename"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Actions — visible on group hover ── */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddSection(chapter.id)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl
                       bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800
                       dark:from-emerald-900/40 dark:to-teal-900/30 dark:text-emerald-300
                       border border-emerald-200/50 dark:border-emerald-800/50
                       hover:shadow-sm transition-all"
          >
            <ListPlus className="w-3.5 h-3.5" /> Add Section
          </button>
          <button
            onClick={() => onDelete(chapter.id)}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
            aria-label="Delete chapter"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* ── Expand/Collapse ── */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="p-1.5 ml-2"
          aria-label={isExpanded ? 'Collapse sections' : 'Expand sections'}
        >
          {isExpanded
            ? <ChevronUp className="w-5 h-5 text-muted-foreground" />
            : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>
      </div>

      {/* ── Sections List ── */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {sections.length === 0 && (
            <p className="text-xs text-slate-400 pl-8 italic">
              No sections yet — click "Add Section" to add one.
            </p>
          )}
          {sections.map((section, idx) => (
            <SectionRow
              key={section.id}
              section={section}
              index={idx}
              chapterId={chapter.id}
              bookId={bookId}
              onRename={onSectionRename}
              onRenameSave={onSectionRenameSave}
              onTrackUploadSuccess={onTrackUploadSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SectionRow (inline sub-component) ───────────────────────────────

function SectionRow({
  section, index, chapterId, bookId, onRename, onRenameSave, onTrackUploadSuccess
}: {
  section: FlatSection;
  index: number;
  chapterId: string;
  bookId: string;
  onRename: (id: string, title: string) => void;
  onRenameSave: (sectionId: string, chapterId: string, title: string) => void;
  onTrackUploadSuccess: (sectionId: string, trackInfo: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(section.title);

  useEffect(() => {
    if (!isEditing) {
      setLocalTitle(section.title);
    }
  }, [section.title, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localTitle.trim() !== section.title && localTitle.trim() !== '') {
      onRename(section.id, localTitle.trim());
      onRenameSave(section.id, chapterId, localTitle.trim());
    } else {
      setLocalTitle(section.title);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'Duration pending';
    const secs = Math.floor(ms / 1000);
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  return (
    <div className="pl-6 border-l-2 border-slate-200 dark:border-slate-700 py-2 ml-2 group">
      <div className="flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/40 px-4 py-3 rounded-xl
                      border border-slate-200/60 dark:border-slate-700/40 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-2 flex-1">
          {isEditing ? (
            <input
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') { setLocalTitle(section.title); setIsEditing(false); }
              }}
              autoFocus
              className="flex-1 bg-transparent border-b border-peacock-teal outline-none
                         text-sm font-medium text-slate-800 dark:text-slate-200"
            />
          ) : (
            <span className="font-medium text-sm text-slate-800 dark:text-slate-200 flex-1 cursor-text"
                  onDoubleClick={() => setIsEditing(true)}>
              {section.title}
            </span>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg
                       hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
            aria-label="Rename section"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/40 rounded-md px-2.5 py-1 ml-3 shrink-0">
          {formatDuration(section.durationMs)}
        </span>
      </div>

      {/* Upload Slots per track gender */}
      <div className="pl-4 pr-2 py-3 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <UploadSlot
          bookId={bookId}
          sectionId={section.id}
          gender="MALE"
          track={section.tracks?.find((t) => t.gender === 'MALE')}
          onUploadSuccess={(trackInfo) => onTrackUploadSuccess(section.id, trackInfo)}
        />
        <UploadSlot
          bookId={bookId}
          sectionId={section.id}
          gender="FEMALE"
          track={section.tracks?.find((t) => t.gender === 'FEMALE')}
          onUploadSuccess={(trackInfo) => onTrackUploadSuccess(section.id, trackInfo)}
        />
      </div>
    </div>
  );
}
