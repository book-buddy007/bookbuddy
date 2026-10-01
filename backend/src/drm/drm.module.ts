import { Module, Global } from '@nestjs/common';
import { SecureLinksService } from './secure-links.service';

/**
 * DrmModule — Provides DRM / content-protection services.
 *
 * Marked @Global so that any module in the app (BooksModule, future
 * VideoModule, etc.) can inject SecureLinksService without explicitly
 * importing DrmModule every time.
 */
@Global()
@Module({
  providers: [SecureLinksService],
  exports: [SecureLinksService],
})
export class DrmModule {}
