import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { OtpDto, OtpResponseDto, VerifyOtpDto } from './otp.dto';

@ApiTags('OTP')
@Controller('otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @Post('/send')
  @ApiBody({ type: OtpDto })
  @ApiResponse({
    status: 201,
    description: 'OTP sent successfully.',
    type: OtpResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  async sendOtp(@Body() body: OtpDto): Promise<OtpResponseDto> {
    // type can be 'mail', 'sms', 'whatsapp' // to is the recipient depending on the type
    return await this.otpService.sendOtp(body.type, body.to);
  }

  @Post('/verify')
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully.',
    type: OtpResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP.' })
  async verifyOtp(@Body() body: VerifyOtpDto): Promise<OtpResponseDto> {
    return await this.otpService.validateOtp(body.otp,body.email);
  }
}
