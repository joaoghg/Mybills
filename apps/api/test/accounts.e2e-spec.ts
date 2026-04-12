import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';
import request from 'supertest';
import { App } from 'supertest/types';
import { SignInInput, SignUpInput, signInOutputSchema } from '@mybills/dtos';

describe('Accounts (e2e)', () => {
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
      name: 'Account User',
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

  it('should create an account for an authenticated user', async () => {
    const accessToken = await authenticateUser('accounts-create@mybills.dev');

    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Primary Account',
        balance: 15750
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'Primary Account',
      balance: 15750,
      userId: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  });

  it('should list only accounts from the authenticated user', async () => {
    const firstUserToken = await authenticateUser('accounts-list-user-a@mybills.dev');
    const secondUserToken = await authenticateUser('accounts-list-user-b@mybills.dev');

    const firstUserAccount = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .send({ name: 'A Account', balance: 1000 })
      .expect(201);

    const secondUserAccount = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${secondUserToken}`)
      .send({ name: 'B Account', balance: 2000 })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/accounts')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);

    const ids = (listResponse.body as Array<{ id: string }>).map((account) => account.id);

    expect(ids).toContain(firstUserAccount.body.id as string);
    expect(ids).not.toContain(secondUserAccount.body.id as string);
  });

  it('should return one account by id when account belongs to authenticated user', async () => {
    const accessToken = await authenticateUser('accounts-findone@mybills.dev');

    const createResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Find Account', balance: 3000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/accounts/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      name: 'Find Account',
      balance: 3000
    });
  });

  it('should return not found when trying to access another user account', async () => {
    const firstUserToken = await authenticateUser('accounts-not-found-a@mybills.dev');
    const secondUserToken = await authenticateUser('accounts-not-found-b@mybills.dev');

    const createResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .send({ name: 'Private Account', balance: 4500 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/accounts/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'accounts.account_not_found',
      error: 'not_found'
    });
  });

  it('should update an existing account', async () => {
    const accessToken = await authenticateUser('accounts-update@mybills.dev');

    const createResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Before Update', balance: 2500 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/accounts/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'After Update',
        balance: 2600
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      name: 'After Update',
      balance: 2600
    });
  });

  it('should transfer balance between two accounts from the authenticated user', async () => {
    const accessToken = await authenticateUser('accounts-transfer@mybills.dev');

    const sourceAccountResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Source Account', balance: 6000 })
      .expect(201);

    const destinationAccountResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Destination Account', balance: 1000 })
      .expect(201);

    const transferResponse = await request(app.getHttpServer())
      .post('/accounts/transfer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceAccountId: sourceAccountResponse.body.id,
        destinationAccountId: destinationAccountResponse.body.id,
        amount: 1500
      })
      .expect(200);

    expect(transferResponse.body).toMatchObject({
      sourceAccount: {
        id: sourceAccountResponse.body.id,
        balance: 4500
      },
      destinationAccount: {
        id: destinationAccountResponse.body.id,
        balance: 2500
      }
    });
  });

  it('should return bad request when transfer amount is greater than source account balance', async () => {
    const accessToken = await authenticateUser('accounts-transfer-insufficient@mybills.dev');

    const sourceAccountResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Source Limited Account', balance: 1000 })
      .expect(201);

    const destinationAccountResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Destination Account', balance: 500 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/accounts/transfer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceAccountId: sourceAccountResponse.body.id,
        destinationAccountId: destinationAccountResponse.body.id,
        amount: 1001
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'accounts.insufficient_balance',
      error: 'invalid_argument'
    });
  });

  it('should return not found when destination account does not belong to authenticated user', async () => {
    const firstUserToken = await authenticateUser('accounts-transfer-owner-a@mybills.dev');
    const secondUserToken = await authenticateUser('accounts-transfer-owner-b@mybills.dev');

    const sourceAccountResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .send({ name: 'Source Account', balance: 6000 })
      .expect(201);

    const destinationAccountResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${secondUserToken}`)
      .send({ name: 'Private Destination Account', balance: 1000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/accounts/transfer')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .send({
        sourceAccountId: sourceAccountResponse.body.id,
        destinationAccountId: destinationAccountResponse.body.id,
        amount: 500
      })
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'accounts.destination_account_not_found',
      error: 'not_found'
    });
  });

  it('should delete an account and return not found when fetching it afterwards', async () => {
    const accessToken = await authenticateUser('accounts-delete@mybills.dev');

    const createResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Delete Account', balance: 1200 })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/accounts/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const findDeletedAccountResponse = await request(app.getHttpServer())
      .get(`/accounts/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(findDeletedAccountResponse.body).toMatchObject({
      statusCode: 404,
      code: 'accounts.account_not_found',
      error: 'not_found'
    });
  });

  it('should validate account creation payload', async () => {
    const accessToken = await authenticateUser('accounts-validation@mybills.dev');

    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: '',
        balance: 1000.5
      })
      .expect(400);

    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.errors).toBeDefined();
  });
});
