import {
  CreateOpenFinanceConnectionInput,
  ListOpenFinanceConnectionsOutput,
  OpenFinanceConnectionOutput,
  OpenFinanceSyncRunOutput,
  createOpenFinanceConnectionInputSchema,
  listOpenFinanceConnectionsOutputSchema,
  openFinanceConnectionOutputSchema,
  openFinanceSyncRunOutputSchema
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function createOpenFinanceConnection(
  client: HttpClient,
  input: CreateOpenFinanceConnectionInput
): Promise<OpenFinanceConnectionOutput> {
  const body = createOpenFinanceConnectionInputSchema.parse(input);
  const raw = await client.postJson<unknown>('/open-finance/connections', body);
  return openFinanceConnectionOutputSchema.parse(raw);
}

export async function listOpenFinanceConnections(
  client: HttpClient
): Promise<ListOpenFinanceConnectionsOutput> {
  const raw = await client.getJson<unknown>('/open-finance/connections');
  return listOpenFinanceConnectionsOutputSchema.parse(raw);
}

export async function disconnectOpenFinanceConnection(
  client: HttpClient,
  connectionId: string
): Promise<void> {
  await client.deleteJson(`/open-finance/connections/${connectionId}`);
}

export async function startOpenFinanceSync(
  client: HttpClient,
  connectionId: string
): Promise<OpenFinanceSyncRunOutput> {
  const raw = await client.postJson<unknown>(
    `/open-finance/connections/${connectionId}/sync`,
    {}
  );
  return openFinanceSyncRunOutputSchema.parse(raw);
}

export async function getOpenFinanceSyncRun(
  client: HttpClient,
  connectionId: string,
  syncRunId: string
): Promise<OpenFinanceSyncRunOutput> {
  const raw = await client.getJson<unknown>(
    `/open-finance/connections/${connectionId}/sync-runs/${syncRunId}`
  );
  return openFinanceSyncRunOutputSchema.parse(raw);
}
