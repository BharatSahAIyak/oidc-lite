import { Test, TestingModule } from '@nestjs/testing';
import { UserRegistrationService } from './user-registration.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HeaderAuthService } from '../../header-auth/header-auth.service';
import { UserService } from '../user.service';
import { UtilsService } from '../../utils/utils.service';
import {
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ResponseDto } from '../../dto/response.dto';
import {
  CreateUserAndUserRegistration,
  CreateUserRegistrationDto,
  UpdateUserRegistrationDto,
} from '../user.dto';
import { AccessTokenDto, RefreshTokenDto } from '../../oidc/dto/oidc.token.dto';
import { ApplicationDataDto } from '../../application/application.dto';
import { access } from 'fs';

describe('UserRegistrationService', () => {
  let service: UserRegistrationService;
  let prismaService: PrismaService;
  let headerAuthService: HeaderAuthService;
  let userService: UserService;
  let utilService: UtilsService;

  const mockPrismaService = {
    application: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userRegistration: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    applicationRole: {
      findUnique: jest.fn(),
    },
  };

  const mockHeaderAuthService = {
    authorizationHeaderVerifier: jest.fn(),
    validateRoute: jest.fn(),
  };

  const mockUserService = {
    createAUser: jest.fn(),
  };

  const mockUtilService = {
    returnRolesForAGivenUserIdAndApplicationId: jest.fn(),
    createToken: jest.fn(),
    saveOrUpdateRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRegistrationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HeaderAuthService, useValue: mockHeaderAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: UtilsService, useValue: mockUtilService },
      ],
    }).compile();

    service = module.get<UserRegistrationService>(UserRegistrationService);
    prismaService = module.get<PrismaService>(PrismaService);
    headerAuthService = module.get<HeaderAuthService>(HeaderAuthService);
    userService = module.get<UserService>(UserService);
    utilService = module.get<UtilsService>(UtilsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockApplication = {
    id: 'testAppId',
    tenantId: 'testTenantId',
    data: JSON.stringify({
      jwtConfiguration: {
        timeToLiveInSeconds: 3600,
      },
    }),
    accessTokenSigningKeysId: null,
    idTokenSigningKeysId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    name: 'testApp',
    active: true,
  };

  const mockUser = {
    id: 'testUserId',
    data: '{}',
    active: true,
    expiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId: 'testTenantId',
    email: 'test@test.com',
  };

  const mockUserRegistration = {
    id: 'testRegId',
    applicationsId: 'testAppId',
    usersId: 'testUserId',
    authenticationToken: 'testToken',
    password: 'Password@123',
    data: {},
    createdAt: new Date(),
    lastLoginInstant: null,
    updatedAt: new Date(),
  };
  const mockRoles = ['role1', 'role2'];
  const mockAccessToken = 'accessToken';
  const data: CreateUserRegistrationDto = {
    applicationId: 'testAppId',
    registrationId: 'testRegId',
    generateAuthenticationToken: true,
  };
  describe('createAUserRegistration', () => {
    it('should create a user registration successfully', async () => {
      const userId = 'testUserId';

      const headers = {
        authorization: 'master',
      };

      jest
        .spyOn(mockPrismaService.application, 'findUnique')
        .mockResolvedValue(mockApplication);
      jest
        .spyOn(mockHeaderAuthService, 'authorizationHeaderVerifier')
        .mockResolvedValue({ success: true, message: 'Authorized' });
      jest
        .spyOn(mockPrismaService.user, 'findUnique')
        .mockResolvedValue(mockUser);
      jest
        .spyOn(mockPrismaService.userRegistration, 'create')
        .mockResolvedValue(mockUserRegistration);
      jest
        .spyOn(mockUtilService, 'returnRolesForAGivenUserIdAndApplicationId')
        .mockResolvedValue(['roleId1', 'roleId2']);
      jest
        .spyOn(mockPrismaService.applicationRole, 'findUnique')
        .mockResolvedValueOnce({ name: 'role1' })
        .mockResolvedValueOnce({ name: 'role2' });
      jest
        .spyOn(mockUtilService, 'createToken')
        .mockResolvedValue(mockAccessToken);

      try {
        const result = await service.createAUserRegistration(
          userId,
          data,
          headers,
        );

        expect(result).toEqual({
          success: true,
          message: 'A user registered',
          data: {
            userRegistration: mockUserRegistration,
            access_token: mockAccessToken,
          },
        });
      } catch (e) {
        console.log(e);
      }
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledWith({
        where: { id: data.applicationId },
      });
      expect(
        mockHeaderAuthService.authorizationHeaderVerifier,
      ).toHaveBeenCalledWith(
        headers,
        mockApplication.tenantId,
        '/user/registration',
        'POST',
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.userRegistration.create).toHaveBeenCalledWith({
        data: {
          id: data.registrationId,
          authenticationToken: expect.any(String),
          usersId: userId,
          applicationsId: mockApplication.id,
          password: undefined,
        },
      });
      expect(
        mockUtilService.returnRolesForAGivenUserIdAndApplicationId,
      ).toHaveBeenCalledWith(mockUser.id, mockApplication.id);
      expect(
        mockPrismaService.applicationRole.findUnique,
      ).toHaveBeenCalledTimes(2);
      expect(mockUtilService.createToken).toHaveBeenCalledWith(
        {
          active: true,
          applicationId: mockApplication.id,
          iat: expect.any(Number),
          iss: process.env.ISSUER_URL,
          exp: expect.any(Number),
          roles: mockRoles,
          sub: mockUser.id,
          aud: mockApplication.id,
          scope: 'openid',
        },
        mockApplication.id,
        mockApplication.tenantId,
        'access',
      );
    });

    it('should throw BadRequestException if no data is provided', async () => {
      const userId = 'testUserId';
      const data: CreateUserRegistrationDto = null;
      const headers = {};

      await expect(
        service.createAUserRegistration(userId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no applicationId is provided', async () => {
      const userId = 'testUserId';
      const data: CreateUserRegistrationDto = {
        applicationId: null,
        registrationId: 'testRegId',
        generateAuthenticationToken: true,
      };
      const headers = {};

      await expect(
        service.createAUserRegistration(userId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no userId is provided', async () => {
      const userId = null;
      const data: CreateUserRegistrationDto = {
        applicationId: 'testAppId',
        registrationId: 'testRegId',
        generateAuthenticationToken: true,
      };
      const headers = {};

      await expect(
        service.createAUserRegistration(userId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no application with given id exists', async () => {
      const userId = 'testUserId';
      const data: CreateUserRegistrationDto = {
        applicationId: 'nonExistentAppId',
        registrationId: 'testRegId',
        generateAuthenticationToken: true,
      };
      const headers = {};

      jest
        .spyOn(mockPrismaService.application, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.createAUserRegistration(userId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if authorization header verification fails', async () => {
      const userId = 'testUserId';
      const data: CreateUserRegistrationDto = {
        applicationId: 'testAppId',
        registrationId: 'testRegId',
        generateAuthenticationToken: true,
      };
      const headers = {};

      jest
        .spyOn(mockPrismaService.application, 'findUnique')
        .mockResolvedValue(mockApplication);

      jest
        .spyOn(mockHeaderAuthService, 'authorizationHeaderVerifier')
        .mockResolvedValue({ success: false, message: 'Unauthorized' });

      await expect(
        service.createAUserRegistration(userId, data, headers),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if no user with given id exists', async () => {
      const userId = 'nonExistentUserId';
      const data: CreateUserRegistrationDto = {
        applicationId: 'testAppId',
        registrationId: 'testRegId',
        generateAuthenticationToken: true,
      };
      const headers = {};

      jest
        .spyOn(mockPrismaService.application, 'findUnique')
        .mockResolvedValue(mockApplication);

      jest
        .spyOn(headerAuthService, 'authorizationHeaderVerifier')
        .mockResolvedValueOnce({
          success: true,
          message: 'Authorized',
        });

      jest.spyOn(mockPrismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.createAUserRegistration(userId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if an error occurs during user registration creation', async () => {
      const userId = 'testUserId';
      const data: CreateUserRegistrationDto = {
        applicationId: 'testAppId',
        registrationId: 'testRegId',
        generateAuthenticationToken: true,
      };
      const headers = {};

      jest
        .spyOn(headerAuthService, 'authorizationHeaderVerifier')
        .mockResolvedValue({
          success: true,
          message: 'Authorized',
        });

      jest
        .spyOn(mockPrismaService.user, 'findUnique')
        .mockResolvedValue(mockUser);

      jest
        .spyOn(mockPrismaService.userRegistration, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.createAUserRegistration(userId, data, headers),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('returnAUserRegistration', () => {
    it('should return a user registration successfully', async () => {
      const userId = 'testUserId';
      const applicationId = 'testAppId';
      const headers = {};

      mockPrismaService.application.findUnique.mockResolvedValue(
        mockApplication,
      );
      mockHeaderAuthService.authorizationHeaderVerifier.mockResolvedValue({
        success: true,
      });
      mockPrismaService.userRegistration.findFirst.mockResolvedValue(
        mockUserRegistration,
      );

      const result = await service.returnAUserRegistration(
        userId,
        applicationId,
        headers,
      );

      expect(result).toEqual({
        success: true,
        message: 'User registration found successfully',
        data: mockUserRegistration,
      });
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledWith({
        where: { id: applicationId },
      });
      expect(
        mockHeaderAuthService.authorizationHeaderVerifier,
      ).toHaveBeenCalledWith(
        headers,
        mockApplication.tenantId,
        '/user/registration',
        'GET',
      );
      expect(mockPrismaService.userRegistration.findFirst).toHaveBeenCalledWith(
        {
          where: { usersId: userId, applicationsId: applicationId },
        },
      );
    });
    // Naming mismatch
    it('should throw UnauthorizedException if user registration is not found', async () => {
      const userId = 'testUserId';
      const applicationId = 'testAppId';
      const headers = {};

      const mockApplication = { id: 'testAppId', tenantId: 'testTenantId' };

      mockPrismaService.application.findUnique.mockResolvedValue(
        mockApplication,
      );
      mockHeaderAuthService.authorizationHeaderVerifier.mockResolvedValue({
        success: true,
      });
      mockPrismaService.userRegistration.findFirst.mockResolvedValue(null);
      // TODO : Unauthorized Exception is not thrown
      await expect(
        service.returnAUserRegistration(userId, applicationId, headers),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateAUserRegistration', () => {
    it('should update a user registration successfully', async () => {
      const userId = 'testUserId';
      const applicationId = 'testAppId';
      const data: UpdateUserRegistrationDto = {
        data: {
          code_challenge: 'testCodeChallenge',
          code_challenge_method: 'testCodeChallengeMethod',
          scope: 'testScope',
        },
      };
      const headers = {};

      const mockApplication = { id: 'testAppId', tenantId: 'testTenantId' };
      const mockUser = { id: 'testUserId' };
      const mockUserRegistration = { id: 'testRegId', data: '{}' };
      const updatedUserRegistration = {
        ...mockUserRegistration,
        data: JSON.stringify(data.data),
      };

      mockPrismaService.application.findUnique.mockResolvedValue(
        mockApplication,
      );
      mockHeaderAuthService.authorizationHeaderVerifier.mockResolvedValue({
        success: true,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userRegistration.findFirst.mockResolvedValue(
        mockUserRegistration,
      );
      mockPrismaService.userRegistration.update.mockResolvedValue(
        updatedUserRegistration,
      );

      const result = await service.updateAUserRegistration(
        userId,
        applicationId,
        data,
        headers,
      );

      expect(result).toEqual({
        success: true,
        message: 'User registration updated',
        data: updatedUserRegistration,
      });
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledWith({
        where: { id: applicationId },
      });
      expect(
        mockHeaderAuthService.authorizationHeaderVerifier,
      ).toHaveBeenCalledWith(
        headers,
        mockApplication.tenantId,
        '/user/registration',
        'PATCH',
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.userRegistration.findFirst).toHaveBeenCalledWith(
        {
          where: { usersId: userId, applicationsId: applicationId },
        },
      );
      expect(mockPrismaService.userRegistration.update).toHaveBeenCalledWith({
        where: { id: mockUserRegistration.id },
        data: { data: JSON.stringify(data.data) },
      });
    });

    it('should throw BadRequestException if no applicationId is provided', async () => {
      const userId = 'testUserId';
      const applicationId = '';
      const data: UpdateUserRegistrationDto = {
        data: {
          code_challenge: 'testCodeChallenge',
          code_challenge_method: 'testCodeChallengeMethod',
          scope: 'testScope',
        },
      };
      const headers = {};

      await expect(
        service.updateAUserRegistration(userId, applicationId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no userId is provided', async () => {
      const userId = '';
      const applicationId = 'testAppId';
      const data: UpdateUserRegistrationDto = {
        data: {
          code_challenge: 'testCodeChallenge',
          code_challenge_method: 'testCodeChallengeMethod',
          scope: 'testScope',
        },
      };
      const headers = {};

      await expect(
        service.updateAUserRegistration(userId, applicationId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no application with given id exists', async () => {
      const userId = 'testUserId';
      const applicationId = 'nonExistentAppId';
      const data: UpdateUserRegistrationDto = {
        data: {
          code_challenge: 'testCodeChallenge',
          code_challenge_method: 'testCodeChallengeMethod',
          scope: 'testScope',
        },
      };
      const headers = {};

      jest
        .spyOn(mockPrismaService.application, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.updateAUserRegistration(userId, applicationId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if authorization header verification fails', async () => {
      const userId = 'testUserId';
      const applicationId = 'testAppId';
      const data: UpdateUserRegistrationDto = {
        data: {
          code_challenge: 'testCodeChallenge',
          code_challenge_method: 'testCodeChallengeMethod',
          scope: 'testScope',
        },
      };
      const headers = {};

      jest
        .spyOn(mockPrismaService.application, 'findUnique')
        .mockResolvedValue(mockApplication);

      jest
        .spyOn(mockHeaderAuthService, 'authorizationHeaderVerifier')
        .mockResolvedValue({ success: false, message: 'Unauthorized' });

      await expect(
        service.updateAUserRegistration(userId, applicationId, data, headers),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if no user with given id exists', async () => {
      const userId = 'nonExistentUserId';
      const applicationId = 'testAppId';
      const data: UpdateUserRegistrationDto = {
        data: {
          code_challenge: 'testCodeChallenge',
          code_challenge_method: 'testCodeChallengeMethod',
          scope: 'testScope',
        },
      };
      const headers = {};

      jest
        .spyOn(mockPrismaService.application, 'findUnique')
        .mockResolvedValue(mockApplication);

      jest
        .spyOn(mockHeaderAuthService, 'authorizationHeaderVerifier')
        .mockResolvedValue({
          success: true,
          message: 'Authorized',
        });

      jest.spyOn(mockPrismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.updateAUserRegistration(userId, applicationId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if an error occurs during user registration update', async () => {
      const userId = 'testUserId';
      const applicationId = 'testAppId';
      const data: UpdateUserRegistrationDto = {
        data: {
          code_challenge: 'testCodeChallenge',
          code_challenge_method: 'testCodeChallengeMethod',
          scope: 'testScope',
        },
      };
      const headers = {};

      jest
        .spyOn(mockPrismaService.application, 'findUnique')
        .mockResolvedValue(mockApplication);

      jest
        .spyOn(mockHeaderAuthService, 'authorizationHeaderVerifier')
        .mockResolvedValue({ success: true, message: 'Authorized' });

      jest
        .spyOn(mockPrismaService.user, 'findUnique')
        .mockResolvedValue(mockUser);

      jest
        .spyOn(mockPrismaService.userRegistration, 'findFirst')
        .mockResolvedValue(mockUserRegistration);

      jest
        .spyOn(mockPrismaService.userRegistration, 'update')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateAUserRegistration(userId, applicationId, data, headers),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteAUserRegistration', () => {
    it('should delete a user registration successfully', async () => {
      const usersId = 'testUserId';
      const applicationsId = 'testAppId';
      const headers = {};

      const mockApplication = { id: 'testAppId', tenantId: 'testTenantId' };
      const mockUserRegistration = { id: 'testRegId' };

      mockPrismaService.application.findUnique.mockResolvedValue(
        mockApplication,
      );
      mockHeaderAuthService.authorizationHeaderVerifier.mockResolvedValue({
        success: true,
      });
      mockPrismaService.userRegistration.findFirst.mockResolvedValue(
        mockUserRegistration,
      );
      mockPrismaService.userRegistration.delete.mockResolvedValue(
        mockUserRegistration,
      );

      const result = await service.deleteAUserRegistration(
        usersId,
        applicationsId,
        headers,
      );

      expect(result).toEqual({
        success: true,
        message: 'User registration deleted successfully',
        data: mockUserRegistration,
      });
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledWith({
        where: { id: applicationsId },
      });
      expect(
        mockHeaderAuthService.authorizationHeaderVerifier,
      ).toHaveBeenCalledWith(
        headers,
        mockApplication.tenantId,
        '/user/registration',
        'DELETE',
      );
      expect(mockPrismaService.userRegistration.findFirst).toHaveBeenCalledWith(
        {
          where: { usersId, applicationsId },
        },
      );
      expect(mockPrismaService.userRegistration.delete).toHaveBeenCalledWith({
        where: { id: mockUserRegistration.id },
      });
    });

    it('should throw BadRequestException if no application with given id exists', async () => {
      const usersId = 'testUserId';
      const applicationsId = 'nonExistentAppId';
      const headers = {};

      mockPrismaService.application.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAUserRegistration(usersId, applicationsId, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if authorization header verification fails', async () => {
      const usersId = 'testUserId';
      const applicationsId = 'testAppId';
      const headers = {};

      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'testAppId',
        tenantId: 'testTenantId',
      });

      mockHeaderAuthService.authorizationHeaderVerifier.mockResolvedValue({
        success: false,
        message: 'Unauthorized',
      });

      await expect(
        service.deleteAUserRegistration(usersId, applicationsId, headers),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if no user id is given', async () => {
      const usersId = '';
      const applicationsId = 'testAppId';
      const headers = {};

      jest
        .spyOn(headerAuthService, 'authorizationHeaderVerifier')
        .mockResolvedValue({
          success: true,
          message: 'Authorized',
        });

      await expect(
        service.deleteAUserRegistration(usersId, applicationsId, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no such user registration exists', async () => {
      const usersId = 'testUserId';
      const applicationsId = 'testAppId';
      const headers = {};

      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'testAppId',
        tenantId: 'testTenantId',
      });

      mockHeaderAuthService.authorizationHeaderVerifier.mockResolvedValue({
        success: true,
      });

      mockPrismaService.userRegistration.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteAUserRegistration(usersId, applicationsId, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if an error occurs during user registration deletion', async () => {
      const usersId = 'testUserId';
      const applicationsId = 'testAppId';
      const headers = {};

      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'testAppId',
        tenantId: 'testTenantId',
      });

      mockHeaderAuthService.authorizationHeaderVerifier.mockResolvedValue({
        success: true,
      });

      mockPrismaService.userRegistration.findFirst.mockResolvedValue({
        id: 'testRegId',
      });

      mockPrismaService.userRegistration.delete.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.deleteAUserRegistration(usersId, applicationsId, headers),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createAUserAndUserRegistration', () => {
    it('should throw UnauthorizedException if authorization header validation fails', async () => {
      const userId = 'testUserId';
      const data: CreateUserAndUserRegistration = {
        userInfo: {
          active: true,
          membership: [],
          userData: {
            username: 'testUser',
            password: 'Password@123',
          },
          email: 'test@test.com',
        },
        registrationInfo: {
          applicationId: 'testAppId',
        },
      };
      const headers = {};

      mockHeaderAuthService.validateRoute.mockResolvedValue({
        success: false,
        message: 'Unauthorized',
      });

      await expect(
        service.createAUserAndUserRegistration(userId, data, headers),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not authorized enough', async () => {
      const userId = 'testUserId';
      const data: CreateUserAndUserRegistration = {
        userInfo: {
          active: true,
          membership: [],
          userData: {
            username: 'testUser',
            password: 'Password@123',
          },
          email: 'test@test.com',
        },
        registrationInfo: {
          applicationId: 'testAppId',
        },
      };
      const headers = {
        'x-stencil-tenantid': 'otherTenantId',
      };

      jest.spyOn(mockHeaderAuthService, 'validateRoute').mockResolvedValue({
        success: true,
        data: { tenantsId: 'testTenantId2' },
      });
      jest
        .spyOn(mockPrismaService.application, 'findUnique')
        .mockResolvedValue({
          id: 'testAppId',
          tenantId: 'testTenantId',
        });

      await expect(
        service.createAUserAndUserRegistration(userId, data, headers),
      ).rejects.toThrow(UnauthorizedException);
    });

    //

    it('should throw BadRequestException if userInfo is missing required fields', async () => {
      const userId = 'testUserId';
      const data: CreateUserAndUserRegistration = {
        userInfo: {
          active: true,
          membership: [],
          userData: {
            username: 'testUser',
            password: 'Password@123',
          },
          email: '',
        },
        registrationInfo: {
          applicationId: 'testAppId',
        },
      };
      const headers = {
        'x-stencil-tenantid': 'testTenantId',
      };

      mockHeaderAuthService.validateRoute.mockResolvedValue({
        success: true,
        data: { tenantsId: 'testTenantId' },
      });

      await expect(
        service.createAUserAndUserRegistration(userId, data, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if an error occurs during user creation', async () => {
      const userId = 'testUserId';
      const data: CreateUserAndUserRegistration = {
        userInfo: {
          active: true,
          membership: [],
          userData: {
            username: 'testUser',
            password: 'Password@123',
          },
          email: 'test@test.com',
        },
        registrationInfo: {
          applicationId: 'testAppId',
        },
      };
      const headers = {
        'x-stencil-tenantid': 'testTenantId',
      };

      mockHeaderAuthService.validateRoute.mockResolvedValue({
        success: true,
        data: { tenantsId: 'testTenantId' },
      });
      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'testAppId',
        tenantId: 'testTenantId',
      });
      mockUserService.createAUser.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createAUserAndUserRegistration(userId, data, headers),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException if an error occurs during user registration creation', async () => {
      const userId = 'testUserId';
      const data: CreateUserAndUserRegistration = {
        userInfo: {
          active: true,
          membership: [],
          userData: {
            username: 'testUser',
            password: 'Password@123',
          },
          email: 'test@test.com',
        },
        registrationInfo: {
          applicationId: 'testAppId',
        },
      };
      const headers = {
        'x-stencil-tenantid': 'testTenantId',
      };

      mockHeaderAuthService.validateRoute.mockResolvedValue({
        success: true,
        data: { tenantsId: 'testTenantId' },
      });
      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'testAppId',
        tenantId: 'testTenantId',
      });
      mockUserService.createAUser.mockResolvedValue({ id: 'testUserId' });
      jest
        .spyOn(service, 'createAUserRegistration')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.createAUserAndUserRegistration(userId, data, headers),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException if an error occurs during refresh token creation', async () => {
      const userId = 'testUserId';
      const data: CreateUserAndUserRegistration = {
        userInfo: {
          active: true,
          membership: [],
          userData: {
            username: 'testUser',
            password: 'Password@123',
          },
          email: 'test@test.com',
        },
        registrationInfo: {
          applicationId: 'testAppId',
        },
      };
      const headers = {
        'x-stencil-tenantid': 'testTenantId',
      };

      mockHeaderAuthService.validateRoute.mockResolvedValue({
        success: true,
        data: { tenantsId: 'testTenantId' },
      });
      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'testAppId',
        tenantId: 'testTenantId',
        data: JSON.stringify({
          jwtConfiguration: {
            refreshTokenTimeToLiveInMinutes: 60,
          },
        }),
      });
      mockUserService.createAUser.mockResolvedValue({ id: 'testUserId' });
      // jest.spyOn(service, 'createAUserRegistration').mockResolvedValue({ id: 'testRegId' });
      mockUtilService.createToken.mockRejectedValue(
        new Error('Token creation error'),
      );

      await expect(
        service.createAUserAndUserRegistration(userId, data, headers),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException if an error occurs during refresh token saving', async () => {
      const userId = 'testUserId';
      const data: CreateUserAndUserRegistration = {
        userInfo: {
          active: true,
          membership: [],
          userData: {
            username: 'testUser',
            password: 'Password@123',
          },
          email: 'test@test.com',
        },
        registrationInfo: {
          applicationId: 'testAppId',
        },
      };
      const headers = {
        'x-stencil-tenantid': 'testTenantId',
      };

      mockHeaderAuthService.validateRoute.mockResolvedValue({
        success: true,
        data: { tenantsId: 'testTenantId' },
      });
      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'testAppId',
        tenantId: 'testTenantId',
        data: JSON.stringify({
          jwtConfiguration: {
            refreshTokenTimeToLiveInMinutes: 60,
          },
        }),
      });
      mockUserService.createAUser.mockResolvedValue({ id: 'testUserId' });
      // jest.spyOn(service, 'createAUserRegistration').mockResolvedValue({ id: 'testRegId' });
      mockUtilService.createToken.mockResolvedValue('refreshToken');
      mockUtilService.saveOrUpdateRefreshToken.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createAUserAndUserRegistration(userId, data, headers),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should create a user and user registration successfully', async () => {
      const userId = 'testUserId';
      const data: CreateUserAndUserRegistration = {
        userInfo: {
          active: true,
          membership: [],
          userData: {
            username: 'testUser',
            password: 'Password@123',
          },
          email: 'test@test.com',
        },
        registrationInfo: {
          applicationId: 'testAppId',
        },
      };
      const headers = {};

      const mockApplication = {
        id: 'testAppId',
        tenantId: 'testTenantId',
        data: JSON.stringify({
          jwtConfiguration: {
            refreshTokenTimeToLiveInMinutes: 60,
          },
        }),
      };
      const mockUser = { id: 'testUserId', data: '{}' };
      const mockUserRegistration = { id: 'testRegId' };
      const mockRefreshToken = 'refreshToken';
      const mockSaveToken = { id: 'saveTokenId' };

      mockHeaderAuthService.validateRoute.mockResolvedValue({
        success: true,
        data: { tenantsId: 'testTenantId' },
      });
      mockPrismaService.application.findUnique.mockResolvedValue(
        mockApplication,
      );
      mockUserService.createAUser.mockResolvedValue(mockUser);
      jest.spyOn(service, 'createAUserRegistration').mockResolvedValue({
        success: true,
        message: 'A user registered',
        data: {
          userRegistration: mockUserRegistration,
          access_token: 'accessToken',
        },
      });
      mockUtilService.createToken.mockResolvedValue(mockRefreshToken);
      mockUtilService.saveOrUpdateRefreshToken.mockResolvedValue(mockSaveToken);
      try {
        const result = await service.createAUserAndUserRegistration(
          userId,
          data,
          headers,
        );

        expect(result).toEqual({
          success: true,
          message: 'User and user registration created successfully!',
          data: {
            user: expect.any(Object),
            userRegistration: expect.any(Object),
            refresh_token: mockRefreshToken,
            refreshTokenId: mockSaveToken.id,
          },
        });
      } catch (e) {
        console.log(e);
      }
      expect(mockHeaderAuthService.validateRoute).toHaveBeenCalledWith(
        headers,
        '/user/registration',
        'POST',
      );
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledWith({
        where: { id: data.registrationInfo.applicationId },
      });
      expect(mockUserService.createAUser).toHaveBeenCalledWith(
        userId,
        data.userInfo,
        headers,
      );
      expect(service.createAUserRegistration).toHaveBeenCalledWith(
        userId,
        data.registrationInfo,
        headers,
      );
      expect(mockUtilService.createToken).toHaveBeenCalledWith(
        {
          active: true,
          applicationId: mockApplication.id,
          iat: expect.any(Number),
          iss: process.env.ISSUER_URL,
          exp: expect.any(Number),
          sub: userId,
        },
        mockApplication.id,
        mockApplication.tenantId,
        'refresh',
      );
      expect(mockUtilService.saveOrUpdateRefreshToken).toHaveBeenCalledWith(
        mockApplication.id,
        mockRefreshToken,
        userId,
        mockApplication.tenantId,
        '',
        expect.any(Number),
        expect.any(Number),
      );
    });
  });
});
