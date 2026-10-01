import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getChatHistory, queryVartaAi, ChatMessage, Citation } from '@/api/varta';
import { useThemeColors } from '@/ThemeProvider';
import { radius, spacing, type ColorTokens } from '@/theme';

export default function VartaAiChatScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { id: bookId, title = 'Book Assistant' } = useLocalSearchParams<{
    id: string;
    title?: string;
  }>();

  const [queryInput, setQueryInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Load chat history on open
  const { isLoading: historyLoading } = useQuery({
    queryKey: ['varta-history', bookId],
    queryFn: async () => {
      if (!bookId) return [];
      const history = await getChatHistory(bookId);
      setMessages(history);
      return history;
    },
    enabled: !!bookId,
  });

  async function handleSend() {
    if (!queryInput.trim() || !bookId || busy) return;

    const userQuery = queryInput.trim();
    setQueryInput('');

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userQuery,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setBusy(true);

    try {
      const res = await queryVartaAi(bookId, userQuery);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.content || 'I could not find a specific answer in the textbook.',
        citations: res.citations || [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        /* Was "Varta is processing your query. Please try again." — which
           described the failure as progress. Every request failed here (the
           SSE body could not be JSON-parsed), so that reassurance was the only
           thing users ever saw from this screen. Say what went wrong. */
        content: err?.message || "Varta couldn't answer that. Please try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setBusy(false);
    }
  }

  function renderMessageItem({ item }: { item: ChatMessage }) {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={styles.roleLabel}>{isUser ? 'You' : 'Varta 🤖'}</Text>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {item.content}
        </Text>

        {/* Citations Row */}
        {item.citations && item.citations.length > 0 && (
          <View style={styles.citationsContainer}>
            <Text style={styles.citationHeading}>Sources / Citations:</Text>
            <View style={styles.citationBadgeRow}>
              {item.citations.map((c, idx) => (
                <TouchableOpacity
                  key={c.chunkId || idx}
                  onPress={() => setActiveCitation(c)}
                  style={styles.citationBadge}
                >
                  <Text style={styles.citationBadgeText}>
                    📌 Page {c.pageNumber || 'Excerpts'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>Varta Assistant</Text>
          <Text style={styles.headerSub}>{title}</Text>
        </View>
      </View>

      {/* Messages Feed */}
      {historyLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading conversation history...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.feedContent}
          keyboardShouldPersistTaps="handled"
          // Keep the newest message (and the AI's reply) in view as the
          // conversation grows, instead of leaving it below the fold.
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      {/* Query Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          value={queryInput}
          onChangeText={setQueryInput}
          placeholder="Ask Varta about this book..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={busy || !queryInput.trim()}
          style={[styles.sendBtn, (!queryInput.trim() || busy) && styles.sendBtnDisabled]}
        >
          {busy ? (
            <ActivityIndicator color={colors.bg} size="small" />
          ) : (
            <Text style={styles.sendBtnText}>Ask</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Citation Preview Modal */}
      <Modal
        visible={!!activeCitation}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveCitation(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeader}>Citation Reference</Text>
            {activeCitation && (
              <>
                <Text style={styles.modalPage}>Page {activeCitation.pageNumber || 'Excerpts'}</Text>
                {activeCitation.chapterTitle ? (
                  <Text style={styles.modalChapter}>{activeCitation.chapterTitle}</Text>
                ) : null}
                <Text style={styles.modalPreview}>
                  "{activeCitation.textPreview || 'Source passage retrieved from vector embeddings.'}"
                </Text>
              </>
            )}
            <TouchableOpacity onPress={() => setActiveCitation(null)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Close Reference</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  backBtn: { paddingRight: spacing(3) },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  headerCenter: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  headerSub: { color: colors.textMuted, fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textMuted, marginTop: spacing(2), fontSize: 13 },
  feedContent: { padding: spacing(4) },
  messageBubble: {
    borderRadius: radius.md,
    padding: spacing(4),
    marginBottom: spacing(3),
    maxWidth: '88%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleLabel: { color: colors.gold, fontSize: 11, fontWeight: '800', marginBottom: spacing(1) },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: colors.bg, fontWeight: '600' },
  aiText: { color: colors.text },
  citationsContainer: { marginTop: spacing(3), paddingTop: spacing(2), borderTopWidth: 1, borderColor: colors.border },
  citationHeading: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: spacing(1.5) },
  citationBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) },
  citationBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.sm,
  },
  citationBadgeText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(3),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: spacing(2),
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
    borderRadius: radius.sm,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: colors.bg, fontSize: 14, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    padding: spacing(6),
  },
  modalHeader: { color: colors.gold, fontSize: 16, fontWeight: '800', marginBottom: spacing(2) },
  modalPage: { color: colors.text, fontSize: 15, fontWeight: '700' },
  modalChapter: { color: colors.textMuted, fontSize: 13, marginTop: spacing(1) },
  modalPreview: { color: colors.text, fontSize: 14, fontStyle: 'italic', marginTop: spacing(3), lineHeight: 20 },
  modalCloseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing(3),
    borderRadius: radius.sm,
    marginTop: spacing(5),
    alignItems: 'center',
  },
  modalCloseText: { color: colors.bg, fontSize: 14, fontWeight: '800' },
});
