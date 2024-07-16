import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';

type OTP = {
  email: string;
  expirationTime: number;
};

@Injectable()
export class OtpManagerService {
  private readonly logger: Logger;
  private otpStore: Map<string, OTP> = new Map(); // Stores OTP and its expiration time

  constructor() {
    this.logger = new Logger(OtpManagerService.name);
  }

  timeOut: number = parseInt(process.env.OTP_TIMEOUT) || 300; // OTP valid for 5 minutes default otherwise from env

  async generateOtp(email: string, length: number = 6): Promise<string> {
    try {
      const otp = this.generateSecureOtp(length);
      const expirationTime = Date.now() + this.timeOut * 1000;
      const data = {
        email,
        expirationTime,
      };
      this.otpStore.set(otp, data);
      return otp;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException({
        success: false,
        message: 'OTP failed to generate',
      });
    }
  }

  private generateSecureOtp(length: number): string {
    return crypto.randomInt(100000, 999999).toString().padStart(length, '0');
  }

  async validateOtp(otp: string, email: string): Promise<boolean> {
    const data = this.otpStore.get(otp);
    if (!data) {
      return false; // OTP does not exist
    }

    const isValid = data.email === email && Date.now() < data.expirationTime;
    if (isValid) {
      this.otpStore.delete(otp); // Invalidate OTP after use
      this.logger.log(`Successful otp login for ${email}`);
    } else {
      this.logger.log(`Unsuccessful otp login attempt for ${email}`);
    }
    return isValid;
  }

  async cleanExpiredOtps(): Promise<void> {
    const now = Date.now();
    for (const [otp, data] of this.otpStore.entries()) {
      if (now >= data.expirationTime) {
        this.otpStore.delete(otp);
      }
    }
  }
}
