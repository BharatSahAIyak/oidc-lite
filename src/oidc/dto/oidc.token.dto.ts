import { ApiProperty } from '@nestjs/swagger';

export class TokenDto {
  @ApiProperty() client_id?: string;
  @ApiProperty() client_secret?: string;
  @ApiProperty() code?: string;
  @ApiProperty() loginId?: string;
  @ApiProperty() password?: string;
  @ApiProperty() code_verifier?: string;
  @ApiProperty() refresh_token?: string;
  @ApiProperty() grant_type: string;
  @ApiProperty() redirect_uri: string;
}

export class IntrospectDto {
  @ApiProperty() client_id: string;
  @ApiProperty() client_secret: string;
  @ApiProperty() token: string;
}

export class IdTokenDto {
  @ApiProperty() active: boolean;
  @ApiProperty() iat?: number;
  @ApiProperty() iss?: string;
  @ApiProperty() exp?: number;
  @ApiProperty() aud: string;
  @ApiProperty() userData?: string | object; // stores user info
}

export class AccessTokenDto {
  @ApiProperty() active: boolean;
  @ApiProperty() iss?: string;
  @ApiProperty() iat?: number;
  @ApiProperty() exp?: number;
  @ApiProperty() sub?: string; //userid
  @ApiProperty() applicationId: string;
  @ApiProperty() scope?: string;
  @ApiProperty() roles?: string[];
  @ApiProperty() aud: string;
}

export class RefreshTokenDto {
  @ApiProperty() active: boolean;
  @ApiProperty() applicationId: string;
  @ApiProperty() iat?: number;
  @ApiProperty() iss?: string;
  @ApiProperty() exp?: number;
  @ApiProperty() sub: string;
}
