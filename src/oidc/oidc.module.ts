import { Module } from '@nestjs/common';
import { OidcService } from './oidc.service';
import { OidcController } from './oidc.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';
import { OtpModule } from 'src/otp/otp.module';

@Module({
  imports: [OtpModule],
  providers: [OidcService, PrismaService, UtilsService],
  controllers: [OidcController],
})
export class OidcModule {}
