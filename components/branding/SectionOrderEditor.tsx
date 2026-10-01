import React from 'react';
import { SectionEditor } from './SectionEditor';
import { Reorder } from 'framer-motion';
import { GripVertical } from '@/components/ui/icons';

const SECTION_LABELS: Record<string, string> = {
    hero: 'Hero Section',
    features: 'Feature Cards',
    featured: 'Featured Books',
    gallery: 'Image Gallery',
    testimonials: 'Testimonials',
    announcements: 'Announcements'
};

export function SectionOrderEditor({ sectionsOrder = [], onChange }: { sectionsOrder: string[], onChange: (newOrder: string[]) => void }) {
    // Ensure all known sections are present if missing
    const defaultSections = ['hero', 'features', 'featured', 'gallery', 'testimonials', 'announcements'];
    const activeSections = sectionsOrder.length > 0 ? sectionsOrder : defaultSections;

    return (
        <SectionEditor
            title="Homepage Section Order"
            description="Drag and drop to reorder how sections appear on the public homepage."
            name="sectionsOrder"
        >
            <Reorder.Group axis="y" values={activeSections} onReorder={onChange} className="space-y-3">
                {activeSections.map((sectionId) => (
                    <Reorder.Item
                        key={sectionId}
                        value={sectionId}
                        className="p-3 border rounded-md flex items-center bg-white/80 shadow-sm cursor-grab active:cursor-grabbing"
                        aria-label={`Drag to reorder ${SECTION_LABELS[sectionId] || sectionId} section`}
                    >
                        <GripVertical className="h-5 w-5 text-muted-foreground mr-3" aria-hidden="true" />
                        <span className="sr-only">Drag handle</span>
                        <span className="font-medium text-sm text-bb-muted">
                            {SECTION_LABELS[sectionId] || sectionId}
                        </span>
                    </Reorder.Item>
                ))}
            </Reorder.Group>
        </SectionEditor>
    );
}
