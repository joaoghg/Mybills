import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/modules/database/database.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { PrismaCategoryRepository } from './repositories/prisma/prisma-category.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [CategoriesController],
  providers: [
    {
      provide: 'CategoryRepository',
      useClass: PrismaCategoryRepository
    },
    CategoriesService
  ],
  exports: [CategoriesService]
})
export class CategoriesModule {}