import React, { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { ApiError } from '@/api/client';
import {
  PERSONAL_UPLOAD_MIME_TYPES,
  confirmUpload,
  createFolder,
  deleteFile,
  deleteFolder,
  getContents,
  getQuota,
  presignUpload,
  updateFile,
  uploadToPresignedUrl,
} from '@/api/personalLibrary';
import type { PersonalFile, PersonalFolder } from '@/api/types';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import {
  Banner,
  BottomSheet,
  Card,
  Chip,
  EmptyState,
  PressableScale,
  Screen,
  Skeleton,
} from '@/components/ui';
import { entrance, haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';
import { formatBytes, quotaFraction } from '@/utils/fileSize';
import { useBreakpoint } from '@/utils/useBreakpoint';

/**
 * The reader's own files — their uploads, not the institution's catalogue.
 *
 * Folder navigation is done by pushing a new route with `folderId` rather than
 * holding a stack in state, so the hardware back button walks back up the tree
 * the way a file manager should.
 */
export default function PersonalLibraryScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { folderId } = useLocalSearchParams<{ folderId?: string }>();
  const { gridColumns } = useBreakpoint();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const columns = gridColumns({ minCardWidth: 180, horizontalPadding: spacing(8), min: 1, max: 4 });

  const contentsQuery = useQuery({
    queryKey: ['personal-library', folderId ?? 'root'],
    queryFn: () => getContents(folderId ?? null),
  });

  const quotaQuery = useQuery({ queryKey: ['personal-quota'], queryFn: getQuota });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['personal-library'] });
    queryClient.invalidateQueries({ queryKey: ['personal-quota'] });
  }

  const folderMutation = useMutation({
    mutationFn: () =>
      createFolder({ name: folderName.trim(), parentId: folderId ?? null }),
    onSuccess: () => {
      haptics.success();
      setCreatingFolder(false);
      setFolderName('');
      invalidate();
    },
    onError: (err) => {
      haptics.error();
      setError(err instanceof ApiError ? err.message : 'Could not create the folder.');
    },
  });

  const starMutation = useMutation({
    mutationFn: (file: PersonalFile) =>
      updateFile(file.id, { isStarred: !file.isStarred }),
    onSuccess: () => invalidate(),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => {
      haptics.success();
      invalidate();
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      haptics.success();
      invalidate();
    },
  });

  /**
   * Deletion is permanent, and the trash icon sits one tap away next to every
   * item — so confirm first. A folder delete can take its whole subtree with it,
   * which is worth spelling out.
   */
  function confirmDelete(item: PersonalFolder | PersonalFile) {
    const isFolder = !('storageKey' in item);
    const name = isFolder
      ? (item as PersonalFolder).name
      : (item as PersonalFile).title;
    Alert.alert(
      isFolder ? 'Delete folder?' : 'Delete file?',
      isFolder
        ? `“${name}” and everything inside it will be permanently deleted.`
        : `“${name}” will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            isFolder
              ? deleteFolderMutation.mutate(item.id)
              : deleteFileMutation.mutate(item.id),
        },
      ],
    );
  }

  /**
   * Pick → presign → PUT → confirm.
   *
   * Quota is checked at the presign step, so a file that would not fit is
   * rejected before any bytes are sent and the user gets the real reason.
   */
  async function handleUpload() {
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [...PERSONAL_UPLOAD_MIME_TYPES],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      const mimeType = asset.mimeType ?? 'application/pdf';
      const size = asset.size ?? 0;

      setUploading(true);

      const presigned = await presignUpload({
        filename: asset.name,
        mimeType,
        fileSize: size,
      });

      await uploadToPresignedUrl(presigned.uploadUrl, asset.uri, mimeType);

      await confirmUpload({
        storageKey: presigned.storageKey,
        title: asset.name.replace(/\.(pdf|epub)$/i, ''),
        format: mimeType === 'application/epub+zip' ? 'epub' : 'pdf',
        mimeType,
        fileSize: size,
        folderId: folderId ?? undefined,
      });

      haptics.success();
      invalidate();
    } catch (err) {
      haptics.error();
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Upload failed.',
      );
    } finally {
      setUploading(false);
    }
  }

  const contents = contentsQuery.data;
  const quota = quotaQuery.data;
  const entries: (PersonalFolder | PersonalFile)[] = [
    ...(contents?.folders ?? []),
    ...(contents?.files ?? []),
  ];

  return (
    <>
      <Stack.Screen
        options={{ title: contents?.folder?.name ?? 'My files' }}
      />
      <Screen maxWidth="wide" padded={false}>
        {quota ? (
          <View style={styles.quota}>
            <View style={styles.quotaText}>
              <Text style={styles.quotaLabel}>
                {formatBytes(quota.usedBytes)} of {formatBytes(quota.maxStorageBytes)} used
              </Text>
              <Text style={styles.quotaSub}>
                {quota.remainingFiles} file{quota.remainingFiles === 1 ? '' : 's'} left
              </Text>
            </View>
            <View style={styles.quotaTrack}>
              <View
                style={[
                  styles.quotaFill,
                  { width: `${quotaFraction(quota.usedBytes, quota.maxStorageBytes) * 100}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        {contents?.breadcrumb?.length ? (
          <View style={styles.breadcrumb}>
            <PressableScale haptic="none" onPress={() => router.dismissTo('/personal-library')}>
              <Text style={styles.crumbRoot}>My files</Text>
            </PressableScale>
            {contents.breadcrumb.map((crumb) => (
              <View key={crumb.id} style={styles.crumbRow}>
                <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
                <Text style={styles.crumb} numberOfLines={1}>
                  {crumb.name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {!!error && (
          <Banner tone="danger" message={error} style={{ marginHorizontal: spacing(4) }} />
        )}

        {contentsQuery.isLoading ? (
          <View style={styles.skeletons}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={76} rounded={radius.lg} />
            ))}
          </View>
        ) : contentsQuery.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            tone="danger"
            title="Couldn't open your files"
            body={(contentsQuery.error as Error).message}
            actionLabel="Try again"
            onAction={() => contentsQuery.refetch()}
          />
        ) : (
          <FlatList
            key={`pl-${columns}`}
            data={entries}
            numColumns={columns}
            columnWrapperStyle={columns > 1 ? { gap: spacing(3) } : undefined}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={contentsQuery.isRefetching}
                onRefresh={contentsQuery.refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="folder-open-outline"
                title="Nothing here yet"
                body="Upload a PDF or EPUB and it will be readable on any device you sign in to."
                actionLabel="Upload a file"
                onAction={handleUpload}
              />
            }
            renderItem={({ item, index }) => {
              const isFolder = !('storageKey' in item);

              return (
                <Animated.View
                  entering={entrance.stagger(index)}
                  style={{ flex: 1 / columns }}
                >
                  <Card
                    onPress={() =>
                      isFolder
                        ? router.push(`/personal-library?folderId=${item.id}`)
                        : router.push(`/personal-library/read/${item.id}`)
                    }
                    style={styles.entry}
                  >
                    <View style={styles.entryHead}>
                      <Ionicons
                        name={
                          isFolder
                            ? 'folder'
                            : (item as PersonalFile).format === 'epub'
                              ? 'book-outline'
                              : 'document-text-outline'
                        }
                        size={20}
                        color={isFolder ? colors.gold : colors.primary}
                      />
                      <View style={{ flex: 1 }} />
                      {!isFolder && (
                        <PressableScale
                          haptic="select"
                          onPress={() => starMutation.mutate(item as PersonalFile)}
                          accessibilityLabel="Star file"
                        >
                          <Ionicons
                            name={(item as PersonalFile).isStarred ? 'star' : 'star-outline'}
                            size={16}
                            color={(item as PersonalFile).isStarred ? colors.gold : colors.textMuted}
                          />
                        </PressableScale>
                      )}
                      <PressableScale
                        haptic="none"
                        onPress={() => confirmDelete(item)}
                        accessibilityLabel="Delete"
                        style={{ marginLeft: spacing(2.5) }}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                      </PressableScale>
                    </View>

                    <Text style={styles.entryTitle} numberOfLines={2}>
                      {isFolder ? (item as PersonalFolder).name : (item as PersonalFile).title}
                    </Text>

                    {!isFolder && (
                      <View style={styles.entryMeta}>
                        <Text style={styles.entrySub}>
                          {formatBytes((item as PersonalFile).fileSize)}
                        </Text>
                        {(item as PersonalFile).readingProgress?.percentComplete ? (
                          <Chip
                            label={`${Math.round((item as PersonalFile).readingProgress!.percentComplete)}%`}
                            tone="teal"
                          />
                        ) : null}
                      </View>
                    )}
                  </Card>
                </Animated.View>
              );
            }}
          />
        )}

        <View style={styles.actions}>
          <Button
            label="Upload"
            icon="cloud-upload-outline"
            variant="saffron"
            onPress={handleUpload}
            loading={uploading}
            style={{ flex: 1 }}
          />
          <Button
            label="New folder"
            icon="folder-outline"
            variant="ghost"
            onPress={() => setCreatingFolder(true)}
            style={{ flex: 1 }}
          />
        </View>
      </Screen>

      <BottomSheet
        visible={creatingFolder}
        onClose={() => setCreatingFolder(false)}
        title="New folder"
      >
        <TextField
          label="Folder name"
          icon="folder-outline"
          value={folderName}
          onChangeText={setFolderName}
          placeholder="Semester 1"
        />
        <Button
          label="Create folder"
          variant="saffron"
          onPress={() => folderMutation.mutate()}
          loading={folderMutation.isPending}
          disabled={folderName.trim().length === 0}
        />
      </BottomSheet>
    </>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  quota: { paddingHorizontal: spacing(4), paddingTop: spacing(3), gap: spacing(2) },
  quotaText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  quotaLabel: {
    fontFamily: fonts.heading,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  quotaSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  quotaTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  quotaFill: { height: '100%', backgroundColor: colors.primary },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing(1),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
  },
  crumbRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  crumbRoot: {
    fontFamily: fonts.label,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  crumb: { fontFamily: fonts.label, fontSize: 12, color: colors.textMuted, maxWidth: 130 },
  skeletons: { gap: spacing(3), padding: spacing(4) },
  list: { padding: spacing(4), gap: spacing(3), paddingBottom: spacing(24), flexGrow: 1 },
  entry: { gap: spacing(2), minHeight: 104 },
  entryHead: { flexDirection: 'row', alignItems: 'center' },
  entryTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  entrySub: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted },
  actions: {
    position: 'absolute',
    left: spacing(4),
    right: spacing(4),
    bottom: spacing(5),
    flexDirection: 'row',
    gap: spacing(3),
  },
});
