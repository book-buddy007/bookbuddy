import { Module } from '@nestjs/common';
import { ReaderController } from './reader.controller';
import { ReaderService } from './reader.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReaderController],
  providers: [ReaderService],
})
export class ReaderModule {}
