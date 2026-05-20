import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';
import request from 'supertest';
import { App } from 'supertest/types';
import { createHash } from 'crypto';
import {
  signInOutputSchema,
  signUpOutputSchema,
  SignInInput,
  SignInOutput,
  SignUpInput,
  SignUpOutput
} from '@mybills/dtos';
import { UsersService } from 'src/modules/user/users.service';
import { User } from 'src/modules/user/entities/user.entity';
import {
  refreshTokenOutputSchema,
  RefreshTokenOutput,
  userOutputSchema
} from '@mybills/dtos';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;

  function parseSignUpOutput(body: object): SignUpOutput {
    return signUpOutputSchema.parse(body);
  }

  function parseSignInOutput(body: object): SignInOutput {
    return signInOutputSchema.parse(body);
  }

  function parseRefreshTokenOutput(body: object): RefreshTokenOutput {
    return refreshTokenOutputSchema.parse(body);
  }

  function getPersistedRefreshToken(user: User | null): string {
    if (!user?.refreshToken) {
      throw new Error('Expected persisted refresh token to exist');
    }

    return user.refreshToken;
  }

  function expectRefreshTokenCleared(user: User | null): void {
    expect(user).not.toBeNull();
    expect(user?.refreshToken).toBeNull();
  }

  function hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    usersService = app.get(UsersService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user and return tokens', async () => {
    const payload: SignUpInput = {
      name: 'teste',
      email: 'teste@mybills.dev',
      password: 'Teste123'
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);
    const registerOutput = parseSignUpOutput(response.body as object);

    expect(registerOutput).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String)
    });

    const createdUser: User | null = await usersService.findByEmail(payload.email);

    expect(createdUser).not.toBeNull();
    expect(createdUser?.password).not.toBe(payload.password);
    expect(createdUser?.refreshToken).toBeTruthy();
    expect(createdUser?.refreshToken).not.toBe(registerOutput.refreshToken);

    const persistedRefreshToken = getPersistedRefreshToken(createdUser);

    expect(persistedRefreshToken).toBe(hashRefreshToken(registerOutput.refreshToken));
  });

  it('should not allow duplicate email registration', async () => {
    const payload: SignUpInput = {
      name: 'teste duplicado',
      email: 'teste-duplicado@mybills.dev',
      password: 'Teste123'
    };

    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);

    const duplicateResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(409);

    expect(duplicateResponse.body).toMatchObject({
      statusCode: 409,
      code: 'auth.email_already_registered',
      error: 'already_exists'
    });
  });

  it('should validate register payload', async () => {
    const invalidPayload = {
      name: 'Invalid User',
      email: 'invalid-email',
      password: '123'
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(invalidPayload)
      .expect(400);

    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.errors).toBeDefined();
  });

  it('should login with valid credentials and return tokens', async () => {
    const payload: SignUpInput = {
      name: 'Login User',
      email: 'login-success@mybills.dev',
      password: 'Teste123'
    };

    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);

    const loginPayload: SignInInput = {
      email: payload.email,
      password: payload.password
    };

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginPayload)
      .expect(200);
    const loginOutput = parseSignInOutput(loginResponse.body as object);

    expect(loginOutput).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String)
    });

    const user: User | null = await usersService.findByEmail(payload.email);

    expect(user?.refreshToken).toBeTruthy();

    const persistedRefreshToken = getPersistedRefreshToken(user);

    expect(persistedRefreshToken).toBe(hashRefreshToken(loginOutput.refreshToken));
  });

  it('should return not found when login password is invalid', async () => {
    const payload: SignUpInput = {
      name: 'Wrong Password User',
      email: 'wrong-password@mybills.dev',
      password: 'StrongPass123'
    };

    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);

    const invalidLoginPayload: SignInInput = {
      email: payload.email,
      password: 'WrongPass123'
    };

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(invalidLoginPayload)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'auth.invalid_credentials',
      error: 'not_found'
    });
  });

  it('should return not found when login user does not exist', async () => {
    const payload: SignInInput = {
      email: 'not-found-user@mybills.dev',
      password: 'StrongPass123'
    };

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(payload)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'auth.invalid_credentials',
      error: 'not_found'
    });
  });

  it('should validate login payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'invalid-email',
        password: ''
      })
      .expect(400);

    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.errors).toBeDefined();
  });

  it('should refresh tokens and rotate the stored refresh token', async () => {
    const payload: SignUpInput = {
      name: 'Refresh User',
      email: 'refresh-user@mybills.dev',
      password: 'Teste123'
    };

    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(200);

    const loginOutput = parseSignInOutput(loginResponse.body as object);

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginOutput.refreshToken })
      .expect(200);

    const refreshOutput = parseRefreshTokenOutput(refreshResponse.body as object);

    expect(refreshOutput).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String)
    });

    expect(refreshOutput.refreshToken).not.toBe(loginOutput.refreshToken);

    const user = await usersService.findByEmail(payload.email);
    const persistedRefreshToken = getPersistedRefreshToken(user);

    expect(persistedRefreshToken).toBe(hashRefreshToken(refreshOutput.refreshToken));

    const reusedRefreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginOutput.refreshToken })
      .expect(401);

    expect(reusedRefreshResponse.body).toMatchObject({
      statusCode: 401,
      code: 'auth.invalid_refresh_token',
      error: 'unauthorized'
    });
  });

  it('should return the authenticated user from GET /auth/me', async () => {
    const payload: SignUpInput = {
      name: 'Me User',
      email: 'me-user@mybills.dev',
      password: 'Teste123'
    };

    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(200);

    const loginOutput = parseSignInOutput(loginResponse.body as object);

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginOutput.accessToken}`)
      .expect(200);

    const meUser = userOutputSchema.parse(meResponse.body as object);

    expect(meUser.name).toBe(payload.name);
    expect(meUser.email).toBe(payload.email);
    expect(meUser.id).toEqual(expect.any(String));
  });

  it('should logout and invalidate the current refresh token', async () => {
    const payload: SignUpInput = {
      name: 'Logout User',
      email: 'logout-user@mybills.dev',
      password: 'Teste123'
    };

    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(200);

    const loginOutput = parseSignInOutput(loginResponse.body as object);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${loginOutput.accessToken}`)
      .expect(204);

    const user = await usersService.findByEmail(payload.email);
    expectRefreshTokenCleared(user);

    const refreshAfterLogoutResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginOutput.refreshToken })
      .expect(401);

    expect(refreshAfterLogoutResponse.body).toMatchObject({
      statusCode: 401,
      code: 'auth.invalid_refresh_token',
      error: 'unauthorized'
    });
  });
});
