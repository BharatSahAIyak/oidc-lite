import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { OidcService } from './oidc.service';
import { Request, Response } from 'express';
import { OIDCAuthQuery } from './dto/oidc.auth.dto';
import { LoginDto, RegisterDto } from '../login/login.dto';
import { IntrospectDto, TokenDto } from './dto/oidc.token.dto';
import { QueryApplicationIdGuard } from '../guards/queryApplicationId.guard';
import { DataApplicationIdGuard } from '../guards/dataApplicationId.guard';

@ApiTags('OIDC')
@Controller('oidc')
export class OidcController {
  constructor(private readonly oidcService: OidcService) {}

  @ApiOperation({ summary: 'OIDC Authorization Endpoint' })
  @ApiQuery({ name: 'client_id', required: true, type: String })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
  @ApiQuery({ name: 'redirect_uri', required: true, type: String })
  @ApiQuery({ name: 'response_type', required: true, type: String })
  @ApiQuery({ name: 'scope', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Redirects to login page or authorizes the user',
  })
  @ApiHeader({ name: 'authorization', required: false })
  @Get('auth')
  @UseGuards(QueryApplicationIdGuard)
  async authorize(
    @Query() query: OIDCAuthQuery,
    @Req() req: Request,
    @Res() res: Response,
    @Headers() headers: object,
  ) {
    return await this.oidcService.authorize(req, res, query, headers);
  }

  @ApiOperation({ summary: 'OIDC Post Authorization Endpoint' })
  @ApiBody({ type: LoginDto })
  @ApiQuery({ name: 'client_id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Returns authentication token' })
  @ApiHeader({ name: 'authorization', required: false })
  @Post('auth')
  @UseGuards(QueryApplicationIdGuard)
  async postAuthorize(
    @Body() data: LoginDto,
    @Query() query: OIDCAuthQuery,
    @Headers() headers: object,
    @Res() res: Response,
  ) {
    return await this.oidcService.postAuthorize(data, query, headers, res);
  }

  @Get('/register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiQuery({ name: 'client_id', required: true })
  @ApiQuery({ name: 'redirect_uri', required: true })
  @ApiQuery({ name: 'response_type', required: true })
  @ApiQuery({ name: 'scope', required: true })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'code_challenge', required: false })
  @ApiQuery({ name: 'code_challenge_method', required: false })
  async registerAUser(
    @Query() query: OIDCAuthQuery,
    @Req() req: Request,
    @Res() res: Response,
    @Headers() headers: object,
  ) {
    return await this.oidcService.registerAUser(req, res, query, headers);
  }

  @Post('/register')
  @ApiOperation({ summary: 'Post registration' })
  @ApiBody({ type: RegisterDto })
  async postRegisterAUser(
    @Body() data: RegisterDto,
    @Query() query: OIDCAuthQuery,
    @Headers() headers: object,
    @Res() res: Response,
  ) {
    return await this.oidcService.postRegisterAUser(data, query, headers, res);
  }

  @Get('/passwordless-otp')
  @ApiOperation({ summary: 'Get HTML for passwordless OTP' })
  @ApiQuery({ name: 'client_id', required: false, type: String })
  @ApiQuery({ name: 'redirect_uri', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'HTML form for entering email and getting OTP',
  })
  async passwordless_otp(
    @Query() query: OIDCAuthQuery,
    @Req() req: Request,
    @Res() res: Response,
    @Headers() headers: object,
  ) {
    return await this.oidcService.passwordless_otp(req, res, query, headers);
  }

  @Post('/passwordless-otp')
  @ApiOperation({ summary: 'Verify OTP and login user without password' })
  @ApiQuery({ name: 'client_id', required: false, type: String })
  @ApiQuery({ name: 'redirect_uri', required: false, type: String })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  async postPasswordless_otp(
    @Body() data: LoginDto & { otp: string },
    @Query() query: OIDCAuthQuery,
    @Headers() headers: object,
    @Res() res: Response,
  ) {
    return await this.oidcService.postPasswordless_otp(
      data,
      query,
      headers,
      res,
    );
  }

  @ApiOperation({ summary: 'OIDC Token Endpoint' })
  @ApiBody({ type: TokenDto })
  @ApiResponse({
    status: 200,
    description: 'Returns tokens (idToken, accessToken, refreshToken)',
  })
  @ApiHeader({ name: 'authorization', required: true })
  @Post('token')
  async returnToken(@Headers() headers: object, @Body() data: TokenDto) {
    return await this.oidcService.returnToken(data, headers);
  }

  @ApiOperation({ summary: 'Return all public JWKS' })
  @ApiResponse({ status: 200, description: 'Returns all public JWKS' })
  @Get('/.well-known/jwks.json')
  async returnAllPublicJwks() {
    return await this.oidcService.returnAllPublicJwks();
  }

  @ApiOperation({ summary: 'Return public JWKS for a tenant' })
  @ApiParam({ name: 'tenantId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Returns public JWKS for a tenant' })
  @Get('/:tenantId/.well-known/jwks.json')
  async returnAPublicJwks(@Param('tenantId') tenantId: string) {
    return await this.oidcService.returnAPublicJwks(tenantId);
  }

  @ApiOperation({ summary: 'Introspect a token' })
  @ApiBody({ type: IntrospectDto })
  @ApiResponse({
    status: 200,
    description: 'Returns token introspection result',
  })
  @ApiHeader({ name: 'content-type', required: true })
  @ApiHeader({ name: 'authorization', required: false })
  @Post('/introspect')
  @UseGuards(DataApplicationIdGuard)
  async introspect(@Body() data: IntrospectDto, @Headers() headers: object) {
    return await this.oidcService.introspect(data, headers);
  }

  @Post('userinfo')
  @ApiOperation({ summary: 'Return claims of end user' })
  async returnClaimsOfEndUser(@Headers() headers: object) {
    return await this.oidcService.returnClaimsOfEndUser(headers);
  }
  @Get('userinfo')
  @ApiOperation({ summary: 'Return claims of end user via GET' })
  async returnClaimsOfEndUserGet(@Headers() headers: object) {
    return await this.oidcService.returnClaimsOfEndUser(headers);
  }

  @Get('.well-known/openid-configuration')
  async returnConfigs() {
    return {
      issuer: `${process.env.ISSUER_URL}`,
      authorization_endpoint: `${process.env.FULL_URL}/oidc/auth`,
      token_endpoint: `${process.env.FULL_URL}/oidc/token`,
      userinfo_endpoint: `${process.env.FULL_URL}/oidc/userinfo`,
      jwks_uri: `${process.env.FULL_URL}/oidc/.well-known/jwks.json`,
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      response_types_supported: ['code'],
      grant_types_supported: [
        'authorization_code',
        'password',
        'refresh_token',
      ],
      id_token_signing_alg_values_supported: [
        'RS256',
        'RS384',
        'RS512',
        'ES256',
        'ES384',
        'ES512',
      ],
      code_challenge_methods_supported: ['plain', 'S256'],
    };
  }
}
