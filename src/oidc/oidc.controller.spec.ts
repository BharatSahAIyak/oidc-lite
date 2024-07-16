import { Test, TestingModule } from '@nestjs/testing';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { QueryApplicationIdGuard } from '../guards/queryApplicationId.guard';
import { DataApplicationIdGuard } from '../guards/dataApplicationId.guard';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { UtilsService } from '../utils/utils.service';

describe('OidcController', () => {
  let oidcController: OidcController;
  let oidcService: OidcService;

  const mockOidcService = {
    authorize: jest.fn(),
    postAuthorize: jest.fn(),
    registerAUser: jest.fn(),
    postRegisterAUser: jest.fn(),
    returnToken: jest.fn(),
    returnAllPublicJwks: jest.fn(),
    returnAPublicJwks: jest.fn(),
    introspect: jest.fn(),
    returnClaimsOfEndUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OidcController],
      providers: [
        {
          provide: OidcService,
          useValue: mockOidcService,
        },
        {
          provide: QueryApplicationIdGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: DataApplicationIdGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        PrismaService,
        UtilsService,
      ],
    }).compile();

    oidcController = module.get<OidcController>(OidcController);
    oidcService = module.get<OidcService>(OidcService);
  });

  it('should be defined', () => {
    expect(oidcController).toBeDefined();
  });

  const mockOIDCAuthQuery = {
    client_id: 'client_id',
    redirect_uri: 'redirect_uri',
    response_type: 'response_type',
    tenantId: 'tenantId',
    scope: 'scope',
    state: 'state',
    code_challenge: 'code_challenge',
    code_challenge_method: 'code_challenge_method',
  };

  describe('authorize', () => {
    it('should call oidcService.authorize', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const query = mockOIDCAuthQuery;
      const headers = {};

      await oidcController.authorize(query, req, res, headers);

      expect(oidcService.authorize).toHaveBeenCalledWith(
        req,
        res,
        query,
        headers,
      );
    });
  });

  const mockLoginDto = {
    loginId: 'loginId',
    password: 'password',
    applicationId: 'applicationId',
    redirect_uri: 'redirect_uri',
    scope: 'scope',
    state: 'state',
    code_challenge: 'code_challenge',
    code_challenge_method: 'code_challenge_method',
  };

  describe('postAuthorize', () => {
    it('should call oidcService.postAuthorize', async () => {
      const data = mockLoginDto;
      const query = mockOIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      await oidcController.postAuthorize(data, query, headers, res);

      expect(oidcService.postAuthorize).toHaveBeenCalledWith(
        data,
        query,
        headers,
        res,
      );
    });
  });

  describe('registerAUser', () => {
    it('should call oidcService.registerAUser', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const query = mockOIDCAuthQuery;
      const headers = {};

      await oidcController.registerAUser(query, req, res, headers);

      expect(oidcService.registerAUser).toHaveBeenCalledWith(
        req,
        res,
        query,
        headers,
      );
    });
  });

  const mockRegisterDto = {
    firstname: 'firstname',
    lastname: 'lastname',
    username: 'username',
    loginId: 'loginId',
    password: 'password',
    redirect_uri: 'redirect_uri',
    state: 'state',
    code_challenge: 'code_challenge',
    code_challenge_method: 'code_challenge_method',
    response_type: 'response_type',
    scope: 'scope',
  };

  describe('postRegisterAUser', () => {
    it('should call oidcService.postRegisterAUser', async () => {
      const data = mockRegisterDto;
      const query = mockOIDCAuthQuery;
      const headers = {};
      const res = {} as Response;

      await oidcController.postRegisterAUser(data, query, headers, res);

      expect(oidcService.postRegisterAUser).toHaveBeenCalledWith(
        data,
        query,
        headers,
        res,
      );
    });
  });

  const mockTokenDto = {
    client_id: 'client_id',
    client_secret: 'client_secret',
    code: 'code',
    loginId: 'loginId',
    password: 'password',
    code_verifier: 'code_verifier',
    grant_type: 'grant_type',
    redirect_uri: 'redirect_uri',
  };

  describe('returnToken', () => {
    it('should call oidcService.returnToken', async () => {
      const data = mockTokenDto;
      const headers = {};

      await oidcController.returnToken(headers, data);

      expect(oidcService.returnToken).toHaveBeenCalledWith(data, headers);
    });
  });

  describe('returnAllPublicJwks', () => {
    it('should call oidcService.returnAllPublicJwks', async () => {
      await oidcController.returnAllPublicJwks();

      expect(oidcService.returnAllPublicJwks).toHaveBeenCalled();
    });
  });

  describe('returnAPublicJwks', () => {
    it('should call oidcService.returnAPublicJwks', async () => {
      const tenantId = 'tenantId';

      await oidcController.returnAPublicJwks(tenantId);

      expect(oidcService.returnAPublicJwks).toHaveBeenCalledWith(tenantId);
    });
  });

  const mockIntrospectDto = {
    client_id: 'client_id',
    client_secret: 'client_secret',
    token: 'token',
  };

  describe('introspect', () => {
    it('should call oidcService.introspect', async () => {
      const data = mockIntrospectDto;
      const headers = {};

      await oidcController.introspect(data, headers);

      expect(oidcService.introspect).toHaveBeenCalledWith(data, headers);
    });
  });

  describe('returnClaimsOfEndUser', () => {
    it('should call oidcService.returnClaimsOfEndUser', async () => {
      const headers = {};

      await oidcController.returnClaimsOfEndUser(headers);

      expect(oidcService.returnClaimsOfEndUser).toHaveBeenCalledWith(headers);
    });
  });

  describe('returnClaimsOfEndUserGet', () => {
    it('should call oidcService.returnClaimsOfEndUserGet', async () => {
      const headers = {};

      await oidcController.returnClaimsOfEndUserGet(headers);

      expect(oidcService.returnClaimsOfEndUser).toHaveBeenCalledWith(headers);
    });
  });

  describe('returnConfigs', () => {
    it('should return the OIDC configuration', async () => {
      const configs = await oidcController.returnConfigs();

      expect(configs).toEqual({
        issuer: `${process.env.ISSUER_URL}`,
        authorization_endpoint: `${process.env.FULL_URL}/oidc/auth`,
        token_endpoint: `${process.env.FULL_URL}/oidc/token`,
        userinfo_endpoint: `${process.env.FULL_URL}/oidc/userinfo`,
        jwks_uri: `${process.env.FULL_URL}/oidc/.well-known/jwks.json`,
        scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'password', 'refresh_token'],
        id_token_signing_alg_values_supported: [
          'RS256',
          'RS384',
          'RS512',
          'ES256',
          'ES384',
          'ES512',
        ],
        code_challenge_methods_supported: ['plain', 'S256'],
      });
    });
  });
});
