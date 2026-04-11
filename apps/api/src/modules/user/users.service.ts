import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { User } from './entities/user.entity';
import { CreateUserData } from './contracts/create-user-data.contract';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { UpdateUserData } from './contracts/update-user-data.contract';
import { AlreadyExistsError } from 'src/common/errors/already-exists.error';

@Injectable()
export class UsersService {
  constructor(@Inject('UserRepository') private readonly repository: UserRepository) {}

  async findAll(): Promise<User[]> {
    return await this.repository.findAll();
  }

  async findById(userId: string): Promise<User> {
    this.validateUserId(userId);

    const user = await this.repository.findById(userId);

    if (!user) {
      throw new NotFoundError({
        code: 'users.user_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'user' }
      });
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findByEmail(email);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await this.repository.updateRefreshToken(userId, refreshToken);
  }

  async create(data: CreateUserData): Promise<User> {
    return await this.repository.create(data);
  }

  async update(userId: string, data: UpdateUserData): Promise<User> {
    this.validateUserId(userId);
    this.validateUpdateData(data);

    await this.findById(userId);

    let normalizedName: string | undefined;
    let normalizedEmail: string | undefined;

    if (data.name !== undefined) {
      normalizedName = data.name.trim();
    }

    if (data.email !== undefined) {
      normalizedEmail = data.email.trim();

      const existingUser = await this.repository.findByEmail(normalizedEmail);

      if (existingUser && existingUser.id !== userId) {
        throw new AlreadyExistsError({
          code: 'users.email_already_registered',
          i18nKey: 'errors.conflict.already_exists_field',
          i18nArgs: { field: 'email' }
        });
      }
    }

    return await this.repository.update(userId, {
      name: normalizedName,
      email: normalizedEmail
    });
  }

  async remove(userId: string): Promise<void> {
    this.validateUserId(userId);

    await this.findById(userId);
    await this.repository.delete(userId);
  }

  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw new InvalidArgumentError({
        code: 'users.invalid_user_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'user_id' }
      });
    }
  }

  private validateUpdateData(data: UpdateUserData): void {
    if (data.name === undefined && data.email === undefined) {
      throw new InvalidArgumentError({
        code: 'users.at_least_one_field_required',
        i18nKey: 'errors.validation.at_least_one_field_required'
      });
    }

    if (
      data.name !== undefined &&
      (!data.name || typeof data.name !== 'string' || !data.name.trim())
    ) {
      throw new InvalidArgumentError({
        code: 'users.invalid_user_name',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'user_name' }
      });
    }

    if (
      data.email !== undefined &&
      (!data.email || typeof data.email !== 'string' || !data.email.trim())
    ) {
      throw new InvalidArgumentError({
        code: 'users.invalid_email',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'email' }
      });
    }
  }
}
