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

  async function createTransferFixture(accessToken: string) {
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
        date: '2026-06-07',
        description: 'Monthly move'
      })
      .expect(201);

    return {
      sourceAccountId: sourceAccountResponse.body.id as string,
      destinationAccountId: destinationAccountResponse.body.id as string,
      transferGroupId: transferResponse.body.transferGroupId as string,
      sourceTransactionId: transferResponse.body.sourceTransaction.id as string,
      destinationTransactionId: transferResponse.body.destinationTransaction.id as string
    };
  }

  it('should get transfer pair by transfer group id', async () => {
    const accessToken = await authenticateUser('transfers-get@mybills.dev');
    const fixture = await createTransferFixture(accessToken);

    const response = await request(app.getHttpServer())
      .get(`/transactions/transfer/${fixture.transferGroupId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      transferGroupId: fixture.transferGroupId,
      sourceTransaction: expect.objectContaining({
        id: fixture.sourceTransactionId,
        type: 'EXPENSE',
        amount: 1500
      }),
      destinationTransaction: expect.objectContaining({
        id: fixture.destinationTransactionId,
        type: 'INCOME',
        amount: 1500
      })
    });
  });

  it('should delete both transfer legs and restore balances when deleting one leg', async () => {
    const accessToken = await authenticateUser('transfers-delete@mybills.dev');
    const fixture = await createTransferFixture(accessToken);

    await request(app.getHttpServer())
      .delete(`/transactions/${fixture.sourceTransactionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/transactions/${fixture.sourceTransactionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/transactions/${fixture.destinationTransactionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    const sourceAccount = await request(app.getHttpServer())
      .get(`/accounts/${fixture.sourceAccountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const destinationAccount = await request(app.getHttpServer())
      .get(`/accounts/${fixture.destinationAccountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(sourceAccount.body.balance).toBe(6000);
    expect(destinationAccount.body.balance).toBe(1000);
  });

  it('should reject patching an individual transfer leg', async () => {
    const accessToken = await authenticateUser('transfers-patch-leg@mybills.dev');
    const fixture = await createTransferFixture(accessToken);

    const response = await request(app.getHttpServer())
      .patch(`/transactions/${fixture.sourceTransactionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 2000 })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'transactions.transfer_edit_not_allowed',
      error: 'invalid_argument'
    });
  });

  it('should update transfer pair and rebalance accounts', async () => {
    const accessToken = await authenticateUser('transfers-update@mybills.dev');
    const fixture = await createTransferFixture(accessToken);

    const thirdAccountResponse = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Third Account', balance: 3000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/transactions/transfer/${fixture.transferGroupId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceAccountId: thirdAccountResponse.body.id,
        destinationAccountId: fixture.destinationAccountId,
        amount: 2000,
        date: '2026-06-08',
        description: 'Updated transfer'
      })
      .expect(200);

    expect(response.body).toMatchObject({
      transferGroupId: fixture.transferGroupId,
      sourceTransaction: expect.objectContaining({
        accountId: thirdAccountResponse.body.id,
        amount: 2000,
        description: 'Updated transfer'
      }),
      destinationTransaction: expect.objectContaining({
        accountId: fixture.destinationAccountId,
        amount: 2000,
        description: 'Updated transfer'
      })
    });

    const originalSource = await request(app.getHttpServer())
      .get(`/accounts/${fixture.sourceAccountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const newSource = await request(app.getHttpServer())
      .get(`/accounts/${thirdAccountResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const destinationAccount = await request(app.getHttpServer())
      .get(`/accounts/${fixture.destinationAccountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(originalSource.body.balance).toBe(6000);
    expect(newSource.body.balance).toBe(1000);
    expect(destinationAccount.body.balance).toBe(3000);
  });
});
