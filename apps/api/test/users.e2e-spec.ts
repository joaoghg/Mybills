import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  signInOutputSchema,
  SignInInput,
  SignUpInput,
  updateUserInputSchema,
  userOutputSchema
} from '@mybills/dtos';
import { UsersService } from 'src/modules/user/users.service';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;

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

  async function authenticateUser(email: string): Promise<string> {
    const registerPayload: SignUpInput = {
      name: 'User Module Tester',
      email,
      password: 'StrongPass123'
    };

    await request(app.getHttpServer()).post('/auth/register').send(registerPayload).expect(201);

    const loginPayload: SignInInput = {
      email,
      password: registerPayload.password
    };

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginPayload)
      .expect(200);

    const output = signInOutputSchema.parse(loginResponse.body as object);

    return output.accessToken;
  }

  it('should list users', async () => {
    const userEmail = 'users-list@mybills.dev';
    const accessToken = await authenticateUser(userEmail);

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect((response.body as object[]).length).toBeGreaterThan(0);

    const foundUser = (response.body as object[]).find((item) => {
      const parsedUser = userOutputSchema.safeParse(item);

      return parsedUser.success && parsedUser.data.email === userEmail;
    });

    expect(foundUser).toBeDefined();
  });

  it('should get one user by id', async () => {
    const userEmail = 'users-findone@mybills.dev';
    const accessToken = await authenticateUser(userEmail);
    const user = await usersService.findByEmail(userEmail);

    if (!user) {
      throw new Error('Expected user to be created');
    }

    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const parsedUser = userOutputSchema.parse(response.body as object);

    expect(parsedUser.id).toBe(user.id);
    expect(parsedUser.email).toBe(user.email);
  });

  it('should update an existing user', async () => {
    const userEmail = 'users-update@mybills.dev';
    const accessToken = await authenticateUser(userEmail);
    const user = await usersService.findByEmail(userEmail);

    if (!user) {
      throw new Error('Expected user to be created');
    }

    const payload = updateUserInputSchema.parse({
      name: 'Updated Name',
      email: 'users-updated@mybills.dev'
    });

    const response = await request(app.getHttpServer())
      .patch(`/users/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(200);

    const parsedUser = userOutputSchema.parse(response.body as object);

    expect(parsedUser.name).toBe(payload.name);
    expect(parsedUser.email).toBe(payload.email);
  });

  it('should delete an existing user', async () => {
    const userEmail = 'users-delete@mybills.dev';
    const accessToken = await authenticateUser(userEmail);
    const user = await usersService.findByEmail(userEmail);

    if (!user) {
      throw new Error('Expected user to be created');
    }

    await request(app.getHttpServer())
      .delete(`/users/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'users.user_not_found',
      error: 'not_found'
    });
  });
});
