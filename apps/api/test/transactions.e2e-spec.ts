import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';
import request from 'supertest';
import { App } from 'supertest/types';
import { SignInInput, SignUpInput, signInOutputSchema } from '@mybills/dtos';

describe('Transactions (e2e)', () => {
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
      name: 'Transaction User',
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

  async function createAccount(
    accessToken: string,
    name: string,
    balance: number
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name,
        balance
      })
      .expect(201);

    return response.body.id as string;
  }

  async function getAccountBalance(accessToken: string, accountId: string): Promise<number> {
    const response = await request(app.getHttpServer())
      .get(`/accounts/${accountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return response.body.balance as number;
  }

  it('should create a paid expense transaction and decrease account balance', async () => {
    const accessToken = await authenticateUser('transactions-create-paid@mybills.dev');
    const accountId = await createAccount(accessToken, 'Main Account', 10000);

    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        description: 'Monthly bill',
        type: 'EXPENSE',
        amount: 2500,
        date: '2026-04-04',
        isPaid: true
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      accountId,
      type: 'EXPENSE',
      amount: 2500,
      isPaid: true
    });

    const balance = await getAccountBalance(accessToken, accountId);

    expect(balance).toBe(7500);
  });

  it('should list and get transactions from the authenticated user', async () => {
    const accessToken = await authenticateUser('transactions-list@mybills.dev');
    const accountId = await createAccount(accessToken, 'List Account', 5000);

    const created = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        description: 'Groceries',
        type: 'EXPENSE',
        amount: 1000,
        date: '2026-04-05',
        isPaid: false
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const ids = (list.body as Array<{ id: string }>).map((transaction) => transaction.id);
    expect(ids).toContain(created.body.id as string);

    const findOne = await request(app.getHttpServer())
      .get(`/transactions/${created.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(findOne.body).toMatchObject({
      id: created.body.id,
      description: 'Groceries'
    });
  });

  it('should update an existing transaction', async () => {
    const accessToken = await authenticateUser('transactions-update@mybills.dev');
    const accountId = await createAccount(accessToken, 'Update Account', 5000);

    const created = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        description: 'Old Description',
        type: 'EXPENSE',
        amount: 900,
        date: '2026-04-06',
        isPaid: false
      })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/transactions/${created.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        description: 'New Description',
        amount: 1200
      })
      .expect(200);

    expect(updated.body).toMatchObject({
      id: created.body.id,
      description: 'New Description',
      amount: 1200
    });
  });

  it('should update isPaid and impact account balance only when paid', async () => {
    const accessToken = await authenticateUser('transactions-paid-status@mybills.dev');
    const accountId = await createAccount(accessToken, 'Paid Status Account', 10000);

    const created = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        description: 'Utilities',
        type: 'EXPENSE',
        amount: 3000,
        date: '2026-04-07',
        isPaid: false
      })
      .expect(201);

    const balanceBefore = await getAccountBalance(accessToken, accountId);
    expect(balanceBefore).toBe(10000);

    await request(app.getHttpServer())
      .patch(`/transactions/${created.body.id as string}/is-paid`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isPaid: true })
      .expect(200);

    const balanceAfterPaying = await getAccountBalance(accessToken, accountId);
    expect(balanceAfterPaying).toBe(7000);

    await request(app.getHttpServer())
      .patch(`/transactions/${created.body.id as string}/is-paid`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isPaid: false })
      .expect(200);

    const balanceAfterUnpaying = await getAccountBalance(accessToken, accountId);
    expect(balanceAfterUnpaying).toBe(10000);
  });

  it('should create a paid income transaction and increase account balance', async () => {
    const accessToken = await authenticateUser('transactions-income-paid@mybills.dev');
    const accountId = await createAccount(accessToken, 'Income Account', 10000);

    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        description: 'Salary',
        type: 'INCOME',
        amount: 4500,
        date: '2026-04-09',
        isPaid: true
      })
      .expect(201);

    const balance = await getAccountBalance(accessToken, accountId);
    expect(balance).toBe(14500);
  });

  it('should rebalance paid transaction when changing account on update', async () => {
    const accessToken = await authenticateUser('transactions-change-account@mybills.dev');
    const firstAccountId = await createAccount(accessToken, 'Primary Account', 10000);
    const secondAccountId = await createAccount(accessToken, 'Secondary Account', 5000);

    const created = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId: firstAccountId,
        description: 'Rent',
        type: 'EXPENSE',
        amount: 2000,
        date: '2026-04-10',
        isPaid: true
      })
      .expect(201);

    const firstBalanceAfterCreate = await getAccountBalance(accessToken, firstAccountId);
    const secondBalanceAfterCreate = await getAccountBalance(accessToken, secondAccountId);
    expect(firstBalanceAfterCreate).toBe(8000);
    expect(secondBalanceAfterCreate).toBe(5000);

    await request(app.getHttpServer())
      .patch(`/transactions/${created.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId: secondAccountId
      })
      .expect(200);

    const firstBalanceAfterUpdate = await getAccountBalance(accessToken, firstAccountId);
    const secondBalanceAfterUpdate = await getAccountBalance(accessToken, secondAccountId);
    expect(firstBalanceAfterUpdate).toBe(10000);
    expect(secondBalanceAfterUpdate).toBe(3000);
  });

  it('should delete a transaction and return not found when fetching it afterwards', async () => {
    const accessToken = await authenticateUser('transactions-delete@mybills.dev');
    const accountId = await createAccount(accessToken, 'Delete Account', 9000);

    const created = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        description: 'To be deleted',
        type: 'EXPENSE',
        amount: 1000,
        date: '2026-04-08',
        isPaid: false
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/transactions/${created.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const response = await request(app.getHttpServer())
      .get(`/transactions/${created.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'transactions.transaction_not_found',
      error: 'not_found'
    });
  });

  describe('list filters', () => {
    async function createCategory(accessToken: string, name: string): Promise<string> {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name, icon: 'cart-outline', types: ['INCOME', 'EXPENSE'] })
        .expect(201);

      return response.body.id as string;
    }

    async function seedTransactions(accessToken: string, accountId: string, categoryId: string) {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          categoryId,
          description: 'Supermarket groceries',
          type: 'EXPENSE',
          amount: 1500,
          date: '2026-03-15',
          isPaid: false
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          categoryId,
          description: 'Salary payment',
          type: 'INCOME',
          amount: 500000,
          date: '2026-04-01',
          isPaid: false
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          description: 'Account transfer',
          type: 'TRANSFER',
          amount: 2000,
          date: '2026-04-02',
          isPaid: false
        })
        .expect(201);
    }

    it('should filter transactions by month and year', async () => {
      const accessToken = await authenticateUser('transactions-filter-month@mybills.dev');
      const accountId = await createAccount(accessToken, 'Filter Month Account', 10000);
      const categoryId = await createCategory(accessToken, 'Food');
      await seedTransactions(accessToken, accountId, categoryId);

      const march = await request(app.getHttpServer())
        .get('/transactions')
        .query({ year: 2026, month: 3, includeTransfer: true })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(march.body).toHaveLength(1);
      expect(march.body[0]).toMatchObject({ description: 'Supermarket groceries' });

      const april = await request(app.getHttpServer())
        .get('/transactions')
        .query({ year: 2026, month: 4, includeTransfer: true })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(april.body).toHaveLength(2);
    });

    it('should filter transactions by type and exclude transfers by default when includeTransfer is false', async () => {
      const accessToken = await authenticateUser('transactions-filter-type@mybills.dev');
      const accountId = await createAccount(accessToken, 'Filter Type Account', 10000);
      const categoryId = await createCategory(accessToken, 'Salary Cat');
      await seedTransactions(accessToken, accountId, categoryId);

      const incomeOnly = await request(app.getHttpServer())
        .get('/transactions')
        .query({ year: 2026, month: 4, type: 'INCOME', includeTransfer: true })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(incomeOnly.body).toHaveLength(1);
      expect(incomeOnly.body[0]).toMatchObject({ type: 'INCOME' });

      const withoutTransfers = await request(app.getHttpServer())
        .get('/transactions')
        .query({ year: 2026, month: 4, includeTransfer: false })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const types = (withoutTransfers.body as Array<{ type: string }>).map((tx) => tx.type);
      expect(types).not.toContain('TRANSFER');
      expect(types).toContain('INCOME');
    });

    it('should filter transactions by category and search', async () => {
      const accessToken = await authenticateUser('transactions-filter-search@mybills.dev');
      const accountId = await createAccount(accessToken, 'Filter Search Account', 10000);
      const categoryId = await createCategory(accessToken, 'Groceries');
      await seedTransactions(accessToken, accountId, categoryId);

      const byCategory = await request(app.getHttpServer())
        .get('/transactions')
        .query({ year: 2026, month: 3, categoryId, includeTransfer: true })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(byCategory.body).toHaveLength(1);
      expect(byCategory.body[0]).toMatchObject({ categoryId });

      const bySearch = await request(app.getHttpServer())
        .get('/transactions')
        .query({ search: 'super', includeTransfer: true })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(bySearch.body).toHaveLength(1);
      expect(bySearch.body[0]).toMatchObject({ description: 'Supermarket groceries' });
    });

    it('should reject month without year query params', async () => {
      const accessToken = await authenticateUser('transactions-filter-validation@mybills.dev');

      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ month: 4 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.message).toEqual(expect.any(String));
      expect(response.body.errors).toBeDefined();
    });
  });
});
