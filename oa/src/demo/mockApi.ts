type DemoState = {
  employees: any[];
  departments: any[];
  assets: any[];
  accounts: any[];
  templates: any[];
  instances: any[];
};

const STATE_KEY = 'airway-frontend-showcase-state-v1';
const SESSION_KEY = 'airway-frontend-showcase-session';

const departments = [
  { id: 1, code: 'DEMO-OPS', name: '展示營運部', parent_id: null, sort_order: 10, manager_employee_id: 3, manager_name: '陳大文', manager_email: 'alex.chen@example.com' },
  { id: 2, code: 'DEMO-IT', name: '展示資訊部', parent_id: null, sort_order: 20, manager_employee_id: 1, manager_name: '展示管理員', manager_email: 'demo.admin@example.com' },
  { id: 3, code: 'DEMO-HR', name: '展示人資部', parent_id: null, sort_order: 30, manager_employee_id: 2, manager_name: '林小美', manager_email: 'mina.lin@example.com' },
  { id: 4, code: 'DEMO-CS', name: '客戶成功組', parent_id: 1, parent_name: '展示營運部', sort_order: 40, manager_employee_id: 4, manager_name: '張艾咪', manager_email: 'amy.chang@example.com' }
];

const employees = [
  { id: 1, employee_no: 'DEMO-001', chinese_name: '展示管理員', english_name: 'Demo Admin', company_email: 'demo.admin@example.com', ad_username: 'demo.admin', department_id: 2, department_code: 'DEMO-IT', department_name: '展示資訊部', position_title: '系統管理員', onboard_date: '2025-01-06', account_status: 'active', status: 'active', manager_name: '陳大文', manager_email: 'alex.chen@example.com' },
  { id: 2, employee_no: 'DEMO-002', chinese_name: '林小美', english_name: 'Mina Lin', company_email: 'mina.lin@example.com', ad_username: 'mina.lin', department_id: 3, department_code: 'DEMO-HR', department_name: '展示人資部', position_title: '人資專員', onboard_date: '2025-03-10', account_status: 'active', status: 'active', manager_name: '陳大文', manager_email: 'alex.chen@example.com' },
  { id: 3, employee_no: 'DEMO-003', chinese_name: '陳大文', english_name: 'Alex Chen', company_email: 'alex.chen@example.com', ad_username: 'alex.chen', department_id: 1, department_code: 'DEMO-OPS', department_name: '展示營運部', position_title: '營運主管', onboard_date: '2024-11-18', account_status: 'active', status: 'active' },
  { id: 4, employee_no: 'DEMO-004', chinese_name: '張艾咪', english_name: 'Amy Chang', company_email: 'amy.chang@example.com', ad_username: 'amy.chang', department_id: 4, department_code: 'DEMO-CS', department_name: '客戶成功組', position_title: '客戶成功專員', onboard_date: '2025-07-01', account_status: 'active', status: 'active', manager_id: 3, manager_name: '陳大文', manager_email: 'alex.chen@example.com' },
  { id: 5, employee_no: 'DEMO-005', chinese_name: '王小明', english_name: 'Kevin Wang', company_email: 'kevin.wang@example.com', ad_username: 'kevin.wang', department_id: 1, department_code: 'DEMO-OPS', department_name: '展示營運部', position_title: '營運分析師', onboard_date: '2024-08-12', account_status: 'resigned', status: 'resigned', manager_id: 3, manager_name: '陳大文' }
];

