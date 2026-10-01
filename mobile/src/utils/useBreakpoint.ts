import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Window size classes, following Material 3 / Android adaptive layout guidance.
 * `useWindowDimensions` already reports density-independent pixels, so these
 * thresholds are dp and map 1:1 to the breakpoints Google documents:
 *
 *   compact   < 600dp   phones in portrait
 *   medium    600–839dp small tablets, large phones in landscape, unfolded inner
 *   expanded  >= 840dp  tablets in landscape, desktop-class windows
 *
 * Layout decisions key off the size class rather than a raw `isTablet` boolean
 * so that a phone rotated into landscape gets the roomier layout too.
 */
export type WindowSize = 'compact' | 'medium' | 'expanded';

export const BREAKPOINTS = {
  medium: 600,
  expanded: 840,
} as const;

/** Values per size class. `compact` is required and acts as the fallback. */
export type ResponsiveValues<T> = {
  compact: T;
  medium?: T;
  expanded?: T;
};

export interface Breakpoint {
  width: number;
  height: number;
  size: WindowSize;
  isCompact: boolean;
  /** medium or expanded — i.e. anything roomier than a portrait phone. */
  isTablet: boolean;
  isExpanded: boolean;
  isLandscape: boolean;
  /**
   * Pick a value for the current size class, falling back to the next smaller
   * one when a class is omitted:
   *   select({ compact: 16, expanded: 32 })  // medium resolves to 16
   */
  select: <T>(values: ResponsiveValues<T>) => T;
  /**
   * Column count for a card grid. Derived from the available width and a
   * minimum comfortable card width, then clamped — so a 10" tablet does not
   * render two enormous covers, and a small phone never squeezes to three.
   */
  gridColumns: (options?: GridColumnOptions) => number;
}

export interface GridColumnOptions {
  /** Minimum comfortable card width in dp. Default 165 (a book cover). */
  minCardWidth?: number;
  /** Horizontal padding around the grid, subtracted from the width. */
  horizontalPadding?: number;
  min?: number;
  max?: number;
}

function resolveSize(width: number): WindowSize {
  if (width >= BREAKPOINTS.expanded) return 'expanded';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'compact';
}

export function useBreakpoint(): Breakpoint {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const size = resolveSize(width);

    function select<T>(values: ResponsiveValues<T>): T {
      if (size === 'expanded') {
        return values.expanded ?? values.medium ?? values.compact;
      }
      if (size === 'medium') return values.medium ?? values.compact;
      return values.compact;
    }

    function gridColumns(options: GridColumnOptions = {}): number {
      const {
        minCardWidth = 165,
        horizontalPadding = 32,
        min = 2,
        max = 6,
      } = options;

      const usable = Math.max(width - horizontalPadding, minCardWidth);
      const fit = Math.floor(usable / minCardWidth);
      return Math.min(Math.max(fit, min), max);
    }

    return {
      width,
      height,
      size,
      isCompact: size === 'compact',
      isTablet: size !== 'compact',
      isExpanded: size === 'expanded',
      isLandscape: width > height,
      select,
      gridColumns,
    };
  }, [width, height]);
}

/**
 * Max readable content width. Long-form text and forms stretched across a 10"
 * tablet are unreadable, so centred surfaces cap out here.
 */
export const CONTENT_MAX_WIDTH = {
  /** Body text / reader columns. */
  prose: 680,
  /** Forms, settings rows, auth cards. */
  form: 520,
  /** Wide dashboards and grids. */
  wide: 1100,
} as const;
