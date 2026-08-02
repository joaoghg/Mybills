import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/modules/database/database.module';
import { PrismaUserRepository } from './repositories/prisma/prisma-user.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [
    {
      provide: 'UserRepository',
      useClass: PrismaUserRepository
    },
    UsersService
  ],
  exports: [UsersService]
})
export class UserModule {}
