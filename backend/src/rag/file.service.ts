import { Injectable, Logger, NotFoundException } from '@nestjs/common';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  /**
   * Fetch a PDF file as Buffer from its storage URL.
   * Handles both public CDN URLs and local file paths.
   */
  async getFileBuffer(fileUrl: string): Promise<Buffer> {
    if (!fileUrl) {
      throw new NotFoundException('No file URL provided');
    }

    // Local file path (starts with / or drive letter)
    if (fileUrl.startsWith('/') || /^[A-Z]:\\/i.test(fileUrl)) {
      const fs = await import('fs/promises');
      return fs.readFile(fileUrl);
    }

    // Remote URL (S3, R2, CDN)
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch PDF: HTTP ${response.status} from ${fileUrl}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    this.logger.log(
      `✅ Fetched PDF: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB`,
    );
    return Buffer.from(arrayBuffer);
  }
}
