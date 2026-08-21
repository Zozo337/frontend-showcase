import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { useLoading } from '@sa/hooks';
import { useRouterPush } from '@/hooks/common/router';
import { localStg } from '@/utils/storage';
import { SetupStoreId } from '@/enum';
import { useRouteStore } from '../route';
import { useTabStore } from '../tab';
import { clearAuthStorage, getToken } from './shared';

type AirwayGroup = {
  id: number;
  code: string;
  name: string;
  description?: string;
  group_type?: string;
};

type AirwayMeResponse = {
  ok: boolean;
  message?: string;
  user?: {
    id: number | string;
    employee_no?: string;
    chinese_name?: string;
    english_name?: string;
    company_email?: string;
    department_id?: number | string;
    department_code?: string;
    department_name?: string;
    account_status?: string;
    status?: string;
  };
  groups?: AirwayGroup[];
  permissions?: string[];
};

function toUserInfo(payload: AirwayMeResponse): Api.Auth.UserInfo {
  const user = payload.user;
  const groups = payload.groups || [];
  const permissions = payload.permissions || [];

  const roles = groups.map(group => group.code).filter(Boolean);

  // Soybean 靜態路由常用 R_SUPER 判斷超管；我們有 * 就補上，避免路由被擋
  if (permissions.includes('*') && !roles.includes('R_SUPER')) {
    roles.push('R_SUPER');
  }

  return {
    userId: String(user?.id || ''),
    userName: user?.chinese_name || user?.english_name || user?.company_email || '',
    roles,
    buttons: permissions
  };
}

async function readJsonSafe(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: text || `HTTP ${response.status}`
    };
  }
}

export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const route = useRoute();
  const authStore = useAuthStore();
  const routeStore = useRouteStore();
  const tabStore = useTabStore();
  const { toLogin, redirectFromLogin } = useRouterPush(false);
  const { loading: loginLoading, startLoading, endLoading } = useLoading();

  const token = ref('');

  const userInfo: Api.Auth.UserInfo = reactive({
    userId: '',
    userName: '',
    roles: [],
    buttons: []
  });

  /** is super role in static route */
  const isStaticSuper = computed(() => {
    const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env;

    return VITE_AUTH_ROUTE_MODE === 'static' && userInfo.roles.includes(VITE_STATIC_SUPER_ROLE);
  });

  /** Is login */
  const isLogin = computed(() => Boolean(token.value));

  /** Reset auth store */
  async function resetStore() {
    recordUserId();

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // ignore logout network error
    }

    clearAuthStorage();

    authStore.$reset();

    if (!route.meta.constant) {
      await toLogin();
    }

    tabStore.cacheTabs();
    routeStore.resetStore();
  }

  /** Record the user ID of the previous login session Used to compare with the current user ID on next login */
  function recordUserId() {
    if (!userInfo.userId) {
      return;
    }

    localStg.set('lastLoginUserId', userInfo.userId);
  }

  function checkTabClear(): boolean {
    if (!userInfo.userId) {
      return false;
    }

    const lastLoginUserId = localStg.get('lastLoginUserId');

    if (!lastLoginUserId || lastLoginUserId !== userInfo.userId) {
      localStg.remove('globalTabs');
      tabStore.clearTabs();

      localStg.remove('lastLoginUserId');
      return true;
    }

    localStg.remove('lastLoginUserId');
    return false;
  }

  /**
   * AD Login
   */
  async function login(userName: string, password: string, redirect = true) {
    startLoading();

    try {
      const response = await fetch('/api/auth/ad/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          username: userName,
          password
        })
      });

      const payload = (await readJsonSafe(response)) as AirwayMeResponse;

      if (!response.ok || !payload.ok) {
        window.$message?.error(payload.message || 'AD 登入失敗');
        await resetStore();
        return;
      }

      Object.assign(userInfo, toUserInfo(payload));

      const sessionToken = 'ad-session';
      localStg.set('token', sessionToken);
      localStg.set('refreshToken', sessionToken);
      token.value = sessionToken;

      const isClear = checkTabClear();
      let needRedirect = redirect;

      if (isClear) {
        needRedirect = false;
      }

      await redirectFromLogin(needRedirect);

      window.$notification?.success({
        title: '登入成功',
        content: `歡迎回來，${userInfo.userName}`,
        duration: 4500
      });
    } catch (err) {
      window.$message?.error(err instanceof Error ? err.message : 'AD 登入失敗');
      await resetStore();
    } finally {
      endLoading();
    }
  }

  async function getUserInfo() {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      });

      const payload = (await readJsonSafe(response)) as AirwayMeResponse;

      if (!response.ok || !payload.ok) {
        return false;
      }

      Object.assign(userInfo, toUserInfo(payload));

      return true;
    } catch {
      return false;
    }
  }

  async function initUserInfo() {
    const maybeToken = getToken();

    if (maybeToken) {
      token.value = maybeToken;
      const pass = await getUserInfo();

      if (!pass) {
        await resetStore();
      }

      return;
    }

    // AD session mode:
    // Even if local token is missing, try backend session cookie once.
    const pass = await getUserInfo();

    if (pass) {
      const sessionToken = 'ad-session';
      localStg.set('token', sessionToken);
      localStg.set('refreshToken', sessionToken);
      token.value = sessionToken;
    }
  }

  return {
    token,
    userInfo,
    isStaticSuper,
    isLogin,
    loginLoading,
    resetStore,
    login,
    initUserInfo
  };
});
