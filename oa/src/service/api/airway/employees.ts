const AIRWAY_API_BASE = '';
const API_TIMEOUT_MS = 15000;

async function airwayFetch(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });

  let response: Response;
  try {
    response = await fetch(`${AIRWAY_API_BASE}${path}`, {
      credentials: 'include',
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('OA API 連線逾時，請稍後重試');
    throw error;
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(typeof data === 'string' ? data : data?.message || data?.error || `Demo API ${response.status}`);
  }

  return data;
}

export interface AirwayEmployee {
  id: number;
  employee_no?: string;
  chinese_name?: string;
  english_name?: string;
  company_email?: string;
  ad_username?: string;
  department_id?: number | null;
  department_name?: string | null;
  department_code?: string | null;
  position_title?: string | null;
  job_title?: string | null;
  title?: string | null;
  onboard_date?: string | null;
  hire_date?: string | null;
  start_date?: string | null;
  manager_id?: number | null;
  manager_name?: string | null;
  manager_email?: string | null;
  account_status?: string;
  status?: string;
  [key: string]: any;
}

export interface EmployeeDetailResponse {
  ok: boolean;
  employee: AirwayEmployee;
  itAccounts: any[];
  assets: any[];
  changeLogs: any[];
  workflowRequests: any[];
}

function normalizeEmployeeList(data: any): AirwayEmployee[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export interface FetchEmployeesOptions {
  includeInactive?: boolean;
  includeDeleted?: boolean;
}

const inactiveEmployeeStatuses = ['deleted', 'disabled', 'inactive', 'resigned', 'left', 'suspended'];

export async function fetchEmployees(options: FetchEmployeesOptions = {}): Promise<AirwayEmployee[]> {
  const search = new URLSearchParams();
  if (options.includeDeleted) search.set('includeDeleted', 'true');

  const qs = search.toString();
  const data = await airwayFetch(`/api/employees${qs ? `?${qs}` : ''}`);
  const rows = normalizeEmployeeList(data);

  if (options.includeInactive) return rows;

  return rows.filter(emp => {
    const accountStatus = String(emp.account_status || '').toLowerCase();
    const status = String(emp.status || '').toLowerCase();
    return !inactiveEmployeeStatuses.includes(accountStatus) && !inactiveEmployeeStatuses.includes(status);
  });
}

export async function fetchEmployeeLookup(params: { q?: string; limit?: number; includeInactive?: boolean; includeDeleted?: boolean; ids?: number[] } = {}): Promise<AirwayEmployee[]> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.includeInactive) search.set('includeInactive', 'true');
  if (params.includeDeleted) search.set('includeDeleted', 'true');
  if (params.ids?.length) search.set('ids', params.ids.join(','));

  const qs = search.toString();
  const data = await airwayFetch(`/api/employees/lookup${qs ? `?${qs}` : ''}`);
  return normalizeEmployeeList(data);
}

export function fetchEmployeeDetail(id: number): Promise<EmployeeDetailResponse> {
  return airwayFetch(`/api/employees/${id}`);
}

export function uploadEmployeeAvatar(id: number, file: File) {
  const formData = new FormData();
  formData.append('avatar', file);

  return fetch(`${AIRWAY_API_BASE}/api/employees/${id}/avatar`, {
    credentials: 'include',
    method: 'POST',
    body: formData
  }).then(async response => {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || '上傳大頭貼失敗');
    }

    return data;
  });
}

export function resolveAvatarUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${AIRWAY_API_BASE}${url}`;
}

export function deleteEmployee(id: number) {
  return fetch(`${AIRWAY_API_BASE}/api/employees/${id}`, {
    credentials: 'include',
    method: 'DELETE',
    headers: { Accept: 'application/json' }
  }).then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || '刪除員工失敗');
    return data;
  });
}


export async function createEmployee(payload: Record<string, any>) {
  return airwayFetch('/api/employees', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateEmployee(id: number, payload: Record<string, any>) {
  return airwayFetch(`/api/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export interface MyEmployeeProfileResponse {
  ok: boolean;
  employee: AirwayEmployee;
  assets: any[];
  itAccounts: any[];
}

export function fetchMyEmployeeProfile(): Promise<MyEmployeeProfileResponse> {
  return airwayFetch('/api/employees/me');
}

export function uploadMyAvatar(file: File): Promise<{ ok: boolean; avatar_url: string; message?: string }> {
  const formData = new FormData();
  formData.append('avatar', file);

  return fetch(`${AIRWAY_API_BASE}/api/employees/me/avatar`, {
    credentials: 'include',
    method: 'POST',
    body: formData
  }).then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || data?.error || '上傳大頭貼失敗');
    return data;
  });
}
