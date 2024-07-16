import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class OIDCAuthQuery {
  @IsString()
  @ApiProperty()
  client_id: string;

  @IsString()
  @ApiProperty()
  redirect_uri: string;

  @IsString()
  @ApiProperty()
  response_type: string;

  @IsString()
  @ApiProperty()
  tenantId: string;

  @IsString()
  @ApiProperty()
  scope: string;

  @IsString()
  @ApiProperty()
  state: string;

  @IsString()
  @ApiProperty()
  code_challenge: string;

  @IsString()
  @ApiProperty()
  code_challenge_method: string;
}
