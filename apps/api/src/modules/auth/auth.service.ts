import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { Env } from 'src/config/env.validation';
import { SignUpData } from './contracts/sign-up-data.contract';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { AlreadyExistsError } from 'src/common/errors/already-exists.error';
import * as argon2 from 'argon2';
import { SignInData } from './contracts/sign-in-data.contract';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { JwtPayload } from './contracts/jwt-payload.contract';
import { UsersService } from '../user/users.service';
import { CategoriesService } from '../categories/categories.service';
import { RefreshTokenData } from './contracts/refresh-token-data.contract';
import { UnauthorizedError } from 'src/common/errors/unauthorized.error';
import type { UserOutput } from '@mybills/dtos';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly categoriesService: CategoriesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env>
  ) {}

  private async getTokens(userId: string, email: string) {
    const jwtPayload: JwtPayload = { sub: userId, email, jti: randomUUID() };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get('ACCESS_TOKEN_SECRET'),
        expiresIn: '15m'
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        expiresIn: '7d'
      })
    ]);

    return { accessToken, refreshToken };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');

    await this.usersService.updateRefreshToken(userId, hash);
  }

  async signUp(data: SignUpData) {
    if (!data.email || typeof data.email !== 'string') {
      throw new InvalidArgumentError({
        code: 'auth.invalid_email',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'email' }
      });
    }
    if (!data.name || typeof data.name !== 'string') {
      throw new InvalidArgumentError({
        code: 'auth.invalid_name',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'name' }
      });
    }
    if (!data.password || typeof data.password !== 'string') {
      throw new InvalidArgumentError({
        code: 'auth.invalid_password',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'password' }
      });
    }

    const user = await this.usersService.findByEmail(data.email);
    if (user) {
      throw new AlreadyExistsError({
        code: 'auth.email_already_registered',
        i18nKey: 'errors.conflict.already_exists_field',
        i18nArgs: { field: 'email' }
      });
    }

    const hashedPassword = await argon2.hash(data.password);

    const createdUser = await this.usersService.create({
      name: data.name,
      email: data.email,
      hashedPassword
    });

    await this.categoriesService.ensureDefaultTransferCategory(createdUser.id);

    const tokens = await this.getTokens(createdUser.id, createdUser.email);

    await this.updateRefreshToken(createdUser.id, tokens.refreshToken);

    return tokens;
  }

  async signIn(data: SignInData) {
    if (!data.email || typeof data.email !== 'string') {
      throw new InvalidArgumentError({
        code: 'auth.invalid_email',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'email' }
      });
    }
    if (!data.password || typeof data.password !== 'string') {
      throw new InvalidArgumentError({
        code: 'auth.invalid_password',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'password' }
      });
    }

    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new NotFoundError({ code: 'auth.invalid_credentials', i18nKey: 'errors.auth.invalid_credentials' });
    }

    const isPasswordValid = await argon2.verify(user.password, data.password);
    if (!isPasswordValid) {
      throw new NotFoundError({ code: 'auth.invalid_credentials', i18nKey: 'errors.auth.invalid_credentials' });
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshTokens(data: RefreshTokenData) {
    if (!data.refreshToken || typeof data.refreshToken !== 'string') {
      throw new InvalidArgumentError({
        code: 'auth.invalid_refresh_token',
        i18nKey: 'errors.auth.invalid_refresh_token'
      });
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(data.refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET')
      });
    } catch {
      throw new UnauthorizedError({ code: 'auth.invalid_refresh_token', i18nKey: 'errors.auth.invalid_refresh_token' });
    }

    const user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedError({ code: 'auth.invalid_refresh_token', i18nKey: 'errors.auth.invalid_refresh_token' });
    }

    const hashedRefreshToken = createHash('sha256').update(data.refreshToken).digest('hex');
    const isRefreshTokenValid = hashedRefreshToken === user.refreshToken;

    if (!isRefreshTokenValid) {
      throw new UnauthorizedError({ code: 'auth.invalid_refresh_token', i18nKey: 'errors.auth.invalid_refresh_token' });
    }

    const tokens = await this.getTokens(user.id, user.email);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async getMe(userId: string): Promise<UserOutput> {
    const user = await this.usersService.findById(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
