import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  UnauthorizedException,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { LoggerService } from '../logger/logger.service';
import { Request } from 'express';

@Controller('api/media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('MediaController');
  }

  /**
   * Generate a pre-signed URL for uploading a media file
   * Only accessible to super admins
   */
  @UseGuards(BetterAuthGuard)
  @Post('upload')
  async generateUploadUrl(
    @Body() body: { fileType: string; filename: string; contentType: string },
    @Req() req: Request,
  ) {
    const user = req.user as { id: string; role: string };

    if (!user || user.role !== 'SUPER_ADMIN') {
      this.logger.warn(`Unauthorized upload attempt by user ${user?.id}`);
      throw new ForbiddenException('Only super admins can upload media files');
    }

    this.logger.log(
      `Generating upload URL for ${body.filename} (${body.fileType}) by user ${user.id}`,
    );

    return this.mediaService.generateUploadUrl(
      user.id,
      body.fileType,
      body.filename,
      body.contentType,
    );
  }

  /**
   * Process an uploaded media file
   * Only accessible to super admins
   */
  @UseGuards(BetterAuthGuard)
  @Post('process')
  async processUploadedMedia(
    @Body() body: { uploadId: string; s3Key: string },
    @Req() req: Request,
  ) {
    const user = req.user as { id: string; role: string };

    if (!user || user.role !== 'SUPER_ADMIN') {
      this.logger.warn(`Unauthorized process attempt by user ${user?.id}`);
      throw new ForbiddenException('Only super admins can process media files');
    }

    this.logger.log(
      `Processing uploaded media ${body.uploadId} (${body.s3Key}) by user ${user.id}`,
    );

    return this.mediaService.processUploadedMedia(body.uploadId, body.s3Key);
  }

  /**
   * Get a media file by ID
   * Only accessible to super admins
   */
  @UseGuards(BetterAuthGuard)
  @Get(':id')
  async getMediaFile(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: string; role: string };

    if (!user || user.role !== 'SUPER_ADMIN') {
      this.logger.warn(
        `Unauthorized media file access attempt by user ${user?.id}`,
      );
      throw new ForbiddenException(
        'Only super admins can view media file details',
      );
    }

    this.logger.log(`Getting media file ${id} for user ${user.id}`);

    return this.mediaService.getMediaFile(id);
  }

  /**
   * Generate a signed URL for accessing a media file
   */
  @UseGuards(BetterAuthGuard)
  @Get(':id/access')
  async generateAccessUrl(
    @Param('id') id: string,
    @Query('expires') expiresIn: number = 3600,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };

    this.logger.log(
      `Generating access URL for media ${id} by user ${user.id}, expires in ${expiresIn}s`,
    );

    const url = await this.mediaService.generateSignedAccessUrl(
      user.id,
      id,
      expiresIn,
    );

    return { url };
  }

  /**
   * Attach a media file to a book
   * Only accessible to super admins
   */
  @UseGuards(BetterAuthGuard)
  @Post(':id/attach')
  async attachMediaToBook(
    @Param('id') id: string,
    @Body() body: { bookId: string },
    @Req() req: Request,
  ) {
    const user = req.user as { id: string; role: string };

    if (!user || user.role !== 'SUPER_ADMIN') {
      this.logger.warn(
        `Unauthorized media attachment attempt by user ${user?.id}`,
      );
      throw new ForbiddenException(
        'Only super admins can attach media to books',
      );
    }

    this.logger.log(
      `Attaching media ${id} to book ${body.bookId} by user ${user.id}`,
    );

    return this.mediaService.attachMediaToBook(id, body.bookId, user.id);
  }
}
