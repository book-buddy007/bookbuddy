import { Module } from '@nestjs/common';
import { SanchikaController } from './sanchika.controller';
import { SanchikaService } from './sanchika.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SanchikaController],
  providers: [SanchikaService],
  exports: [SanchikaService],
})
export class SanchikaModule {}
