import { useEffect } from 'react';

import { checkForOtaUpdate } from './check-for-ota-update';

/** Runs a one-shot OTA check when the app mounts. */
export function useOtaUpdates(): void {
  useEffect(() => {
    void checkForOtaUpdate();
  }, []);
}
