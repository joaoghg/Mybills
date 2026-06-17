import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';
import request from 'supertest';
import { App } from 'supertest/types';
import { SignInInput, SignUpInput, signInOutputSchema } from '@mybills/dtos';

describe('Transfers (e2e)', () => {
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
      name: 'Transfer User',
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

  it('should create default transfer category on signup', async () => {
    const accessToken = await authenticateUser('transfers-signup-category@mybills.dev');

    const categoriesResponse = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(categoriesResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Transferência',
          icon: 'swap-horizontal-outline',
          isSystem: true
        })
      ])
    );
  });

  it('should create transfer with two linked transactions and updated balances', async () => {
    const accessToken = await authenticateUser('transfers-create@mybills.dev');

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
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceAccountId: sourceAccountResponse.body.id,
        destinationAccountId: destinationAccountResponse.body.id,
        amount: 1500,
        date: '2026-06-07'
      })
      .expect(201);

    expect(transferResponse.body.transferGroupId).toEqual(expect.any(String));
    expect(transferResponse.body.sourceTransaction).toMatchObject({
      type: 'EXPENSE',
      accountId: sourceAccountResponse.body.id,
      amount: 1500,
      isPaid: true,
      transferGroupId: transferResponse.body.transferGroupId
    });
    expect(transferResponse.body.destinationTransaction).toMatchObject({
      type: 'INCOME',
      accountId: destinationAccountResponse.body.id,
      amount: 1500,
      isPaid: true,
      transferGroupId: transferResponse.body.transferGroupId
    });

    const sourceAccount = await request(app.getHttpServer())
      .get(`/accounts/${sourceAccountResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const destinationAccount = await request(app.getHttpServer())
      .get(`/accounts/${destinationAccountResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(sourceAccount.body.balance).toBe(4500);
    expect(destinationAccount.body.balance).toBe(2500);
  });

  it('should return bad request when source and destination accounts are the same', async () => {
    const accessToken = await authenticateUser('transfers-same-account@mybills.dev');

    const accountResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Single Account', balance: 5000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceAccountId: accountResponse.body.id,
        destinationAccountId: accountResponse.body.id,
        amount: 100,
        date: '2026-06-07'
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'accounts.source_and_destination_must_differ',
      error: 'invalid_argument'
    });
  });

  it('should return bad request when transfer amount is greater than source account balance', async () => {
    const accessToken = await authenticateUser('transfers-insufficient@mybills.dev');

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
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceAccountId: sourceAccountResponse.body.id,
        destinationAccountId: destinationAccountResponse.body.id,
        amount: 1001,
        date: '2026-06-07'
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'accounts.insufficient_balance',
      error: 'invalid_argument'
    });
  });

  it('should return not found when destination account does not belong to authenticated user', async () => {
    const firstUserToken = await authenticateUser('transfers-owner-a@mybills.dev');
    const secondUserToken = await authenticateUser('transfers-owner-b@mybills.dev');

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
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .send({
        sourceAccountId: sourceAccountResponse.body.id,
        destinationAccountId: destinationAccountResponse.body.id,
        amount: 500,
        date: '2026-06-07'
      })
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'accounts.destination_account_not_found',
      error: 'not_found'
    });
  });
});
