const AIRWAY_API_BASE = '';

async function airwayFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${AIRWAY_API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(typeof data === 'string' ? data : data?.message || data?.error || `Demo API ${response.status}`);
  }

  return data;
}

export type AccountSystem = 'gws' | 'aws' | 'm365' | string;

export interface AirwayAccount {
  id: number | string;
  employee_id?: number | null;
  system_name?: AccountSystem | null;
  account_name?: string | null;
  account_email?: string | null;
  status?: string | null;
  account_status?: string | null;
  enabled?: number | boolean | null;
  role?: string | null;
  permission_group?: string | null;
  license_name?: string | null;
  need_2fa?: number | boolean | null;
  external_id?: string | null;
  note?: string | null;
  automation_status?: string | null;
  automation_last_error?: string | null;
  automation_synced_at?: string | null;
  employee_no?: string | null;
  chinese_name?: string | null;
  english_name?: string | null;
  company_email?: string | null;
  department_code?: string | null;
  department_name?: string | null;
  legacy_source?: string | null;
  [key: string]: any;
}

export interface FetchAccountsOptions {
  system?: string;
  status?: string;
  q?: string;
  employeeId?: number | null;
  includeDeleted?: boolean;
}

export interface AccountPayload {
  employee_id?: number | null;
  employeeId?: number | null;
  system_name?: string;
  systemName?: string;
  system?: string;
  account_name?: string | null;
  accountName?: string | null;
  account_email?: string | null;
  accountEmail?: string | null;
  account_status?: string;
  accountStatus?: string;
  status?: string;
  role?: string | null;
  permission_group?: string | null;
  permissionGroup?: string | null;
  license_name?: string | null;
  licenseName?: string | null;
  license?: string | null;
  need_2fa?: boolean | number;
  need2fa?: boolean | number;
  external_id?: string | null;
  externalId?: string | null;
  note?: string | null;
}

function normalizeAccountList(data: any): AirwayAccount[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.accounts)) return data.accounts;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchAccounts(options: FetchAccountsOptions = {}): Promise<AirwayAccount[]> {
  const search = new URLSearchParams();

  if (options.system) search.set('system', options.system);
  if (options.status) search.set('status', options.status);
  if (options.q) search.set('q', options.q);
  if (options.employeeId) search.set('employeeId', String(options.employeeId));
  if (options.includeDeleted) search.set('includeDeleted', 'true');

  const qs = search.toString();
  const data = await airwayFetch(`/api/accounts${qs ? `?${qs}` : ''}`);

  return normalizeAccountList(data);
}

export function fetchAccount(id: number): Promise<{ ok: boolean; account: AirwayAccount }> {
  return airwayFetch(`/api/accounts/${id}`);
}

export function createAccount(payload: AccountPayload) {
  return airwayFetch('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAccount(id: number, payload: AccountPayload) {
  return airwayFetch(`/api/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAccount(id: number) {
  return airwayFetch(`/api/accounts/${id}`, {
    method: 'DELETE'
  });
}

export function syncAccount(id: number, action = 'account.sync') {
  return airwayFetch(`/api/accounts/${id}/sync`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });
}
