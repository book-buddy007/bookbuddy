import React, { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/Ionicons';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandWatermark } from '@/components/landing/BrandWatermark';
import { entrance } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';
import { CONTENT_MAX_WIDTH } from '@/utils/useBreakpoint';

export interface AuthShellProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Footer row under the card — usually a "back to sign in" link. */
  footer?: React.ReactNode;
  /** Shows the pill back button. Defaults to true. */
  showBack?: boolean;
  onBack?: () => void;
}

/**
 * Shared shell for the account screens — the parchment card, saffron glow,
 * brand watermark and haloed icon that the sign-in screen established.
 *
 * Extracted so forgot-password, reset-password and verify-email don't each
 * re-derive the same 90 lines of styling, and so the card caps at a readable
 * width instead of stretching across a tablet.
 *
 * Unlike the original inline version this is token-driven, so the card is
 * legible in dark mode rather than a fixed white sheet.
 */
export function AuthShell({
  icon,
  title,
  subtitle,
  children,
  footer,
  showBack = true,
  onBack,
}: AuthShellProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  function handleBack() {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <View style={styles.orbSaffron} pointerEvents="none" />
      <View style={styles.orbIndigo} pointerEvents="none" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            {showBack && (
              <View style={styles.topBar}>
                <Pressable
                  onPress={handleBack}
                  style={styles.backBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={15} color={colors.primary} />
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
              </View>
            )}

            <Animated.View entering={entrance.card} style={styles.cardWrapper}>
              <View style={styles.cardGlow} />

              <View style={styles.parchmentCard}>
                <BrandWatermark size={280} opacity={0.25} style={styles.brandWatermark} />

                <View style={styles.header}>
                  <View style={styles.iconHalo}>
                    <Ionicons name={icon} size={30} color="#FFFFFF" />
                  </View>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>

                <View style={styles.body}>{children}</View>
              </View>
            </Animated.View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg, position: 'relative' },
  orbSaffron: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,138,61,0.16)',
  },
  orbIndigo: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(10,15,36,0.12)',
  },
  scrollContainer: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(10),
    paddingBottom: spacing(8),
    flexGrow: 1,
    justifyContent: 'center',
  },
  // Caps the card so it stays a card on a tablet instead of a full-width slab.
  column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH.form, alignSelf: 'center' },
  topBar: { marginBottom: spacing(4) },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(1.5),
    borderRadius: radius.full,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: colors.primary,
    fontFamily: fonts.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  cardWrapper: { position: 'relative' },
  cardGlow: {
    position: 'absolute',
    top: 6,
    bottom: -6,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 77, 0, 0.16)',
    borderRadius: 24,
    zIndex: -1,
  },
  parchmentCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    padding: spacing(6),
    shadowColor: colors.deepBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    overflow: 'hidden',
  },
  brandWatermark: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 0,
  },
  header: { alignItems: 'center', marginBottom: spacing(6), zIndex: 1 },
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing(1.5),
  },
  body: { zIndex: 1 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing(6),
    gap: 4,
  },
});
