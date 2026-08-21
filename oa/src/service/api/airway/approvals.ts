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

export type ApprovalCategory = 'IT' | 'HR' | 'GA';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface ApprovalProcessStep {
  step_name: string;
  approver_id?: number | null;
  role_code?: string | null;
}

export interface ApprovalTemplate {
  id: number;
  template_code: string;
  template_name: string;
  category: ApprovalCategory;
  description?: string | null;
  schema_json: string;
  process_json: string;
  schema?: ApprovalFieldSchema[];
  process?: ApprovalProcessStep[];
  enabled: number;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertApprovalTemplatePayload {
  template_code: string;
  template_name: string;
  category: ApprovalCategory;
  description?: string;
  schema: ApprovalFieldSchema[];
  process: ApprovalProcessStep[];
  enabled?: number;
}

export interface ApprovalInstance {
  id: number;
  template_id: number;
  template_code: string;
  template_name: string;
  category: ApprovalCategory;
  applicant_id: number;
  applicant_name?: string;
  form_data_json: string;
  form_data?: Record<string, any>;
  schema?: ApprovalFieldSchema[];
  process?: ApprovalProcessStep[];
  status: ApprovalStatus;
  current_step_index?: number;
  pending_task_count?: number;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface ApprovalTask {
  id: number;
  instance_id: number;
  step_index: number;
  step_name?: string;
  task_type: string;
  assignee_type: string;
  assignee_id?: number;
  role_code?: string;
  status: string;
  action_by?: number;
  action_at?: string;
  comment?: string;
  created_at?: string;
  assignee_name?: string;
  assignee_english_name?: string;
  assignee_email?: string;
  action_by_name?: string;
}

export interface ApprovalLog {
  id: number;
  instance_id: number;
  task_id?: number;
  actor_id?: number;
  action: string;
  comment?: string;
  step_index?: number;
  step_name?: string;
  created_at?: string;
  actor_name?: string;
  actor_english_name?: string;
  actor_email?: string;
}

export function fetchApprovalTemplates(params: { category?: string; includeDisabled?: boolean; management?: boolean } = {}): Promise<ApprovalTemplate[]> {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.includeDisabled) search.set('includeDisabled', '1');
  if (params.management) search.set('management', '1');
  const qs = search.toString();
  return airwayFetch(`/api/approvals/templates${qs ? `?${qs}` : ''}`);
}

export function fetchApprovalTemplate(id: number | string, includeDisabled = false): Promise<ApprovalTemplate> {
  return airwayFetch(`/api/approvals/templates/${id}${includeDisabled ? '?includeDisabled=1' : ''}`);
}

export function createApprovalTemplate(payload: UpsertApprovalTemplatePayload): Promise<{ ok: boolean; id: number; message?: string }> {
  return airwayFetch('/api/approvals/templates', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateApprovalTemplate(id: number | string, payload: UpsertApprovalTemplatePayload): Promise<{ ok: boolean; message?: string }> {
  return airwayFetch(`/api/approvals/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function setApprovalTemplateStatus(id: number | string, enabled: number): Promise<{ ok: boolean; message?: string }> {
  return airwayFetch(`/api/approvals/templates/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled })
  });
}

export function submitApprovalTemplate(id: number | string, formData: Record<string, any>): Promise<{ ok: boolean; id: number; message?: string }> {
  return airwayFetch(`/api/approvals/templates/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ form_data: formData })
  });
}

export function fetchApprovalInstances(scope: 'mine' | 'pending' | 'processed' | 'all' = 'mine'): Promise<ApprovalInstance[]> {
  return airwayFetch(`/api/approvals/instances?scope=${scope}`);
}

export function fetchApprovalInstance(id: number | string): Promise<{
  ok: boolean;
  instance: ApprovalInstance;
  tasks: ApprovalTask[];
  logs: ApprovalLog[];
  current_user_task?: ApprovalTask | null;
}> {
  return airwayFetch(`/api/approvals/instances/${id}`);
}

export function actionApprovalTask(taskId: number | string, payload: { action: 'APPROVE' | 'REJECT'; comment?: string }): Promise<{ ok: boolean; message?: string }> {
  return airwayFetch(`/api/approvals/tasks/${taskId}/action`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
