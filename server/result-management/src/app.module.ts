import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { GlobalUtilsModule } from './shared/utils/global-utils.module';
import { ClarisaResultModule } from './entity/clarisa-result.module';
import { mainRoutes } from './entity/main.routes';

@Module({
  imports: [
    GlobalUtilsModule,
    ClarisaResultModule,
    RouterModule.register(mainRoutes),
    ThrottlerModule.forRoot([
      {
        ttl: 60 * 1000,
        limit: 400,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
