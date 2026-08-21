const AIRWAY_API_BASE = '';

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(typeof data === 'string' ? data : data?.error || JSON.stringify(data));
  }

  return data;
}

export function previewEmployeeImport(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${AIRWAY_API_BASE}/api/employees/import/preview`, {
    credentials: 'include',
    method: 'POST',
    body: formData
  }).then(parseResponse);
}

export function confirmEmployeeImport(rows: any[]) {
  return fetch(`${AIRWAY_API_BASE}/api/employees/import/confirm`, {
    credentials: 'include',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rows })
  }).then(parseResponse);
}