const assets = [
  { id: 1, asset_no: 'DEMO-NB-001', asset_type: 'Notebook', asset_category: 'laptop', name: 'Demo Admin Notebook', brand: 'DemoTech', model: 'Orbit 14', serial_no: 'SYNTH-NB-001', status: 'assigned', owner_employee_id: 1, employee_id: 1, chinese_name: '展示管理員', english_name: 'Demo Admin', employee_no: 'DEMO-001', department_id: 2, department_code: 'DEMO-IT', department_name: '展示資訊部', location: 'Taipei Demo Office', purchase_date: '2025-02-10', warranty_expire_date: '2028-02-09', assigned_at: '2025-02-12', automation_status: 'synced', hostname: 'DEMO-NB-001' },
  { id: 2, asset_no: 'DEMO-NB-002', asset_type: 'Notebook', asset_category: 'laptop', name: 'Operations Notebook', brand: 'DemoTech', model: 'Orbit 13', serial_no: 'SYNTH-NB-002', status: 'assigned', owner_employee_id: 4, employee_id: 4, chinese_name: '張艾咪', english_name: 'Amy Chang', employee_no: 'DEMO-004', department_id: 4, department_code: 'DEMO-CS', department_name: '客戶成功組', location: 'Taipei Demo Office', purchase_date: '2025-04-15', warranty_expire_date: '2028-04-14', assigned_at: '2025-07-01', automation_status: 'synced', hostname: 'DEMO-NB-002' },
  { id: 3, asset_no: 'DEMO-MON-001', asset_type: 'Monitor', asset_category: 'monitor', name: 'Demo 27-inch Monitor', brand: 'DemoView', model: 'Clear 27', serial_no: 'SYNTH-MON-001', status: 'in_stock', owner_employee_id: null, employee_id: null, department_id: 2, department_code: 'DEMO-IT', department_name: '展示資訊部', location: 'Demo Warehouse', purchase_date: '2025-05-20', warranty_expire_date: '2028-05-19', automation_status: 'pending' },
  { id: 4, asset_no: 'DEMO-PROJ-001', asset_type: 'Projector', asset_category: 'office_equipment_electronic', name: 'Meeting Room Projector', brand: 'DemoView', model: 'Beam Pro', serial_no: 'SYNTH-PROJ-001', status: 'repair', owner_employee_id: null, employee_id: null, department_id: 1, department_code: 'DEMO-OPS', department_name: '展示營運部', location: 'Demo Meeting Room', purchase_date: '2024-09-20', automation_status: 'failed', automation_last_error: 'Demo maintenance ticket created' }
];

const accounts = [
  { id: 1, employee_id: 1, system_name: 'gws', account_name: 'demo.admin', account_email: 'demo.admin@example.com', account_status: 'active', status: 'active', enabled: 1, role: 'Admin', need_2fa: 1, employee_no: 'DEMO-001', chinese_name: '展示管理員', english_name: 'Demo Admin', department_code: 'DEMO-IT', department_name: '展示資訊部', automation_status: 'synced' },
  { id: 2, employee_id: 2, system_name: 'gws', account_name: 'mina.lin', account_email: 'mina.lin@example.com', account_status: 'active', status: 'active', enabled: 1, role: 'User', need_2fa: 1, employee_no: 'DEMO-002', chinese_name: '林小美', english_name: 'Mina Lin', department_code: 'DEMO-HR', department_name: '展示人資部', automation_status: 'synced' },
  { id: 3, employee_id: 3, system_name: 'aws', account_name: 'alex.chen', account_email: 'alex.chen@example.com', account_status: 'active', status: 'active', enabled: 1, role: 'PowerUser', need_2fa: 1, employee_no: 'DEMO-003', chinese_name: '陳大文', english_name: 'Alex Chen', department_code: 'DEMO-OPS', department_name: '展示營運部', automation_status: 'synced' },
  { id: 4, employee_id: 4, system_name: 'm365', account_name: 'operations@example.com', account_email: 'amy.chang@example.com', account_status: 'active', status: 'active', enabled: 1, role: 'Member', license_name: 'Business Basic', need_2fa: 1, employee_no: 'DEMO-004', chinese_name: '張艾咪', english_name: 'Amy Chang', department_code: 'DEMO-CS', department_name: '客戶成功組', automation_status: 'synced' }
];

