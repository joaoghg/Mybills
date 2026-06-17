import { Test, TestingModule } from '@nestjs/testing';
import {
  CategoryOutput,
  CreateCategoryInput,
  ListCategoriesOutput,
  UpdateCategoryInput
} from '@mybills/dtos';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

  const baseCategory: CategoryOutput = {
    id: '0ef9f98d-a8d2-470e-a8c4-3a46ad278f0f',
    userId: 'ba5f8ccd-5a24-4e41-9dbd-6ddb49a93fdd',
    name: 'Food',
    icon: 'restaurant-outline',
    types: ['EXPENSE'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get(CategoriesService) as jest.Mocked<CategoriesService>;
  });

  describe('findAll', () => {
    it('should call categoriesService.findAll with current user id and return categories', async () => {
      const output: ListCategoriesOutput = [baseCategory];
      service.findAll.mockResolvedValue(output);

      const result = await controller.findAll(baseCategory.userId);

      expect(result).toEqual(output);
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(baseCategory.userId);
    });
  });

  describe('findOne', () => {
    it('should call categoriesService.findById with category id and user id', async () => {
      service.findById.mockResolvedValue(baseCategory);

      const result = await controller.findOne(baseCategory.userId, { id: baseCategory.id });

      expect(result).toEqual(baseCategory);
      expect(service.findById).toHaveBeenCalledTimes(1);
      expect(service.findById).toHaveBeenCalledWith(baseCategory.id, baseCategory.userId);
    });
  });

  describe('create', () => {
    it('should call categoriesService.create with payload and user id', async () => {
      const input: CreateCategoryInput = {
        name: 'Food',
        icon: 'restaurant-outline',
        types: ['EXPENSE']
      };

      service.create.mockResolvedValue(baseCategory);

      const result = await controller.create(baseCategory.userId, input);

      expect(result).toEqual(baseCategory);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith({
        userId: baseCategory.userId,
        name: input.name,
        icon: input.icon,
        types: input.types
      });
    });
  });

  describe('update', () => {
    it('should call categoriesService.update with category id, user id and payload', async () => {
      const input: UpdateCategoryInput = {
        name: 'Transport'
      };
      const output: CategoryOutput = {
        ...baseCategory,
        name: 'Transport'
      };

      service.update.mockResolvedValue(output);

      const result = await controller.update(baseCategory.userId, { id: baseCategory.id }, input);

      expect(result).toEqual(output);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(baseCategory.id, baseCategory.userId, input);
    });
  });

  describe('remove', () => {
    it('should call categoriesService.remove with category id and user id', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(baseCategory.userId, { id: baseCategory.id });

      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(baseCategory.id, baseCategory.userId);
    });
  });
});
