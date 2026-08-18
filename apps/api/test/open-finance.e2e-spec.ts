import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  SignInInput,
  SignUpInput,
  listOpenFinanceConnectionsOutputSchema,
  openFinanceConnectionOutputSchema,
  openFinanceSyncRunOutputSchema,
  signInOutputSchema
} from '@mybills/dtos';
import { AppModule } from 'src/modules/app.module';
import { PLUGGY_CLIENT_PORT } from 'src/modules/open-finance/providers/pluggy.constants';
import { PluggyClientPort } from 'src/modules/open-finance/providers/pluggy-client.port';
import request from 'supertest';
import { App } from 'supertest/types';

const WEBHOOK_SECRET = 'e2e-pluggy-webhook-secret';

function emptyOffsetPage() {
  return { results: [], page: 1, total: 0, totalPages: 1 };
}

function createMockPluggy(): PluggyClientPort {
  return {
    fetchItem: jest.fn(async (itemId: string) => ({
      id: itemId,
      status: 'UPDATED',
      connector: { id: 200, name: 'Meu Pluggy', imageUrl: 'https://example.com/logo.png' }
    })),
    deleteItem: jest.fn(async () => undefined),
    fetchAccounts: jest.fn(async () => []),
    fetchAccount: jest.fn(),
    fetchCreditCardBills: jest.fn(async () => emptyOffsetPage()),
    fetchTransactionsPage: jest.fn(async () => ({ results: [], next: null })),
    fetchAllTransactions: jest.fn(async () => []),
    fetchTransactionsByIds: jest.fn(async () => []),
    fetchTransaction: jest.fn(),
    fetchTransactionsFromLink: jest.fn(async () => []),
    fetchInvestmentsPage: jest.fn(async () => emptyOffsetPage()),
    fetchInvestmentTransactionsPage: jest.fn(async () => emptyOffsetPage())
  } as unknown as PluggyClientPort;
}

async function authenticateUser(app: INestApplication<App>, email: string): Promise<string> {
  const registerPayload: SignUpInput = {
    name: 'Open Finance User',
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

  return signInOutputSchema.parse(loginResponse.body as object).accessToken;
}

describe('Open Finance (e2e) — feature flag off', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('hides Open Finance routes when the feature flag is disabled', async () => {
    const token = await authenticateUser(app, 'open-finance-disabled@mybills.dev');

    await request(app.getHttpServer())
      .get('/open-finance/connections')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('rejects unauthenticated webhook calls when the feature is disabled', async () => {
    await request(app.getHttpServer()).post('/open-finance/webhooks/pluggy').send({}).expect(404);
  });
});

describe('Open Finance (e2e) — enabled with mocked Pluggy', () => {
  let app: INestApplication<App>;
  let pluggy: PluggyClientPort;

  beforeAll(async () => {
    pluggy = createMockPluggy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PLUGGY_CLIENT_PORT)
      .useValue(pluggy)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const config = app.get(ConfigService);
    const originalGet = config.get.bind(config) as (key: string, options?: unknown) => unknown;
    jest.spyOn(config, 'get').mockImplementation((key: string, options?: unknown) => {
      if (key === 'OPEN_FINANCE_ENABLED') {
        return true;
      }

      if (key === 'PLUGGY_WEBHOOK_SECRET') {
        return WEBHOOK_SECRET;
      }

      return originalGet(key, options);
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('registers, lists, syncs, isolates users, lists investments, and disconnects', async () => {
    const ownerToken = await authenticateUser(app, `of-owner-${randomUUID()}@mybills.dev`);
    const otherToken = await authenticateUser(app, `of-other-${randomUUID()}@mybills.dev`);
    const itemId = randomUUID();

    const createdResponse = await request(app.getHttpServer())
      .post('/open-finance/connections')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ itemId })
      .expect(201);

    const created = openFinanceConnectionOutputSchema.parse(createdResponse.body as object);
    expect(created.connectorId).toBe(200);
    expect(created.itemId).toBe(itemId);

    const listResponse = await request(app.getHttpServer())
      .get('/open-finance/connections')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const listed = listOpenFinanceConnectionsOutputSchema.parse(listResponse.body as object);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);

    const otherList = await request(app.getHttpServer())
      .get('/open-finance/connections')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    expect(listOpenFinanceConnectionsOutputSchema.parse(otherList.body as object)).toHaveLength(0);

    await request(app.getHttpServer())
      .post(`/open-finance/connections/${created.id}/sync`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    const syncResponse = await request(app.getHttpServer())
      .post(`/open-finance/connections/${created.id}/sync`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(202);

    const syncRun = openFinanceSyncRunOutputSchema.parse(syncResponse.body as object);
    expect(['PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL']).toContain(syncRun.status);

    const statusResponse = await request(app.getHttpServer())
      .get(`/open-finance/connections/${created.id}/sync-runs/${syncRun.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(openFinanceSyncRunOutputSchema.parse(statusResponse.body as object).id).toBe(syncRun.id);

    await request(app.getHttpServer())
      .get(`/open-finance/connections/${created.id}/sync-runs/${syncRun.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    const investments = await request(app.getHttpServer())
      .get('/open-finance/investments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(investments.body).toEqual([]);

    await request(app.getHttpServer())
      .delete(`/open-finance/connections/${created.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    expect(jest.mocked(pluggy.deleteItem)).toHaveBeenCalledWith(itemId);

    const afterDisconnect = await request(app.getHttpServer())
      .get('/open-finance/connections')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const disconnected = listOpenFinanceConnectionsOutputSchema.parse(
      afterDisconnect.body as object
    );
    expect(disconnected[0]?.status).toBe('DISCONNECTED');
  });

  it('rejects webhook calls without the shared secret and acknowledges authenticated duplicates', async () => {
    const itemId = randomUUID();
    const ownerToken = await authenticateUser(app, `of-webhook-${randomUUID()}@mybills.dev`);

    await request(app.getHttpServer())
      .post('/open-finance/connections')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ itemId })
      .expect(201);

    await request(app.getHttpServer())
      .post('/open-finance/webhooks/pluggy')
      .send({ eventId: randomUUID(), event: 'item/updated', itemId })
      .expect(401);

    const eventId = randomUUID();
    const payload = { eventId, event: 'item/updated', itemId };

    await request(app.getHttpServer())
      .post('/open-finance/webhooks/pluggy')
      .set('x-webhook-secret', WEBHOOK_SECRET)
      .send(payload)
      .expect(200);

    await request(app.getHttpServer())
      .post('/open-finance/webhooks/pluggy')
      .set('x-webhook-secret', WEBHOOK_SECRET)
      .send(payload)
      .expect(200);
  });
});
