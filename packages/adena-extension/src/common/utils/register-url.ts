import { REGISTER_PATH, RoutePath } from '@types';

const REGISTER_ROUTE_PARAM = 'route';
const REGISTER_DIRECT_ROUTES = new Set<string>([RoutePath.WebAccountAdd]);

export const createRegisterUrl = (route?: RoutePath): string => {
  if (!route) {
    return REGISTER_PATH;
  }

  return `${REGISTER_PATH}?${REGISTER_ROUTE_PARAM}=${encodeURIComponent(route)}`;
};

export const getRegisterInitialRoute = (search: string): RoutePath | null => {
  const route = new URLSearchParams(search).get(REGISTER_ROUTE_PARAM);
  if (!route || !REGISTER_DIRECT_ROUTES.has(route)) {
    return null;
  }

  return route as RoutePath;
};
