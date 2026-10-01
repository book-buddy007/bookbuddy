import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../aws/s3.service';
import { CloudFrontService } from '../aws/cloudfront.service';
import { LoggerService } from '../logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { MediaProcessingService } from './media-processing.service';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private cloudfrontService: CloudFrontService,
    private mediaProcessingService: MediaProcessingService,
    private logger: LoggerService,
    private configService: ConfigService,
  ) {
    this.logger.setContext('MediaService');
  }

  /**
   * Generate a pre-signed URL for uploading a media file
   */
  async generateUploadUrl(
    userId: string,
    fileType: string,
    filename: string,
    contentType: string,
  ) {
    // First, verify the user is a super-admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only super-admin users can upload media files',
      );
    }

    // TODO: Update media settings to use tenant-based lookup
    // For now, use default bucket
    const mediaSettings: any = null; // await this.prisma.mediaSettings.findFirst({ ... });

    // Use default bucket
    const bucket: string =
      this.configService.get('AWS_S3_BUCKET') || 'book-buddy-media';

    // Check file type against allowed formats
    if (mediaSettings?.allowedFormats) {
      const allowedFormats = JSON.parse(mediaSettings.allowedFormats as string);
      const fileExtension = filename.split('.').pop()?.toLowerCase();

      if (!allowedFormats.includes(fileExtension)) {
        throw new BadRequestException(
          `File format not allowed. Allowed formats: ${allowedFormats.join(', ')}`,
        );
      }
    }

    // Generate the pre-signed URL
    const { url, key } = await this.s3Service.generatePresignedUploadUrl(
      bucket,
      fileType,
      contentType,
      3600, // 1 hour expiration
    );

    // Create a media upload record
    const mediaUpload = await this.prisma.mediaUpload.create({
      data: {
        user: { connect: { id: userId } },
        presignedUrl: url,
        fileType,
        filename,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour expiration
        status: 'PENDING',
      },
    });

    return {
      uploadId: mediaUpload.id,
      presignedUrl: url,
      key,
    };
  }

  /**
   * Process a media file after it has been uploaded
   */
  async processUploadedMedia(uploadId: string, s3Key: string) {
    // Find the upload record
    const upload = await this.prisma.mediaUpload.findUnique({
      where: { id: uploadId },
      include: { user: true },
    });

    if (!upload) {
      throw new NotFoundException('Upload record not found');
    }

    try {
      // Update status to processing
      await this.prisma.mediaUpload.update({
        where: { id: uploadId },
        data: { status: 'processing' },
      });

      // TODO: Update media settings to use tenant-based lookup
      const mediaSettings: any = null;

      const bucket: string =
        this.configService.get('AWS_S3_BUCKET') || 'book-buddy-media';

      // Create a media file record
      const mediaFile = await this.prisma.mediaFile.create({
        data: {
          filename: upload.filename || s3Key.split('/').pop() || 'unknown',
          originalName: upload.filename || 'unknown',
          mimeType: upload.fileType,
          size: 0, // This will be updated later
          s3Key,
          s3Bucket: bucket,
          status: 'processing',
        },
      });

      // Start processing the file based on type
      if (upload.fileType.includes('audio')) {
        // Process audiobook
        await this.mediaProcessingService.processAudiobook(
          mediaFile.id,
          bucket,
          s3Key,
          mediaSettings,
        );
      } else if (
        upload.fileType.includes('pdf') ||
        upload.fileType.includes('epub')
      ) {
        // Process ebook
        await this.mediaProcessingService.processEbook(
          mediaFile.id,
          bucket,
          s3Key,
          mediaSettings,
        );
      } else {
        throw new BadRequestException('Unsupported file type');
      }

      // Update upload record with success
      await this.prisma.mediaUpload.update({
        where: { id: uploadId },
        data: {
          status: 'COMPLETED',
          mediaFileId: mediaFile.id,
        },
      });

      return { success: true, mediaFileId: mediaFile.id };
    } catch (error) {
      // Update upload record with error
      await this.prisma.mediaUpload.update({
        where: { id: uploadId },
        data: {
          status: 'error',
          errorMessage: error.message,
        },
      });

      this.logger.error(
        `Failed to process uploaded media: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a media file by ID
   */
  async getMediaFile(id: string) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id },
      include: {
        book: true,
      },
    });

    if (!mediaFile) {
      throw new NotFoundException('Media file not found');
    }

    return mediaFile;
  }

  /**
   * Generate a signed URL for accessing a media file
   */
  async generateSignedAccessUrl(
    userId: string,
    mediaFileId: string,
    expiresIn = 3600,
  ) {
    // Find the media file
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
      include: { book: true },
    });

    if (!mediaFile) {
      throw new NotFoundException('Media file not found');
    }

    // Check if the user has access to this book
    // For this example, super-admin always has access, and regular users need to have borrowed the book
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        borrowedBooks: {
          where: {
            bookId: mediaFile.book?.id,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hasBorrowed = user.borrowedBooks.length > 0;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    if (!isSuperAdmin && !hasBorrowed) {
      throw new ForbiddenException('You do not have access to this media file');
    }

    // Generate token for access
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store the access token
    await this.prisma.mediaAccess.create({
      data: {
        user: { connect: { id: userId } },
        token,
        expiresAt,
        resourceType: 'mediaFile',
        resourceId: mediaFileId,
      },
    });

    // Generate a signed URL if CDN is configured
    if (mediaFile.cdnUrl) {
      return this.cloudfrontService.generateSignedUrl(
        `${mediaFile.s3Key}?token=${token}`,
        expiresIn,
      );
    }

    // Fall back to S3 pre-signed URL if no CDN
    return this.s3Service.generatePresignedDownloadUrl(
      mediaFile.s3Bucket,
      mediaFile.s3Key,
      expiresIn,
    );
  }

  /**
   * Attach a media file to a book
   */
  async attachMediaToBook(mediaFileId: string, bookId: string, userId: string) {
    // Verify the user is a super-admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only super-admin users can attach media to books',
      );
    }

    // Check if media file exists
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
    });

    if (!mediaFile) {
      throw new NotFoundException('Media file not found');
    }

    // Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Update the book with the media file
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        mediaFile: { connect: { id: mediaFileId } },
        format: mediaFile.mimeType.includes('audio') ? 'Audiobook' : 'EPUB',
        streamable: true,
        drmProtected: true,
      },
    });

    return { success: true };
  }
}
