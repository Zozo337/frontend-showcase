const AIRWAY_API_BASE = '';
const API_TIMEOUT_MS = 15000;

async function apiFetch(path: string, options: RequestInit = {}) {
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

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
  }
  return data;
}

export type FieldPermissionMode = 'hidden' | 'readonly' | 'editable';

export interface LarkAutomationAction {
  id: string;
  name?: string;
  action_type: 'builtin' | 'custom';
  builtin_key?: string;
  webhook_url?: string;
  webhook_events?: string[];
  webhook_secret?: string;
  timeout_ms?: number;
  enabled?: number | boolean;
}

export interface LarkFormField {
  id?: number;
  form_id?: number;
  field_key: string;
  field_label: string;
  field_type: string;
  required?: number | boolean;
  placeholder?: string;
  default_value?: any;
  option_source?: 'manual' | 'external';
  options?: Array<{ label: string; value: string; sort_order?: number; color?: string; disabled?: boolean }>;
  printable?: boolean;
  options_json?: string | null;
  sort_order?: number;
  enabled?: number;
  config?: Record<string, any>;
  children?: LarkFormField[];
}

export interface LarkProcessNode {
  id?: string;
  node_type: 'submit' | 'approval' | 'processing' | 'cc' | 'end';
  node_name: string;
  approver_type?: 'employee' | 'approval_group' | 'variable' | 'submitter_select' | 'self' | 'role';
  approver_ids?: number[];
  approver_variable?: string;
  approval_group_ids?: number[];
  approver_group_ids?: number[];
  group_ids?: number[];
  processor_type?: 'employee' | 'approval_group' | 'variable' | 'submitter_select' | 'self' | 'role';
  processor_ids?: number[];
  processor_variable?: string;
  processor_group_ids?: number[];
  role_code?: string;
  approval_mode?: 'any' | 'all';
  cc_ids?: number[];
  field_permissions?: Record<string, FieldPermissionMode>;
  automation?: {
    webhook_url?: string;
    webhook_events?: string[];
    webhook_secret?: string;
    timeout_ms?: number;
    actions?: LarkAutomationAction[];
  };
}

