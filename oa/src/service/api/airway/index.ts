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
    throw new Error(`Demo API ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }

  return data;
}

export function fetchAirwayHealth() {
  return airwayFetch('/api/health');
}

export function fetchAirwayEmployees() {
  return airwayFetch('/api/employees');
}

export function fetchAirwayDepartments() {
  return airwayFetch('/api/departments');
}

export function fetchAirwayForms(params?: { category?: string; includeDisabled?: string | number }) {
  const searchParams = new URLSearchParams();

  if (params?.category) searchParams.set('category', params.category);
  if (params?.includeDisabled !== undefined) searchParams.set('includeDisabled', String(params.includeDisabled));

  const query = searchParams.toString();

  return airwayFetch(`/api/forms${query ? `?${query}` : ''}`);
}

export function fetchAirwayAssets() {
  return airwayFetch('/api/assets');
}

export function fetchAirwayWorkflowTasks() {
  return airwayFetch('/api/workflow-tasks');
}
