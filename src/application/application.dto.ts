import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsUrl,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';

class OauthConfiguration {
  @ApiProperty({
    description: 'List of authorized origin URLs',
    type: [String],
    example: ['https://example.com', 'https://anotherexample.com'],
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'There must be at least one authorized origin URL',
  })
  @ArrayMaxSize(100, {
    message: 'There can be at most 100 authorized origin URLs',
  })
  @IsString({ each: true, message: 'Each URL must be a string' })
  // @IsUrl({}, { each: true, message: 'Each URL must be a valid URL' })
  authorizedOriginURLs: string[];

  @ApiProperty({
    description: 'List of authorized redirect URLs',
    type: [String],
    example: [
      'https://example.com/callback',
      'https://anotherexample.com/callback',
    ],
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'There must be at least one authorized redirect URL',
  })
  @ArrayMaxSize(100, {
    message: 'There can be at most 100 authorized redirect URLs',
  })
  @IsString({ each: true, message: 'Each URL must be a string' })
  // @IsUrl({}, { each: true, message: 'Each URL must be a valid URL' })
  authorizedRedirectURLs: string[];

  @ApiProperty({
    description: 'Client secret for authentication',
    type: String,
    example: 'supersecret',
  })
  @IsString({ message: 'Client secret must be a string' })
  @IsNotEmpty({ message: 'Client secret must not be empty' })
  clientSecret: string;

  @ApiProperty({
    description: 'List of enabled grants',
    type: [String],
    example: ['authorization_code', 'refresh_token'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'There must be at least one enabled grant' })
  @IsString({ each: true, message: 'Each grant must be a string' })
  @IsNotEmpty({ each: true, message: 'Each grant must not be empty' })
  enabledGrants: string[];

  @ApiProperty({
    description: 'Logout URL',
    type: String,
    example: 'https://example.com/logout',
  })
  @IsString({ message: 'Logout URL must be a string' })
  // @IsUrl({}, { message: 'Logout URL must be a valid URL' })
  @IsNotEmpty({ message: 'Logout URL must not be empty' })
  logoutURL: string;
}

export class JwtConfiguration {
  @ApiProperty({
    description: 'ID for the access token signing keys',
    type: String,
    example: 'access-key-id-123',
  })
  @IsString({ message: 'Access token signing keys ID must be a string' })
  @IsNotEmpty({ message: 'Access token signing keys ID must not be empty' })
  accessTokenSigningKeysID: string;

  @ApiProperty({
    description: 'Time to live for refresh tokens in minutes',
    type: Number,
    example: 1440,
  })
  @IsInt({ message: 'Refresh token time to live must be an integer' })
  @Min(1, { message: 'Refresh token time to live must be at least 1 minute' })
  refreshTokenTimeToLiveInMinutes: number;

  @ApiProperty({
    description: 'Time to live for access tokens in seconds',
    type: Number,
    example: 3600,
  })
  @IsInt({ message: 'Time to live must be an integer' })
  @Min(1, { message: 'Time to live must be at least 1 second' })
  timeToLiveInSeconds: number;

  @ApiProperty({
    description: 'ID for the ID token signing keys',
    type: String,
    example: 'id-key-id-456',
  })
  @IsString({ message: 'ID token signing keys ID must be a string' })
  @IsNotEmpty({ message: 'ID token signing keys ID must not be empty' })
  idTokenSigningKeysID: string;
}

export class RoleDto {
  @ApiProperty({
    description: 'Description of the role',
    type: String,
    example: 'Admin role with full permissions',
  })
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description must not be empty' })
  description: string;

  @ApiProperty({
    description: 'Indicates if this role is the default role',
    type: Boolean,
    example: true,
  })
  @IsBoolean({ message: 'isDefault must be a boolean value' })
  isDefault: boolean;

  @ApiProperty({
    description: 'Indicates if this role is a super role',
    type: Boolean,
    example: false,
  })
  @IsBoolean({ message: 'isSuperRole must be a boolean value' })
  isSuperRole: boolean;

