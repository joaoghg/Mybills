import { createHttpClient, type HttpClient } from '@mybills/api-client';

import { getApiBaseUrl } from '../config/env';

let client: HttpClient | undefined;

export function getHttpClient(): HttpClient {
  if (!client) {
    client = createHttpClient({ baseUrl: getApiBaseUrl() });
  }
  return client;
}
