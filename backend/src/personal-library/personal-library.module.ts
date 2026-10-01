import { Module } from '@nestjs/common';
import { PersonalLibraryController } from './personal-library.controller';
import { PersonalLibraryService } from './personal-library.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AwsModule } from '../aws/aws.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [PrismaModule, AwsModule, LoggerModule],
  controllers: [PersonalLibraryController],
  providers: [PersonalLibraryService],
  exports: [PersonalLibraryService],
})
export class PersonalLibraryModule {}
