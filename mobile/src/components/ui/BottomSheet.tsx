import React, { useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@/components/Ionicons';
import { useThemeColors } from '@/ThemeProvider';
import { haptics, spring } from '@/motion';
import { fonts, radius, spacing } from '@/theme';
import { CONTENT_MAX_WIDTH, useBreakpoint } from '@/utils/useBreakpoint';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * On expanded widths, present as a centred dialog instead of a sheet glued to
   * the bottom of a 10" screen. Default true — pass false to force a sheet.
   */
  adaptive?: boolean;
}

/** Drag distance past which releasing dismisses the sheet. */
const DISMISS_THRESHOLD = 110;

/**
 * Modal surface used for filters, book actions, and confirmations.
 *
 * Phone: a bottom sheet with drag-to-dismiss, reachable by thumb.
 * Tablet: a centred dialog, because a sheet pinned to the bottom edge of a
 * large landscape display puts controls nowhere near where the user is looking.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  adaptive = true,
}: BottomSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const translateY = useSharedValue(0);

  const asDialog = adaptive && isExpanded;

  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [translateY, visible]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!asDialog)
        .onChange((event) => {
          // Downward only — an upward drag on a sheet shouldn't lift it off.
          translateY.value = Math.max(0, translateY.value + event.changeY);
        })
        .onEnd((event) => {
          if (translateY.value > DISMISS_THRESHOLD || event.velocityY > 900) {
            runOnJS(onClose)();
          } else {
            translateY.value = withSpring(0, spring.gentle);
          }
        }),
    [asDialog, onClose, translateY],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(10, 15, 36, 0.55)',
          justifyContent: asDialog ? 'center' : 'flex-end',
          alignItems: asDialog ? 'center' : 'stretch',
          padding: asDialog ? spacing(6) : 0,
        },
        surface: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          paddingHorizontal: spacing(5),
          paddingTop: spacing(2),
        },
        sheet: {
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingBottom: insets.bottom + spacing(5),
        },
        dialog: {
          borderRadius: radius.xl,
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH.form,
          paddingBottom: spacing(5),
        },
        grabber: {
          alignSelf: 'center',
          width: 42,
          height: 4,
          borderRadius: radius.full,
          backgroundColor: colors.border,
          marginBottom: spacing(3),
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing(3),
          gap: spacing(3),
        },
        title: {
          fontFamily: fonts.heading,
          fontSize: 18,
          fontWeight: '800',
          color: colors.text,
          flex: 1,
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
        },
      }),
    [asDialog, colors, insets.bottom],
  );

  function handleClose() {
    haptics.tap();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
        <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Dismiss">
          {/* Stop taps inside the surface from reaching the backdrop. */}
          <Pressable onPress={(event) => event.stopPropagation()} style={asDialog ? { width: '100%', alignItems: 'center' } : undefined}>
            <GestureDetector gesture={panGesture}>
              <Animated.View
                entering={asDialog ? ZoomIn.duration(180) : SlideInDown.springify().damping(24)}
                exiting={asDialog ? ZoomOut.duration(140) : SlideOutDown.duration(200)}
                style={[styles.surface, asDialog ? styles.dialog : styles.sheet, sheetStyle]}
              >
                {!asDialog && <View style={styles.grabber} />}

                {title ? (
                  <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <Pressable onPress={handleClose} style={styles.closeBtn} accessibilityRole="button">
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ) : null}

                {children}
              </Animated.View>
            </GestureDetector>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
