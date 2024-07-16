import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { OIDCAuthQuery } from './dto/oidc.auth.dto';
import { LoginDto, RegisterDto } from '../login/login.dto';
import { randomUUID } from 'crypto';
import {
  AccessTokenDto,
  IdTokenDto,
  IntrospectDto,
  RefreshTokenDto,
  TokenDto,
} from './dto/oidc.token.dto';
import * as jwt from 'jsonwebtoken';
import {
  ApplicationDataDto,
  ApplicationDto,
} from '../application/application.dto';
import {
  UserData,
  UserDataDto,
  UserDto,
  UserRegistrationData,
} from 'src/user/user.dto';
import { UtilsService } from '../utils/utils.service';
import { ResponseDto } from '../dto/response.dto';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class OidcService {
  private readonly logger: Logger;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly utilService: UtilsService,
    private readonly otpService: OtpService,
  ) {
    this.logger = new Logger(OidcService.name);
  }

  async authorize(
    req: Request,
    res: Response,
    query: OIDCAuthQuery,
    headers: object,
  ) {
    const {
      client_id,
      tenantId,
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method,
    } = query;
    if (!client_id) {
      throw new BadRequestException({
        success: false,
        message: 'No client/application id given',
      });
    }
    if (!redirect_uri) {
      throw new BadRequestException({
        success: false,
        message: 'No redirect uri given',
      });
    }
    if (!scope) {
      // verify scopes in application, give only those scopes that are registered for the application
      throw new BadRequestException({
        success: false,
        message: 'Scopes not given',
      });
    }
    if (!response_type) {
      throw new BadRequestException({
        success: false,
        message: 'No response type given',
      });
    }
    res.render('login', {
      host: `${process.env.FULL_URL}`,
      applicationId: client_id,
      redirect_uri,
      state,
      scope,
      response_type,
      code_challenge,
      code_challenge_method,
    });
  }

  async postAuthorize(
    data: LoginDto,
    query: OIDCAuthQuery,
    headers: object,
    res: Response,
  ) {
    if (!data || !data.loginId || !data.password) {
      throw new BadRequestException({
        success: false,
        message: 'No data given',
      });
    }
    const {
      loginId,
      password,
      state,
      scope,
      code_challenge,
      code_challenge_method,
      redirect_uri,
    } = data;
    const { client_id } = query;
    const application = await this.prismaService.application.findUnique({
      where: { id: client_id },
    });
    if (!application) {
      throw new BadRequestException({
        success: false,
        message: 'No such application exists',
      });
    }
    const applicationData: ApplicationDataDto = JSON.parse(application.data);
    const redirectUrls =
      applicationData.oauthConfiguration.authorizedRedirectURLs;
    if (!redirectUrls.includes(redirect_uri)) {
      throw new UnauthorizedException({
        success: false,
        message:
          'The given redirect_uri doesnt match with the registered redirect uris',
      });
    }
    const user = await this.prismaService.user.findUnique({
      where: { email: loginId },
    });
    if (!user) {
      throw new BadRequestException({
        success: false,
        message: 'No such user exists',
      });
    }
    const authenticationToken = randomUUID();
    const userData: UserData = JSON.parse(user.data);
    if (
      (await this.utilService.comparePasswords(
        password,
        userData.userData?.password,
      )) === false
    ) {
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid user credentials',
      });
    }
    try {
      const alreadyRegisterd =
        await this.prismaService.userRegistration.findUnique({
          where: {
            user_registrations_uk_1: {
              usersId: user.id,
              applicationsId: application.id,
            },
          },
        });
      if (!alreadyRegisterd) {
        const userRegistration =
          await this.prismaService.userRegistration.create({
            data: {
              applicationsId: application.id,
              authenticationToken,
              password: userData.userData.password,
              usersId: user.id,
              data: JSON.stringify({
                code_challenge: code_challenge === '' ? null : code_challenge,
                code_challenge_method:
                  code_challenge_method === '' ? null : code_challenge_method,
                scope,
              }),
            },
          });
        this.logger.log('A user authenticated', user);
        return res.redirect(
          `${redirect_uri}?code=${userRegistration.authenticationToken}&state=${state}`,
        );
      }
      const updateRegistration =
        await this.prismaService.userRegistration.update({
          where: { id: alreadyRegisterd.id },
          data: {
            authenticationToken,
            data: JSON.stringify({
              code_challenge: code_challenge === '' ? null : code_challenge,
              code_challenge_method:
                code_challenge_method === '' ? null : code_challenge_method,
              scope,
            }),
          },
        });

      this.logger.log('A user authenticated', user);
      res.redirect(
        `${redirect_uri}?code=${updateRegistration.authenticationToken}&state=${state}`,
      );
    } catch (error) {
      this.logger.log('Error from postAuthorize', error);
      throw new InternalServerErrorException({
        success: false,
        message: 'Error occured while registering',
      });
    }
  }

  async passwordless_otp(
    req: Request,
    res: Response,
    query: OIDCAuthQuery,
    headers: object,
  ) {
    const {
      client_id,
      tenantId,
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method,
    } = query;
    if (!client_id) {
      throw new BadRequestException({
        success: false,
        message: 'No client/application id given',
      });
    }
    if (!redirect_uri) {
      throw new BadRequestException({
        success: false,
        message: 'No redirect uri given',
      });
    }
    if (!scope) {
      throw new BadRequestException({
        success: false,
        message: 'Scopes not given',
      });
    }
    if (!response_type) {
      throw new BadRequestException({
        success: false,
        message: 'No response type given',
      });
    }
    res.render('passwordless-otp', {
      host: `${process.env.FULL_URL}`,
      applicationId: client_id,
      redirect_uri,
      state,
      scope,
      response_type,
      code_challenge,
      code_challenge_method,
    });
  }

  async postPasswordless_otp(
    data: LoginDto & { otp: string },
    query: OIDCAuthQuery,
    headers: object,
    res: Response,
  ) {
    if (!data || !data.loginId) {
      throw new BadRequestException({
        success: false,
        message: 'No data given',
      });
    }
    const {
      loginId,
      state,
      scope,
      code_challenge,
      code_challenge_method,
      redirect_uri,
    } = data;
    const { client_id } = query;
    const application = await this.prismaService.application.findUnique({
      where: { id: client_id },
    });
    if (!application) {
      throw new BadRequestException({
        success: false,
        message: 'No such application exists',
      });
    }
    const applicationData: ApplicationDataDto = JSON.parse(application.data);
    const redirectUrls =
      applicationData.oauthConfiguration.authorizedRedirectURLs;
    if (!redirectUrls.includes(redirect_uri)) {
      throw new UnauthorizedException({
        success: false,
        message:
          'The given redirect_uri doesnt match with the registered redirect uris',
      });
    }
    const user = await this.prismaService.user.findUnique({
      where: { email: loginId },
    });
    if (!user) {
      throw new BadRequestException({
        success: false,
        message: 'No such user exists',
      });
    }
    const authenticationToken = randomUUID();
    const userData: UserData = JSON.parse(user.data);
    const valid = await this.otpService.validateOtp(data.otp, loginId);
    if (!valid.success) {
      throw new UnauthorizedException({
        success: valid.success,
        message: valid.message,
      });
    }
    try {
      const alreadyRegisterd =
        await this.prismaService.userRegistration.findUnique({
          where: {
            user_registrations_uk_1: {
              usersId: user.id,
              applicationsId: application.id,
            },
          },
        });
      if (!alreadyRegisterd) {
        const userRegistration =
          await this.prismaService.userRegistration.create({
            data: {
              applicationsId: application.id,
              authenticationToken,
              password: userData.userData.password,
              usersId: user.id,
              data: JSON.stringify({
                code_challenge: code_challenge === '' ? null : code_challenge,
                code_challenge_method:
                  code_challenge_method === '' ? null : code_challenge_method,
                scope,
              }),
            },
          });
        this.logger.log('A user authenticated', user);
        return res.redirect(
          `${redirect_uri}?code=${userRegistration.authenticationToken}&state=${state}`,
        );
      }
      const updateRegistration =
        await this.prismaService.userRegistration.update({
          where: { id: alreadyRegisterd.id },
          data: {
            authenticationToken,
            data: JSON.stringify({
              code_challenge: code_challenge === '' ? null : code_challenge,
              code_challenge_method:
                code_challenge_method === '' ? null : code_challenge_method,
              scope,
            }),
          },
        });

      this.logger.log('A user authenticated', user);
      res.redirect(
        `${redirect_uri}?code=${updateRegistration.authenticationToken}&state=${state}`,
      );
    } catch (error) {
      this.logger.log('Error from postAuthorize', error);
      throw new InternalServerErrorException({
        success: false,
        message: 'Error occured while registering',
      });
    }
  }

  async registerAUser(
    req: Request,
    res: Response,
    query: OIDCAuthQuery,
    headers: object,
  ) {
    const {
      client_id,
      tenantId,
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method,
    } = query;
    if (!client_id) {
      throw new BadRequestException({
        success: false,
        message: 'No client/application id given',
      });
    }
    if (!redirect_uri) {
      throw new BadRequestException({
        success: false,
        message: 'No redirect uri given',
      });
    }
    if (!scope) {
      // verify scopes in application, give only those scopes that are registered for the application
      throw new BadRequestException({
        success: false,
        message: 'Scopes not given',
      });
    }
    if (!response_type) {
      throw new BadRequestException({
        success: false,
        message: 'No response type given',
      });
    }
    res.render('signup', {
      host: `${process.env.FULL_URL}`,
      applicationId: client_id,
      tenantId,
      redirect_uri,
      state,
      scope,
      response_type,
      code_challenge,
      code_challenge_method,
    });
  }

  async postRegisterAUser(
    data: RegisterDto,
    query: OIDCAuthQuery,
    headers: object,
    res: Response,
  ) {
    if (!data || !data.loginId || !data.password) {
      throw new BadRequestException({
        success: false,
        message: 'No data given',
      });
    }
    const {
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      password,
      loginId,
      firstname,
      lastname,
      username,
    } = data;
    const { client_id } = query;
    if (!client_id) {
      throw new BadRequestException({
        success: false,
        message: 'No application id given',
      });
    }
    const application = await this.prismaService.application.findUnique({
      where: { id: client_id },
    });
    if (!application) {
      throw new BadRequestException({
        success: false,
        message: 'No such application exists',
      });
    }
    const applicationData: ApplicationDataDto = JSON.parse(application.data);
    const redirectUrls =
      applicationData.oauthConfiguration.authorizedRedirectURLs;
    if (!redirectUrls.includes(redirect_uri)) {
      throw new UnauthorizedException({
        success: false,
        message:
          'The given redirect_uri doesnt match with the registered redirect uris',
      });
    }
    const oldUser = await this.prismaService.user.findUnique({
      where: { email: loginId },
    });
    if (oldUser) {
      throw new BadRequestException({
        success: false,
        message: 'such user already exists',
      });
    }
    const authenticationToken = randomUUID();
    const userData: UserDataDto = {
      username,
      firstname,
      lastname,
      password: await this.utilService.hashPassword(password),
    };
    const userInfo = { userData };
    const user = await this.prismaService.user.create({
      data: {
        email: loginId,
        tenantId: application.tenantId,
        active: true,
        data: JSON.stringify(userInfo),
      },
    });
    const userRegistration = await this.prismaService.userRegistration.create({
      data: {
        applicationsId: application.id,
        authenticationToken,
        password: userData.password,
        usersId: user.id,
        data: JSON.stringify({
          code_challenge: code_challenge === '' ? null : code_challenge,
          code_challenge_method:
            code_challenge_method === '' ? null : code_challenge_method,
          scope,
        }),
      },
    });
    this.logger.log('A user authenticated', user);
    return res.redirect(
      `${redirect_uri}?code=${userRegistration.authenticationToken}&state=${state}`,
    );
  }

  async returnToken(data: TokenDto, headers: object) {
    if (headers['content-type'] !== 'application/x-www-form-urlencoded') {
      throw new BadRequestException({
        success: false,
        message: 'content-type should be application/x-www-form-urlencoded',
      });
    }
    const authorization = headers['authorization']?.split('Basic ')[1];
    let client_id: string | null = null,
      client_secret: string | null = null;
    if (authorization) {
      const credentials = Buffer.from(authorization, 'base64').toString(
        'utf-8',
      );
      [client_id, client_secret] = credentials.split(':');
    }
    if (!data) {
      throw new BadRequestException({
        success: false,
        message: 'No data given',
      });
    }
    const { code, grant_type, redirect_uri, loginId, password, refresh_token } =
      data;
    if (!code || !grant_type || !redirect_uri) {
      throw new BadRequestException({
        success: false,
        message: 'either of code,grant_type,redirect_uri missing',
      });
    }
    const clientId = client_id ? client_id : data?.client_id;
    const clientSecret = client_secret ? client_secret : data?.client_secret;
    if (!clientId) {
      throw new BadRequestException({
        success: false,
        message:
          'Client id should be provided either via authorization header or data.client_id',
      });
    }
    const application = await this.prismaService.application.findUnique({
      where: { id: clientId },
    });
    if (!application) {
      throw new BadRequestException({
        success: false,
        message: 'No such application exists',
      });
    }
    const applicationData: ApplicationDataDto = JSON.parse(application.data);
    const actualSecret = applicationData?.oauthConfiguration.clientSecret;
    if (clientSecret !== actualSecret) {
      throw new BadRequestException({
        success: false,
        message: 'No such client with given id and secret exists',
      });
    }
    const refreshTokenSeconds =
      applicationData.jwtConfiguration.refreshTokenTimeToLiveInMinutes * 60;
    const accessTokenSeconds =
      applicationData.jwtConfiguration.timeToLiveInSeconds;
    let user: UserDto = null;
    let scope: string | null = null;
    if (grant_type === 'authorization_code') {
      if (
        !applicationData.oauthConfiguration.enabledGrants.includes(
          'authorization_code',
        )
      ) {
        throw new BadRequestException({
          success: false,
          message:
            'Your application does not support grant_type authorization_code',
        });
      }
      if (!code) {
        throw new BadRequestException({
          success: false,
          message: 'No authorizationToken passed as code',
        });
      }
      const userRegistration =
        await this.prismaService.userRegistration.findUnique({
          where: { authenticationToken: code },
        });
      if (!userRegistration) {
        throw new BadRequestException({
          success: false,
          message: 'No such authorization code exists',
        });
      }

      const userRegistrationData: UserRegistrationData = JSON.parse(
        userRegistration.data,
      );
      const verify = await this.verify_code_challenge(
        userRegistrationData.code_challenge,
        userRegistrationData.code_challenge_method,
        data.code_verifier,
      );
      if (!verify.success) {
        throw new BadRequestException({
          success: verify.success,
          message: verify.message,
        });
      }
      const foundUser = await this.prismaService.user.findUnique({
        where: { id: userRegistration.usersId },
      });
      scope = scope === null ? userRegistrationData.scope : null;
      user = user === null ? foundUser : null;
    } else if (grant_type === 'password') {
      if (
        !applicationData.oauthConfiguration.enabledGrants.includes('password')
      ) {
        throw new BadRequestException({
          success: false,
          message: 'Your application does not support grant_type password',
        });
      }
      if (!loginId || !password) {
        throw new BadRequestException({
          success: false,
          message: 'No loginId or password given',
        });
      }
      const foundUser = await this.prismaService.user.findUnique({
        where: { email: loginId },
      });
      if (!foundUser) {
        throw new BadRequestException({
          success: false,
          message: 'No such user exists',
        });
      }
      const foundUserRegistration =
        await this.prismaService.userRegistration.findUnique({
          where: {
            user_registrations_uk_1: {
              applicationsId: application.id,
              usersId: foundUser.id,
            },
          },
        });
      if (!foundUserRegistration) {
        throw new BadRequestException({
          success: false,
          message: 'Not registered with the application',
        });
      }
      const foundUserRegistrationData: UserRegistrationData = JSON.parse(
        foundUserRegistration.data,
      );
      if (
        (await this.utilService.comparePasswords(
          password,
          foundUserRegistration.password,
        )) === false
      ) {
        throw new UnauthorizedException({
          success: false,
          message: 'You are not authorized',
        });
      }
      scope = scope === null ? foundUserRegistrationData.scope : null;
      user = user === null ? foundUser : null;
    } else if (grant_type === 'client_credentials') {
      if (
        !applicationData.oauthConfiguration.enabledGrants.includes(
          'client_credentials',
        )
      ) {
        throw new BadRequestException({
          success: false,
          message:
            'Your application does not support grant_type client_credentials',
        });
      }
      // implementation remaining, this is used by application to retrieve its own access rights
      throw new NotImplementedException({
        success: false,
        message: 'you reached a part of server that is not yet implemented',
      });
    } else if (grant_type === 'refresh_token') {
      if (
        !applicationData.oauthConfiguration.enabledGrants.includes(
          'refresh_token',
        )
      ) {
        throw new BadRequestException({
          success: false,
          message: 'refresh_token grant type not supported by your application',
        });
      }
      return await this.returnAccessTokenForRefreshToken(
        application,
        refresh_token,
      );
    }
    const scopes: string[] | null = scope?.split(' ');
    const validScopes =
      await this.utilService.returnScopesForAGivenApplicationId(application.id);
    if (!scopes.includes('openid')) {
      throw new BadRequestException({
        success: false,
        message: 'openid scope required',
      });
    }
    if (!user) {
      throw new BadRequestException({
        success: false,
        message: 'No user found!',
      });
    }

    const profileAllowed =
      validScopes.includes('profile') && scopes.includes('profile');
    const emailAllowed =
      validScopes.includes('email') && scopes.includes('email');
    const offline_accessAllowed =
      validScopes.includes('offline_access') &&
      scopes.includes('offline_access');
    const now = Math.floor(Date.now() / 1000);
    const userData: UserData = JSON.parse(user.data);
    const { username, firstname, lastname } = userData.userData;
    const idTokenPayload = {
      policy: ['consoleAdmin'],
      active: true,
      iat: now,
      exp: now + refreshTokenSeconds,
      iss: process.env.ISSUER_URL,
      aud: clientId,
      sub: user.id,
      userData: profileAllowed
        ? { username: username, firstname: firstname, lastname: lastname }
        : null,
      email: emailAllowed ? user.email : null,
    };
    const idToken = await this.utilService.createToken(
      idTokenPayload,
      application.id,
      application.tenantId,
      'id',
    );
    const refreshTokenPayload: RefreshTokenDto = {
      active: true,
      iat: now,
      applicationId: application.id,
      iss: process.env.ISSUER_URL,
      exp: now + refreshTokenSeconds,
      sub: user.id,
    };
    const refreshToken = await this.utilService.createToken(
      refreshTokenPayload,
      application.id,
      application.tenantId,
      'refresh',
    );

    const newRefreshToken = await this.utilService.saveOrUpdateRefreshToken(
      application.id,
      refreshToken,
      user.id,
      application.tenantId,
      '',
      now,
      now + refreshTokenSeconds,
    );

    const rolesIds =
      await this.utilService.returnRolesForAGivenUserIdAndApplicationId(
        user.id,
        application.id,
      );
    const roles = await Promise.all(
      rolesIds.map(async (roleId) => {
        const role = await this.prismaService.applicationRole.findUnique({
          where: { id: roleId },
        });
        return role.name;
      }),
    );
    const accessTokenPayload: AccessTokenDto = {
      active: true,
      roles,
      iat: now,
      exp: now + accessTokenSeconds,
      iss: process.env.ISSUER_URL,
      sub: user.id,
      aud: clientId,
      applicationId: application.id,
      scope: `openid ${profileAllowed ? 'profile' : ''} ${emailAllowed ? 'email' : ''} ${offline_accessAllowed ? 'offline_access' : ''}`,
    };
    const accessToken = await this.utilService.createToken(
      accessTokenPayload,
      application.id,
      application.tenantId,
      'access',
    );
    return {
      id_token: idToken,
      access_token: accessToken,
      refresh_token: offline_accessAllowed ? refreshToken : null,
      refreshTokenId: offline_accessAllowed ? newRefreshToken.id : null,
      userId: user.id,
      token_type: 'Bearer',
    };
  }

  private async returnAccessTokenForRefreshToken(
    application: ApplicationDto,
    refresh_token: string,
  ) {
    const applicationData: ApplicationDataDto = JSON.parse(application.data);
    const accessTokenSigningKeyId =
      applicationData.jwtConfiguration.accessTokenSigningKeysID;
    const accessTokenSigningKey = await this.prismaService.key.findUnique({
      where: { id: accessTokenSigningKeyId },
    });
    const refreshToken = await this.utilService.checkValidityOfToken(
      refresh_token,
      accessTokenSigningKey.publicKey,
      'refresh',
    );
    if (refreshToken.active === false) {
      return {
        active: false,
      };
    }
    const userId = (refreshToken as jwt.JwtPayload).sub; // sub has userid
    const userRegistration =
      await this.prismaService.userRegistration.findUnique({
        where: {
          user_registrations_uk_1: {
            applicationsId: application.id,
            usersId: userId,
          },
        },
      });
    if (!userRegistration) {
      return {
        active: false,
      };
    }
    const userRegistrationData: UserRegistrationData = JSON.parse(
      userRegistration.data,
    );
    const now = Math.floor(Date.now() / 1000);
    const accessTokenSeconds =
      applicationData.jwtConfiguration.timeToLiveInSeconds;
    const rolesIds =
      await this.utilService.returnRolesForAGivenUserIdAndApplicationId(
        userId,
        application.id,
      );
    const roles = await Promise.all(
      rolesIds.map(async (roleId) => {
        const role = await this.prismaService.applicationRole.findUnique({
          where: { id: roleId },
        });
        return role.name;
      }),
    );
    const accessTokenPayload: AccessTokenDto = {
      active: true,
      roles,
      iat: now,
      exp: now + accessTokenSeconds,
      iss: process.env.ISSUER_URL,
      sub: userId,
      aud: application.id,
      applicationId: application.id,
      scope: userRegistrationData.scope,
    };
    const accessToken = await this.utilService.createToken(
      accessTokenPayload,
      application.id,
      application.tenantId,
      'access',
    );
    return {
      refresh_token,
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: now + accessTokenSeconds,
    };
  }

  async returnAllPublicJwks() {
    const results = await this.prismaService.key.findMany();
    const filteredResults = results.map((result, i) => {
      return JSON.parse(result.data);
    });
    return {
      keys: filteredResults,
    };
  }

  async returnAPublicJwks(tenantId: string) {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new BadRequestException({
        success: false,
        message: 'no such tenant exists',
      });
    }
    const accessTokenSigningKey = await this.prismaService.key.findUnique({
      where: { id: tenant.accessTokenSigningKeysId },
    });
    const idTokenSigningKey = await this.prismaService.key.findUnique({
      where: { id: tenant.idTokenSigningKeysId },
    });
    const keys = [];
    keys.push(JSON.parse(accessTokenSigningKey.data));
    keys.push(JSON.parse(idTokenSigningKey.data));

    // Ensure each key object contains a "key" field directly
    const parsedKeys = keys.map((key) => JSON.parse(key.data));

    return {
      keys: parsedKeys,
    };
  }

  async introspect(data: IntrospectDto, headers: object) {
    const contentType = headers['content-type'];
    if (contentType !== 'application/x-www-form-urlencoded') {
      throw new BadRequestException({
        success: false,
        message:
          'content-type header should be application/x-www-form-urlencoded',
      });
    }
    const authorization = headers['authorization']?.split('Basic ')[1];
    let client_id: string | null = null,
      client_secret: string | null = null;
    if (authorization) {
      const credentials = Buffer.from(authorization, 'base64').toString(
        'utf-8',
      );
      [client_id, client_secret] = credentials.split(':');
    }
    if (!data) {
      throw new BadRequestException({
        success: false,
        message: 'No data given',
      });
    }
    const clientId = client_id ? client_id : data?.client_id;
    const clientSecret = client_secret ? client_secret : data?.client_secret;
    if (!clientId) {
      throw new BadRequestException({
        success: false,
        message:
          'Client id should be provided either via authorization header or data.client_id',
      });
    }
    const application = await this.prismaService.application.findUnique({
      where: { id: clientId },
    });
    if (!application) {
      throw new BadRequestException({
        success: false,
        message: 'No such application exists',
      });
    }
    const applicationData: ApplicationDataDto = JSON.parse(application.data);
    const actualSecret = applicationData?.oauthConfiguration.clientSecret;
    if (clientSecret !== actualSecret) {
      throw new BadRequestException({
        success: false,
        message: 'No such client with given id and secret exists',
      });
    }
    if (!data.token) {
      throw new BadRequestException({
        success: false,
        message: 'token not given',
      });
    }
    const accessTokenSigningKey = await this.prismaService.key.findUnique({
      where: { id: application.accessTokenSigningKeysId },
    });
    const accessTokenSecret = accessTokenSigningKey.publicKey
      ? accessTokenSigningKey.publicKey
      : accessTokenSigningKey.secret;
    return await this.utilService.checkValidityOfToken(
      data.token,
      accessTokenSecret,
      'access',
    );
  }

  async returnClaimsOfEndUser(headers: object) {
    const authorization = headers['authorization']?.split('Bearer ')[1];
    if (!authorization) {
      throw new BadRequestException({
        success: false,
        message: 'Bearer Authorization header required',
      });
    }
    try {
      const payload = jwt.decode(authorization);
      const accessPayload = payload as AccessTokenDto;
      const scopes = accessPayload.scope.split(' ');
      if (!scopes.includes('openid')) {
        return {
          success: false,
          message: 'openid scope missing in token',
        };
      }
      const userid = accessPayload.sub;
      const user = await this.prismaService.user.findUnique({
        where: { id: userid as string },
      });
      const userData: UserData = JSON.parse(user.data);
      const actualUserData: UserDataDto = userData.userData;
      delete actualUserData.password;
      const emailClaim = scopes.includes('email') ? user.email : null;
      const userDataClaim: UserDataDto | null = scopes.includes('profile')
        ? actualUserData
        : null;
      const roleIds =
        await this.utilService.returnRolesForAGivenUserIdAndApplicationId(
          user.id,
          accessPayload.applicationId,
        );
      const allRoles = await Promise.all(
        roleIds.map(async (roleId) => {
          const role = await this.prismaService.applicationRole.findUnique({
            where: { id: roleId },
          });
          return role?.name;
        }),
      );
      const roles = allRoles.filter((i) => i);
      return {
        applicationId: accessPayload.applicationId,
        email: emailClaim,
        sub: accessPayload.sub,
        roles,
        firstname: userDataClaim?.firstname,
        lastname: userDataClaim?.lastname,
        username: userDataClaim?.username,
      };
    } catch (error) {
      this.logger.log('Error occured in returnClaimsOfEndUser', error);
      throw new InternalServerErrorException({
        success: false,
        message: 'Error occured while processing end user info',
      });
    }
  }

  private async verify_code_challenge(
    code_challenge: string,
    code_challenge_method: string,
    code_verifier: string,
  ): Promise<ResponseDto> {
    if (!code_challenge || !code_challenge_method) {
      return {
        success: true,
        message: 'Pkce was not set',
      };
    }
    // apply code_challenge_method on code_verifier === code_challenge
    if (!code_verifier) {
      return {
        success: false,
        message: 'no code_verifier given',
      };
    }
    if (code_challenge_method === 'plain') {
      const valid = code_verifier === code_challenge;
      return {
        success: valid,
        message: valid ? 'Success' : 'Failed',
      };
    } else if (code_challenge_method === 'S256') {
      const encoder = new TextEncoder();
      const data = encoder.encode(code_verifier);
      return crypto.subtle
        .digest('SHA-256', data)
        .then((digest) => {
          const hashArray = Array.from(new Uint8Array(digest));
          const base64url = btoa(String.fromCharCode.apply(null, hashArray))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
          const valid = base64url === code_challenge;
          return {
            success: valid,
            message: valid ? 'Success' : 'Failed',
          };
        })
        .catch((error) => {
          return {
            success: false,
            message: `Error processing code_verifier: ${error.message}`,
          };
        });
    } else {
      return {
        success: false,
        message: 'unknown code_challenge_method',
      };
    }
  }
}
