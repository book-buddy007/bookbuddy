import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { AppThrottlerModule } from './throttler/throttler.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';
import { EmailModule } from './email/email.module';
import { AwsModule } from './aws/aws.module';

// Feature modules
import { AuthModule } from './auth.module';
import { BooksModule } from './books/books.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { JoinRequestsModule } from './join-requests/join-requests.module';
import { TenantUsersModule } from './tenant-users/tenant-users.module';
import { TenantAdminModule } from './tenant-admin/tenant-admin.module';
import { LibraryModule } from './library/library.module';
import { ReaderModule } from './reader/reader.module';
import { ProgressModule } from './progress/progress.module';
import { AnnotationsModule } from './annotations/annotations.module';
import { FlashcardsModule } from './flashcards/flashcards.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { MediaModule } from './media/media.module';
import { AudiobookModule } from './audiobook/audiobook.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ExportModule } from './export/export.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { PersonalLibraryModule } from './personal-library/personal-library.module';
import { RagModule } from './rag/rag.module';
import { SanchikaModule } from './sanchika/sanchika.module';
import { GraphModule } from './graph/graph.module';
import { QuizModule } from './quiz/quiz.module';
import { VartaActivityModule } from './varta-activity/varta-activity.module';
import { UserPreferencesModule } from './user-preferences/user-preferences.module';
import { AccountDeletionModule } from './account-deletion/account-deletion.module';
import { ResurfacingModule } from './resurfacing/resurfacing.module';
import { TextAdaptationModule } from './text-adaptation/text-adaptation.module';
import { VisualGroundingModule } from './visual-grounding/visual-grounding.module';
import { DigestModule } from './digest/digest.module';
import { DrmModule } from './drm/drm.module';
import { OtpModule } from './otp/otp.module';
import { SmsModule } from './sms/sms.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { AiModule } from './ai/ai.module';
import { AiEntitlementModule } from './ai-entitlement/ai-entitlement.module';
import { BookAccessModule } from './common/book-access.module';

@Module({
  imports: [
    // Error tracking — must be the first registered module.
    SentryModule.forRoot(),

    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Global modules
    PrismaModule,
    LoggerModule,

    // BullMQ (Redis-based queues)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          try {
            const parsed = new URL(redisUrl);
            return {
              connection: {
                host: parsed.hostname,
                port: parseInt(parsed.port || '6379', 10),
                username: parsed.username
                  ? decodeURIComponent(parsed.username)
                  : undefined,
                password: parsed.password
                  ? decodeURIComponent(parsed.password)
                  : undefined,
              },
            };
          } catch {
            // fallback if invalid URL
          }
        }
        return {
          connection: {
            host: configService.get('REDIS_HOST', '127.0.0.1'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
        };
      },
      inject: [ConfigService],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Caching
    CacheModule.register({
      isGlobal: true,
    }),

    // Rate limiting.
    // AppThrottlerModule, not ThrottlerModule.forRoot(): forRoot only supplies
    // configuration. The guard has to be registered as well, and that
    // APP_GUARD registration lives in AppThrottlerModule. Without it the
    // @Throttle() decorators on the OTP and book-chat routes do nothing.
    AppThrottlerModule,

    // Feature modules
    AiEntitlementModule,
    BookAccessModule,
    AuthModule,
    BooksModule,
    UserModule,
    AdminModule,
    InstitutionsModule,
    JoinRequestsModule,
    TenantUsersModule,
    TenantAdminModule,
    LibraryModule,
    ReaderModule,
    ProgressModule,
    AnnotationsModule,
    FlashcardsModule,
    DictionaryModule,
    MediaModule,
    AudiobookModule,
    NotificationsModule,
    AssignmentsModule,
    AnalyticsModule,
    ExportModule,
    TaxonomyModule,
    PersonalLibraryModule,
    RagModule,
    SanchikaModule,
    GraphModule,
    QuizModule,
    VartaActivityModule,
    UserPreferencesModule,
    AccountDeletionModule,
    ResurfacingModule,
    TextAdaptationModule,
    VisualGroundingModule,
    DigestModule,
    DrmModule,
    OtpModule,
    SmsModule,
    WhatsAppModule,
    AiModule,
    EmailModule,
    AwsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Reports unhandled exceptions to Sentry/GlitchTip, then delegates to the
    // default Nest exception handling.
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
