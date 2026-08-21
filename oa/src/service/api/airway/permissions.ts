const API_BASE = '';

async function airwayFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || `Demo API ${response.status}: ${text}`);
  }

  return data;
}

export interface AirwayCurrentUser {
  id: number;
  employee_no?: string;
  chinese_name?: string;
  english_name?: string;
  company_email?: string;
  department_id?: number;
  department_code?: string;
  department_name?: string;
  account_status?: string;
}

export interface PermissionGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  group_type?: string;
  is_active?: number;
  member_count?: number;
  action_count?: number;
}

export interface PermissionGroupMember {
  id: number;
  group_id: number;
  employee_id: number;
  employee_no?: string;
  chinese_name?: string;
  english_name?: string;
  company_email?: string;
  department_code?: string;
  department_name?: string;
  account_status?: string;
}

export interface PermissionAction {
  id: number;
  group_id: number;
  permission_code: string;
  is_allowed?: number;
}

export async function fetchAuthMe() {
  return airwayFetch('/api/auth/me');
}

export async function fetchPermissionGroups(): Promise<PermissionGroup[]> {
  const data = await airwayFetch('/api/permission-groups');

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.rows)) return data.rows;

  return [];
}

export async function fetchPermissionGroupMembers(groupId: number): Promise<PermissionGroupMember[]> {
  const data = await airwayFetch(`/api/permission-groups/${groupId}/members`);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.rows)) return data.rows;

  return [];
}

export async function fetchPermissionGroupActions(groupId: number): Promise<PermissionAction[]> {
  const data = await airwayFetch(`/api/permission-groups/${groupId}/actions`);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.rows)) return data.rows;

  return [];
}

export async function addPermissionGroupMember(groupId: number, employeeId: number) {
  return airwayFetch(`/api/permission-groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ employeeId })
  });
}

export async function removePermissionGroupMember(groupId: number, employeeId: number) {
  return airwayFetch(`/api/permission-groups/${groupId}/members/${employeeId}`, {
    method: 'DELETE'
  });
}

export async function updatePermissionGroupActions(groupId: number, permissions: string[]) {
  return airwayFetch(`/api/permission-groups/${groupId}/actions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions })
  });
}

export async function createPermissionGroup(payload: Record<string, any>) {
  return airwayFetch('/api/permission-groups', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updatePermissionGroup(id: number, payload: Record<string, any>) {
  return airwayFetch(`/api/permission-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export interface SimplePermissionEmployee {
  id: number;
  employee_no?: string;
  chinese_name?: string;
  english_name?: string;
  company_email?: string;
  department_code?: string;
  department_name?: string;
  label?: string;
}

export interface SimplePermissionPage {
  key: string;
  label: string;
  path: string;
  permission_code: string;
  description?: string;
  employee_ids: number[];
  employees: SimplePermissionEmployee[];
}

export interface SimplePermissionConfig {
  ok: boolean;
  pages: SimplePermissionPage[];
  roles?: SimpleAclRole[];
  super_admins: SimplePermissionEmployee[];
  super_admin_ids: number[];
}

export async function fetchSimplePermissionConfig(): Promise<SimplePermissionConfig> {
  return airwayFetch('/api/simple-permissions/config');
}

export async function updateSimplePageUsers(pageKey: string, employeeIds: number[]) {
  return airwayFetch(`/api/simple-permissions/pages/${encodeURIComponent(pageKey)}/users`, {
    method: 'PUT',
    body: JSON.stringify({ employee_ids: employeeIds })
  });
}

export async function updateSimpleSuperAdmins(employeeIds: number[]) {
  return airwayFetch('/api/simple-permissions/super-admins', {
    method: 'PUT',
    body: JSON.stringify({ employee_ids: employeeIds })
  });
}

export async function fetchSimplePermissionMe() {
  return airwayFetch('/api/simple-permissions/me');
}

export interface SimpleAclRole {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_default_all?: number | boolean;
  page_keys: string[];
  member_ids: number[];
  members: SimplePermissionEmployee[];
}

export async function createSimpleAclRole(payload: {
  name: string;
  description?: string | null;
  page_keys: string[];
  employee_ids: number[];
  is_default_all?: boolean;
}) {
  return airwayFetch('/api/simple-permissions/roles', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateSimpleAclRole(id: number, payload: {
  name: string;
  description?: string | null;
  page_keys: string[];
  employee_ids: number[];
  is_default_all?: boolean;
}) {
  return airwayFetch(`/api/simple-permissions/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteSimpleAclRole(id: number) {
  return airwayFetch(`/api/simple-permissions/roles/${id}`, {
    method: 'DELETE'
  });
}

export interface SoftInstallerGrant {
  id: number;
  request_no?: string | null;
  template_code?: string | null;
  template_name?: string | null;
  applicant_id?: number | null;
  applicant_name?: string | null;
  employee_no?: string | null;
  chinese_name?: string | null;
  english_name?: string | null;
  company_email?: string | null;
  status?: string | null;
  user_sid?: string | null;
  account?: string | null;
  computer_name?: string | null;
  valid_from?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  approved_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function fetchSoftInstallerGrants(): Promise<SoftInstallerGrant[]> {
  const data = await airwayFetch('/api/softinstaller/grants');
  return Array.isArray(data?.grants) ? data.grants : [];
}

export interface SoftInstallerGrantDefaults {
  employee: {
    id: number;
    employeeNo: string;
    name: string;
    email: string;
  };
  userSid: string;
  account: string;
  computerName: string;
  computers: Array<{
    value: string;
    label: string;
    assetId: number;
    assetNo?: string | null;
    source: string;
  }>;
}

export async function fetchSoftInstallerGrantDefaults(employeeId: number): Promise<SoftInstallerGrantDefaults> {
  const data = await airwayFetch(`/api/softinstaller/grant-defaults/${employeeId}`);
  return data.defaults;
}

export async function createSoftInstallerGrant(payload: {
  employeeId: number;
  computerName: string;
  validFrom: string;
  expiresAt: string;
}) {
  return airwayFetch('/api/softinstaller/grants', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateSoftInstallerGrant(id: number, payload: {
  userSid: string;
  account: string;
  computerName: string;
  validFrom: string;
  expiresAt: string;
  revoked: boolean;
}) {
  return airwayFetch(`/api/softinstaller/grants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}