export interface LarkTemplate {
  id?: number;
  form_code?: string;
  form_name: string;
  code?: string;
  name?: string;
  category: string;
  group_name?: string;
  workflow_type?: string;
  description?: string;
  icon?: string;
  submit_scope?: string;
  show_in_workspace?: number;
  workspace_group?: string;
  manager_ids?: number[];
  fields?: LarkFormField[];
  process_json?: LarkProcessNode[];
  settings_json?: Record<string, any>;
  enabled?: number;
  deleted_at?: string | null;
  field_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalInstance {
  id: number;
  template_id: number;
  template_code: string;
  template_name: string;
  category: string;
  applicant_id?: number;
  applicant_name?: string;
  form_data_json?: string;
  form_data?: Record<string, any>;
  status: string;
  current_step_index?: number;
  current_handlers?: string[];
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface ApprovalTask {
  id: number;
  instance_id: number;
  step_index: number;
  step_name: string;
  task_type: string;
  assignee_type: string;
  assignee_id?: number;
  role_code?: string;
  assignee_name?: string;
  status: string;
  action_by_name?: string;
  action_at?: string;
  comment?: string;
}

export interface ApprovalLog {
  id: number;
  instance_id: number;
  task_id?: number;
  actor_id?: number;
  actor_name?: string;
  action: string;
  comment?: string;
  step_name?: string;
  created_at?: string;
}

function normalizeProcess(nodes?: LarkProcessNode[], fields: LarkFormField[] = []) {
  const list = Array.isArray(nodes) ? [...nodes] : [];
  if (!list.length || list[0]?.node_type !== 'submit') {
    list.unshift({ id: 'submit', node_type: 'submit', node_name: '提交', field_permissions: {} });
  }
  const endIndex = list.findIndex(node => node.node_type === 'end');
  if (endIndex < 0) {
    list.push({ id: 'end', node_type: 'end', node_name: '結束', field_permissions: {} });
  } else if (endIndex !== list.length - 1) {
    const [end] = list.splice(endIndex, 1);
    list.push(end);
  }

  return list.map(node => {
    const permissions = { ...(node.field_permissions || {}) } as Record<string, FieldPermissionMode>;
    fields.forEach(field => {
      if (!permissions[field.field_key]) {
        permissions[field.field_key] = node.node_type === 'submit' ? 'editable' : 'readonly';
      }
    });
    return { ...node, field_permissions: permissions };
  });
}


function parseMaybeJsonValue(value: any, fallback: any = null) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeOptionItem(option: any, index: number) {
  if (typeof option === 'string') return { label: option, value: option, sort_order: index + 1 };
  const label = String(option?.label || option?.name || option?.value || `選項 ${index + 1}`);
  const value = String(option?.value || label || `option_${index + 1}`);
  return { ...option, label, value, sort_order: Number(option?.sort_order || index + 1) };
}

function normalizeOptions(field: any) {
  const raw = Array.isArray(field.options)
    ? field.options
    : Array.isArray(parseMaybeJsonValue(field.options_json || field.optionsJson, []))
      ? parseMaybeJsonValue(field.options_json || field.optionsJson, [])
      : [];
  return raw.map(normalizeOptionItem);
}

function normalizeField(field: LarkFormField, index: number): LarkFormField {
  const fieldType = field.field_type || (field as any).type || 'text';
  const config = field.config || {};
  const children = Array.isArray(field.children)
    ? field.children
    : Array.isArray((config as any).children)
      ? (config as any).children
      : [];

  const options = normalizeOptions(field);
  const defaultValue = parseMaybeJsonValue((field as any).default_value ?? (field as any).defaultValue, fieldType === 'multi_select' ? [] : '');

  return {
    ...field,
    field_key: field.field_key || (field as any).key || `field_${Date.now()}_${index}`,
    field_label: field.field_label || (field as any).label || `欄位 ${index + 1}`,
    field_type: fieldType,
    required: field.required ? 1 : 0,
    enabled: Number(field.enabled ?? 1),
    sort_order: Number(field.sort_order ?? index + 1),
    placeholder: field.placeholder || (['select', 'multi_select', 'date', 'date_range'].includes(fieldType) ? '請選擇' : '請輸入'),
    option_source: (field as any).option_source || (field as any).optionSource || (config as any).option_source || (['select', 'multi_select'].includes(fieldType) ? 'manual' : undefined),
    options,
    default_value: defaultValue,
    printable: (field as any).printable ?? (config as any).printable ?? true,
    children: children.map((child: LarkFormField, childIndex: number) => normalizeField(child, childIndex))
  };
}

function normalizeTemplatePayload(payload: Partial<LarkTemplate> & Record<string, any>) {
  const formName = String(payload.form_name || payload.name || '未命名審批').trim();
  const formCode = String(payload.form_code || payload.code || `FORM_${Date.now()}`).trim();
  const groupName = String(payload.group_name || payload.workspace_group || payload.category || '未分組').trim();
  const rawCategory = String(payload.category || groupName || 'HR').trim();
  const category = ['IT', 'HR', 'GA'].includes(rawCategory) ? rawCategory : 'HR';
  const settings = payload.settings_json || payload.settingsJson || {};
  const fields = Array.isArray(payload.fields) ? payload.fields.map(normalizeField) : [];

  return {
    ...payload,
    form_name: formName,
    form_code: formCode,
    name: formName,
    code: formCode,
    group_name: groupName,
    category,
    workflow_type: payload.workflow_type || 'LARK_APPROVAL',
    show_in_workspace: Number(payload.show_in_workspace ?? 1),
    workspace_group: payload.workspace_group || groupName || '全部申請',
    settings_json: settings,
    manager_ids: payload.manager_ids || settings.manager_employee_ids || [],
    enabled: Number(payload.enabled ?? 0),
    fields,
    schema_json: { fields },
    process_json: normalizeProcess(payload.process_json as LarkProcessNode[], fields)
  };
}

export function fetchLarkGroups(): Promise<{ ok: boolean; groups: Array<{ name: string; count: number }> }> {
  return apiFetch('/api/forms/groups');
}

export function createLarkGroup(name: string): Promise<{ ok: boolean; group: { name: string } }> {
  return apiFetch('/api/forms/groups', { method: 'POST', body: JSON.stringify({ name }) });
}

export function fetchLarkTemplates(params: { includeDisabled?: boolean; search?: string; group?: string } = {}): Promise<{ ok: boolean; templates: LarkTemplate[] }> {
  const search = new URLSearchParams();
  if (params.includeDisabled) search.set('includeDisabled', '1');
  if (params.search) search.set('search', params.search);
  if (params.group) search.set('group', params.group);
  const qs = search.toString();
  return apiFetch(`/api/forms/templates${qs ? `?${qs}` : ''}`);
}

export function fetchLarkTemplate(id: number | string): Promise<{ ok: boolean; template: LarkTemplate }> {
  return apiFetch(`/api/forms/templates/${id}`);
}

export function createLarkTemplate(payload: Partial<LarkTemplate>): Promise<{ ok: boolean; id: number; template: LarkTemplate }> {
  return apiFetch('/api/forms/templates', { method: 'POST', body: JSON.stringify(normalizeTemplatePayload(payload as any)) });
}

export function updateLarkTemplate(id: number | string, payload: Partial<LarkTemplate>): Promise<{ ok: boolean; id: number; template: LarkTemplate }> {
  return apiFetch(`/api/forms/templates/${id}`, { method: 'PUT', body: JSON.stringify(normalizeTemplatePayload(payload as any)) });
}

export function setLarkTemplateStatus(id: number | string, enabled: number): Promise<{ ok: boolean; template?: LarkTemplate }> {
  return apiFetch(`/api/forms/templates/${id}/status`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
}

export function duplicateLarkTemplate(id: number | string): Promise<{ ok: boolean; id: number; template: LarkTemplate }> {
  return apiFetch(`/api/forms/templates/${id}/duplicate`, { method: 'POST', body: JSON.stringify({}) });
}

export function deleteLarkTemplate(id: number | string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/forms/templates/${id}`, { method: 'DELETE' });
}

export function moveLarkTemplateToGroup(id: number | string, group_name: string): Promise<{ ok: boolean; template?: LarkTemplate }> {
  return apiFetch(`/api/forms/templates/${id}/group`, { method: 'PATCH', body: JSON.stringify({ group_name }) });
}

export function submitLarkApproval(id: number | string, payload: {
  form_data: Record<string, any>;
  approver_ids?: number[];
  selected_approvers_by_node?: Record<string, number[]>;
  selectedApproversByNode?: Record<string, number[]>;
}): Promise<{ ok: boolean; id: number; request_no?: string; message?: string }> {
  return apiFetch(`/api/forms/templates/${id}/submit`, { method: 'POST', body: JSON.stringify(payload) });
}

export function fetchApprovalInstances(box = 'pending'): Promise<{ ok: boolean; instances: ApprovalInstance[] }> {
  return apiFetch(`/api/forms/instances?box=${encodeURIComponent(box)}`);
}

export function fetchApprovalInstance(id: number | string): Promise<{ ok: boolean; instance: ApprovalInstance; template: LarkTemplate; tasks: ApprovalTask[]; logs: ApprovalLog[]; current_user_task: ApprovalTask | null }> {
  return apiFetch(`/api/forms/instances/${id}`);
}

export function actionApprovalTask(
  id: number | string,
  payload: { action: 'APPROVE' | 'REJECT' | 'COMMENT'; comment?: string; form_data?: Record<string, any> }
): Promise<{ ok: boolean; message?: string }> {
  return apiFetch(`/api/forms/tasks/${id}/action`, { method: 'POST', body: JSON.stringify(payload) });
}

export interface ApprovalDataQueryParams {
  template_id?: number | string | null;
  status?: string | null;
  applicant?: string | null;
  handler?: string | null;
  keyword?: string | null;
  created_start?: string | null;
  created_end?: string | null;
  completed_start?: string | null;
  completed_end?: string | null;
  limit?: number;
}

export function fetchApprovalData(
  params: ApprovalDataQueryParams = {}
): Promise<{ ok: boolean; instances: ApprovalInstance[]; count?: number; query?: Record<string, any> }> {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });

  const qs = search.toString();

  return apiFetch(`/api/forms/data/query${qs ? `?${qs}` : ''}`);
}

export interface ApprovalUserGroupMember {
  id: number;
  employee_no?: string;
  chinese_name?: string;
  english_name?: string;
  company_email?: string;
  department_id?: number;
  display_name?: string;
}

export interface ApprovalUserGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  group_type?: string;
  is_active?: number;
  member_count?: number;
  members?: ApprovalUserGroupMember[];
}

export function fetchApprovalUserGroups(
  params: { q?: string; includeDisabled?: boolean } = {}
): Promise<{ ok: boolean; groups: ApprovalUserGroup[] }> {
  const search = new URLSearchParams();

  if (params.q) search.set('q', params.q);
  if (params.includeDisabled) search.set('includeDisabled', '1');

  const qs = search.toString();

  return apiFetch(`/api/forms/approval-groups${qs ? `?${qs}` : ''}`);
}

export function createApprovalUserGroup(payload: {
  name: string;
  code?: string;
  description?: string;
  group_type?: string;
  employee_ids?: number[];
}): Promise<{ ok: boolean; group: ApprovalUserGroup }> {
  return apiFetch('/api/forms/approval-groups', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateApprovalUserGroup(
  id: number | string,
  payload: {
    name: string;
    description?: string;
    group_type?: string;
    is_active?: number | boolean;
    employee_ids?: number[];
  }
): Promise<{ ok: boolean; group: ApprovalUserGroup }> {
  return apiFetch(`/api/forms/approval-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteApprovalUserGroup(id: number | string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/forms/approval-groups/${id}`, {
    method: 'DELETE'
  });
}

export function previewApprovalResolver(payload: {
  source_type: 'employee' | 'approval_group' | 'group' | 'variable';
  variable?: 'applicant_self' | 'applicant_manager' | 'applicant_department_manager' | string;
  applicant_id?: number;
  group_ids?: number[];
  employee_ids?: number[];
}): Promise<{ ok: boolean; errors: string[]; assignee_ids: number[]; assignees: any[] }> {
  return apiFetch('/api/forms/approval-resolvers/preview', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
