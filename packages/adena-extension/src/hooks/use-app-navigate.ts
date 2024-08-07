import { NavigateOptions, useLocation, useNavigate } from 'react-router-dom';
import { RouteParams, RoutePath } from '@types';

type NavigateProps<key extends keyof RouteParams> = key extends unknown
  ? null extends RouteParams[key]
    ?
        | [screen: key] // if the params are optional, we don't have to provide it
        | [
            screen: key,
            params: {
              replace?: NavigateOptions['replace'];
              state?: RouteParams[key];
              preventScrollReset?: NavigateOptions['preventScrollReset'];
              relative?: NavigateOptions['relative'];
            },
          ]
    : [
        screen: key,
        params: {
          replace?: NavigateOptions['replace'];
          state?: RouteParams[key];
          preventScrollReset?: NavigateOptions['preventScrollReset'];
          relative?: NavigateOptions['relative'];
        },
      ]
  : never;

const useAppNavigate = <RouteName extends keyof RouteParams>(): {
  navigate: <RouteName extends keyof RouteParams>(...args: NavigateProps<RouteName>) => void;
  params: RouteParams[RouteName];
  goBack: () => void;
  reload: () => void;
} => {
  const params = useLocation().state as RouteParams[RouteName];

  const baseNavigate = useNavigate();

  const navigate = <RouteName extends keyof RouteParams>(
    ...args: NavigateProps<RouteName>
  ): void => {
    const [path, params] = args;
    baseNavigate(path, params);
  };

  const goBack = (): void => {
    if (window?.history?.length > 1) {
      baseNavigate(-1);
    } else {
      navigate(RoutePath.Home, {});
    }
  };

  const reload = (): void => {
    window.location.reload();
  };

  return {
    navigate,
    params,
    goBack,
    reload,
  };
};

export default useAppNavigate;
