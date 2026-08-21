import type { LocationQueryRaw, RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router';
import type { RouteKey, RoutePath } from '@elegant-router/types';
import { useAuthStore } from '@/store/modules/auth';
import { useRouteStore } from '@/store/modules/route';
import { localStg } from '@/utils/storage';
import { getRouteName } from '@/router/elegant/transform';

/**
 * create route guard
 *
 * @param router router instance
 */
export function createRouteGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const location = await initRoute(to);

    if (location) {
      return location;
    }

    const authStore = useAuthStore();

    const rootRoute: RouteKey = 'root';
    const loginRoute: RouteKey = 'login';
    const noAuthorizationRoute: RouteKey = '403';

    const isLogin = Boolean(localStg.get('token'));
    const publicRouteNames = new Set(['login', '403', '404', '500']);
    const needLogin = !publicRouteNames.has(String(to.name || ''));
    const routeRoles = to.meta.roles || [];

    const hasRole = authStore.userInfo.roles.some(role => routeRoles.includes(role));
    const hasAuth = authStore.isStaticSuper || !routeRoles.length || hasRole;

    // if it is login route when logged in, then switch to the root page
    if (to.name === loginRoute && isLogin) {
      return { name: rootRoute };
    }

    // if the route does not need login, then it is allowed to access directly
    if (!needLogin) {
      return handleRouteSwitch(to, from);
    }

    // the route need login but the user is not logged in, then switch to the login page
    if (!isLogin) {
      return { name: loginRoute, query: { redirect: to.fullPath } };
    }

    const requiredPagePermission = getAirwayRequiredPagePermission(to.path);
    if (requiredPagePermission) {
      const currentPermissions = await getAirwayCurrentPermissions(authStore.userInfo.buttons);

      if (!currentPermissions.includes('*') && !currentPermissions.includes(requiredPagePermission)) {
        return { name: noAuthorizationRoute };
      }
    }

    // if the user is logged in but does not have authorization, then switch to the 403 page
    if (!hasAuth) {
      return { name: noAuthorizationRoute };
    }

    // switch route normally
    return handleRouteSwitch(to, from);
  });
}

/**
 * initialize route
 *
 * @param to to route
 */
async function initRoute(to: RouteLocationNormalized): Promise<RouteLocationRaw | null> {
  const routeStore = useRouteStore();

  const notFoundRoute: RouteKey = 'not-found';
  const isNotFoundRoute = to.name === notFoundRoute;

  // if the constant route is not initialized, then initialize the constant route
  if (!routeStore.isInitConstantRoute) {
    await routeStore.initConstantRoute();

    // the route is captured by the "not-found" route because the constant route is not initialized
    // after the constant route is initialized, redirect to the original route
    const path = to.fullPath;
    const location: RouteLocationRaw = {
      path,
      replace: true,
      query: to.query,
      hash: to.hash
    };

    return location;
  }

  const isLogin = Boolean(localStg.get('token'));

  if (!isLogin) {
    const publicRouteNames = new Set(['login', '403', '404', '500']);
    const currentRouteName = String(to.name || '');

    // 未登入時只有 login / error pages 可直接進入；Demo OA constant routes 也必須登入。
    if (publicRouteNames.has(currentRouteName)) {
      routeStore.onRouteSwitchWhenNotLoggedIn();

      return null;
    }

    // if the user is not logged in, then switch to the login page
    const loginRoute: RouteKey = 'login';
    const query = getRouteQueryOfLoginRoute(to, routeStore.routeHome);

    const location: RouteLocationRaw = {
      name: loginRoute,
      query
    };

    return location;
  }

  if (!routeStore.isInitAuthRoute) {
    // initialize the auth route
    await routeStore.initAuthRoute();

    // the route is captured by the "not-found" route because the auth route is not initialized
    // after the auth route is initialized, redirect to the original route
    if (isNotFoundRoute) {
      const rootRoute: RouteKey = 'root';
      const path = to.redirectedFrom?.name === rootRoute ? '/' : to.fullPath;

      const location: RouteLocationRaw = {
        path,
        replace: true,
        query: to.query,
        hash: to.hash
      };

      return location;
    }
  }

  routeStore.onRouteSwitchWhenLoggedIn();

  // the auth route is initialized
  // it is not the "not-found" route, then it is allowed to access
  if (!isNotFoundRoute) {
    return null;
  }

  // it is captured by the "not-found" route, then check whether the route exists
  const exist = await routeStore.getIsAuthRouteExist(to.path as RoutePath);
  const noPermissionRoute: RouteKey = '403';

  if (exist) {
    const location: RouteLocationRaw = {
      name: noPermissionRoute
    };

    return location;
  }

  return null;
}

function handleRouteSwitch(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  // route with href
  if (to.meta.href) {
    window.open(to.meta.href, '_blank');

    return { path: from.fullPath, replace: true, query: from.query, hash: to.hash };
  }
}

function getRouteQueryOfLoginRoute(to: RouteLocationNormalized, routeHome: RouteKey) {
  const loginRoute: RouteKey = 'login';
  const redirect = to.fullPath;
  const [redirectPath, redirectQuery] = redirect.split('?');
  const redirectName = getRouteName(redirectPath as RoutePath);

  const isRedirectHome = routeHome === redirectName;

  const query: LocationQueryRaw = to.name !== loginRoute && !isRedirectHome ? { redirect } : {};

  if (isRedirectHome && redirectQuery) {
    query.redirect = `/?${redirectQuery}`;
  }

  return query;
}

async function getAirwayCurrentPermissions(storePermissions: string[] = []) {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      return storePermissions;
    }

    const data = await response.json();
    return Array.isArray(data?.permissions)
      ? data.permissions
      : Array.isArray(data?.user?.permissions)
        ? data.user.permissions
        : [];
  } catch {
    return storePermissions;
  }
}

function getAirwayRequiredPagePermission(path = '') {
  const normalized = String(path || '');

  if (normalized.startsWith('/airway/portal')) return 'PAGE_PORTAL.view';
  if (normalized.startsWith('/airway/dashboard')) return 'PAGE_DASHBOARD.view';
  if (normalized.startsWith('/airway/profile')) return 'PAGE_PROFILE.view';
  if (normalized.startsWith('/airway/forms/center') || normalized.startsWith('/airway/forms/detail')) return 'PAGE_FORMS_CENTER.view';
  if (normalized.startsWith('/airway/forms/designer')) return 'PAGE_FORM_DESIGNER.ADMIN';
  if (normalized.startsWith('/airway/forms')) return 'PAGE_FORMS.view';
  if (normalized.startsWith('/airway/departments')) return 'PAGE_ORG.view';
  if (normalized.startsWith('/airway/employees')) return 'PAGE_EMPLOYEES.view';
  if (normalized.startsWith('/airway/assets')) return 'PAGE_ASSETS.view';
  if (normalized.startsWith('/airway/accounts')) return 'PAGE_ACCOUNTS.view';
  if (normalized.startsWith('/airway/employee-import')) return 'PAGE_EMPLOYEE_IMPORT.view';
  if (normalized.startsWith('/airway/permissions')) return 'PAGE_PERMISSION.view';
  if (normalized.startsWith('/airway/ad-permissions')) return 'PAGE_AD_PERMISSIONS.view';
  if (normalized.startsWith('/airway/test')) return 'PAGE_API_TEST.view';

  return '';
}
