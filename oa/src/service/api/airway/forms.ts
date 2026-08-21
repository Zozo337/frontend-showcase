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

  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Demo API ${response.status}: ${text}`);
  }

  return data;
}

export interface AirwayFormDefinition {
  id: number;
  form_code: string;
  form_name: string;
  category: string;
  workflow_type?: string;
  description?: string | null;
  enabled?: number;
  field_count?: number;
  created_at?: string;
  updated_at?: string;
  fields?: AirwayFormField[];
}

export interface AirwayFormField {
  id: number;
  form_id?: number;
  field_key: string;
  field_label: string;
  field_type: string;
  section_key?: string | null;
  section_name?: string | null;
  required?: number;
  readonly?: number;
  hidden?: number;
  placeholder?: string | null;
  default_value?: string | null;
  options_json?: string | null;
  sort_order?: number;
  enabled?: number;
}

export interface UpsertFormPayload {
  form_code: string;
  form_name: string;
  category: string;
  workflow_type: string;
  description?: string;
  enabled?: number;
}

export interface UpsertFieldPayload {
  field_key: string;
  field_label: string;
  field_type: string;
  required?: number;
  placeholder?: string;
  default_value?: string;
  options_json?: string;
  sort_order?: number;
  enabled?: number;
}

export interface AirwayRole {
  id?: number;
  role_key: string;
  role_name?: string;
  name?: string;
  description?: string;
  enabled?: number;
}

export interface AirwayFormPermission {
  form_code: string;
  role_key: string;
  can_view: number;
  can_create?: number;
  can_submit: number;
  can_edit_definition: number;
  can_view_all: number;
  can_view_own: number;
}

export interface WorkflowDefinition {
  id: number;
  workflow_key: string;
  form_code: string;
  name: string;
  description?: string | null;
  enabled?: number;
  steps?: WorkflowStep[];
}

export interface WorkflowStep {
  id?: number;
  workflow_definition_id?: number;
  step_order: number;
  step_key: string;
  step_name: string;
  step_type: string;
  assignee_type?: string | null;
  assignee_value?: string | null;
  required_role?: string | null;
  action_key?: string | null;
  description?: string | null;
}

export function fetchForms(params: { category?: string; includeDisabled?: boolean } = {}): Promise<AirwayFormDefinition[]> {
  const search = new URLSearchParams();

  if (params.category) search.set('category', params.category);
  if (params.includeDisabled) search.set('includeDisabled', '1');

  const qs = search.toString();

  return airwayFetch(`/api/forms${qs ? `?${qs}` : ''}`);
}

export function fetchFormDetail(id: number | string, includeDisabled = true): Promise<AirwayFormDefinition> {
  return airwayFetch(`/api/forms/${id}${includeDisabled ? '?includeDisabled=1' : ''}`);
}

export function createForm(payload: UpsertFormPayload): Promise<{ ok: boolean; id: number; message?: string }> {
  return airwayFetch('/api/forms', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateForm(id: number | string, payload: UpsertFormPayload): Promise<{ ok: boolean; message?: string }> {
  return airwayFetch(`/api/forms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function createFormField(
  formId: number | string,
  payload: UpsertFieldPayload
): Promise<{ ok: boolean; id: number; message?: string }> {
  return airwayFetch(`/api/forms/${formId}/fields`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateFormField(
  formId: number | string,
  fieldId: number | string,
  payload: UpsertFieldPayload
): Promise<{ ok: boolean; message?: string }> {
  return airwayFetch(`/api/forms/${formId}/fields/${fieldId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteFormField(formId: number | string, fieldId: number | string): Promise<{ ok: boolean; message?: string }> {
  return airwayFetch(`/api/forms/${formId}/fields/${fieldId}`, {
    method: 'DELETE'
  });
}

export function fetchPermissionRoles(): Promise<AirwayRole[]> {
  return airwayFetch('/api/permissions/roles');
}

export function fetchFormPermissions(formCode: string): Promise<AirwayFormPermission[]> {
  return airwayFetch(`/api/permissions/forms/${encodeURIComponent(formCode)}`);
}

export function saveFormPermissions(
  formCode: string,
  permissions: AirwayFormPermission[]
): Promise<{ ok: boolean }> {
  return airwayFetch(`/api/permissions/forms/${encodeURIComponent(formCode)}`, {
    method: 'PUT',
    body: JSON.stringify({ permissions })
  });
}

export function fetchWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  return airwayFetch('/api/workflows/definitions');
}

export function saveWorkflowDefinition(payload: {
  workflow_key: string;
  form_code: string;
  name: string;
  description?: string;
  enabled?: number;
}): Promise<{ ok: boolean; definition: WorkflowDefinition }> {
  return airwayFetch('/api/workflows/definitions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function saveWorkflowStep(
  definitionId: number | string,
  payload: WorkflowStep
): Promise<{ ok: boolean; step: WorkflowStep }> {
  return airwayFetch(`/api/workflows/definitions/${definitionId}/steps`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function deleteWorkflowStep(
  definitionId: number | string,
  stepId: number | string
): Promise<{ ok: boolean }> {
  return airwayFetch(`/api/workflows/definitions/${definitionId}/steps/${stepId}`, {
    method: 'DELETE'
  });
}


export interface AirwayEmployeeOption {
  id: number;
  employee_no?: string;
  chinese_name?: string;
  english_name?: string;
  company_email?: string;
  department_code?: string;
  department_name?: string;
}

export interface AirwayEmployeeAclResponse {
  ok: boolean;
  form_code: string;
  viewer_ids: number[];
  editor_ids: number[];
  viewers: AirwayEmployeeOption[];
  editors: AirwayEmployeeOption[];
}

export async function fetchEmployeeOptions(): Promise<AirwayEmployeeOption[]> {
  const data = await airwayFetch('/api/employees/lookup?limit=1000');
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.employees) ? data.employees : [];
}

export function fetchFormEmployeeAcl(formId: number | string): Promise<AirwayEmployeeAclResponse> {
  return airwayFetch(`/api/forms/${formId}/employee-acl`);
}

export function saveFormEmployeeAcl(
  formId: number | string,
  payload: { viewer_ids: number[]; editor_ids: number[] }
): Promise<{ ok: boolean }> {
  return airwayFetch(`/api/forms/${formId}/employee-acl`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}
