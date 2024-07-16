import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { OtpAdaptersService } from './otp-adapters/otp-adapters.service';
import { OtpManagerService } from './otp-manager/otp-manager.service';

@Module({
  controllers: [OtpController],
  providers: [OtpService, OtpAdaptersService, OtpManagerService],
  exports: [OtpService]
})
export class OtpModule {}
