import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Everything the platform holds about one user, for Settings → "Download a copy of
   * your data" (DPDP access right). Deliberately excluded: password hashes, sessions,
   * OAuth accounts, refresh/reset/verification tokens, OTPs, login attempts and device
   * tokens (credentials, not personal content), and storage keys of uploaded files.
   * Uploaded files themselves are listed, not embedded; they can be downloaded from My Shelf.
   */
  async exportUserData(userId: string) {
    const where = { userId };
    const bookTitle = { select: { id: true, title: true, author: true } };

    const [
      profile, memberships, joinRequests, borrows, readingProgress, audioProgress,
      audioBookmarks, annotations, vocabulary, flashcardDecks, flashcardReviews,
      quizAttempts, conceptMastery, chatMessages, assignments, streak,
      personalFolders, personalFiles, notifications,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, role: true, accountType: true, phone: true,
          gradeLevel: true, subscriptionTier: true, subscriptionStatus: true, trialEndsAt: true,
          subscriptionEndsAt: true, emailVerified: true, phoneVerified: true, profilePicture: true,
          authProvider: true, onboardingCompleted: true, metadata: true, lastLoginAt: true,
          createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.userTenantMembership.findMany({
        where,
        select: { role: true, status: true, joinedAt: true, approvedAt: true, tenant: { select: { id: true, name: true } } },
      }),
      this.prisma.joinRequest.findMany({
        where,
        select: { id: true, requestedRole: true, message: true, status: true, rejectionReason: true, createdAt: true, reviewedAt: true, tenant: { select: { id: true, name: true } } },
      }),
      this.prisma.borrowedBook.findMany({ where, include: { book: bookTitle } }),
      this.prisma.readingProgress.findMany({ where }),
      this.prisma.audioProgress.findMany({ where }),
      this.prisma.audioBookmark.findMany({ where }),
      this.prisma.annotation.findMany({ where }),
      this.prisma.vocabularyItem.findMany({ where }),
      this.prisma.flashcardDeck.findMany({ where, include: { cards: true } }),
      this.prisma.flashcardReview.findMany({ where }),
      this.prisma.quizAttempt.findMany({ where }),
      this.prisma.conceptMastery.findMany({ where }),
      this.prisma.bookChatMessage.findMany({
        where,
        select: { bookId: true, role: true, content: true, mode: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.studentAssignment.findMany({
        where,
        include: { assignment: { select: { id: true, title: true } } },
      }),
      this.prisma.userStreak.findUnique({ where }),
      this.prisma.personalFolder.findMany({ where }),
      this.prisma.personalFile.findMany({
        where,
        select: {
          id: true, title: true, author: true, format: true, mimeType: true, fileSize: true, folderId: true,
          tags: true, isStarred: true, progress: true, lastReadAt: true, createdAt: true, deletedAt: true,
        },
      }),
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      format: 'book-buddy-user-export/v1',
      profile,
      institutions: { memberships, joinRequests },
      library: { borrows, readingProgress, audioProgress, audioBookmarks },
      study: { annotations, vocabulary, flashcardDecks, flashcardReviews, quizAttempts, conceptMastery, assignments, streak },
      varta: { messages: chatMessages },
      myShelf: { folders: personalFolders, files: personalFiles },
      notifications,
    };
  }

  async generateMarkdownStudyNotes(
    userId: string,
    bookId: string,
    bookTitle: string,
    annotations: any[],
  ) {
    const vocabulary = await this.prisma.vocabularyItem.findMany({
      where: { userId, bookId },
      orderBy: { lastReviewed: 'desc' },
    });

    const safeTitle = bookTitle || 'Unknown Book';
    let md = `# Study Notes: ${safeTitle}\n\n`;
    md += `*Generated automatically by your Ai Study Assistant.*\n\n`;

    if (vocabulary.length > 0) {
      md += `## 📚 Vocabulary List\n\n`;
      vocabulary.forEach((v) => {
        md += `- **${v.word}**: ${v.definition || 'Definition missing.'}\n`;
        if (v.context) {
          md += `  > *Context*: "${v.context}"\n`;
        }
      });
      md += '\n';
    }

    if (annotations && annotations.length > 0) {
      md += `## 📝 Highlights & Notes\n\n`;

      // Sort annotations by page number and position
      const sortedAnnotations = [...annotations].sort((a, b) => {
        if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
        return (a.position?.startIndex || 0) - (b.position?.startIndex || 0);
      });

      sortedAnnotations.forEach((a) => {
        if (a.type === 'highlight') {
          md += `> **Highlight (Page ${a.pageNumber})**\n> ${a.selectedText || a.content}\n\n`;
        } else if (a.type === 'note') {
          md += `> **Note (Page ${a.pageNumber}) on:** "${a.selectedText || ''}"\n>\n> *${a.content}*\n\n`;
        }
      });
    }

    if (vocabulary.length === 0 && (!annotations || annotations.length === 0)) {
      md += `*No notes or vocabulary saved for this book yet.*\n`;
    }

    return { markdown: md };
  }
}
