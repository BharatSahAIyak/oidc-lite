import { Test, TestingModule } from '@nestjs/testing';
import { OtpManagerService } from './otp-manager.service';

describe('OtpManagerService', () => {
  let service: OtpManagerService;

  beforeAll(() => {
    process.env.OTP_TIMEOUT = '300'; // Set default timeout to 300 seconds (5 minutes)
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OtpManagerService],
    }).compile();

    service = module.get<OtpManagerService>(OtpManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a 6-digit OTP by default', async () => {
    const otp = await service.generateOtp('some mail');
    expect(otp).toHaveLength(6);
    expect(Number(otp)).toBeGreaterThanOrEqual(100000);
    expect(Number(otp)).toBeLessThanOrEqual(999999);
  });

  it('should store the OTP with expiration time', async () => {
    const otp = await service.generateOtp('some mail');
    const data = service['otpStore'].get(otp);
    expect(data).toBeDefined();
    expect(data.expirationTime).toBeGreaterThan(Date.now());
  });

  it('should validate a valid OTP', async () => {
    const otp = await service.generateOtp('some mail');
    const isValid = await service.validateOtp(otp, 'some mail');
    expect(isValid).toBe(true);
  });

  it('should not validate an invalid OTP', async () => {
    const isValid = await service.validateOtp('000000', 'some mail');
    expect(isValid).toBe(false);
  });

  it('should invalidate an OTP after use', async () => {
    const otp = await service.generateOtp('some mail');
    await service.validateOtp(otp, 'some mail');
    const isValid = await service.validateOtp(otp, 'some mail');
    expect(isValid).toBe(false);
  });

  it('should clean expired OTPs', async () => {
    const otp = await service.generateOtp('some mail');
    service['otpStore'].set(otp, {
      email: 'some mail',
      expirationTime: Date.now() - 1000,
    }); // Set OTP as expired
    await service.cleanExpiredOtps();
    const expirationTime = service['otpStore'].get(otp);
    expect(expirationTime).toBeUndefined();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });
});
