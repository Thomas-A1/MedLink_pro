import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.mnotify.com/api/sms/quick';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('integrations.mnotifyApiKey', '');
  }

  /**
   * Send SMS via Mnotify API
   * @param phoneNumber - Recipient phone number (must include country code, e.g., +233XXXXXXXXX for Ghana)
   * @param message - Message content
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('Mnotify API key not configured. SMS sending disabled.');
      return false;
    }

    // Normalize phone number (ensure it starts with +)
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: this.apiKey,
          recipient: [normalizedPhone],
          sender: 'MedLink',
          message,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        this.logger.log(`SMS sent successfully to ${normalizedPhone}`);
        return true;
      } else {
        this.logger.error(`Failed to send SMS: ${JSON.stringify(data)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error sending SMS to ${normalizedPhone}:`, error);
      return false;
    }
  }

  /**
   * Send password reset code via SMS
   * @param phoneNumber - Recipient phone number
   * @param code - 6-digit reset code
   */
  async sendPasswordResetCode(phoneNumber: string, code: string): Promise<boolean> {
    const message = `Your MedLink password reset code is: ${code}\n\nThis code expires in 10 minutes. Do not share this code with anyone.\n\nIf you didn't request this, please ignore this message.`;
    return this.sendSms(phoneNumber, message);
  }
}

