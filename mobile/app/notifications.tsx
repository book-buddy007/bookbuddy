import React, { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { getNotifications } from '@/api/notifications';
import type { AppNotification } from '@/api/types';
import { Card, Chip, EmptyState, Screen, Skeleton } from '@/components/ui';
import { entrance } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';

/** Icon and tone per notification type, falling back to a neutral bell. */
function decorate(type: string): {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'primary' | 'success' | 'danger' | 'gold';
} {
  if (type.includes('approved')) return { icon: 'checkmark-circle-outline', tone: 'success' };
  if (type.includes('rejected')) return { icon: 'close-circle-outline', tone: 'danger' };
  if (type.includes('due') || type.includes('expiring')) {
    return { icon: 'time-outline', tone: 'gold' };
  }
  return { icon: 'notifications-outline', tone: 'primary' };
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d ago`;

  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Notifications inbox.
 *
 * This closes a real gap: the app registers a push token and declares
 * POST_NOTIFICATIONS, so notifications could already arrive with nowhere to
 * land. The backend exposes no read-receipt endpoint yet, so unread state is
 * displayed but not cleared here.
 */
export default function NotificationsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });

  const items: AppNotification[] = query.data?.data ?? [];
  const unread = query.data?.unreadCount ?? 0;

  return (
    <>
      <Stack.Screen
        options={{ title: unread > 0 ? `Notifications (${unread})` : 'Notifications' }}
      />
      <Screen maxWidth="prose" padded={false}>
        {query.isLoading ? (
          <View style={styles.skeletons}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={82} rounded={radius.lg} />
            ))}
          </View>
        ) : query.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            tone="danger"
            title="Couldn't load notifications"
            body={(query.error as Error).message}
            actionLabel="Try again"
            onAction={() => query.refetch()}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={query.refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="notifications-off-outline"
                title="Nothing new"
                body="Due-date reminders and updates about your institution will appear here."
              />
            }
            renderItem={({ item, index }) => {
              const { icon, tone } = decorate(item.type);

              return (
                <Animated.View entering={entrance.stagger(index)}>
                  <Card
                    variant={item.isRead ? 'solid' : 'accent'}
                    style={styles.row}
                    onPress={
                      item.actionUrl
                        ? () => router.push(item.actionUrl as never)
                        : undefined
                    }
                  >
                    <View style={styles.head}>
                      <Ionicons
                        name={icon}
                        size={18}
                        color={
                          tone === 'success'
                            ? colors.success
                            : tone === 'danger'
                              ? colors.danger
                              : tone === 'gold'
                                ? colors.gold
                                : colors.primary
                        }
                      />
                      <Text style={styles.title} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.isRead ? <Chip label="New" tone="primary" /> : null}
                    </View>

                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
                  </Card>
                </Animated.View>
              );
            }}
          />
        )}
      </Screen>
    </>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  skeletons: { gap: spacing(3), padding: spacing(4) },
  list: { padding: spacing(4), gap: spacing(3), flexGrow: 1 },
  row: { gap: spacing(2) },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing(2.5) },
  title: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  time: { fontFamily: fonts.label, fontSize: 11, color: colors.textMuted },
});
