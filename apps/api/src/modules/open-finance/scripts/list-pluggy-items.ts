import { writeFileSync } from 'fs';
import { join } from 'path';

const PLUGGY_API_BASE_URL = 'https://api.pluggy.ai';

type ItemRow = {
  id: string;
  status?: string;
  connector?: { id?: number; name?: string; isSandbox?: boolean };
};

type PageResponse = {
  results?: ItemRow[];
  page?: number;
  total?: number;
  totalPages?: number;
};

async function main(): Promise<void> {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET are required');
  }

  const authResponse = await fetch(`${PLUGGY_API_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret })
  });

  if (!authResponse.ok) {
    throw new Error(`Pluggy auth failed with status ${authResponse.status}`);
  }

  const authBody = (await authResponse.json()) as { apiKey?: string };
  if (!authBody.apiKey) {
    throw new Error('Pluggy auth did not return an apiKey');
  }

  const headers = { 'X-API-KEY': authBody.apiKey, Accept: 'application/json' };
  const connectorResponse = await fetch(`${PLUGGY_API_BASE_URL}/connectors/200`, { headers });
  const itemsResponse = await fetch(`${PLUGGY_API_BASE_URL}/items?page=1&pageSize=50`, { headers });

  const payload = itemsResponse.ok
    ? ((await itemsResponse.json()) as PageResponse)
    : { error: await itemsResponse.text() };

  const rows =
    payload && 'results' in payload && Array.isArray(payload.results)
      ? payload.results.map((item) => ({
          id: item.id,
          status: item.status ?? null,
          connectorId: item.connector?.id ?? null,
          connectorName: item.connector?.name ?? null,
          isSandbox: item.connector?.isSandbox ?? null
        }))
      : [];

  const output = JSON.stringify(
    {
      connectorHttpStatus: connectorResponse.status,
      connectorOk: connectorResponse.ok,
      itemsHttpStatus: itemsResponse.status,
      total: 'total' in payload ? payload.total : null,
      rows,
      error: 'error' in payload ? payload.error : null
    },
    null,
    2
  );

  const outputPath = join(__dirname, 'pluggy-items-list.json');
  writeFileSync(outputPath, `${output}\n`);
  console.log(output);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
