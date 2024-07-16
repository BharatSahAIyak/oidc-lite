import { Test, TestingModule } from '@nestjs/testing';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { OtpDto, OtpResponseDto, VerifyOtpDto } from './otp.dto';

describe('OtpController', () => {
  let controller: OtpController;
  let otpService: OtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtpController],
      providers: [
        {
          provide: OtpService,
          useValue: {
            sendOtp: jest.fn(),
            validateOtp: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OtpController>(OtpController);
    otpService = module.get<OtpService>(OtpService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should call otpService.sendOtp and return the result', async () => {
      const otpDto: OtpDto = {
        type: ['mail', 'sms'],
        to: 'test@example.com',
      };
      const otpResponseDto: OtpResponseDto = {
        success: true,
        message: 'OTP sent successfully',
      };

      jest.spyOn(otpService, 'sendOtp').mockResolvedValue(otpResponseDto);

      const result = await controller.sendOtp(otpDto);

      expect(result).toEqual(otpResponseDto);
      expect(otpService.sendOtp).toHaveBeenCalledWith(otpDto.type, otpDto.to);
    });
  });

  describe('verifyOtp', () => {
    it('should call otpService.validateOtp and return the result', async () => {
      const verifyOtpDto: VerifyOtpDto = {
        otp: '123456',
        email: 'some mail',
      };
      const otpResponseDto: OtpResponseDto = {
        success: true,
        message: 'OTP is valid and verified',
      };

      jest.spyOn(otpService, 'validateOtp').mockResolvedValue(otpResponseDto);

      const result = await controller.verifyOtp(verifyOtpDto);

      expect(result).toEqual(otpResponseDto);
      expect(otpService.validateOtp).toHaveBeenCalledWith(
        verifyOtpDto.otp,
        verifyOtpDto.email,
      );
    });
  });
});
