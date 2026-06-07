import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';
import request from 'supertest';
import { App } from 'supertest/types';
import { SignInInput, SignUpInput, signInOutputSchema } from '@mybills/dtos';

const defaultCategoryIcon = 'restaurant-outline' as const;
const defaultCategoryTypes = ['EXPENSE'] as const;

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function authenticateUser(email: string): Promise<string> {
    const registerPayload: SignUpInput = {
      name: 'Category User',
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

  it('should create a category for an authenticated user', async () => {
    const accessToken = await authenticateUser('categories-create@mybills.dev');

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Food',
        icon: defaultCategoryIcon,
        types: defaultCategoryTypes
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      userId: expect.any(String),
      name: 'Food',
      icon: defaultCategoryIcon,
      types: defaultCategoryTypes,
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  });

  it('should list only categories from the authenticated user', async () => {
    const firstUserToken = await authenticateUser('categories-list-user-a@mybills.dev');
    const secondUserToken = await authenticateUser('categories-list-user-b@mybills.dev');

    const firstUserCategory = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .send({
        name: 'A Category',
        icon: defaultCategoryIcon,
        types: defaultCategoryTypes
      })
      .expect(201);

    const secondUserCategory = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${secondUserToken}`)
      .send({
        name: 'B Category',
        icon: 'cart-outline',
        types: defaultCategoryTypes
      })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);

    const ids = (listResponse.body as Array<{ id: string }>).map((category) => category.id);

    expect(ids).toContain(firstUserCategory.body.id as string);
    expect(ids).not.toContain(secondUserCategory.body.id as string);
  });

  it('should return one category by id when it belongs to the authenticated user', async () => {
    const accessToken = await authenticateUser('categories-findone@mybills.dev');

    const createResponse = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Find Category',
        icon: defaultCategoryIcon,
        types: defaultCategoryTypes
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/categories/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      name: 'Find Category',
      icon: defaultCategoryIcon
    });
  });

  it('should return not found when trying to access another user category', async () => {
    const firstUserToken = await authenticateUser('categories-not-found-a@mybills.dev');
    const secondUserToken = await authenticateUser('categories-not-found-b@mybills.dev');

    const createResponse = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .send({
        name: 'Private Category',
        icon: defaultCategoryIcon,
        types: defaultCategoryTypes
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/categories/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'categories.category_not_found',
      error: 'not_found'
    });
  });

  it('should update an existing category', async () => {
    const accessToken = await authenticateUser('categories-update@mybills.dev');

    const createResponse = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Before Update',
        icon: defaultCategoryIcon,
        types: defaultCategoryTypes
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/categories/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'After Update'
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      name: 'After Update'
    });
  });

  it('should delete a category and return not found when fetching it afterwards', async () => {
    const accessToken = await authenticateUser('categories-delete@mybills.dev');

    const createResponse = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Delete Category',
        icon: defaultCategoryIcon,
        types: defaultCategoryTypes
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/categories/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const findDeletedCategoryResponse = await request(app.getHttpServer())
      .get(`/categories/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(findDeletedCategoryResponse.body).toMatchObject({
      statusCode: 404,
      code: 'categories.category_not_found',
      error: 'not_found'
    });
  });

  it('should validate category creation payload', async () => {
    const accessToken = await authenticateUser('categories-validation@mybills.dev');

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: ''
      })
      .expect(400);

    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.errors).toBeDefined();
  });

  it('should return conflict when creating duplicated category names for same user', async () => {
    const accessToken = await authenticateUser('categories-conflict@mybills.dev');

    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Bills',
        icon: defaultCategoryIcon,
        types: defaultCategoryTypes
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Bills',
        icon: 'cart-outline',
        types: defaultCategoryTypes
      })
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      code: 'categories.category_already_exists',
      error: 'already_exists'
    });
  });

  it('should reject category creation when types are missing', async () => {
    const accessToken = await authenticateUser('categories-missing-types@mybills.dev');

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'No Types Category',
        icon: defaultCategoryIcon
      })
      .expect(400);

    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.errors).toBeDefined();
  });

  it('should reject category creation when icon is not allowed', async () => {
    const accessToken = await authenticateUser('categories-invalid-icon@mybills.dev');

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Invalid Icon Category',
        icon: 'not-a-real-icon',
        types: defaultCategoryTypes
      })
      .expect(400);

    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.errors).toBeDefined();
  });
});
