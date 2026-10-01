import { Module } from '@nestjs/common';
import { UserPreferencesController } from './user-preferences.controller';
import { UserPreferencesService } from './user-preferences.service';

// PrismaModule is @Global, so it needs no import here (same as VartaActivityModule).
// The service is exported so the RAG chat flow can read the answer-language
// preference through the same single source of truth as the settings endpoint.
@Module({
  controllers: [UserPreferencesController],
  providers: [UserPreferencesService],
  exports: [UserPreferencesService],
})
export class UserPreferencesModule {}
