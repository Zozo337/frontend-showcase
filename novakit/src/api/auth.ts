export type AuthProviders = {
  local: boolean;
  ad: boolean;
  google: boolean;
};

export type AuthConfig = {
  auth_required: boolean;
  auth_mode?: string;
  demo_mode?: boolean;

  providers?: AuthProviders;

  ad_enabled: boolean;
  local_enabled: boolean;
  google_enabled: boolean;

  ad_domain?: string;
  ad_user_suffix?: string;
  google_client_id?: string;
  google_allowed_domain?: string;

  can_manage_auth?: boolean;
};

export type AuthUser = {
  authenticated: boolean;
  provider?: string;
  username?: string;
  operator?: string;
  email?: string;
  role?: string;
  is_admin?: boolean;
  config?: AuthConfig;
};

export type AuthSettings = AuthConfig & {
  ad_url?: string;
  ad_base_dn?: string;

  admin_users?: string[];
  ad_admin_groups?: string[];
  admin_emails?: string[];
};

function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((v) => v.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

function unwrapConfig(raw: any): any {
  return raw?.config ?? raw ?? {};
}

function unwrapSettings(raw: any): any {
  return raw?.settings ?? raw?.config ?? raw ?? {};
}

export function normalizeAuthConfig(raw: any): AuthConfig {
  const src = unwrapConfig(raw);

  const srcProviders = src.providers ?? {};
  const adEnabled = toBool(src.ad_enabled, toBool(srcProviders.ad, false));
  const localEnabled = toBool(src.local_enabled, toBool(srcProviders.local, false));
  const googleEnabled = toBool(src.google_enabled, toBool(srcProviders.google, false));

  const providers: AuthProviders = {
    ad: adEnabled,
    local: localEnabled,
    google: googleEnabled,
  };

  let authMode = src.auth_mode as string | undefined;
  if (!authMode) {
    if (adEnabled && googleEnabled) authMode = "both";
    else if (adEnabled) authMode = "ad";
    else if (googleEnabled) authMode = "google";
    else if (localEnabled) authMode = "local";
    else authMode = "disabled";
  }

  return {
    auth_required: src.auth_required === undefined ? true : toBool(src.auth_required, true),
    auth_mode: authMode,
    demo_mode: toBool(src.demo_mode, false),

    providers,

    ad_enabled: adEnabled,
    local_enabled: localEnabled,
    google_enabled: googleEnabled,

    ad_domain: src.ad_domain ?? "",
    ad_user_suffix: src.ad_user_suffix ?? "",
    google_client_id: src.google_client_id ?? "",
    google_allowed_domain: src.google_allowed_domain ?? "",

    can_manage_auth: toBool(src.can_manage_auth, false),
  };
}

function normalizeUser(raw: any): AuthUser {
  const src = raw ?? {};
  const user: AuthUser = {
    ...src,
    authenticated: toBool(src.authenticated, false),
  };

  if (src.config) {
    user.config = normalizeAuthConfig(src.config);
  }

  return user;
}

function normalizeSettings(raw: any): AuthSettings {
  const src = unwrapSettings(raw);
  const base = normalizeAuthConfig(src);

  return {
    ...base,

    ad_url: src.ad_url ?? "",
    ad_base_dn: src.ad_base_dn ?? "",
    ad_domain: src.ad_domain ?? base.ad_domain ?? "",
    ad_user_suffix: src.ad_user_suffix ?? base.ad_user_suffix ?? "",

    admin_users: toList(src.admin_users),
    ad_admin_groups: toList(src.ad_admin_groups),
    admin_emails: toList(src.admin_emails),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});

  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = body.detail || body.message || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text) as T;
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  const raw = await apiFetch<any>("/api/auth/config");
  return normalizeAuthConfig(raw);
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin",
  });

  if (response.status === 401) {
    return { authenticated: false };
  }

  if (!response.ok) {
    return { authenticated: false };
  }

  const raw = await response.json();
  return normalizeUser(raw);
}

export async function loginAd(username: string, password: string): Promise<AuthUser> {
  const raw = await apiFetch<any>("/api/auth/ad", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  return normalizeUser(raw);
}

export async function loginLocal(username: string, password: string): Promise<AuthUser> {
  const raw = await apiFetch<any>("/api/auth/local", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  return normalizeUser(raw);
}

export async function loginGoogle(idToken: string): Promise<AuthUser> {
  const raw = await apiFetch<any>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({
      credential: idToken,
      id_token: idToken,
      token: idToken,
    }),
  });

  return normalizeUser(raw);
}

export async function logout(): Promise<{ ok: boolean }> {
  await apiFetch<any>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });

  return { ok: true };
}

export async function fetchAuthSettings(): Promise<AuthSettings> {
  const raw = await apiFetch<any>("/api/admin/auth/settings");
  return normalizeSettings(raw);
}

export async function saveAuthSettings(settings: Partial<AuthSettings>): Promise<AuthSettings> {
  const raw = await apiFetch<any>("/api/admin/auth/settings", {
    method: "POST",
    body: JSON.stringify(settings),
  });

  return normalizeSettings(raw);
}

export async function fetchAdminAuthSettings(): Promise<AuthSettings> {
  return fetchAuthSettings();
}

export async function saveAdminAuthSettings(settings: Partial<AuthSettings>): Promise<AuthSettings> {
  return saveAuthSettings(settings);
}
