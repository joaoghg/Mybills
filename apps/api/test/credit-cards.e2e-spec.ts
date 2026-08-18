import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';
import request from 'supertest';
import { App } from 'supertest/types';
import { SignInInput, SignUpInput, signInOutputSchema } from '@mybills/dtos';

describe('CreditCards (e2e)', () => {
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
      name: 'Credit Card User',
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

  async function createAccount(accessToken: string, name: string, balance: number) {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name, balance })
      .expect(201);

    return response.body as { id: string };
  }

  it('should create a credit card for an authenticated user', async () => {
    const accessToken = await authenticateUser('credit-cards-create@mybills.dev');
    const account = await createAccount(accessToken, 'Card Account', 0);

    const response = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId: account.id,
        name: 'Platinum Card',
        limit: 1000000,
        closingDay: 10,
        dueDay: 18
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      userId: expect.any(String),
      accountId: account.id,
      name: 'Platinum Card',
      limit: 1000000,
      closingDay: 10,
      closingOnLastDay: false,
      dueDay: 18,
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  });

  it('should create a credit card that closes on the last day of the month', async () => {
    const accessToken = await authenticateUser('credit-cards-create-last-day@mybills.dev');

    const response = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Last Day Card',
        limit: 750000,
        closingOnLastDay: true,
        dueDay: 10
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'Last Day Card',
      closingDay: 31,
      closingOnLastDay: true,
      dueDay: 10
    });
  });

  it('should create a credit card without a linked account', async () => {
    const accessToken = await authenticateUser('credit-cards-create-no-account@mybills.dev');

    const response = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Standalone Card',
        limit: 500000,
        closingDay: 5,
        dueDay: 12
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      userId: expect.any(String),
      accountId: null,
      name: 'Standalone Card',
      limit: 500000,
      closingDay: 5,
      closingOnLastDay: false,
      dueDay: 12,
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  });

  it('should list only credit cards from the authenticated user', async () => {
    const firstUserToken = await authenticateUser('credit-cards-list-user-a@mybills.dev');
    const secondUserToken = await authenticateUser('credit-cards-list-user-b@mybills.dev');

    const firstUserAccount = await createAccount(firstUserToken, 'A Account', 0);
    const secondUserAccount = await createAccount(secondUserToken, 'B Account', 0);

    const firstUserCard = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .send({
        accountId: firstUserAccount.id,
        name: 'A Card',
        limit: 200000,
        closingDay: 5,
        dueDay: 12
      })
      .expect(201);

    const secondUserCard = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${secondUserToken}`)
      .send({
        accountId: secondUserAccount.id,
        name: 'B Card',
        limit: 300000,
        closingDay: 7,
        dueDay: 15
      })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/credit-cards')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);

    const ids = (listResponse.body as Array<{ id: string }>).map((creditCard) => creditCard.id);

    expect(ids).toContain(firstUserCard.body.id as string);
    expect(ids).not.toContain(secondUserCard.body.id as string);
  });

  it('should return one credit card by id when it belongs to the authenticated user', async () => {
    const accessToken = await authenticateUser('credit-cards-findone@mybills.dev');
    const account = await createAccount(accessToken, 'Find Account', 0);

    const createResponse = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId: account.id,
        name: 'Find Card',
        limit: 150000,
        closingDay: 8,
        dueDay: 16
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/credit-cards/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      name: 'Find Card',
      limit: 150000
    });
  });

  it('should return not found when trying to access another user credit card', async () => {
    const firstUserToken = await authenticateUser('credit-cards-not-found-a@mybills.dev');
    const secondUserToken = await authenticateUser('credit-cards-not-found-b@mybills.dev');

    const firstUserAccount = await createAccount(firstUserToken, 'Private Account A', 0);
    const secondUserAccount = await createAccount(secondUserToken, 'Private Account B', 0);

    const createResponse = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${firstUserToken}`)
      .send({
        accountId: firstUserAccount.id,
        name: 'Private Card',
        limit: 180000,
        closingDay: 9,
        dueDay: 17
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/credit-cards/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'credit_cards.credit_card_not_found',
      error: 'not_found'
    });

    await request(app.getHttpServer())
      .get(`/accounts/${secondUserAccount.id}`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(200);
  });

  it('should update an existing credit card', async () => {
    const accessToken = await authenticateUser('credit-cards-update@mybills.dev');
    const account = await createAccount(accessToken, 'Update Account', 0);

    const createResponse = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId: account.id,
        name: 'Before Update',
        limit: 250000,
        closingDay: 11,
        dueDay: 19
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/credit-cards/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'After Update',
        limit: 260000
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      name: 'After Update',
      limit: 260000
    });
  });

  it('should delete a credit card and return not found when fetching it afterwards', async () => {
    const accessToken = await authenticateUser('credit-cards-delete@mybills.dev');
    const account = await createAccount(accessToken, 'Delete Account', 0);

    const createResponse = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId: account.id,
        name: 'Delete Card',
        limit: 120000,
        closingDay: 6,
        dueDay: 14
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/credit-cards/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const findDeletedCreditCardResponse = await request(app.getHttpServer())
      .get(`/credit-cards/${createResponse.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(findDeletedCreditCardResponse.body).toMatchObject({
      statusCode: 404,
      code: 'credit_cards.credit_card_not_found',
      error: 'not_found'
    });
  });

  it('should validate credit card creation payload', async () => {
    const accessToken = await authenticateUser('credit-cards-validation@mybills.dev');
    const account = await createAccount(accessToken, 'Validation Account', 0);

    const response = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId: account.id,
        name: '',
        limit: 1000.5,
        closingDay: 0,
        dueDay: 32
      })
      .expect(400);

    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.errors).toBeDefined();
  });

  describe('POST /credit-cards/:id/pay-invoice', () => {
    async function createCardPurchase(
      accessToken: string,
      cardId: string,
      amount: number,
      date: string
    ) {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'EXPENSE',
          amount,
          date,
          cardId,
          isPaid: false,
          description: 'Card purchase'
        })
        .expect(201);
    }

    async function findInvoiceIdByEndsOn(
      accessToken: string,
      cardId: string,
      endsOn: string
    ): Promise<string> {
      const response = await request(app.getHttpServer())
        .get(`/credit-cards/${cardId}/invoices`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const invoice = (response.body as Array<{ id: string; endsOn: string }>).find(
        (item) => item.endsOn === endsOn
      );
      if (!invoice) {
        throw new Error(`Invoice ending ${endsOn} not found`);
      }
      return invoice.id;
    }

    it('should pay a closed invoice once and reject double pay', async () => {
      const accessToken = await authenticateUser('credit-cards-pay-happy@mybills.dev');
      const account = await createAccount(accessToken, 'Pay Account', 50000);

      const cardResponse = await request(app.getHttpServer())
        .post('/credit-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: account.id,
          name: 'Pay Card',
          limit: 100000,
          closingDay: 10,
          dueDay: 18
        })
        .expect(201);

      const cardId = cardResponse.body.id as string;

      await createCardPurchase(accessToken, cardId, 10000, '2026-05-15');
      await createCardPurchase(accessToken, cardId, 5000, '2026-06-01');

      const invoiceId = await findInvoiceIdByEndsOn(accessToken, cardId, '2026-06-09');

      const payResponse = await request(app.getHttpServer())
        .post(`/credit-cards/${cardId}/pay-invoice`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ invoiceId })
        .expect(201);

      expect(payResponse.body).toMatchObject({
        amount: 15000,
        accountId: account.id,
        paidCount: 2,
        invoiceId,
        cycleStart: '2026-05-10',
        cycleEnd: '2026-06-09',
        paymentTransactionId: expect.any(String)
      });

      const accountAfter = await request(app.getHttpServer())
        .get(`/accounts/${account.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(accountAfter.body.balance).toBe(35000);

      const cardAfter = await request(app.getHttpServer())
        .get(`/credit-cards/${cardId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(cardAfter.body.usedAmount).toBe(0);

      const paymentTx = await request(app.getHttpServer())
        .get(`/transactions/${payResponse.body.paymentTransactionId as string}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(paymentTx.body).toMatchObject({
        type: 'EXPENSE',
        amount: 15000,
        accountId: account.id,
        cardId: null,
        isPaid: true
      });

      const doublePay = await request(app.getHttpServer())
        .post(`/credit-cards/${cardId}/pay-invoice`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ invoiceId })
        .expect(400);

      expect(doublePay.body).toMatchObject({
        code: 'credit_cards.invoice_already_paid',
        error: 'invalid_argument'
      });
    });

    it('should pay a February closed invoice when card closes on last day of month', async () => {
      const accessToken = await authenticateUser('credit-cards-pay-last-day@mybills.dev');
      const account = await createAccount(accessToken, 'Last Day Pay Account', 50000);

      const cardResponse = await request(app.getHttpServer())
        .post('/credit-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: account.id,
          name: 'Last Day Pay Card',
          limit: 100000,
          closingOnLastDay: true,
          dueDay: 10
        })
        .expect(201);

      const cardId = cardResponse.body.id as string;

      await createCardPurchase(accessToken, cardId, 8000, '2026-02-10');
      await createCardPurchase(accessToken, cardId, 2000, '2026-02-20');

      const invoiceId = await findInvoiceIdByEndsOn(accessToken, cardId, '2026-02-27');

      const payResponse = await request(app.getHttpServer())
        .post(`/credit-cards/${cardId}/pay-invoice`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ invoiceId })
        .expect(201);

      expect(payResponse.body).toMatchObject({
        amount: 10000,
        accountId: account.id,
        paidCount: 2,
        invoiceId,
        cycleStart: '2026-01-31',
        cycleEnd: '2026-02-27',
        paymentTransactionId: expect.any(String)
      });
    });

    it('should reject paying an open cycle before closing day', async () => {
      const accessToken = await authenticateUser('credit-cards-pay-before@mybills.dev');
      const account = await createAccount(accessToken, 'Before Account', 50000);

      const cardResponse = await request(app.getHttpServer())
        .post('/credit-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: account.id,
          name: 'Before Card',
          limit: 100000,
          closingDay: 10,
          dueDay: 18
        })
        .expect(201);

      const cardId = cardResponse.body.id as string;
      await createCardPurchase(accessToken, cardId, 8000, '2099-01-15');

      const invoiceId = await findInvoiceIdByEndsOn(accessToken, cardId, '2099-02-09');

      const response = await request(app.getHttpServer())
        .post(`/credit-cards/${cardId}/pay-invoice`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ invoiceId })
        .expect(400);

      expect(response.body).toMatchObject({
        code: 'credit_cards.invoice_not_closed',
        error: 'invalid_argument'
      });
    });

    it('should reject paying when no account is available', async () => {
      const accessToken = await authenticateUser('credit-cards-pay-no-account@mybills.dev');

      const cardResponse = await request(app.getHttpServer())
        .post('/credit-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'No Account Card',
          limit: 100000,
          closingDay: 10,
          dueDay: 18
        })
        .expect(201);

      const cardId = cardResponse.body.id as string;
      await createCardPurchase(accessToken, cardId, 8000, '2026-05-15');
      const invoiceId = await findInvoiceIdByEndsOn(accessToken, cardId, '2026-06-09');

      const response = await request(app.getHttpServer())
        .post(`/credit-cards/${cardId}/pay-invoice`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ invoiceId })
        .expect(400);

      expect(response.body).toMatchObject({
        code: 'credit_cards.account_required',
        error: 'invalid_argument'
      });
    });

    it('should reject paying a missing invoice', async () => {
      const accessToken = await authenticateUser('credit-cards-pay-empty@mybills.dev');
      const account = await createAccount(accessToken, 'Empty Account', 50000);

      const cardResponse = await request(app.getHttpServer())
        .post('/credit-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: account.id,
          name: 'Empty Card',
          limit: 100000,
          closingDay: 10,
          dueDay: 18
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/credit-cards/${cardResponse.body.id as string}/pay-invoice`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ invoiceId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' })
        .expect(404);

      expect(response.body).toMatchObject({
        code: 'credit_cards.invoice_not_found',
        error: 'not_found'
      });
    });
  });
});
