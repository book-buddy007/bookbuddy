import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetDistributionCommand,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';
// TODO: Update to use getSignedUrl from @aws-sdk/cloudfront-signer
// import { createSigner } from '@aws-sdk/cloudfront-signer';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CloudFrontService {
  private cloudfrontClient: CloudFrontClient;
  private cdnDomain: string;
  private keyPairId: string;
  private privateKey: string;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('CloudFrontService');

    // Initialize CloudFront client
    this.cloudfrontClient = new CloudFrontClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });

    // Set CloudFront domain and key information
    this.cdnDomain = this.configService.get<string>('CLOUDFRONT_DOMAIN', '');
    this.keyPairId = this.configService.get<string>(
      'CLOUDFRONT_KEY_PAIR_ID',
      '',
    );
    this.privateKey = this.configService.get<string>(
      'CLOUDFRONT_PRIVATE_KEY',
      '',
    );
  }

  /**
   * Generate a signed URL for accessing content through CloudFront
   */
  generateSignedUrl(resourceKey: string, expiresIn = 3600): string {
    try {
      if (!this.privateKey || !this.keyPairId || !this.cdnDomain) {
        this.logger.warn(
          'CloudFront signing keys not configured, returning unsigned URL',
        );
        return `https://${this.cdnDomain || 'example.com'}/${resourceKey}`;
      }

      const url = `https://${this.cdnDomain}/${resourceKey}`;
      const expires = Math.floor(Date.now() / 1000) + expiresIn;

      // TODO: Implement CloudFront signed URL generation
      // For now, return the unsigned URL
      this.logger.warn(
        'CloudFront signed URLs not implemented - returning unsigned URL',
      );
      return url;

      // // Create a signer
      // const signer = createSigner({
      //   keyPairId: this.keyPairId,
      //   privateKey: this.privateKey,
      // });
      //
      // // Generate signed URL
      // const signedUrl = signer.getSignedUrl({
      //   url,
      //   dateLessThan: new Date(expires * 1000).toISOString(),
      // });
      //
      // this.logger.log(`Generated signed URL for ${resourceKey}, expires in ${expiresIn} seconds`);
      //
      // return signedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Invalidate CloudFront cache for specific paths
   */
  async invalidateCache(paths: string[]): Promise<string> {
    try {
      const distributionId = this.configService.get<string>(
        'CLOUDFRONT_DISTRIBUTION_ID',
        '',
      );

      if (!distributionId) {
        throw new Error('CloudFront distribution ID not configured');
      }

      const command = new CreateInvalidationCommand({
        DistributionId: distributionId,
        InvalidationBatch: {
          CallerReference: uuidv4(),
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
        },
      });

      const response = await this.cloudfrontClient.send(command);

      this.logger.log(`Created invalidation for paths: ${paths.join(', ')}`);

      return response.Invalidation?.Id || '';
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get CloudFront distribution details
   */
  async getDistributionDetails(): Promise<any> {
    try {
      const distributionId = this.configService.get<string>(
        'CLOUDFRONT_DISTRIBUTION_ID',
        '',
      );

      if (!distributionId) {
        throw new Error('CloudFront distribution ID not configured');
      }

      const command = new GetDistributionCommand({
        Id: distributionId,
      });

      const response = await this.cloudfrontClient.send(command);

      return response.Distribution;
    } catch (error) {
      this.logger.error(
        `Failed to get distribution: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
