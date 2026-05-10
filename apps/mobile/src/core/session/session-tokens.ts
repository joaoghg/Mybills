import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'mybills.accessToken';
const REFRESH_KEY = 'mybills.refreshToken';

export type SessionTokenPayload = {
  accessToken: string;
  refreshToken: string;
};

export async function saveSessionTokens(payload: SessionTokenPayload): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, payload.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, payload.refreshToken);
}

export async function clearSessionTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}