const templateFields = [
  { id: 1, field_key: 'employee', field_label: '申請員工', field_type: 'employee', required: 1, enabled: 1, sort_order: 1, placeholder: '請選擇員工' },
  { id: 2, field_key: 'effective_date', field_label: '生效日期', field_type: 'date', required: 1, enabled: 1, sort_order: 2, placeholder: '請選擇日期' },
  { id: 3, field_key: 'reason', field_label: '申請說明', field_type: 'textarea', required: 1, enabled: 1, sort_order: 3, placeholder: '請輸入原因' }
];

const process = [
  { id: 'submit', node_type: 'submit', node_name: '提交申請' },
  { id: 'manager', node_type: 'approval', node_name: '主管審批', approver_type: 'employee', approver_ids: [3], approval_mode: 'any' },
  { id: 'it', node_type: 'processing', node_name: 'IT 執行', processor_type: 'employee', processor_ids: [1] },
  { id: 'end', node_type: 'end', node_name: '完成' }
];

const templates = [
  { id: 1, form_code: 'DEMO_OFFBOARDING', template_code: 'DEMO_OFFBOARDING', form_name: '展示用離職申請', template_name: '展示用離職申請', category: 'HR', group_name: '人事服務', workspace_group: '人事服務', description: '展示簽核、資產回收與帳號停用流程', icon: '👋', enabled: 1, show_in_workspace: 1, fields: templateFields, process_json: process, schema_json: JSON.stringify(templateFields) },
  { id: 2, form_code: 'DEMO_EQUIPMENT', template_code: 'DEMO_EQUIPMENT', form_name: '設備領用申請', template_name: '設備領用申請', category: 'IT', group_name: '資訊服務', workspace_group: '資訊服務', description: '申請筆電、螢幕或辦公設備', icon: '💻', enabled: 1, show_in_workspace: 1, fields: templateFields, process_json: process, schema_json: JSON.stringify(templateFields) },
  { id: 3, form_code: 'DEMO_ACCESS', template_code: 'DEMO_ACCESS', form_name: '系統權限申請', template_name: '系統權限申請', category: 'IT', group_name: '資訊服務', workspace_group: '資訊服務', description: '申請企業系統角色與存取權', icon: '🔐', enabled: 1, show_in_workspace: 1, fields: templateFields, process_json: process, schema_json: JSON.stringify(templateFields) },
  { id: 4, form_code: 'DEMO_PURCHASE', template_code: 'DEMO_PURCHASE', form_name: '採購申請', template_name: '採購申請', category: 'GA', group_name: '行政服務', workspace_group: '行政服務', description: '一般採購與費用審批', icon: '🛒', enabled: 1, show_in_workspace: 1, fields: templateFields, process_json: process, schema_json: JSON.stringify(templateFields) }
];

const instances = [
  { id: 101, template_id: 1, template_code: 'DEMO_OFFBOARDING', template_name: '展示用離職申請', category: 'HR', applicant_id: 1, applicant_name: '展示管理員', status: 'PENDING', current_step_index: 1, current_handlers: ['陳大文'], form_data: { employee: '張艾咪', effective_date: '2026-08-31', reason: '公開展示流程' }, form_data_json: '{"demo":true}', created_at: '2026-08-18 09:30', updated_at: '2026-08-18 09:30' },
  { id: 102, template_id: 2, template_code: 'DEMO_EQUIPMENT', template_name: '設備領用申請', category: 'IT', applicant_id: 2, applicant_name: '林小美', status: 'PENDING', current_step_index: 1, current_handlers: ['展示管理員'], form_data: { employee: '林小美', effective_date: '2026-08-25', reason: '新進人員設備' }, form_data_json: '{"demo":true}', created_at: '2026-08-19 14:10', updated_at: '2026-08-19 14:10' },
  { id: 103, template_id: 3, template_code: 'DEMO_ACCESS', template_name: '系統權限申請', category: 'IT', applicant_id: 1, applicant_name: '展示管理員', status: 'APPROVED', current_step_index: 3, current_handlers: [], form_data: { employee: '張艾咪', effective_date: '2026-08-12', reason: 'CRM Demo 權限' }, form_data_json: '{"demo":true}', created_at: '2026-08-11 10:20', updated_at: '2026-08-12 16:30', completed_at: '2026-08-12 16:30' }
];

