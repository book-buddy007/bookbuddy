// backend/src/whatsapp/whatsapp.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  private readonly token: string;
  private readonly phoneNumberId = '1005756525962165';
  private readonly templateName = 'book_buddy_otp';
  private readonly apiVersion = 'v25.0';

  constructor(private config: ConfigService) {
    this.token = this.config.get<string>('WHATSAPP_TOKEN') || '';
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber, // E.164 format: 917272865002
      type: 'template',
      template: {
        name: this.templateName,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otp }],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: otp }],
          },
        ],
      },
    };

    try {
      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`WhatsApp OTP sent to ${phoneNumber}`);
    } catch (err) {
      this.logger.error(
        `WhatsApp OTP failed: ${err.response?.data?.error?.message}`,
      );
      throw new Error('Failed to send WhatsApp OTP');
    }
  }

  // Converts Indian number to E.164
  formatIndianNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits;
    if (digits.length === 10) return `91${digits}`;
    throw new Error(`Invalid phone number: ${phone}`);
  }
}
