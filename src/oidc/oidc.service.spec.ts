import { Test, TestingModule } from '@nestjs/testing';
import { OidcService } from './oidc.service';
import { PrismaService } from '../prisma/prisma.service';
import { UtilsService } from '../utils/utils.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { OIDCAuthQuery } from './dto/oidc.auth.dto';
import { LoginDto } from '../login/login.dto';
import * as jwt from 'jsonwebtoken';
import { OtpModule } from '../otp/otp.module';

describe('OidcService', () => {
  let service: OidcService;
  let prismaService: PrismaService;
  let utilService: UtilsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [OtpModule],
      providers: [
        OidcService,
        {
          provide: PrismaService,
          useValue: {
            application: { findUnique: jest.fn() },
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            userRegistration: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            tenant: { findUnique: jest.fn() },
            key: { findMany: jest.fn(), findUnique: jest.fn() },
            applicationRole: { findUnique: jest.fn() },
          },
        },
        {
          provide: UtilsService,
          useValue: {
            comparePasswords: jest.fn(),
            hashPassword: jest.fn(),
            returnScopesForAGivenApplicationId: jest.fn(),
            createToken: jest.fn(),
            saveOrUpdateRefreshToken: jest.fn(),
            returnRolesForAGivenUserIdAndApplicationId: jest.fn(),
            checkValidityOfToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OidcService>(OidcService);
    prismaService = module.get<PrismaService>(PrismaService);
    utilService = module.get<UtilsService>(UtilsService);
  });

  describe('authorize', () => {
    it('should throw a BadRequestException if client_id is not provided', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const query = {} as OIDCAuthQuery;
      const headers = {};

      await expect(service.authorize(req, res, query, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should render login page with correct parameters', async () => {
      const req = {} as Request;
      const res = {
        render: jest.fn(),
      } as any as Response;
      const query = {
        client_id: 'client123',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state123',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain',
      } as OIDCAuthQuery;
      const headers = {};

      await service.authorize(req, res, query, headers);
      expect(res.render).toHaveBeenCalledWith('login', {
        host: `${process.env.FULL_URL}`,
        applicationId: query.client_id,
        redirect_uri: query.redirect_uri,
        state: query.state,
        scope: query.scope,
        response_type: query.response_type,
        code_challenge: query.code_challenge,
        code_challenge_method: query.code_challenge_method,
      });
    });
  });

  describe('postAuthorize', () => {
    it('should throw a BadRequestException if data is not provided', async () => {
      const data = {} as LoginDto;
      const query = {} as OIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      await expect(
        service.postAuthorize(data, query, headers, res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if application does not exist', async () => {
      const data = {
        loginId: 'test@example.com',
        password: 'Password@123',
      } as LoginDto;
      const query = {
        client_id: 'client123',
      } as OIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(null);

      await expect(
        service.postAuthorize(data, query, headers, res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should redirect with code and state if user is successfully authenticated', async () => {
      const data = {
        loginId: 'test@example.com',
        password: 'Password@123',
        redirect_uri: 'http://localhost:3000/callback',
      } as LoginDto;
      const query = {
        client_id: 'client123',
      } as OIDCAuthQuery;
      const headers = {};
      const res = {
        redirect: jest.fn(),
      } as any as Response;

      const application = {
        id: 'client123',
        accessTokenSigningKeysId: 'accessTokenKey123',
        active: true,
        data: JSON.stringify({
          oauthConfiguration: {
            authorizedRedirectURLs: ['http://localhost:3000/callback'],
          },
        }),
        idTokenSigningKeysId: 'idTokenKey123',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'testApp',
        tenantId: 'tenant123',
      };
      const user = {
        id: 'user123',
        active: true,
        data: JSON.stringify({
          userData: {
            password: 'hashedpassword',
          },
        }),
        expiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: 'tenant123',
        email: 'user@example.com',
        groupId: 'mock-gp-id',
      };

      const userRegistration = {
        id: 'registration123',
        applicationsId: 'client123',
        authenticationToken: 'authToken123',
        password: 'hashedpassword',
        data: null,
        createdAt: new Date(),
        lastLoginInstant: null,
        updatedAt: new Date(),
        usersId: 'user123',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(user);
      jest.spyOn(utilService, 'comparePasswords').mockResolvedValueOnce(true);
      jest
        .spyOn(prismaService.userRegistration, 'findUnique')
        .mockResolvedValueOnce(null);
      jest
        .spyOn(prismaService.userRegistration, 'create')
        .mockResolvedValueOnce(userRegistration);

      await service.postAuthorize(data, query, headers, res);
      expect(res.redirect).toHaveBeenCalledWith(
        `${data.redirect_uri}?code=${userRegistration.authenticationToken}&state=${data.state}`,
      );
    });
  });

  // registerAUser
  describe('registerAUser', () => {
    it('should throw a BadRequestException if client_id is not provided', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const query = {} as OIDCAuthQuery;
      const headers = {};

      await expect(
        service.registerAUser(req, res, query, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if redirect_uri is not provided', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const query = {
        client_id: 'client123',
      } as OIDCAuthQuery;
      const headers = {};

      await expect(
        service.registerAUser(req, res, query, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if scope is not provided', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const query = {
        client_id: 'client123',
        redirect_uri: 'http://localhost:3000/callback',
      } as OIDCAuthQuery;
      const headers = {};

      await expect(
        service.registerAUser(req, res, query, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if response_type is not provided', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const query = {
        client_id: 'client123',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid profile',
      } as OIDCAuthQuery;
      const headers = {};

      await expect(
        service.registerAUser(req, res, query, headers),
      ).rejects.toThrow(BadRequestException);
    });

    it('should render signup page with correct parameters', async () => {
      const req = {} as Request;
      const res = {
        render: jest.fn(),
      } as any as Response;
      const query = {
        client_id: 'client123',
        tenantId: 'tenant123',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state123',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain',
      } as OIDCAuthQuery;
      const headers = {};

      await service.registerAUser(req, res, query, headers);
      expect(res.render).toHaveBeenCalledWith('signup', {
        host: `${process.env.FULL_URL}`,
        applicationId: query.client_id,
        tenantId: query.tenantId,
        redirect_uri: query.redirect_uri,
        state: query.state,
        scope: query.scope,
        response_type: query.response_type,
        code_challenge: query.code_challenge,
        code_challenge_method: query.code_challenge_method,
      });
    });
  });

  // postRegisterAUser
  describe('postRegisterAUser', () => {
    it('should throw a BadRequestException if no data is given', async () => {
      const data = null;
      const query = {} as OIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      await expect(
        service.postRegisterAUser(data, query, headers, res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if loginId is not provided', async () => {
      const data = {
        username: 'testuser',
        loginId: '',
        password: 'Password@123',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state123',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain',
      };
      const query = {} as OIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      await expect(
        service.postRegisterAUser(data, query, headers, res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if password is not provided', async () => {
      const data = {
        username: 'testuser',
        loginId: 'test@example.com',
        password: '',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state123',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain',
      };
      const query = {} as OIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      await expect(
        service.postRegisterAUser(data, query, headers, res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if no application id is given', async () => {
      const data = {
        username: 'testuser',
        loginId: 'test@example.com',
        password: 'Password@123',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state123',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain',
      };
      const query = {} as OIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      await expect(
        service.postRegisterAUser(data, query, headers, res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if the application does not exist', async () => {
      const data = {
        username: 'testuser',
        loginId: 'test@example.com',
        password: 'Password@123',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state123',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain',
      };
      const query = {
        client_id: 'client123',
      } as OIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(null);

      await expect(
        service.postRegisterAUser(data, query, headers, res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw an UnauthorizedException if the redirect_uri does not match with the registered redirect uris', async () => {
      const data = {
        username: 'testuser',
        loginId: 'test@example.com',
        password: 'Password@123',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state123',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain',
      };
      const query = {
        client_id: 'client123',
        redirect_uri: 'http://localhost:3000/callback',
      } as OIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      const application = {
        id: 'client123',
        accessTokenSigningKeysId: 'accessTokenKey123',
        active: true,
        data: JSON.stringify({
          oauthConfiguration: {
            authorizedRedirectURLs: ['http://example.com/callback'],
          },
        }),
        idTokenSigningKeysId: 'idTokenKey123',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'testApp',
        tenantId: 'tenant123',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);

      await expect(
        service.postRegisterAUser(data, query, headers, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw a BadRequestException if the user already exists', async () => {
      const data = {
        username: 'testuser',
        loginId: 'test@example.com',
        password: 'Password@123',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state123',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain',
      };
      const query = {
        client_id: 'client123',
        redirect_uri: 'http://localhost:3000/callback',
      } as OIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      const application = {
        id: 'client123',
        accessTokenSigningKeysId: 'accessTokenKey123',
        active: true,
        data: JSON.stringify({
          oauthConfiguration: {
            authorizedRedirectURLs: [
              'http://example.com/callback',
              'http://localhost:3000/callback',
            ],
          },
        }),
        idTokenSigningKeysId: 'idTokenKey123',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'testApp',
        tenantId: 'tenant123',
      };

      const user = {
        id: 'user123',
        active: true,
        data: '',
        expiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: '',
        email: 'test@example.com',
        groupId: 'mock-gp-id',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(user);

      await expect(
        service.postRegisterAUser(data, query, headers, res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a new user and redirect with code and state', async () => {
      const data = {
        username: 'testuser',
        loginId: 'test@example.com',
        password: 'Password@123',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state123',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain',
      };
      const query = {
        client_id: 'client123',
      } as OIDCAuthQuery;
      const headers = {};
      const res = {
        redirect: jest.fn(),
      } as any as Response;

      const application = {
        id: 'client123',
        accessTokenSigningKeysId: 'accessTokenKey123',
        active: true,
        data: JSON.stringify({
          oauthConfiguration: {
            authorizedRedirectURLs: [
              'http://example.com/callback',
              'http://localhost:3000/callback',
            ],
          },
        }),
        idTokenSigningKeysId: 'idTokenKey123',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'testApp',
        tenantId: 'tenant123',
      };

      const user = {
        id: 'user123',
        active: true,
        data: '',
        expiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: '',
        email: '',
        groupId: 'mock-gp-id',
      };

      const userRegistration = {
        id: 'userRegistration123',
        applicationsId: 'application123',
        authenticationToken: 'authToken123',
        password: 'hashedpassword',
        data: null,
        createdAt: new Date(),
        lastLoginInstant: null,
        updatedAt: new Date(),
        usersId: 'user123',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);
      jest
        .spyOn(utilService, 'hashPassword')
        .mockResolvedValueOnce('hashedpassword');
      jest.spyOn(prismaService.user, 'create').mockResolvedValueOnce(user);
      jest
        .spyOn(prismaService.userRegistration, 'create')
        .mockResolvedValueOnce(userRegistration);

      await service.postRegisterAUser(data, query, headers, res);

      expect(res.redirect).toHaveBeenCalledWith(
        `${data.redirect_uri}?code=${userRegistration.authenticationToken}&state=${data.state}`,
      );
    });
  });

  describe('returnToken', () => {
    it('should throw BadRequestException if content-type is not application/x-www-form-urlencoded', async () => {
      const data = {
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
        code: 'code123',
        loginId: '',
        password: '',
      };
      const headers = {
        'content-type': 'application/json',
      };

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no data is given', async () => {
      const data = null;
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if either of code, grant_type, or redirect_uri is missing', async () => {
      const data = {
        code: 'code123',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
        loginId: '',
        password: '',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if client id is not provided', async () => {
      const data = {
        code: 'code123',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no such application exists', async () => {
      const data = {
        code: 'code123',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(null);

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if client secret does not match', async () => {
      const data = {
        code: 'code123',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
        client_secret: 'invalidSecret',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      const applicationData = application.data;

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    const application = {
      id: 'client123',
      accessTokenSigningKeysId: 'accessTokenKey123',
      active: true,
      data: JSON.stringify({
        oauthConfiguration: {
          clientSecret: 'validSecret',
          enabledGrants: [
            'authorization_code',
            'password',
            'client_credentials',
          ],
        },
        jwtConfiguration: {
          refreshTokenTimeToLiveInMinutes: 60,
          timeToLiveInSeconds: 3600,
        },
      }),
      idTokenSigningKeysId: 'idTokenKey123',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'testApp',
      tenantId: 'tenant123',
    };

    // it('should throw BadRequestException if grant_type is not supported by the application', async () => {
    //   const data = {
    //     code: 'code123',
    //     grant_type: 'unsupported_grant_type',
    //     redirect_uri: 'http://localhost:3000/callback',
    //     client_id: 'client123',
    //     client_secret: 'validSecret',
    //   };
    //   const headers = {
    //     'content-type': 'application/x-www-form-urlencoded',
    //   };

    //   jest
    //     .spyOn(prismaService.application, 'findUnique')
    //     .mockResolvedValueOnce(application);

    //   await expect(service.returnToken(data, headers)).rejects.toThrow(
    //     BadRequestException,
    //   );
    // });

    it('should throw BadRequestException if authorization code does not exist', async () => {
      const data = {
        code: 'code123',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
        client_secret: 'validSecret',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest
        .spyOn(prismaService.userRegistration, 'findUnique')
        .mockResolvedValueOnce(null);

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if code challenge verification fails', async () => {
      const data = {
        code: 'code123',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
        client_secret: 'validSecret',
        code_verifier: 'invalidVerifier',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      const userRegistration = {
        id: 'registration123',
        applicationsId: 'client123',
        authenticationToken: 'authToken123',
        password: 'hashedPassword',
        data: JSON.stringify({
          code_challenge: 'challenge123',
          code_challenge_method: 'plain',
        }),
        createdAt: new Date(),
        lastLoginInstant: null,
        updatedAt: new Date(),
        usersId: 'user123',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest
        .spyOn(prismaService.userRegistration, 'findUnique')
        .mockResolvedValueOnce(userRegistration);
      // TODO
      // jest.spyOn(service, 'verify_code_challenge').mockResolvedValueOnce({
      //   success: false,
      //   message: 'Code challenge verification failed',
      // });

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if user does not exist', async () => {
      const data = {
        code: 'code123',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
        client_secret: 'validSecret',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      const userRegistration = {
        id: 'registration123',
        applicationsId: 'client123',
        authenticationToken: 'authToken123',
        password: 'hashedPassword',
        data: JSON.stringify({
          code_challenge: 'challenge123',
          code_challenge_method: 'plain',
        }),
        createdAt: new Date(),
        lastLoginInstant: null,
        updatedAt: new Date(),
        usersId: 'user123',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest
        .spyOn(prismaService.userRegistration, 'findUnique')
        .mockResolvedValueOnce(userRegistration);
      // TODO
      // jest.spyOn(service, 'verify_code_challenge').mockResolvedValueOnce({
      //   success: true,
      // });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if loginId or password is missing', async () => {
      const data = {
        grant_type: 'password',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
        client_secret: 'validSecret',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if user does not exist for password grant type', async () => {
      const data = {
        grant_type: 'password',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
        client_secret: 'validSecret',
        loginId: 'test@example.com',
        password: 'Password@123',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    const user = {
      id: 'user123',
      data: '',
      email: 'test@example.com',
      active: true,
      expiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'tenant123',
      groupId: 'mock-gp-id',
    };

    it('should throw UnauthorizedException if password verification fails', async () => {
      const data = {
        grant_type: 'password',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
        client_secret: 'validSecret',
        loginId: 'test@example.com',
        password: 'InvalidPassword',
        code: 'code123',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      const userRegistration = {
        id: 'registration123',
        applicationsId: 'client123',
        authenticationToken: 'authToken123',
        password: 'hashedPassword',
        data: JSON.stringify({
          code_challenge: 'challenge123',
          code_challenge_method: 'plain',
        }),
        createdAt: new Date(),
        lastLoginInstant: null,
        updatedAt: new Date(),
        usersId: 'user123',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(user);
      jest
        .spyOn(prismaService.userRegistration, 'findUnique')
        .mockResolvedValueOnce(userRegistration);
      jest.spyOn(utilService, 'comparePasswords').mockResolvedValueOnce(false);

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if openid scope is missing', async () => {
      const data = {
        code: 'code123',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
        client_secret: 'validSecret',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      const userRegistration = {
        id: 'registration123',
        applicationsId: 'client123',
        authenticationToken: 'authToken123',
        password: 'hashedPassword',
        data: JSON.stringify({
          code_challenge: 'challenge123',
          code_challenge_method: 'plain',
          scope: 'profile',
        }),
        createdAt: new Date(),
        lastLoginInstant: null,
        updatedAt: new Date(),
        usersId: 'user123',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest
        .spyOn(prismaService.userRegistration, 'findUnique')
        .mockResolvedValueOnce(userRegistration);

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no user is found', async () => {
      const data = {
        code: 'code123',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'client123',
        client_secret: 'validSecret',
      };
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      const userRegistration = {
        id: 'registration123',
        applicationsId: 'client123',
        authenticationToken: 'authToken123',
        password: 'hashedPassword',
        data: JSON.stringify({
          code_challenge: 'challenge123',
          code_challenge_method: 'plain',
          scope: 'openid',
        }),
        createdAt: new Date(),
        lastLoginInstant: null,
        updatedAt: new Date(),
        usersId: 'user123',
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(application);
      jest
        .spyOn(prismaService.userRegistration, 'findUnique')
        .mockResolvedValueOnce(userRegistration);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      await expect(service.returnToken(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    const mockSaveorUpdateToken = {
      id: 'refreshTokenId',
      applicationsId: 'client123',
      expiry: BigInt(3600),
      data: JSON.stringify({
        refreshToken: 'refreshToken',
      }),
      createdAt: new Date(),
      startInstant: BigInt(0),
      tenantId: 'tenant123',
      token: 'refreshToken',
      tokenHash: 'hashedToken',
      tokenText: 'refreshToken',
      usersId: 'user123',
    };

    // TODO

    // it('should return the tokens and user information for authorization code grant type', async () => {
    //   const data = {
    //     code: 'code123',
    //     grant_type: 'authorization_code',
    //     redirect_uri: 'http://localhost:3000/callback',
    //     client_id: 'client123',
    //     client_secret: 'validSecret',
    //     code_verifier: 'challenge123',
    //   };
    //   const headers = {
    //     'content-type': 'application/x-www-form-urlencoded',
    //   };

    //   const userRegistration = {
    //     id: 'registration123',
    //     applicationsId: 'client123',
    //     authenticationToken: 'authToken123',
    //     password: 'hashedPassword',
    //     data: JSON.stringify({
    //       code_challenge: 'challenge123',
    //       code_challenge_method: 'plain', // done to pass verify_code_challenge
    //       scope: 'openid profile',
    //     }),
    //     createdAt: new Date(),
    //     lastLoginInstant: null,
    //     updatedAt: new Date(),
    //     usersId: 'user123',
    //   };

    //   const mockUser = {
    //     ...user,
    //     id: 'user123',
    //     data: JSON.stringify({
    //       userData: {
    //         username: 'testuser',
    //         firstname: 'John',
    //         lastname: 'Doe',
    //       },
    //     }),
    //   };

    //   const roles = ['admin', 'user'];

    //   jest
    //     .spyOn(prismaService.application, 'findUnique')
    //     .mockResolvedValueOnce(application);
    //   jest
    //     .spyOn(prismaService.userRegistration, 'findUnique')
    //     .mockResolvedValueOnce(userRegistration);
    //   jest
    //     .spyOn(prismaService.user, 'findUnique')
    //     .mockResolvedValueOnce(mockUser);
    //   // jest.spyOn(service, 'verify_code_challenge').mockResolvedValueOnce({
    //   //   success: true,
    //   // });
    //   jest
    //     .spyOn(utilService, 'returnScopesForAGivenApplicationId')
    //     .mockResolvedValueOnce(['openid', 'profile']);
    //   jest.spyOn(utilService, 'createToken').mockResolvedValueOnce('idToken');
    //   jest
    //     .spyOn(utilService, 'createToken')
    //     .mockResolvedValueOnce('accessToken');
    //   jest
    //     .spyOn(utilService, 'createToken')
    //     .mockResolvedValueOnce('refreshToken');
    //   jest
    //     .spyOn(utilService, 'saveOrUpdateRefreshToken')
    //     .mockResolvedValueOnce(mockSaveorUpdateToken);
    //   jest
    //     .spyOn(utilService, 'returnRolesForAGivenUserIdAndApplicationId')
    //     .mockResolvedValueOnce(['role1', 'role2']);
    //   jest
    //     .spyOn(prismaService.applicationRole, 'findUnique')
    //     .mockResolvedValueOnce({
    //       id: 'role123',
    //       applicationsId: 'client123',
    //       name: 'role1',
    //       createdAt: new Date(),
    //       updatedAt: new Date(),
    //       isDefault: false,
    //       isSuperRole: false,
    //       description: 'role1',
    //     });

    //   const result = await service.returnToken(data, headers);

    //   expect(result).toEqual({
    //     id_token: 'idToken',
    //     access_token: 'accessToken',
    //     refresh_token: 'refreshToken',
    //     refreshTokenId: 'refreshTokenId',
    //     userId: 'user123',
    //     token_type: 'Bearer',
    //   });
    // });

    // TODO

    // it('should return the tokens and user information for password grant type', async () => {
    //   const data = {
    //     grant_type: 'password',
    //     redirect_uri: 'http://localhost:3000/callback',
    //     client_id: 'client123',
    //     client_secret: 'validSecret',
    //     loginId: 'test@example.com',
    //     password: 'Password@123',
    //     code: 'code123',
    //   };
    //   const headers = {
    //     'content-type': 'application/x-www-form-urlencoded',
    //   };

    //   const mockUser = {
    //     ...user,
    //     id: 'user123',
    //     data: JSON.stringify({
    //       userData: {
    //         username: 'testuser',
    //         firstname: 'John',
    //         lastname: 'Doe',
    //       },
    //     }),
    //   };

    //   const userRegistration = {
    //     id: 'registration123',
    //     applicationsId: 'client123',
    //     authenticationToken: 'authToken123',
    //     password: 'hashedPassword',
    //     data: JSON.stringify({
    //       code_challenge: 'challenge123',
    //       code_challenge_method: 'plain',
    //       scope: 'openid profile',
    //     }),
    //     createdAt: new Date(),
    //     lastLoginInstant: null,
    //     updatedAt: new Date(),
    //     usersId: 'user123',
    //   };

    //   jest
    //     .spyOn(prismaService.application, 'findUnique')
    //     .mockResolvedValueOnce(application);
    //   jest
    //     .spyOn(prismaService.user, 'findUnique')
    //     .mockResolvedValueOnce(mockUser);
    //   jest
    //     .spyOn(prismaService.userRegistration, 'findUnique')
    //     .mockResolvedValueOnce(userRegistration);
    //   jest
    //     .spyOn(utilService, 'returnScopesForAGivenApplicationId')
    //     .mockResolvedValueOnce(['openid', 'profile']);
    //   jest.spyOn(utilService, 'createToken').mockResolvedValueOnce('idToken');
    //   jest
    //     .spyOn(utilService, 'createToken')
    //     .mockResolvedValueOnce('accessToken');
    //   jest
    //     .spyOn(utilService, 'createToken')
    //     .mockResolvedValueOnce('refreshToken');
    //   jest
    //     .spyOn(utilService, 'saveOrUpdateRefreshToken')
    //     .mockResolvedValueOnce(mockSaveorUpdateToken);
    //   jest
    //     .spyOn(utilService, 'returnRolesForAGivenUserIdAndApplicationId')
    //     .mockResolvedValueOnce(['role1', 'role2']);
    //   jest
    //     .spyOn(prismaService.applicationRole, 'findUnique')
    //     .mockResolvedValueOnce({
    //       id: 'role123',
    //       applicationsId: 'client123',
    //       name: 'role1',
    //       createdAt: new Date(),
    //       updatedAt: new Date(),
    //       isDefault: false,
    //       isSuperRole: false,
    //       description: 'role1',
    //     });

    //   const result = await service.returnToken(data, headers);

    //   expect(result).toEqual({
    //     id_token: 'idToken',
    //     access_token: 'accessToken',
    //     refresh_token: 'refreshToken',
    //     refreshTokenId: 'refreshTokenId',
    //     userId: 'user123',
    //     token_type: 'Bearer',
    //   });
    // });
  });

  describe('returnAllPublicJwks', () => {
    it('should return all public JWKS', async () => {
      const mockKeys = [
        {
          id: 'key123',
          algorithm: 'RSA',
          certificate: null,
          expiry: null,
          createdAt: new Date(),
          issuer: null,
          kid: 'kid123',
          updatedAt: new Date(),
          name: 'key1',
          privateKey: null,
          publicKey: 'publicKey123',
          secret: null,
          type: 'public',
          data: JSON.stringify({ key: 'value' }),
        },
      ];
      jest.spyOn(prismaService.key, 'findMany').mockResolvedValue(mockKeys);

      const result = await service.returnAllPublicJwks();

      expect(result).toEqual({
        keys: [{ key: 'value' }],
      });
    });
  });

  describe('returnAPublicJwks', () => {
    it('should throw BadRequestException if tenant does not exist', async () => {
      const tenantId = 'testTenantId';
      jest.spyOn(prismaService.tenant, 'findUnique').mockResolvedValue(null);

      await expect(service.returnAPublicJwks(tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return public JWKS for a given tenant', async () => {
      const tenantId = 'testTenantId';
      const mockTenant = {
        id: 'testTenantId',
        accessTokenSigningKeysId: 'accessKey',
        data: null,
        idTokenSigningKeysId: 'idKey',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'testTenant',
      };
      const mockAccessTokenSigningKey = {
        data: JSON.stringify({ key: 'accessKey' }),
      };
      const mockIdTokenSigningKey = { data: JSON.stringify({ key: 'idKey' }) };

      jest
        .spyOn(prismaService.tenant, 'findUnique')
        .mockResolvedValue(mockTenant);
      jest.spyOn(prismaService.key, 'findUnique').mockImplementation((args) => {
        if (args.where.id === 'accessKey')
          return Promise.resolve({
            data: JSON.stringify(mockAccessTokenSigningKey),
          }) as any;
        if (args.where.id === 'idKey')
          return Promise.resolve({
            data: JSON.stringify(mockIdTokenSigningKey),
          }) as any;
        return null;
      });

      const result = await service.returnAPublicJwks(tenantId);

      expect(result).toEqual({
        keys: [{ key: 'accessKey' }, { key: 'idKey' }],
      });
    });
  });

  describe('introspect', () => {
    it('should throw BadRequestException if content-type is not application/x-www-form-urlencoded', async () => {
      const data = {} as any;
      const headers = {
        'content-type': 'application/json',
      };

      await expect(service.introspect(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if client id is not provided', async () => {
      const data = { token: 'testToken' } as any;
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: 'Basic ',
      };

      await expect(service.introspect(data, headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return token validity', async () => {
      const data = { token: 'testToken' } as any;
      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: 'Basic dGVzdENsaWVudElkOnRlc3RTZWNyZXQ=',
      };
      const mockApplication = {
        id: 'testClientId',
        accessTokenSigningKeysId: 'accessKey',
        active: true,
        data: JSON.stringify({
          oauthConfiguration: { clientSecret: 'testSecret' },
        }),
        idTokenSigningKeysId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'testApplication',
        tenantId: 'testTenantId',
      };
      const mockSigningKey = {
        id: 'testSigningKeyId',
        algorithm: null,
        certificate: null,
        expiry: null,
        createdAt: new Date(),
        issuer: null,
        kid: 'testKid',
        updatedAt: new Date(),
        name: 'testSigningKey',
        privateKey: null,
        publicKey: 'testPublicKey',
        secret: null,
        type: 'public',
        data: JSON.stringify({ key: 'testValue' }),
      };

      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValue(mockApplication);
      jest
        .spyOn(prismaService.key, 'findUnique')
        .mockResolvedValue(mockSigningKey);
      jest
        .spyOn(utilService, 'checkValidityOfToken')
        .mockResolvedValue({ active: true });

      const result = await service.introspect(data, headers);

      expect(result).toEqual({ active: true });
    });
  });

  describe('returnClaimsOfEndUser', () => {
    it('should throw BadRequestException if authorization header is not provided', async () => {
      const headers = {};

      await expect(service.returnClaimsOfEndUser(headers)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return user claims', async () => {
      const token = 'Bearer testToken';
      const headers = { authorization: token };
      const mockPayload = {
        sub: 'userId',
        scope: 'openid profile email',
        applicationId: 'appId',
      };
      const mockUser = {
        id: 'userId',
        active: true,
        data: JSON.stringify({
          userData: {
            username: 'testuser',
            firstname: 'Test',
            lastname: 'User',
          },
        }),
        expiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: 'tenant123',
        email: 'test@example.com',
        groupId: 'mock-gp-id',
      };
      const mockRoles = ['role1', 'role2'];

      const mockApplicationRole = {
        id: 'roleId',
        applicationsId: 'appId',
        description: null,
        createdAt: new Date(),
        isDefault: false,
        isSuperRole: false,
        updatedAt: new Date(),
        name: 'role1',
      };

      jest.spyOn(jwt, 'decode').mockReturnValue(mockPayload);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest
        .spyOn(utilService, 'returnRolesForAGivenUserIdAndApplicationId')
        .mockResolvedValue(['roleId1', 'roleId2']);
      jest
        .spyOn(prismaService.applicationRole, 'findUnique')
        .mockImplementation((query) => {
          if (query.where.id === 'roleId1') {
            return Promise.resolve(mockApplicationRole) as any;
          }
          if (query.where.id === 'roleId2') {
            return Promise.resolve({
              ...mockApplicationRole,
              name: 'role2',
            }) as any;
          }
          return null;
        });

      const result = await service.returnClaimsOfEndUser(headers);

      expect(result).toEqual({
        applicationId: 'appId',
        email: 'test@example.com',
        sub: 'userId',
        roles: mockRoles,
        firstname: 'Test',
        lastname: 'User',
        username: 'testuser',
      });
    });
  });
});
