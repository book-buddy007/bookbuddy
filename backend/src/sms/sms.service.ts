import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class SmsService {
  private whatsappToken: string | null;
  private phoneNumberId: string;
  private templateName: string;
  private isConfigured: boolean;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('SmsService');

    this.whatsappToken =
      this.configService.get<string>('WHATSAPP_TOKEN') || null;
    this.phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_ID',
      '',
    );
    this.templateName = this.configService.get<string>(
      'WHATSAPP_TEMPLATE_NAME',
      '',
    );
    this.isConfigured =
      !!this.whatsappToken && !!this.phoneNumberId && !!this.templateName;

    if (!this.isConfigured) {
      this.logger.warn(
        'WhatsApp Cloud API not configured. Phone OTPs will be disabled. ' +
          'Set WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, and WHATSAPP_TEMPLATE_NAME to enable.',
      );
    } else {
      this.logger.log(
        'Phone OTP service initialized successfully with WhatsApp Cloud API',
      );
    }
  }

  /**
   * Send OTP via WhatsApp Cloud API
   * @param phone - Phone number with country code (e.g., "919876543210")
   * @param otp - The OTP code to send
   */
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        `WhatsApp not configured. Skipping OTP to ${phone}. OTP: ${otp} (dev only log)`,
      );
      // In development, still return true so the flow works
      return true;
    }

    try {
      // Normalize phone: remove +, spaces, dashes
      const normalizedPhone = phone.replace(/[\s\-\+]/g, '');

      // Standard Meta WhatsApp Cloud API Auth Template Payload
      // This assumes an Authentication template with an OTP button and a body variable
      const payload = {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: this.templateName,
          language: { code: 'en_US' }, // Update if your template is not en_US
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      };

      const response = await fetch(
        `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.whatsappToken}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      // Meta returns a messages array with IDs on success
      if (response.ok && data.messages && data.messages.length > 0) {
        this.logger.log(
          `OTP WhatsApp sent successfully to ${this.maskPhone(normalizedPhone)}`,
        );
        return true;
      }

      this.logger.error(
        `Failed to send OTP WhatsApp to ${this.maskPhone(normalizedPhone)}: ${JSON.stringify(data)}`,
      );
      return false;
    } catch (error) {
      this.logger.error(
        `Error sending OTP WhatsApp: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Mask phone number for logging (show only last 4 digits)
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return '****';
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
  }
}
