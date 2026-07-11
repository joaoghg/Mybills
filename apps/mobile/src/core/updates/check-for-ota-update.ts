import * as Updates from 'expo-updates';

/**
 * Checks for an OTA update and reloads when one is available.
 * No-ops in Metro/`__DEV__` and when Updates is disabled.
 */
export async function checkForOtaUpdate(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled) {
    return;
  }

  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) {
      return;
    }

    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch {
    // Keep running on the embedded bundle if the update check fails.
  }
}
