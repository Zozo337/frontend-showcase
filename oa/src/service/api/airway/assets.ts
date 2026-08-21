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

export type AssetCategory =
  | 'laptop'
  | 'monitor'
  | 'office_equipment_electronic'
  | 'office_equipment_nonelectronic'
  | 'machine_equipment'
  | string;

export type AssetStatus = 'in_stock' | 'pending_assign' | 'assigned' | 'returned' | 'repair' | 'retired' | string;

export interface AirwayAsset {
  id: number;
  asset_no?: string | null;
  asset_type?: string | null;
  asset_category?: AssetCategory | null;
  asset_category_normalized?: AssetCategory | null;
  asset_domain?: string | null;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_no?: string | null;
  purchase_date?: string | null;
  warranty_expire_date?: string | null;
  status?: AssetStatus;
  owner_employee_id?: number | null;
  employee_id?: number | null;
  assigned_employee_id?: number | null;
  effective_employee_id?: number | null;
  employee_no?: string | null;
  chinese_name?: string | null;
  english_name?: string | null;
  company_email?: string | null;
  department_id?: number | null;
  effective_department_id?: number | null;
  department_code?: string | null;
  department_name?: string | null;
  location?: string | null;
  assigned_at?: string | null;
  returned_at?: string | null;
  note?: string | null;
  extra_json?: string | null;
  qr_text?: string | null;
  qr_url?: string | null;
  automation_status?: string | null;
  automation_last_error?: string | null;
  automation_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface FetchAssetsOptions {
  category?: string;
  type?: string;
  status?: string;
  q?: string;
  employeeId?: number | null;
  includeReturned?: boolean;
  includeRetired?: boolean;
}

export interface AssetPayload {
  asset_category?: string;
  assetCategory?: string;
  category?: string;
  asset_type?: string;
  assetType?: string;
  asset_no?: string | null;
  assetNo?: string | null;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_no?: string | null;
  serialNo?: string | null;
  purchase_date?: string | null;
  purchaseDate?: string | null;
  warranty_expire_date?: string | null;
  warrantyExpireDate?: string | null;
  status?: string;
  employee_id?: number | null;
  employeeId?: number | null;
  location?: string | null;
  assigned_at?: string | null;
  assignedAt?: string | null;
  returned_at?: string | null;
  returnedAt?: string | null;
  note?: string | null;
  extra_json?: string | Record<string, any> | null;
  extraJson?: string | Record<string, any> | null;
}

function normalizeAssetList(data: any): AirwayAsset[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.assets)) return data.assets;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchAssets(options: FetchAssetsOptions = {}): Promise<AirwayAsset[]> {
  const search = new URLSearchParams();

  if (options.category) search.set('category', options.category);
  if (options.type) search.set('type', options.type);
  if (options.status) search.set('status', options.status);
  if (options.q) search.set('q', options.q);
  if (options.employeeId) search.set('employeeId', String(options.employeeId));
  if (options.includeReturned) search.set('includeReturned', 'true');
  if (options.includeRetired) search.set('includeRetired', 'true');

  const qs = search.toString();
  const data = await airwayFetch(`/api/assets${qs ? `?${qs}` : ''}`);

  return normalizeAssetList(data);
}

export function fetchAsset(id: number): Promise<{ ok: boolean; asset: AirwayAsset }> {
  return airwayFetch(`/api/assets/${id}`);
}

export function fetchAssetByCode(assetNo: string): Promise<{ ok: boolean; asset: AirwayAsset }> {
  return airwayFetch(`/api/assets/code/${encodeURIComponent(assetNo)}`);
}

export function createAsset(payload: AssetPayload) {
  return airwayFetch('/api/assets', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAsset(id: number, payload: AssetPayload) {
  return airwayFetch(`/api/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAsset(id: number) {
  return airwayFetch(`/api/assets/${id}`, {
    method: 'DELETE'
  });
}

export function syncAsset(id: number, action = 'asset.sync') {
  return airwayFetch(`/api/assets/${id}/sync`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });
}