const baseState: DemoState = { employees, departments, assets, accounts, templates, instances };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function loadState(): DemoState {
  try {
    return { ...clone(baseState), ...JSON.parse(localStorage.getItem(STATE_KEY) || '') };
  } catch {
    return clone(baseState);
  }
}

function saveState(state: DemoState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Demo-Data': 'true' }
  });
}

function bodyOf(init?: RequestInit): any {
  if (typeof init?.body !== 'string') return {};
  try { return JSON.parse(init.body); } catch { return {}; }
}

function demoUser() {
  return {
    ok: true,
    user: { ...employees[0], permissions: ['*'] },
    groups: [{ id: 1, code: 'SYSTEM_ADMIN', name: '展示系統管理員', group_type: 'system' }],
    permissions: ['*']
  };
}

function tasksFor(instance: any) {
  return [
    { id: instance.id * 10 + 1, instance_id: instance.id, step_index: 1, step_name: '主管審批', task_type: 'approval', assignee_type: 'employee', assignee_id: 3, assignee_name: '陳大文', status: instance.status === 'PENDING' ? 'PENDING' : 'APPROVED' },
    { id: instance.id * 10 + 2, instance_id: instance.id, step_index: 2, step_name: 'IT 執行', task_type: 'processing', assignee_type: 'employee', assignee_id: 1, assignee_name: '展示管理員', status: instance.status === 'APPROVED' ? 'APPROVED' : 'WAITING' }
  ];
}

