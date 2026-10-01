import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

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
