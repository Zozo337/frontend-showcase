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
    throw new Error(typeof data === 'string' ? data : data?.error || JSON.stringify(data));
  }

  return data;
}

export interface AirwayDepartment {
  id: number;
  name: string;
  code?: string;
  parent_id?: number | null;
  sort_order?: number;
  manager_employee_id?: number | null;
  manager_employee_no?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface DepartmentPayload {
  name: string;
  code?: string;
  parentId?: number | null;
  managerEmployeeId?: number | null;
}

export interface DepartmentMember {
  id: number;
  employee_no?: string;
  chinese_name?: string;
  english_name?: string;
  company_email?: string;
  position_title?: string;
  job_title?: string;
  title?: string;
  account_status?: string;
  department_id?: number;
  department_name?: string;
  avatar_url?: string;
  [key: string]: any;
}

export function fetchDepartments(): Promise<AirwayDepartment[]> {
  return airwayFetch('/api/departments');
}

export async function fetchDepartmentMembers(departmentId: number): Promise<DepartmentMember[]> {
  const data = await airwayFetch(`/api/departments/${departmentId}/members`);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.members)) return data.members;
  if (Array.isArray(data.rows)) return data.rows;

  return [];
}

export function createDepartment(payload: DepartmentPayload) {
  return airwayFetch('/api/departments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateDepartment(id: number, payload: DepartmentPayload) {
  return airwayFetch(`/api/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function moveDepartment(id: number, parentId: number | null) {
  return airwayFetch(`/api/departments/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ parentId })
  });
}