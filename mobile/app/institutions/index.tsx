import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@/components/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { ApiError } from '@/api/client';
import { browseInstitutions, getInstitutionTypes } from '@/api/institutions';
import { cancelJoinRequest, createJoinRequest, getMyJoinRequests } from '@/api/joinRequests';
import type { Institution } from '@/api/types';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import {
  Banner,
  BottomSheet,
  Card,
  Chip,
  EmptyState,
  Screen,
  Skeleton,
} from '@/components/ui';
import { entrance, haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';

/**
 * Browse institutions and apply to join one.
 *
 * The user's own requests are fetched alongside the directory so each row can
 * show its real state — Pending, Declined, or Join — instead of offering a
 * button that the backend would reject as a duplicate.
 */
export default function InstitutionsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [selected, setSelected] = useState<Institution | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const institutionsQuery = useQuery({
    queryKey: ['institutions', search, type],
    queryFn: () => browseInstitutions({ search, type: type ?? undefined }),
  });

  const typesQuery = useQuery({ queryKey: ['institution-types'], queryFn: getInstitutionTypes });

  const requestsQuery = useQuery({ queryKey: ['my-join-requests'], queryFn: getMyJoinRequests });

  /** tenantId -> latest request, so a row can render its own status. */
  const requestByTenant = useMemo(() => {
    const map = new Map<string, { id: string; status: string }>();
    (requestsQuery.data ?? []).forEach((r) => {
      const key = r.tenantId ?? r.tenant?.id;
      if (key && !map.has(key)) map.set(key, { id: r.id, status: r.status });
    });
    return map;
  }, [requestsQuery.data]);

  const joinMutation = useMutation({
    mutationFn: () =>
      createJoinRequest({
        tenantId: selected!.id,
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      haptics.success();
      setSelected(null);
      setMessage('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['my-join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (err) => {
      haptics.error();
      setError(err instanceof ApiError ? err.message : 'Could not send your request.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelJoinRequest(id),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['my-join-requests'] });
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Institutions' }} />
      <Screen maxWidth="wide" padded={false}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={() => setSearch(searchInput.trim())}
            returnKeyType="search"
            placeholder="Search schools, colleges, libraries…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        {(typesQuery.data?.length ?? 0) > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            <Chip
              label="All"
              tone="primary"
              selected={type === null}
              onPress={() => setType(null)}
            />
            {typesQuery.data!.map((t) => (
              <Chip
                key={t}
                label={t}
                tone="primary"
                selected={type === t}
                onPress={() => setType(type === t ? null : t)}
              />
            ))}
          </ScrollView>
        )}

        {institutionsQuery.isLoading ? (
          <View style={styles.skeletons}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={96} rounded={radius.lg} />
            ))}
          </View>
        ) : institutionsQuery.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            tone="danger"
            title="Couldn't load institutions"
            body={(institutionsQuery.error as Error).message}
            actionLabel="Try again"
            onAction={() => institutionsQuery.refetch()}
          />
        ) : (
          <FlatList
            data={institutionsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={institutionsQuery.isRefetching}
                onRefresh={institutionsQuery.refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="school-outline"
                title="No institutions found"
                body={
                  search || type
                    ? 'Try a different search or clear the filter.'
                    : 'No institutions are currently accepting join requests.'
                }
                actionLabel={search || type ? 'Clear filters' : undefined}
                onAction={
                  search || type
                    ? () => {
                        setSearch('');
                        setSearchInput('');
                        setType(null);
                      }
                    : undefined
                }
              />
            }
            renderItem={({ item, index }) => {
              const existing = requestByTenant.get(item.id);

              return (
                <Animated.View entering={entrance.stagger(index)}>
                  <Card style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.name} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {[item.type, item.location].filter(Boolean).join(' · ') || '—'}
                      </Text>
                      <Text style={styles.counts}>
                        {item.bookCount} books · {item.memberCount} members
                      </Text>
                    </View>

                    {existing?.status === 'PENDING' ? (
                      <View style={styles.rowAction}>
                        <Chip label="Pending" tone="gold" icon="time-outline" />
                        <Button
                          label="Withdraw"
                          variant="ghost"
                          onPress={() => cancelMutation.mutate(existing.id)}
                          loading={
                            cancelMutation.isPending &&
                            cancelMutation.variables === existing.id
                          }
                          style={styles.smallBtn}
                          textStyle={{ fontSize: 12 }}
                        />
                      </View>
                    ) : existing?.status === 'APPROVED' ? (
                      <Chip label="Member" tone="success" icon="checkmark-circle-outline" />
                    ) : existing?.status === 'REJECTED' ? (
                      <View style={styles.rowAction}>
                        <Chip label="Declined" tone="danger" />
                        <Button
                          label="Re-apply"
                          variant="ghost"
                          onPress={() => setSelected(item)}
                          style={styles.smallBtn}
                          textStyle={{ fontSize: 12 }}
                        />
                      </View>
                    ) : (
                      <Button
                        label="Join"
                        variant="saffron"
                        onPress={() => setSelected(item)}
                        style={styles.smallBtn}
                        textStyle={{ fontSize: 13 }}
                      />
                    )}
                  </Card>
                </Animated.View>
              );
            }}
          />
        )}
      </Screen>

      <BottomSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Join ${selected.name}` : ''}
      >
        {!!error && <Banner tone="danger" message={error} />}

        <Banner
          tone="info"
          message="An administrator reviews each request. You'll be notified once it's approved, and you can keep reading independently in the meantime."
        />

        <TextField
          label="Message (optional)"
          icon="chatbubble-ellipses-outline"
          value={message}
          onChangeText={setMessage}
          placeholder="Your roll number, course, or anything that helps them verify you"
          multiline
        />

        <Button
          label="Send request"
          icon="paper-plane-outline"
          variant="saffron"
          onPress={() => joinMutation.mutate()}
          loading={joinMutation.isPending}
        />
      </BottomSheet>
    </>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2.5),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(4),
    height: 46,
    marginHorizontal: spacing(4),
    marginTop: spacing(3),
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  filters: { gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(3) },
  skeletons: { gap: spacing(3), padding: spacing(4) },
  list: { padding: spacing(4), gap: spacing(3), flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  rowText: { flex: 1, gap: spacing(0.5) },
  rowAction: { alignItems: 'flex-end', gap: spacing(2) },
  name: { fontFamily: fonts.heading, fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
  counts: { fontFamily: fonts.label, fontSize: 11, color: colors.teal, marginTop: spacing(1) },
  smallBtn: { height: 38, paddingHorizontal: spacing(4) },
});
