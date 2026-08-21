async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(typeof data === 'string' ? data : data?.message || `API ${response.status}`);
  }

  return data;
}

export interface AdUserRow {
  item: number;
  employee_no?: string;
  name?: string;
  sam?: string;
  email?: string;
  department?: string;
  title?: string;
  view_permission?: string;
  edit_permission?: string;
  groups?: string[];
  note?: string;
}

export interface AdGroupRow {
  item: number;
  group_name?: string;
  description?: string;
  members?: string[];
  member_count?: number;
}

export interface AdChangeRow {
  item: number;
  employee_no?: string;
  name?: string;
  sam?: string;
  email?: string;
  department?: string;
  title?: string;
  view_permission?: string;
  edit_permission?: string;
  change_type?: string;
  before?: string;
  after?: string;
}

export interface AdReport {
  id: number;
  report_date: string;
  status: string;
  file_name?: string;
  total_users?: number;
  total_groups?: number;
  total_changes?: number;
  webhook_url?: string;
  webhook_status?: string;
  webhook_message?: string;
  message?: string;
  created_at?: string;
  completed_at?: string;
}

export interface AdLiveResponse {
  ok: boolean;
  configured: boolean;
  missing_config: string[];
  template_exists: boolean;
  template_path: string;
  report_dir: string;
  cron: string;
  timezone: string;
  running: boolean;
  settings: {
    webhook_url?: string;
  };
  latest: AdReport | null;
  tables: {
    users: AdUserRow[];
    groups: AdGroupRow[];
    changes: AdChangeRow[];
  };
}

export function fetchAdPermissionLive(): Promise<AdLiveResponse> {
  return apiFetch('/api/ad-permissions/live');
}

export function saveAdPermissionSettings(payload: { webhook_url: string }) {
  return apiFetch('/api/ad-permissions/settings', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function runAdPermissionReport(payload: { webhook_url?: string; save_webhook?: boolean } = {}) {
  return apiFetch('/api/ad-permissions/run', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function adPermissionReportDownloadUrl(id: number | string) {
  return `/api/ad-permissions/reports/${id}/download`;
}
