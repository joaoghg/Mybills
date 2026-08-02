import type { HttpClient } from '../http-client.js';

export async function logout(client: HttpClient): Promise<void> {
  await client.postJson<unknown>('/auth/logout', {});
}
