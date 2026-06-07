import { Test, TestingModule } from '@nestjs/testing';
import { AlreadyExistsError } from 'src/common/errors/already-exists.error';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { CategoryRepository } from './repositories/category.repository';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: jest.Mocked<CategoryRepository>;

  const category: Category = {
    id: '0ef9f98d-a8d2-470e-a8c4-3a46ad278f0f',
    userId: 'ba5f8ccd-5a24-4e41-9dbd-6ddb49a93fdd',
    name: 'Food',
    icon: 'restaurant-outline',
    types: ['EXPENSE', 'INCOME'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: 'CategoryRepository',
          useValue: {
            findAllByUserId: jest.fn(),
            findByIdAndUserId: jest.fn(),
            findByNameAndUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get('CategoryRepository') as jest.Mocked<CategoryRepository>;

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all categories from the authenticated user', async () => {
      repository.findAllByUserId.mockResolvedValue([category]);

      const result = await service.findAll(category.userId);

      expect(result).toEqual([category]);
      expect(repository.findAllByUserId).toHaveBeenCalledWith(category.userId);
    });

    it('should throw InvalidArgumentError if user id is invalid', async () => {
      await expect(service.findAll('')).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('findById', () => {
    it('should return category when found', async () => {
      repository.findByIdAndUserId.mockResolvedValue(category);

      const result = await service.findById(category.id, category.userId);

      expect(result).toEqual(category);
      expect(repository.findByIdAndUserId).toHaveBeenCalledWith(category.id, category.userId);
    });

    it('should throw NotFoundError if category does not exist', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById(category.id, category.userId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create category when name does not exist for user', async () => {
      repository.findByNameAndUserId.mockResolvedValue(null);
      repository.create.mockResolvedValue(category);

      const result = await service.create({
        userId: category.userId,
        name: ` ${category.name} `,
        icon: category.icon,
        types: category.types
      });

      expect(result).toEqual(category);
      expect(repository.findByNameAndUserId).toHaveBeenCalledWith(category.name, category.userId);
      expect(repository.create).toHaveBeenCalledWith({
        userId: category.userId,
        name: category.name,
        icon: category.icon,
        types: category.types
      });
    });

    it('should throw AlreadyExistsError when category name already exists for user', async () => {
      repository.findByNameAndUserId.mockResolvedValue(category);

      await expect(
        service.create({
          userId: category.userId,
          name: category.name,
          icon: category.icon,
          types: category.types
        })
      ).rejects.toThrow(AlreadyExistsError);
    });
  });

  describe('update', () => {
    it('should update category when category exists and data is valid', async () => {
      const updatedCategory: Category = { ...category, name: 'Transport' };

      repository.findByIdAndUserId.mockResolvedValue(category);
      repository.findByNameAndUserId.mockResolvedValue(null);
      repository.update.mockResolvedValue(updatedCategory);

      const result = await service.update(category.id, category.userId, {
        name: 'Transport'
      });

      expect(result).toEqual(updatedCategory);
      expect(repository.update).toHaveBeenCalledWith(category.id, {
        name: 'Transport',
        icon: undefined,
        types: undefined
      });
    });

    it('should throw InvalidArgumentError when no fields are provided', async () => {
      await expect(service.update(category.id, category.userId, {})).rejects.toThrow(
        InvalidArgumentError
      );
    });

    it('should throw AlreadyExistsError when updated name belongs to another category', async () => {
      repository.findByIdAndUserId.mockResolvedValue(category);
      repository.findByNameAndUserId.mockResolvedValue({
        ...category,
        id: 'd6a277f3-c50b-44de-bf54-ff63a86d7048'
      });

      await expect(
        service.update(category.id, category.userId, {
          name: 'Transport'
        })
      ).rejects.toThrow(AlreadyExistsError);
    });
  });

  describe('remove', () => {
    it('should delete category when category exists', async () => {
      repository.findByIdAndUserId.mockResolvedValue(category);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(category.id, category.userId);

      expect(repository.delete).toHaveBeenCalledWith(category.id);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.remove(category.id, category.userId)).rejects.toThrow(NotFoundError);
    });
  });
});
