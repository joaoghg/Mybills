import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

type RootRouteWithoutParams = {
  [Route in keyof RootStackParamList]: RootStackParamList[Route] extends undefined ? Route : never;
}[keyof RootStackParamList];

export function navigateRoot(name: RootRouteWithoutParams): void;
export function navigateRoot<Route extends keyof RootStackParamList>(
  name: Route,
  params: RootStackParamList[Route]
): void;
export function navigateRoot<Route extends keyof RootStackParamList>(
  name: Route,
  params?: RootStackParamList[Route]
): void {
  if (rootNavigationRef.isReady()) {
    const navigate = rootNavigationRef.navigate.bind(rootNavigationRef) as (
      screen: keyof RootStackParamList,
      screenParams?: object
    ) => void;

    if (params !== undefined) {
      navigate(name, params);
    } else {
      navigate(name);
    }
  }
}
