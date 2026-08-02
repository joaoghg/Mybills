import { Test, TestingModule } from '@nestjs/testing';
import { ListUsersOutput, UpdateUserInput, UserOutput } from '@mybills/dtos';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const baseUser: User = {
    id: '271255b6-9a72-4f9f-a497-44cd1e2ea358',
    name: 'Jane Doe',
    email: 'jane@mybills.dev',
    password: 'hashed-password',
    refreshToken: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  const baseUserOutput: UserOutput = {
    id: baseUser.id,
    name: baseUser.name,
    email: baseUser.email,
    createdAt: baseUser.createdAt,
    updatedAt: baseUser.updatedAt
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  describe('findAll', () => {
    it('should call usersService.findAll and return serialized users', async () => {
      const output: ListUsersOutput = [baseUserOutput];
      service.findAll.mockResolvedValue([baseUser]);

      const result = await controller.findAll();

      expect(result).toEqual(output);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should call usersService.findById and return serialized user', async () => {
      service.findById.mockResolvedValue(baseUser);

      const result = await controller.findOne({ id: baseUser.id });

      expect(result).toEqual(baseUserOutput);
      expect(service.findById).toHaveBeenCalledTimes(1);
      expect(service.findById).toHaveBeenCalledWith(baseUser.id);
    });
  });

  describe('update', () => {
    it('should call usersService.update with user id and payload', async () => {
      const input: UpdateUserInput = {
        name: 'Jane Updated'
      };

      const updatedUser: User = {
        ...baseUser,
        name: input.name as string,
        updatedAt: '2026-01-02T00:00:00.000Z'
      };

      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update({ id: baseUser.id }, input);

      expect(result).toEqual({
        ...baseUserOutput,
        name: input.name,
        updatedAt: updatedUser.updatedAt
      });
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(baseUser.id, input);
    });
  });

  describe('remove', () => {
    it('should call usersService.remove with user id', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove({ id: baseUser.id });

      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(baseUser.id);
    });
  });
});