async function handleApi(url: URL, init?: RequestInit): Promise<Response> {
  const state = loadState();
  const path = url.pathname;
  const method = String(init?.method || 'GET').toUpperCase();
  const payload = bodyOf(init);

  if (path === '/api/health') return json({ ok: true, service: 'airway-frontend-demo', mode: 'browser-mock' });
  if (path === '/api/auth/ad/login' && method === 'POST') {
    if (!payload.username || !payload.password) return json({ ok: false, message: '請輸入 Demo 帳號與密碼' }, 400);
    localStorage.setItem(SESSION_KEY, '1');
    return json(demoUser());
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    localStorage.removeItem(SESSION_KEY);
    return json({ ok: true });
  }
  if (path === '/api/auth/me') {
    if (!localStorage.getItem(SESSION_KEY)) return json({ ok: false, message: '尚未登入' }, 401);
    return json(demoUser());
  }

  if (path === '/api/employees/me') return json({ ok: true, employee: state.employees[0], assets: state.assets.filter(row => row.employee_id === 1), itAccounts: state.accounts.filter(row => row.employee_id === 1) });
  if (path === '/api/employees/lookup') return json(state.employees);
  if (path === '/api/employees' && method === 'GET') return json(state.employees);
  if (path === '/api/employees' && method === 'POST') {
    const department = state.departments.find(row => row.id === Number(payload.department_id));
    const employee = { id: Math.max(0, ...state.employees.map(row => Number(row.id))) + 1, status: payload.account_status || 'active', ...payload, department_name: department?.name, department_code: department?.code };
    state.employees.unshift(employee); saveState(state); return json({ ok: true, employee });
  }
  const employeeMatch = path.match(/^\/api\/employees\/(\d+)$/);
  if (employeeMatch) {
    const id = Number(employeeMatch[1]);
    const index = state.employees.findIndex(row => row.id === id);
    if (index < 0) return json({ message: 'Demo employee not found' }, 404);
    if (method === 'DELETE') { state.employees[index].account_status = 'deleted'; state.employees[index].status = 'deleted'; saveState(state); return json({ ok: true }); }
    if (method === 'PUT') { state.employees[index] = { ...state.employees[index], ...payload }; saveState(state); return json({ ok: true, employee: state.employees[index] }); }
    return json({ ok: true, employee: state.employees[index], itAccounts: state.accounts.filter(row => row.employee_id === id), assets: state.assets.filter(row => row.employee_id === id), changeLogs: [{ id: 1, action: 'DEMO_CREATED', created_at: '2026-08-01 09:00' }], workflowRequests: state.instances.filter(row => row.applicant_id === id) });
  }

  if (path === '/api/departments' && method === 'GET') return json(state.departments);
  if (path === '/api/departments' && method === 'POST') {
    const row = { id: Math.max(...state.departments.map(item => item.id)) + 1, code: `DEMO-${Date.now().toString().slice(-4)}`, ...payload, parent_id: payload.parentId ?? null };
    state.departments.push(row); saveState(state); return json({ ok: true, department: row });
  }
  const memberMatch = path.match(/^\/api\/departments\/(\d+)\/members$/);
  if (memberMatch) return json({ ok: true, members: state.employees.filter(row => row.department_id === Number(memberMatch[1])) });
  const deptMoveMatch = path.match(/^\/api\/departments\/(\d+)\/move$/);
  if (deptMoveMatch) { const row = state.departments.find(item => item.id === Number(deptMoveMatch[1])); if (row) row.parent_id = payload.parentId ?? null; saveState(state); return json({ ok: true, department: row }); }
  const deptMatch = path.match(/^\/api\/departments\/(\d+)$/);
  if (deptMatch && method === 'PUT') { const row = state.departments.find(item => item.id === Number(deptMatch[1])); Object.assign(row || {}, payload, { parent_id: payload.parentId ?? row?.parent_id }); saveState(state); return json({ ok: true, department: row }); }

  if (path === '/api/assets' && method === 'GET') {
    let rows = state.assets;
    if (url.searchParams.get('category')) rows = rows.filter(row => row.asset_category === url.searchParams.get('category'));
    if (url.searchParams.get('status')) rows = rows.filter(row => row.status === url.searchParams.get('status'));
    return json(rows);
  }
  if (path === '/api/assets' && method === 'POST') { const row = { id: Math.max(...state.assets.map(item => item.id)) + 1, status: 'in_stock', automation_status: 'demo', ...payload }; state.assets.unshift(row); saveState(state); return json({ ok: true, asset: row }); }
  const assetCodeMatch = path.match(/^\/api\/assets\/code\/(.+)$/);
  if (assetCodeMatch) { const row = state.assets.find(item => item.asset_no === decodeURIComponent(assetCodeMatch[1])); return row ? json({ ok: true, asset: row }) : json({ message: 'Demo asset not found' }, 404); }
  const assetSyncMatch = path.match(/^\/api\/assets\/(\d+)\/sync$/);
  if (assetSyncMatch) { const row = state.assets.find(item => item.id === Number(assetSyncMatch[1])); if (row) row.automation_status = 'synced'; saveState(state); return json({ ok: true, asset: row, message: 'Demo sync completed' }); }
  const assetMatch = path.match(/^\/api\/assets\/(\d+)$/);
  if (assetMatch) {
    const id = Number(assetMatch[1]); const index = state.assets.findIndex(row => row.id === id); const row = state.assets[index];
    if (!row) return json({ message: 'Demo asset not found' }, 404);
    if (method === 'DELETE') { state.assets.splice(index, 1); saveState(state); return json({ ok: true }); }
    if (method === 'PUT') { state.assets[index] = { ...row, ...payload }; saveState(state); return json({ ok: true, asset: state.assets[index] }); }
    return json({ ok: true, asset: row });
  }

  if (path === '/api/accounts' && method === 'GET') {
    let rows = state.accounts;
    if (url.searchParams.get('system')) rows = rows.filter(row => row.system_name === url.searchParams.get('system'));
    if (url.searchParams.get('status')) rows = rows.filter(row => row.account_status === url.searchParams.get('status'));
    return json(rows);
  }
  if (path === '/api/accounts' && method === 'POST') { const row = { id: Math.max(...state.accounts.map(item => Number(item.id))) + 1, account_status: 'active', status: 'active', automation_status: 'demo', ...payload }; state.accounts.unshift(row); saveState(state); return json({ ok: true, account: row }); }
  const accountSyncMatch = path.match(/^\/api\/accounts\/(\d+)\/sync$/);
  if (accountSyncMatch) { const row = state.accounts.find(item => Number(item.id) === Number(accountSyncMatch[1])); if (row) row.automation_status = 'synced'; saveState(state); return json({ ok: true, account: row, message: 'Demo sync completed' }); }
  const accountMatch = path.match(/^\/api\/accounts\/(\d+)$/);
  if (accountMatch) {
    const id = Number(accountMatch[1]); const index = state.accounts.findIndex(row => Number(row.id) === id); const row = state.accounts[index];
    if (!row) return json({ message: 'Demo account not found' }, 404);
    if (method === 'DELETE') { row.account_status = 'deleted'; row.status = 'deleted'; saveState(state); return json({ ok: true }); }
    if (method === 'PUT') { state.accounts[index] = { ...row, ...payload }; saveState(state); return json({ ok: true, account: state.accounts[index] }); }
    return json({ ok: true, account: row });
  }

  if (path === '/api/forms/groups') {
    const names = [...new Set(state.templates.map(row => row.group_name))];
    return json({ ok: true, groups: names.map(name => ({ name, count: state.templates.filter(row => row.group_name === name).length })) });
  }
  if ((path === '/api/forms/templates' || path === '/api/approvals/templates') && method === 'GET') return json(path.includes('/approvals/') ? state.templates : { ok: true, templates: state.templates });
  if ((path === '/api/forms/templates' || path === '/api/approvals/templates') && method === 'POST') { const row = { id: Math.max(...state.templates.map(item => Number(item.id))) + 1, enabled: 1, ...payload }; state.templates.unshift(row); saveState(state); return json({ ok: true, id: row.id, template: row }); }
  const templateSubmit = path.match(/^\/api\/(?:forms|approvals)\/templates\/(\d+)\/submit$/);
  if (templateSubmit) {
    const template = state.templates.find(row => Number(row.id) === Number(templateSubmit[1])); const id = Math.max(...state.instances.map(row => row.id)) + 1;
    const row = { id, template_id: template?.id, template_code: template?.form_code || template?.template_code, template_name: template?.form_name || template?.template_name, category: template?.category || 'GA', applicant_id: 1, applicant_name: '展示管理員', status: 'PENDING', current_step_index: 1, current_handlers: ['陳大文'], form_data: payload.form_data || payload, form_data_json: JSON.stringify(payload.form_data || payload), created_at: new Date().toLocaleString('sv-SE'), updated_at: new Date().toLocaleString('sv-SE') };
    state.instances.unshift(row); saveState(state); return json({ ok: true, id, request_no: `DEMO-REQ-${id}`, message: 'Demo 申請已送出' });
  }
  const templateAction = path.match(/^\/api\/(?:forms|approvals)\/templates\/(\d+)(?:\/(status|duplicate|group))?$/);
  if (templateAction) {
    const index = state.templates.findIndex(row => Number(row.id) === Number(templateAction[1])); const row = state.templates[index];
    if (!row) return json({ message: 'Demo template not found' }, 404);
    if (templateAction[2] === 'duplicate') { const copy = { ...clone(row), id: Math.max(...state.templates.map(item => Number(item.id))) + 1, form_code: `${row.form_code}_COPY`, form_name: `${row.form_name}（副本）` }; state.templates.push(copy); saveState(state); return json({ ok: true, id: copy.id, template: copy }); }
    if (templateAction[2] === 'status') { row.enabled = Number(payload.enabled); saveState(state); return json({ ok: true, template: row }); }
    if (templateAction[2] === 'group') { row.group_name = payload.group_name; saveState(state); return json({ ok: true, template: row }); }
    if (method === 'DELETE') { state.templates.splice(index, 1); saveState(state); return json({ ok: true }); }
    if (method === 'PUT') { state.templates[index] = { ...row, ...payload }; saveState(state); return json({ ok: true, id: row.id, template: state.templates[index] }); }
    return json({ ok: true, template: row });
  }

  if (path === '/api/forms/data/query') return json({ ok: true, instances: state.instances, count: state.instances.length, query: Object.fromEntries(url.searchParams) });
  if ((path === '/api/forms/instances' || path === '/api/approvals/instances') && method === 'GET') {
    const scope = url.searchParams.get('box') || url.searchParams.get('scope') || 'all';
    let rows = state.instances;
    if (scope === 'pending') rows = rows.filter(row => row.status === 'PENDING');
    if (scope === 'processed') rows = rows.filter(row => row.status !== 'PENDING');
    if (scope === 'mine') rows = rows.filter(row => row.applicant_id === 1);
    return json(path.includes('/approvals/') ? rows : { ok: true, instances: rows });
  }
  const instanceMatch = path.match(/^\/api\/(?:forms|approvals)\/instances\/(\d+)$/);
  if (instanceMatch) {
    const instance = state.instances.find(row => row.id === Number(instanceMatch[1])); if (!instance) return json({ message: 'Demo request not found' }, 404);
    const template = state.templates.find(row => row.id === instance.template_id); const tasks = tasksFor(instance); const logs = [{ id: 1, instance_id: instance.id, actor_id: 1, actor_name: '展示管理員', action: 'SUBMIT', step_name: '提交申請', created_at: instance.created_at }];
    return json({ ok: true, instance, template, tasks, logs, current_user_task: instance.status === 'PENDING' ? tasks[0] : null });
  }
  const taskMatch = path.match(/^\/api\/(?:forms|approvals)\/tasks\/(\d+)\/action$/);
  if (taskMatch) { const instanceId = Math.floor(Number(taskMatch[1]) / 10); const instance = state.instances.find(row => row.id === instanceId); if (instance && payload.action !== 'COMMENT') instance.status = payload.action === 'REJECT' ? 'REJECTED' : 'APPROVED'; saveState(state); return json({ ok: true, message: `Demo task ${payload.action || 'updated'}` }); }

  if (path === '/api/permission-groups') return json([{ id: 1, code: 'SYSTEM_ADMIN', name: '展示系統管理員', description: 'Frontend demo role', group_type: 'system', is_active: 1, member_count: 1, action_count: 1 }]);
  if (path.match(/^\/api\/permission-groups\/\d+\/members$/)) return json({ rows: [{ id: 1, group_id: 1, employee_id: 1, ...state.employees[0] }] });
  if (path.match(/^\/api\/permission-groups\/\d+\/actions$/)) return json({ rows: [{ id: 1, group_id: 1, permission_code: '*', is_allowed: 1 }] });
  if (path === '/api/simple-permissions/config') return json({ ok: true, pages: [{ key: 'dashboard', label: '工作台', path: '/airway/dashboard', permission_code: 'PAGE_DASHBOARD.view', employee_ids: [1], employees: [state.employees[0]] }], roles: [{ id: 1, name: 'Demo Admin', code: 'R_SUPER', description: 'All demo pages', is_default_all: 0, page_keys: ['dashboard'], member_ids: [1], members: [state.employees[0]] }], super_admins: [state.employees[0]], super_admin_ids: [1] });
  if (path === '/api/simple-permissions/me') return json({ ok: true, permissions: ['*'], pages: ['*'] });
  if (path === '/api/softinstaller/grants') return json({ ok: true, grants: [] });
  if (path === '/api/ad-permissions/live') return json({ ok: true, rows: [], summary: { users: 5, groups: 4, warnings: 0 }, demo: true });
  if (path === '/api/ad-permissions/settings') return json({ ok: true, settings: { enabled: false, schedule: 'Demo only' } });

  return json({ ok: true, demo: true, message: 'Frontend demo action completed', rows: [], data: [] });
}

export function installDemoApi() {
  if (typeof window === 'undefined' || (window as any).__DEMO_OA_API__) return;
  (window as any).__DEMO_OA_API__ = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
      await new Promise(resolve => window.setTimeout(resolve, 90));
      return handleApi(url, init);
    }
    return originalFetch(input, init);
  };
}
