import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateRoot(name: keyof RootStackParamList): void {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate(name);
  }
}
