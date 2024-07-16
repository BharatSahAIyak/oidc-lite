import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { OtpAdaptersService } from './otp-adapters/otp-adapters.service';
import { OtpManagerService } from './otp-manager/otp-manager.service';

describe('OtpService', () => {
  let otpService: OtpService;
  let otpAdaptersService: OtpAdaptersService;
  let otpManagerService: OtpManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: OtpAdaptersService,
          useValue: {
            mailOtpAdapter: jest.fn(),
            smsOtpAdapter: jest.fn(),
            whatsappOtpAdapter: jest.fn(),
          },
        },
        {
          provide: OtpManagerService,
          useValue: {
            generateOtp: jest.fn(),
            validateOtp: jest.fn(),
          },
        },
      ],
    }).compile();

    otpService = module.get<OtpService>(OtpService);
    otpAdaptersService = module.get<OtpAdaptersService>(OtpAdaptersService);
    otpManagerService = module.get<OtpManagerService>(OtpManagerService);
  });

  it('should be defined', () => {
    expect(otpService).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should send OTP via mail, sms, and whatsapp and return success', async () => {
      const otpGenerated = '123456';
      jest
        .spyOn(otpManagerService, 'generateOtp')
        .mockResolvedValue(otpGenerated);

      const result = await otpService.sendOtp(
        ['mail', 'sms', 'whatsapp'],
        'test@example.com',
      );

      expect(otpManagerService.generateOtp).toHaveBeenCalled();
      expect(otpAdaptersService.mailOtpAdapter).toHaveBeenCalledWith(
        otpGenerated,
        'test@example.com',
      );
      expect(otpAdaptersService.smsOtpAdapter).toHaveBeenCalledWith(
        otpGenerated,
        'test@example.com',
      );
      expect(otpAdaptersService.whatsappOtpAdapter).toHaveBeenCalledWith(
        otpGenerated,
        'test@example.com',
      );
      expect(result).toEqual({
        success: true,
        message: 'OTP sent successfully',
      });
    });

    it('should return failure if any adapter fails', async () => {
      const otpGenerated = '123456';
      jest
        .spyOn(otpManagerService, 'generateOtp')
        .mockResolvedValue(otpGenerated);
      jest
        .spyOn(otpAdaptersService, 'mailOtpAdapter')
        .mockRejectedValue(new Error('Mail sending failed'));

      const result = await otpService.sendOtp(
        ['mail', 'sms', 'whatsapp'],
        'test@example.com',
      );

      expect(otpManagerService.generateOtp).toHaveBeenCalled();
      expect(otpAdaptersService.mailOtpAdapter).toHaveBeenCalledWith(
        otpGenerated,
        'test@example.com',
      );
      expect(result).toEqual({
        success: false,
        message: 'OTP failed to send',
      });
    });
  });

  describe('validateOtp', () => {
    it('should validate the OTP and return success if valid', async () => {
      jest.spyOn(otpManagerService, 'validateOtp').mockResolvedValue(true);

      const result = await otpService.validateOtp('123456', 'some mail');

      expect(otpManagerService.validateOtp).toHaveBeenCalledWith('123456','some mail');
      expect(result).toEqual({
        success: true,
        message: 'OTP is valid and verified',
      });
    });

    it('should return failure if the OTP is invalid or expired', async () => {
      jest.spyOn(otpManagerService, 'validateOtp').mockResolvedValue(false);

      const result = await otpService.validateOtp('123456', 'some mail');

      expect(otpManagerService.validateOtp).toHaveBeenCalledWith('123456','some mail');
      expect(result).toEqual({
        success: false,
        message: 'OTP is invalid or expired',
      });
    });
  });
});
