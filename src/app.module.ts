import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OidcModule } from './oidc/oidc.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { ApplicationModule } from './application/application.module';
import { MemoryMonitorService } from './memory-monitor/memory-monitor.service';
import { ScheduleModule } from '@nestjs/schedule';
import { KeyModule } from './key/key.module';
import { GroupModule } from './groups/groups.module';
import { RefreshTokenModule } from './refresh_tokens/refreshtokens.module';
import { LoginModule } from './login/login.module';
import { KickstartModule } from './kickstart/kickstart.module';
import { OtpModule } from './otp/otp.module';
import { TenantModule } from './tenant/tenant.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { UtilsService } from './utils/utils.service';
import { AdminMiddleware } from './middlewares/admin.middleware';

@Module({
  imports: [
    OidcModule,
    UserModule,
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_SECRET_EXPIRATION },
    }),
    ApplicationModule,
    ScheduleModule.forRoot(),
    KeyModule,
    RefreshTokenModule,
    LoginModule,
    GroupModule,
    KickstartModule,
    OtpModule,
    TenantModule,
    ApiKeysModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, MemoryMonitorService, UtilsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AdminMiddleware)
      .exclude({ path: 'admin', method: RequestMethod.POST })
      .exclude({ path: 'health', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