  @ApiProperty({
    description: 'Name of the role',
    type: String,
    example: 'Admin',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name must not be empty' })
  name: string;

  @ApiProperty({
    description: 'ID of the role (optional)',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  id?: string;
}

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Description of the role (optional)',
    type: String,
    example: 'Updated description for the admin role',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({
    description: 'Indicates if this role is the default role (optional)',
    type: Boolean,
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isDefault must be a boolean value' })
  isDefault?: boolean;

  @ApiProperty({
    description: 'Indicates if this role is a super role (optional)',
    type: Boolean,
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isSuperRole must be a boolean value' })
  isSuperRole?: boolean;

  @ApiProperty({
    description: 'Name of the role (optional)',
    type: String,
    example: 'Updated Admin',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @ApiProperty({
    description: 'ID of the role (optional)',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  id?: string;
}

export class ScopeDto {
  @ApiProperty({
    description: 'Default consent detail',
    type: String,
    example: 'Default consent detail example',
  })
  @IsString({ message: 'Default consent detail must be a string' })
  @IsNotEmpty({ message: 'Default consent detail must not be empty' })
  defaultConsentDetail: string;

  @ApiProperty({
    description: 'Default consent message',
    type: String,
    example: 'Default consent message example',
  })
  @IsString({ message: 'Default consent message must be a string' })
  @IsNotEmpty({ message: 'Default consent message must not be empty' })
  defaultConsentMessage: string;

  @ApiProperty({
    description: 'ID of the scope (optional)',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'Name of the scope',
    type: String,
    example: 'Scope name example',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name must not be empty' })
  name: string;

  @ApiProperty({
    description: 'Indicates if the scope is required',
    type: Boolean,
    example: true,
  })
  @IsBoolean({ message: 'Required must be a boolean value' })
  required: boolean;
}

export class UpdateScopeDto {
  @ApiProperty({
    description: 'Default consent detail (optional)',
    type: String,
    example: 'Updated default consent detail example',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Default consent detail must be a string' })
  defaultConsentDetail?: string;

  @ApiProperty({
    description: 'Default consent message (optional)',
    type: String,
    example: 'Updated default consent message example',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Default consent message must be a string' })
  defaultConsentMessage?: string;

  @ApiProperty({
    description: 'ID of the scope (optional)',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'Name of the scope (optional)',
    type: String,
    example: 'Updated scope name example',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @ApiProperty({
    description: 'Indicates if the scope is required (optional)',
    type: Boolean,
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Required must be a boolean value' })
  required?: boolean;
}

export class CreateApplicationDto {
  @ApiProperty({
    description: 'Indicates if the application is active',
    type: Boolean,
    example: true,
  })
  @IsBoolean({ message: 'Active must be a boolean value' })
  active: boolean;

  @ApiProperty({
    description: 'Name of the application',
    type: String,
    example: 'My Application',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name must not be empty' })
  name: string;

  @ApiProperty({
    description: 'List of scopes',
    type: [ScopeDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'There must be at least one scope' })
  @ValidateNested({ each: true })
  @Type(() => ScopeDto)
  scopes: ScopeDto[];

  @ApiProperty({
    description: 'List of roles',
    type: [RoleDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'There must be at least one role' })
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles: RoleDto[];

  @ApiProperty({
    description: 'OAuth configuration',
    type: OauthConfiguration,
  })
  @ValidateNested()
  @Type(() => OauthConfiguration)
  oauthConfiguration: OauthConfiguration;
}

export class UpdateApplicationDto {
  @ApiProperty({
    description: 'Indicates if the application is active (optional)',
    type: Boolean,
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Active must be a boolean value' })
  active?: boolean;

  @ApiProperty({
    description: 'JWT configuration (optional)',
    type: JwtConfiguration,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => JwtConfiguration)
  jwtConfiguration?: JwtConfiguration;

  @ApiProperty({
    description: 'OAuth configuration (optional)',
    type: OauthConfiguration,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OauthConfiguration)
  oauthConfiguration?: OauthConfiguration;

  @ApiProperty({
    description: 'Name of the application (optional)',
    type: String,
    example: 'Updated Application Name',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;
}

export class ApplicationDataDto {
  @ApiProperty({
    description: 'OAuth configuration',
    type: OauthConfiguration,
  })
  @ValidateNested()
  @Type(() => OauthConfiguration)
  oauthConfiguration: OauthConfiguration;

  @ApiProperty({
    description: 'JWT configuration',
    type: JwtConfiguration,
  })
  @ValidateNested()
  @Type(() => JwtConfiguration)
  jwtConfiguration: JwtConfiguration;
}

export class ApplicationDto {
  @ApiProperty() id: string;
  @ApiProperty() accessTokenSigningKeysId: string;
  @ApiProperty() active: boolean;
  @ApiProperty() data: string;
  @ApiProperty() idTokenSigningKeysId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() name: string;
  @ApiProperty() tenantId: string;
}
