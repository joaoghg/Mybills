import { writeFileSync } from 'fs';
import { join } from 'path';
import { PluggyClient } from 'pluggy-sdk';

async function waitForUpdated(client: PluggyClient, itemId: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const item = await client.fetchItem(itemId);
    if (item.status === 'UPDATED' || item.status === 'LOGIN_ERROR' || item.status === 'OUTDATED') {
      return item.status;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return 'TIMEOUT';
}

async function main(): Promise<void> {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET are required');
  }

  const client = new PluggyClient({ clientId, clientSecret });
  const item = await client.createItem(0, {
    user: 'user-ok',
    password: 'password-ok'
  });

  const status = await waitForUpdated(client, item.id);
  const output = JSON.stringify(
    {
      itemId: item.id,
      connectorId: item.connector.id,
      connectorName: item.connector.name,
      isSandbox: item.connector.isSandbox,
      status
    },
    null,
    2
  );

  writeFileSync(join(__dirname, 'sandbox-item.json'), `${output}\n`);
  console.log(output);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
