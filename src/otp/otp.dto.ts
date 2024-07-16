import { ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString, Length } from 'class-validator';

export class OtpDto {
  @ApiProperty()
  @IsEnum(['mail', 'sms', 'whatsapp'], { each: true })
  type: string[];
  @ApiProperty()
  @IsString()
  to: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty()
  email: string;
}

export class OtpResponseDto {
  @ApiProperty()
  @IsBoolean()
  success: boolean;
  @ApiProperty()
  message: string;
}
