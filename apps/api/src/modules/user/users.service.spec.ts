import { Test, TestingModule } from '@nestjs/testing';
import { AlreadyExistsError } from 'src/common/errors/already-exists.error';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UserRepository>;

  const user: User = {
    id: '271255b6-9a72-4f9f-a497-44cd1e2ea358',
    name: 'Jane Doe',
    email: 'jane@mybills.dev',
    password: 'hashed-password',
    refreshToken: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'UserRepository',
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            updateRefreshToken: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get('UserRepository') as jest.Mocked<UserRepository>;

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      repository.findAll.mockResolvedValue([user]);

      const result = await service.findAll();

      expect(result).toEqual([user]);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      repository.findById.mockResolvedValue(user);

      const result = await service.findById(user.id);

      expect(result).toEqual(user);
      expect(repository.findById).toHaveBeenCalledWith(user.id);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(user.id)).rejects.toThrow(NotFoundError);
    });

    it('should throw InvalidArgumentError for invalid user id', async () => {
      await expect(service.findById('')).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('update', () => {
    it('should update user when payload is valid and email does not conflict', async () => {
      const updatedUser: User = {
        ...user,
        name: 'Jane Updated'
      };

      repository.findById.mockResolvedValue(user);
      repository.findByEmail.mockResolvedValue(null);
      repository.update.mockResolvedValue(updatedUser);

      const result = await service.update(user.id, {
        name: ' Jane Updated ',
        email: ' jane.updated@mybills.dev '
      });

      expect(result).toEqual(updatedUser);
      expect(repository.findByEmail).toHaveBeenCalledWith('jane.updated@mybills.dev');
      expect(repository.update).toHaveBeenCalledWith(user.id, {
        name: 'Jane Updated',
        email: 'jane.updated@mybills.dev'
      });
    });

    it('should throw AlreadyExistsError when email belongs to another user', async () => {
      repository.findById.mockResolvedValue(user);
      repository.findByEmail.mockResolvedValue({
        ...user,
        id: '488f98fa-df57-4fe9-ba3b-1cb245478f58'
      });

      await expect(
        service.update(user.id, {
          email: 'taken@mybills.dev'
        })
      ).rejects.toThrow(AlreadyExistsError);
    });

    it('should throw InvalidArgumentError when no fields are provided', async () => {
      await expect(service.update(user.id, {})).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('remove', () => {
    it('should delete user when it exists', async () => {
      repository.findById.mockResolvedValue(user);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(user.id);

      expect(repository.delete).toHaveBeenCalledWith(user.id);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(user.id)).rejects.toThrow(NotFoundError);
    });
  });
});
