import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { S3Service } from '../aws/s3.service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(private readonly s3: S3Service) {}

  /**
   * Fetch a stored book file as a Buffer.
   *
   * A URL that belongs to our own storage is read through the storage API with the app's
   * credentials, which is the only way to reach a private object. Anything else (a local
   * path, an external URL) is read directly.
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

    const key = this.s3.keyFromUrl(fileUrl);
    if (key) {
      const buffer = await this.s3.getObjectBuffer(key);
      this.logger.log(
        `✅ Read ${(buffer.length / 1024).toFixed(1)} KB from storage: ${key}`,
      );
      return buffer;
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch file: HTTP ${response.status} from ${fileUrl}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    this.logger.log(
      `✅ Fetched file: ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB`,
    );
    return Buffer.from(arrayBuffer);
  }
}
