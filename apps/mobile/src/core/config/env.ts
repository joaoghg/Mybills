export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new Error(
      'EXPO_PUBLIC_API_URL is missing. Add it to apps/mobile/.env (example in .env.example).'
    );
  }
  const trimmed = url.replace(/\/$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  return `${trimmed}/api`;
}
