import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';
import { CloudFrontService } from './cloudfront.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [S3Service, CloudFrontService],
  exports: [S3Service, CloudFrontService],
})
export class AwsModule {}
