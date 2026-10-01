/**
 * Shared UI kit. Import from '@/components/ui' rather than reaching into
 * individual files, so screens stay easy to re-theme in one place.
 *
 * Every component here consumes `useThemeColors()`, which is what makes the
 * light/dark toggle actually apply — see the note in src/theme.ts.
 */
export { Avatar } from './Avatar';
export { Banner } from './Banner';
export { BottomSheet } from './BottomSheet';
export { Card } from './Card';
export { Chip } from './Chip';
export { EmptyState } from './EmptyState';
export { ListRow } from './ListRow';
export { PressableScale } from './PressableScale';
export { Screen } from './Screen';
export { SegmentedControl } from './SegmentedControl';
export { Skeleton, BookCardSkeleton } from './Skeleton';
export { StatTile } from './StatTile';

export type { AvatarProps } from './Avatar';
export type { BannerProps, BannerTone } from './Banner';
export type { BottomSheetProps } from './BottomSheet';
export type { CardProps, CardVariant } from './Card';
export type { ChipProps, ChipTone } from './Chip';
export type { EmptyStateProps } from './EmptyState';
export type { ListRowProps } from './ListRow';
export type { HapticKind, PressableScaleProps } from './PressableScale';
export type { ScreenProps } from './Screen';
export type { SegmentedControlProps, SegmentOption } from './SegmentedControl';
export type { SkeletonProps } from './Skeleton';
export type { StatTileProps, StatTone } from './StatTile';
