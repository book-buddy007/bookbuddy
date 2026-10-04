import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { TenantAdminController } from './tenant-admin.controller';
import { TenantAdminService } from './tenant-admin.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [TenantAdminController],
  providers: [TenantAdminService],
})
export class TenantAdminModule {}
