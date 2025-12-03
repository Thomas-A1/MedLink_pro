import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.mnotify.com/api';
  private readonly senderId = 'MedLink';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MNOTIFY_API_KEY') || 'ppgVYPAY10ixb9srYfaDAYrxp';
  }

  async sendOTP(phoneNumber: string, otpCode: string, language: 'en' | 'tw' = 'en'): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('MNOTIFY_API_KEY not configured. SMS will not be sent.');
      // In development, log the OTP instead
      this.logger.log(`[DEV] OTP for ${phoneNumber}: ${otpCode}`);
      return true; // Return true for development
    }

    const messages = {
      en: `Your MedLink verification code is: ${otpCode}. Valid for 10 minutes.`,
      tw: `Wo MedLink verification code ne: ${otpCode}. Ɛbɛyɛ adwuma simma 10 mu.`,
    };

    try {
      const response = await fetch(`${this.baseUrl}/sms/quick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: this.apiKey,
          to: phoneNumber.replace(/^\+/, ''), // Remove + prefix
          msg: messages[language],
          sender_id: this.senderId,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        this.logger.log(`SMS sent successfully to ${phoneNumber}`);
        return true;
      } else {
        this.logger.error(`Failed to send SMS: ${result.message}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error sending SMS: ${error.message}`);
      // In development, still return true
      if (process.env.NODE_ENV === 'development') {
        this.logger.log(`[DEV] OTP for ${phoneNumber}: ${otpCode}`);
        return true;
      }
      return false;
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('MNOTIFY_API_KEY not configured. SMS will not be sent.');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sms/quick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: this.apiKey,
          to: phoneNumber.replace(/^\+/, ''),
          msg: message,
          sender_id: this.senderId,
        }),
      });

      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      this.logger.error(`Error sending SMS: ${error.message}`);
      return false;
    }
  }
}

