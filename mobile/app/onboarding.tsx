import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { ApiError } from '@/api/client';
import { completeOnboarding } from '@/api/user';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/Button';
import { Banner, PressableScale } from '@/components/ui';
import { entrance, haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';

type AccountType = 'INDEPENDENT' | 'INSTITUTIONAL';

interface Choice {
  value: AccountType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  points: string[];
}

const CHOICES: readonly Choice[] = [
  {
    value: 'INDEPENDENT',
    icon: 'person-outline',
    title: 'Independent Learner',
    body: 'Read on your own with the public catalogue and your personal library.',
    points: ['Start reading immediately', 'Your own shelves and notes', 'No approval needed'],
  },
  {
    value: 'INSTITUTIONAL',
    icon: 'school-outline',
    title: 'Join an Institution',
    body: "Access your school, college or library's collection.",
    points: [
      'Your institution’s full catalogue',
      'Assignments and reading lists',
      'Needs administrator approval',
    ],
  },
] as const;

/**
 * Account-type choice, matching the web onboarding step.
 *
 * The backend rejects completion without an `accountType`, so this screen is
 * the gate between registering and reaching the library. Institutional users
 * continue to the waiting room, since their access depends on an administrator
 * approving them.
 */
export default function OnboardingScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [selected, setSelected] = useState<AccountType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onContinue() {
    if (!selected) return;

    setError(null);
    setLoading(true);
    try {
      await completeOnboarding({ accountType: selected });
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      haptics.success();

      router.replace(selected === 'INSTITUTIONAL' ? '/pending-approval' : '/(tabs)');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not save your choice. Check your connection and try again.';
      setError(message);
      haptics.error();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      icon="compass-outline"
      title="How will you be reading?"
      subtitle="This sets up your library. You can change it later from your profile."
      showBack={false}
    >
      {!!error && <Banner tone="danger" message={error} />}

      <View style={styles.choices}>
        {CHOICES.map((choice, index) => {
          const active = selected === choice.value;
          return (
            <Animated.View key={choice.value} entering={entrance.stagger(index)}>
              <PressableScale
                haptic="select"
                scaleTo={0.99}
                onPress={() => setSelected(choice.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.choice, active && styles.choiceActive]}
              >
                <View style={styles.choiceHead}>
                  <View style={[styles.choiceIcon, active && styles.choiceIconActive]}>
                    <Ionicons
                      name={choice.icon}
                      size={20}
                      color={active ? colors.primaryText : colors.primary}
                    />
                  </View>
                  <View style={styles.choiceTitleWrap}>
                    <Text style={styles.choiceTitle}>{choice.title}</Text>
                    <Text style={styles.choiceBody}>{choice.body}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </View>

                <View style={styles.points}>
                  {choice.points.map((point) => (
                    <View key={point} style={styles.pointRow}>
                      <Ionicons name="checkmark" size={13} color={colors.success} />
                      <Text style={styles.pointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>

      <Button
        label="Continue"
        icon="arrow-forward-outline"
        variant="saffron"
        onPress={onContinue}
        loading={loading}
        disabled={!selected}
      />
    </AuthShell>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  choices: { gap: spacing(3), marginBottom: spacing(5) },
  choice: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    padding: spacing(4),
    gap: spacing(3),
  },
  choiceActive: {
    borderColor: colors.primary,
    backgroundColor: colors.saffronLight,
  },
  choiceHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3) },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  choiceIconActive: { backgroundColor: colors.primary },
  choiceTitleWrap: { flex: 1, gap: spacing(0.5) },
  choiceTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  choiceBody: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
  },
  points: { gap: spacing(1.5), paddingLeft: spacing(1) },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  pointText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
});
