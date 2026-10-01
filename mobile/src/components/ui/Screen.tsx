import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useThemeColors } from '@/ThemeProvider';
import { spacing } from '@/theme';
import { CONTENT_MAX_WIDTH, useBreakpoint } from '@/utils/useBreakpoint';

type MaxWidth = keyof typeof CONTENT_MAX_WIDTH | number | 'none';

export interface ScreenProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /**
   * Caps content width and centres it. Text and forms stretched across a 10"
   * tablet are unreadable, so every screen should declare an intent here.
   * Defaults to 'wide'.
   */
  maxWidth?: MaxWidth;
  /** Horizontal + top padding. Set false for edge-to-edge lists. */
  padded?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
}

function resolveMaxWidth(maxWidth: MaxWidth): number | undefined {
  if (maxWidth === 'none') return undefined;
  if (typeof maxWidth === 'number') return maxWidth;
  return CONTENT_MAX_WIDTH[maxWidth];
}

/**
 * Standard screen shell: themed background, safe-area insets, and a centred
 * content column that stops growing past a readable width on tablets.
 *
 * On compact widths the cap is inert (the screen is narrower than any cap), so
 * using this everywhere costs nothing on a phone and is what makes the same
 * screens hold up on a large display.
 */
export function Screen({
  children,
  scroll = false,
  maxWidth = 'wide',
  padded = true,
  edges = ['top', 'left', 'right'],
  style,
  contentContainerStyle,
  refreshControl,
}: ScreenProps) {
  const colors = useThemeColors();
  const { isTablet } = useBreakpoint();
  const cap = resolveMaxWidth(maxWidth);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.bg },
        column: {
          flex: 1,
          width: '100%',
          alignSelf: 'center',
          maxWidth: cap,
        },
        padded: {
          paddingHorizontal: spacing(isTablet ? 6 : 4),
          paddingTop: spacing(2),
        },
        scrollContent: { flexGrow: 1, paddingBottom: spacing(8) },
      }),
    [cap, colors.bg, isTablet],
  );

  const inner = (
    <View style={[styles.column, padded && !scroll && styles.padded, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.column}
          contentContainerStyle={[
            styles.scrollContent,
            padded && styles.padded,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}
