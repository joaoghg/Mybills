import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

type RootRouteWithoutParams = {
  [Route in keyof RootStackParamList]: RootStackParamList[Route] extends undefined ? Route : never;
}[keyof RootStackParamList];

export function navigateRoot(name: RootRouteWithoutParams): void {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate(name);
  }
}
