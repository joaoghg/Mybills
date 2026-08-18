import {
  createOpenFinanceConnection,
  disconnectOpenFinanceConnection,
  getOpenFinanceSyncRun,
  listOpenFinanceConnections,
  startOpenFinanceSync
} from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type {
  CreateOpenFinanceConnectionInput,
  ListOpenFinanceConnectionsOutput,
  OpenFinanceConnectionOutput,
  OpenFinanceSyncRunOutput
} from '@mybills/dtos';

export function fetchOpenFinanceConnections(
  client: HttpClient
): Promise<ListOpenFinanceConnectionsOutput> {
  return listOpenFinanceConnections(client);
}

export function registerOpenFinanceConnection(
  client: HttpClient,
  input: CreateOpenFinanceConnectionInput
): Promise<OpenFinanceConnectionOutput> {
  return createOpenFinanceConnection(client, input);
}

export function disconnectConnection(client: HttpClient, connectionId: string): Promise<void> {
  return disconnectOpenFinanceConnection(client, connectionId);
}

export function startConnectionSync(
  client: HttpClient,
  connectionId: string
): Promise<OpenFinanceSyncRunOutput> {
  return startOpenFinanceSync(client, connectionId);
}

export function fetchSyncRun(
  client: HttpClient,
  connectionId: string,
  syncRunId: string
): Promise<OpenFinanceSyncRunOutput> {
  return getOpenFinanceSyncRun(client, connectionId, syncRunId);
}
