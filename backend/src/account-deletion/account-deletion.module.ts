import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';
import { AccountDeletionController } from './account-deletion.controller';
import { AccountDeletionService } from './account-deletion.service';

// PrismaModule and AwsModule are @Global; ConfigModule is global in AppModule.
@Module({
  imports: [EmailModule, UserModule],
  controllers: [AccountDeletionController],
  providers: [AccountDeletionService],
})
export class AccountDeletionModule {}
