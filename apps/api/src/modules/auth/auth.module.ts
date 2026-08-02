import { Module } from '@nestjs/common';
import { UserModule } from '../user/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from 'src/modules/database/database.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [ConfigModule, UserModule, CategoriesModule, DatabaseModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    AuthService
  ]
})
export class AuthModule {}
