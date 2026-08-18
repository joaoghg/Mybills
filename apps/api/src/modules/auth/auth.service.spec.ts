import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../user/users.service';
import { CategoriesService } from '../categories/categories.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { AlreadyExistsError } from 'src/common/errors/already-exists.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { User } from '../user/entities/user.entity';
import { UnauthorizedError } from 'src/common/errors/unauthorized.error';

jest.mock('argon2');

const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user-123',
    name: 'João',
    email: 'joao@example.com',
    password: 'hashed-password',
    refreshToken: 'stored-refresh-token-hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            updateRefreshToken: jest.fn(),
            create: jest.fn()
          }
        },
        {
          provide: CategoriesService,
          useValue: {
            ensureDefaultTransferCategory: jest.fn()
          }
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn()
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn()
          }
        }
      ]
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    categoriesService = module.get(CategoriesService) as jest.Mocked<CategoriesService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;

    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a new user and return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      categoriesService.ensureDefaultTransferCategory.mockResolvedValue({
        id: 'category-1',
        userId: mockUser.id,
        name: 'Transferência',
        icon: 'swap-horizontal-outline',
        isSystem: true,
        types: ['EXPENSE', 'INCOME'],
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt
      });
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      mockedArgon2.hash.mockImplementation(async () => 'hashed-password');

      const result = await authService.signUp({
        name: 'João',
        email: 'joao@example.com',
        password: 'password123'
      });

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(usersService.create).toHaveBeenCalledWith({
        name: 'João',
        email: 'joao@example.com',
        hashedPassword: 'hashed-password'
      });
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-123',
        hashRefreshToken('refresh-token')
      );
    });

    it('should throw AlreadyExistsError if email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.signUp({
          name: 'João',
          email: 'joao@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(AlreadyExistsError);
    });

    it('should throw InvalidArgumentError if missing data', async () => {
      await expect(
        authService.signUp({
          name: '',
          email: 'joao@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('signIn', () => {
    it('should successfully sign in and return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      mockedArgon2.verify.mockImplementation(async () => true);

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.signIn({
        email: 'joao@example.com',
        password: 'password123'
      });

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-123',
        hashRefreshToken('refresh-token')
      );
    });

    it('should throw NotFoundError if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.signIn({
          email: 'joao@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      mockedArgon2.verify.mockImplementation(async () => false);

      await expect(
        authService.signIn({
          email: 'joao@example.com',
          password: 'wrongpassword'
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InvalidArgumentError if missing data', async () => {
      await expect(
        authService.signIn({
          email: '',
          password: 'password123'
        })
      ).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('refreshTokens', () => {
    it('should validate a refresh token, rotate it and return new tokens', async () => {
      const refreshToken = 'current-refresh-token';
      const refreshableUser: User = {
        ...mockUser,
        refreshToken: hashRefreshToken(refreshToken)
      };

      usersService.findByEmail.mockResolvedValue(refreshableUser);
      jwtService.verifyAsync.mockResolvedValue({
        sub: refreshableUser.id,
        email: refreshableUser.email,
        jti: 'jti-1'
      });
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await authService.refreshTokens({
        refreshToken
      });

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        refreshableUser.id,
        hashRefreshToken('new-refresh-token')
      );
    });

    it('should throw UnauthorizedError if the refresh token cannot be verified', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(
        authService.refreshTokens({
          refreshToken: 'invalid-refresh-token'
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if the stored refresh token does not match', async () => {
      const refreshableUser: User = {
        ...mockUser,
        refreshToken: hashRefreshToken('stored-refresh-token')
      };

      usersService.findByEmail.mockResolvedValue(refreshableUser);
      jwtService.verifyAsync.mockResolvedValue({
        sub: refreshableUser.id,
        email: refreshableUser.email,
        jti: 'jti-2'
      });

      await expect(
        authService.refreshTokens({
          refreshToken: 'current-refresh-token'
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('should clear the stored refresh token for the user', async () => {
      await authService.logout('user-123');

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', null);
    });
  });

  describe('getMe', () => {
    it('should return the authenticated user profile', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await authService.getMe('user-123');

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt
      });
      expect(usersService.findById).toHaveBeenCalledWith('user-123');
    });
  });
});
