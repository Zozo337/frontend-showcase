<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  createLarkTemplate,
  fetchLarkGroups,
  fetchApprovalUserGroups,
  fetchLarkTemplate,
  updateLarkTemplate,
  type FieldPermissionMode,
  type LarkFormField,
  type LarkProcessNode,
  type LarkTemplate,
  type ApprovalUserGroup,
  type LarkAutomationAction
} from '@/service/api/airway/lark-forms';
import { fetchEmployeeLookup, type AirwayEmployee } from '@/service/api/airway/employees';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const activeStep = ref(1);
const loading = ref(false);
const saving = ref(false);
const selectedFieldKey = ref('');
const selectedNodeIndex = ref(1);
const draggingControlType = ref('');
const draggingFieldIndex = ref<number | null>(null);

const template = reactive<LarkTemplate>({
  form_name: '未命名審批',
  form_code: '',
  category: 'HR',
  group_name: '未分組',
  workflow_type: 'LARK_APPROVAL',
  description: '',
  icon: '📄',
  submit_scope: 'all',
  show_in_workspace: 1,
  workspace_group: '全部申請',
  fields: [],
  process_json: [
    { id: 'submit', node_type: 'submit', node_name: '提交', field_permissions: {}, automation: { webhook_url: '', webhook_events: ['approval.submitted'], webhook_secret: '', timeout_ms: 5000 } },
    { id: 'approval_default', node_type: 'approval', node_name: '審批', approver_type: 'submitter_select', approver_ids: [], approval_mode: 'any', field_permissions: {}, automation: { webhook_url: '', webhook_events: ['approval.node.completed'], webhook_secret: '', timeout_ms: 5000 } },
    { id: 'end', node_type: 'end', node_name: '結束', field_permissions: {}, automation: { webhook_url: '', webhook_events: ['approval.completed', 'approval.rejected'], webhook_secret: '', timeout_ms: 5000 } }
  ],
  settings_json: {
    allow_revoke_running: true,
    allow_batch_approve: false,
    quick_approve_card: true,
    dedupe_mode: 'once',
    lock_admin_management: false,
    allow_proxy_submit: false,
    submit_employee_ids: [],
    manager_employee_ids: []
  },
  enabled: 1
});

const fieldControls = [
  { type: 'text', label: '單行文本', icon: 'A', group: '文本' },
  { type: 'textarea', label: '多行文本', icon: 'A≡', group: '文本' },
  { type: 'description', label: '說明', icon: 'ⓘ', group: '文本' },
  { type: 'number', label: '數字', icon: '123', group: '數值' },
  { type: 'amount', label: '金額', icon: '￥', group: '數值' },
  { type: 'select', label: '單選', icon: '∨', group: '選項' },
  { type: 'multi_select', label: '多選', icon: '☷', group: '選項' },
  { type: 'date', label: '日期', icon: '▣', group: '日期 / 其他' },
  { type: 'date_range', label: '日期區間', icon: '▣', group: '日期 / 其他' },
  { type: 'detail_table', label: '明細/表格', icon: '▦', group: '日期 / 其他' },
  { type: 'file', label: '附件', icon: '📎', group: '日期 / 其他' },
  { type: 'department', label: '部門', icon: '⌘', group: '日期 / 其他' },
  { type: 'employee', label: '聯繫人', icon: '👤', group: '日期 / 其他' },
  { type: 'phone', label: '電話', icon: '☎', group: '日期 / 其他' },
  { type: 'email', label: 'Email', icon: '@', group: '日期 / 其他' },
  { type: 'serial_no', label: '流水號', icon: '☷', group: '日期 / 其他' }
];

const controlGroups = computed(() => {
  const map = new Map<string, typeof fieldControls>();
  fieldControls.forEach(control => {
    if (!map.has(control.group)) map.set(control.group, [] as any);
    map.get(control.group)!.push(control as any);
  });
  return Array.from(map.entries()).map(([name, controls]) => ({ name, controls }));
});

const groups = ref<Array<{ name: string; count?: number }>>([]);
const employees = ref<AirwayEmployee[]>([]);
const approvalGroups = ref<ApprovalUserGroup[]>([]);

const groupOptions = computed(() => {
  const set = new Set<string>();
  groups.value.forEach(item => item.name && set.add(item.name));
  if (template.group_name) set.add(template.group_name);
  ['人事', '行政', '財務', '考勤', 'IT', 'HR', 'GA'].forEach(item => set.add(item));
  return Array.from(set).map(item => ({ label: item, value: item }));
});

const submitScopeOptions = [
  { label: '全員', value: 'all' },
  { label: '指定人員', value: 'specified_users' },
  { label: '指定部門', value: 'specified_departments' },
  { label: '流程管理員 / 管理員', value: 'managers' }
];

const approverTypeOptions = [
  { label: '指定員工', value: 'employee' },
  { label: '審批用戶組', value: 'approval_group' },
  { label: '變數', value: 'variable' },
  { label: '提交人自選', value: 'submitter_select' },
  { label: '提交人本人', value: 'self' }
];

const approverVariableOptions = [
  { label: '申請人直屬上級', value: 'applicant_manager' },
  { label: '申請人部門負責人', value: 'applicant_department_manager' },
  { label: '申請人本人', value: 'applicant_self' }
];

const approvalModeOptions = [
  { label: '任一人同意即可', value: 'any' },
  { label: '全部人都需同意', value: 'all' }
];

const nodeTypeOptions = [
  { label: '審批節點', value: 'approval' },
  { label: '處理節點', value: 'processing' },
  { label: '抄送節點', value: 'cc' }
];

const insertNodeOptions = [
  { label: '新增審批節點', key: 'approval' },
  { label: '新增處理節點', key: 'processing' },
  { label: '新增抄送節點', key: 'cc' }
];

const fieldPermissionOptions = [
  { label: '隱藏', value: 'hidden' },
  { label: '只讀', value: 'readonly' },
  { label: '可填寫 / 可修改', value: 'editable' }
];

const nodeAutomationEventOptions = [
  { label: '提交後', value: 'approval.submitted' },
  { label: '進入節點', value: 'approval.node.entered' },
  { label: '任務同意後', value: 'approval.task.approved' },
  { label: '任務拒絕後', value: 'approval.task.rejected' },
  { label: '留言後', value: 'approval.comment.created' },
  { label: '節點完成後', value: 'approval.node.completed' },
  { label: '節點拒絕後', value: 'approval.node.rejected' },
  { label: '流程完成後', value: 'approval.completed' },
  { label: '流程拒絕後', value: 'approval.rejected' }
];

const automationTargetOptions = [
  { label: '自訂 API', value: 'custom' },
  { label: '內建功能｜人員離職連動', value: 'builtin:employee_offboarding' }
];

function employeeDisplayName(emp: AirwayEmployee) {
  return emp.chinese_name || emp.english_name || emp.company_email || emp.employee_no || `員工 ${emp.id}`;
}


const approvalGroupOptions = computed(() =>
  approvalGroups.value.map(group => ({
    label: `${group.name}（${group.member_count || group.members?.length || 0}人）`,
    value: Number(group.id)
  }))
);

const employeeOptions = computed(() =>
  employees.value.map(emp => {
    const name = employeeDisplayName(emp);
    const dept = emp.department_name || emp.department_code || '';
    const title = emp.position_title || emp.job_title || emp.title || '';
    const email = emp.company_email || '';
    const meta = [dept, title, email].filter(Boolean).join(' / ');
    return { label: meta ? `${name}（${meta}）` : name, value: Number(emp.id) };
  })
);

const selectedField = computed(() => (template.fields || []).find(item => item.field_key === selectedFieldKey.value) || null);
const flowNodes = computed(() => template.process_json || []);
const selectedNode = computed(() => flowNodes.value[selectedNodeIndex.value] || null);

function makeKey(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 6)}`;
}

function previewIcon(value?: string) {
  const text = String(value || '').trim();
  if (!text) return '📄';
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return Array.from(text).slice(0, 2).join('');
  return text.slice(0, 2).toUpperCase();
}

function ensureSettings() {
  if (!template.settings_json) template.settings_json = {};
  return template.settings_json;
}

function settingsText(key: string, fallback = '') {
  const settings = ensureSettings();
  const value = settings[key];
  if (Array.isArray(value)) return value.join(',');
  return value == null ? fallback : String(value);
}

function updateSettingsText(key: string, value: string) {
  ensureSettings()[key] = value;
}

function settingsBool(key: string, fallback = false) {
  const value = ensureSettings()[key];
  return typeof value === 'boolean' ? value : fallback;
}

function updateSettingsBool(key: string, value: boolean) {
  ensureSettings()[key] = value;
}

function settingsIdList(key: string) {
  const value = ensureSettings()[key];
  if (Array.isArray(value)) return value.map(Number).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(item => Number(item.trim())).filter(Boolean);
  return [];
}

function updateSettingsIdList(key: string, value: Array<number | string>) {
  ensureSettings()[key] = value.map(item => Number(item)).filter(Boolean);
}

function updateGroupName(value: string) {
  template.group_name = value || '未分組';
  template.category = ['IT', 'HR', 'GA'].includes(value) ? value : 'HR';
  if (!template.workspace_group || template.workspace_group === '全部申請') template.workspace_group = value || '全部申請';
}

function makeDefaultOptions() {
  return [1, 2, 3].map(index => ({
    label: `選項 ${index}`,
    value: `option_${index}`,
    sort_order: index
  }));
}

function makeField(type: string): LarkFormField {
  const control = fieldControls.find(item => item.type === type);
  const isChoice = type === 'select' || type === 'multi_select';
  const field: LarkFormField = {
    field_key: makeKey(type),
    field_label: control?.label || '欄位',
    field_type: type,
    required: type === 'description' ? 0 : 1,
    placeholder: isChoice || ['date', 'date_range', 'employee', 'department'].includes(type) ? '請選擇' : '請輸入',
    default_value: type === 'multi_select' ? [] : '',
    option_source: isChoice ? 'manual' : undefined,
    options: isChoice ? makeDefaultOptions() : [],
    printable: true,
    sort_order: (template.fields || []).length + 1,
    enabled: 1,
    children: type === 'detail_table'
      ? [
          { field_key: makeKey('content'), field_label: '內容', field_type: 'text', required: 1, placeholder: '請輸入', enabled: 1, printable: true },
          { field_key: makeKey('date'), field_label: '日期', field_type: 'date', required: 0, placeholder: '請選擇', enabled: 1, printable: true },
          { field_key: makeKey('amount'), field_label: '金額', field_type: 'amount', required: 0, placeholder: '請輸入', enabled: 1, printable: true }
        ]
      : []
  } as LarkFormField;
  return field;
}

function normalizeFieldOrder() {
  template.fields = [...(template.fields || [])].map((field, index) => ({ ...field, sort_order: index + 1, enabled: 1 }));
}

function ensureAllNodeFieldPermissions() {
  const fields = template.fields || [];
  normalizeProcessNodes().forEach(node => {
    if (!node.field_permissions) node.field_permissions = {};
    ensureNodeAutomation(node);
    fields.forEach(field => {
      if (!node.field_permissions![field.field_key]) {
        node.field_permissions![field.field_key] = defaultFieldPermission(node);
      }
    });
    Object.keys(node.field_permissions).forEach(key => {
      if (!fields.some(field => field.field_key === key)) delete node.field_permissions![key];
    });
  });
}

function addField(type: string, index?: number) {
  const field = makeField(type);
  const fields = [...(template.fields || [])];
  if (typeof index === 'number') fields.splice(index, 0, field);
  else fields.push(field);
  template.fields = fields;
  normalizeFieldOrder();
  selectedFieldKey.value = field.field_key;
  ensureAllNodeFieldPermissions();
}

function removeField(field: LarkFormField) {
  template.fields = (template.fields || []).filter(item => item.field_key !== field.field_key);
  if (selectedFieldKey.value === field.field_key) selectedFieldKey.value = '';
  normalizeFieldOrder();
  ensureAllNodeFieldPermissions();
}

function copyField(field: LarkFormField, index: number) {
  const copy = JSON.parse(JSON.stringify(field));
  copy.field_key = makeKey(field.field_type || 'field');
  copy.field_label = `${field.field_label} 副本`;
  const fields = [...(template.fields || [])];
  fields.splice(index + 1, 0, copy);
  template.fields = fields;
  normalizeFieldOrder();
  selectedFieldKey.value = copy.field_key;
  ensureAllNodeFieldPermissions();
}

function moveField(index: number, delta: number) {
  const fields = [...(template.fields || [])];
  const next = index + delta;
  if (next < 0 || next >= fields.length) return;
  const [item] = fields.splice(index, 1);
  fields.splice(next, 0, item);
  template.fields = fields;
  normalizeFieldOrder();
}

function moveFieldTo(fromIndex: number, toIndex: number) {
  const fields = [...(template.fields || [])];
  if (fromIndex < 0 || fromIndex >= fields.length) return;
  const [item] = fields.splice(fromIndex, 1);
  const target = fromIndex < toIndex ? toIndex - 1 : toIndex;
  fields.splice(Math.max(0, Math.min(target, fields.length)), 0, item);
  template.fields = fields;
  normalizeFieldOrder();
}

function onControlDragStart(type: string, event: DragEvent) {
  draggingControlType.value = type;
  draggingFieldIndex.value = null;
  event.dataTransfer?.setData('text/plain', `control:${type}`);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
}

function onFieldDragStart(index: number, event: DragEvent) {
  draggingFieldIndex.value = index;
  draggingControlType.value = '';
  event.dataTransfer?.setData('text/plain', `field:${index}`);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function onCanvasDrop(index: number | null, event: DragEvent) {
  const data = event.dataTransfer?.getData('text/plain') || '';
  const insertIndex = index == null ? (template.fields || []).length : index;

  if (data.startsWith('control:') || draggingControlType.value) {
    addField(data.replace('control:', '') || draggingControlType.value, insertIndex);
  } else if (data.startsWith('field:') || draggingFieldIndex.value !== null) {
    const from = Number(data.replace('field:', '') || draggingFieldIndex.value);
    moveFieldTo(from, insertIndex);
  }

  draggingControlType.value = '';
  draggingFieldIndex.value = null;
}


const bulkOptionsText = ref('');

function isChoiceField(field?: LarkFormField | null) {
  return !!field && ['select', 'multi_select'].includes(field.field_type);
}

function optionValueFromLabel(label: string, index = 0) {
  const raw = String(label || '').trim();
  const ascii = raw
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return ascii || `option_${index + 1}`;
}

function normalizeOptionItem(option: any, index: number) {
  if (typeof option === 'string') {
    return { label: option, value: optionValueFromLabel(option, index), sort_order: index + 1 };
  }
  const label = String(option?.label || option?.name || option?.value || `選項 ${index + 1}`);
  const value = String(option?.value || optionValueFromLabel(label, index));
  return {
    ...option,
    label,
    value,
    sort_order: Number(option?.sort_order || index + 1)
  };
}

function ensureOptions(field: LarkFormField) {
  if (!Array.isArray(field.options)) field.options = [];
  field.options = field.options.map(normalizeOptionItem);
  if (!field.options.length) field.options = makeDefaultOptions();
  return field.options;
}

function optionSelectOptions(field: LarkFormField) {
  return ensureOptions(field).map(option => ({ label: option.label, value: option.value }));
}

function addOption(field: LarkFormField) {
  const options = ensureOptions(field);
  const index = options.length + 1;
  options.push({ label: `選項 ${index}`, value: `option_${Date.now()}_${index}`, sort_order: index });
}

function removeOption(field: LarkFormField, index: number) {
  const options = ensureOptions(field);
  options.splice(index, 1);
  if (!options.length) addOption(field);
  normalizeChoiceDefault(field);
}

function moveOption(field: LarkFormField, index: number, delta: number) {
  const options = ensureOptions(field);
  const next = index + delta;
  if (next < 0 || next >= options.length) return;
  const [item] = options.splice(index, 1);
  options.splice(next, 0, item);
  options.forEach((option, optionIndex) => (option.sort_order = optionIndex + 1));
}

function updateOptionLabel(field: LarkFormField, index: number, value: string) {
  const option = ensureOptions(field)[index];
  if (!option) return;
  const oldValue = option.value;
  option.label = value;
  if (!option.value || /^option_\d+/.test(option.value) || option.value === oldValue) {
    option.value = optionValueFromLabel(value, index);
  }
  normalizeChoiceDefault(field, oldValue, option.value);
}

function updateOptionValue(field: LarkFormField, index: number, value: string) {
  const option = ensureOptions(field)[index];
  if (!option) return;
  const oldValue = option.value;
  option.value = value || optionValueFromLabel(option.label, index);
  normalizeChoiceDefault(field, oldValue, option.value);
}

function batchAddOptions(field: LarkFormField) {
  const lines = bulkOptionsText.value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  if (!lines.length) return;
  const options = ensureOptions(field);
  lines.forEach((label, index) => {
    const optionIndex = options.length + index;
    options.push({ label, value: optionValueFromLabel(label, optionIndex), sort_order: optionIndex + 1 });
  });
  bulkOptionsText.value = '';
}

function choiceDefaultValue(field: LarkFormField) {
  if (field.field_type === 'multi_select') {
    if (Array.isArray(field.default_value)) return field.default_value;
    return field.default_value ? [String(field.default_value)] : [];
  }
  return field.default_value == null || Array.isArray(field.default_value) ? null : String(field.default_value);
}

function updateChoiceDefault(field: LarkFormField, value: string | string[] | null) {
  field.default_value = value as any;
}

function normalizeChoiceDefault(field: LarkFormField, oldValue?: string, newValue?: string) {
  if (!isChoiceField(field)) return;
  const valid = new Set(ensureOptions(field).map(option => option.value));
  if (field.field_type === 'multi_select') {
    let values = Array.isArray(field.default_value) ? field.default_value.map(String) : field.default_value ? [String(field.default_value)] : [];
    if (oldValue && newValue) values = values.map(item => item === oldValue ? newValue : item);
    field.default_value = values.filter(item => valid.has(item)) as any;
  } else {
    const value = field.default_value == null ? '' : String(field.default_value);
    field.default_value = valid.has(value) ? value : '';
  }
}

function fieldPreviewText(field: LarkFormField) {
  if (field.field_type === 'select') {
    const value = choiceDefaultValue(field) as string | null;
    return optionSelectOptions(field).find(option => option.value === value)?.label || field.placeholder || '請選擇';
  }
  if (field.field_type === 'multi_select') {
    const values = choiceDefaultValue(field) as string[];
    const labels = optionSelectOptions(field).filter(option => values.includes(String(option.value))).map(option => option.label);
    return labels.length ? labels.join('、') : field.placeholder || '請選擇';
  }
  if (field.field_type === 'date' || field.field_type === 'date_range' || field.field_type === 'employee' || field.field_type === 'department') return field.placeholder || '請選擇';
  if (field.field_type === 'amount') return field.placeholder || '請輸入金額';
  if (field.field_type === 'description') return '說明文字';
  if (field.field_type === 'serial_no') return '系統自動產生';
  return field.placeholder || '請根據需要填寫';
}

function addChildField(parent: LarkFormField) {
  if (!Array.isArray(parent.children)) parent.children = [];
  parent.children.push({ field_key: makeKey('detail'), field_label: '明細欄位', field_type: 'text', required: 0, placeholder: '請輸入', enabled: 1 });
}

function removeChildField(parent: LarkFormField, child: LarkFormField) {
  parent.children = (parent.children || []).filter(item => item.field_key !== child.field_key);
}

function normalizeProcessNodes() {
  const nodes = Array.isArray(template.process_json) ? [...template.process_json] : [];
  if (!nodes.length || nodes[0]?.node_type !== 'submit') nodes.unshift({ id: 'submit', node_type: 'submit', node_name: '提交', field_permissions: {}, automation: { webhook_url: '', webhook_events: ['approval.submitted'], webhook_secret: '', timeout_ms: 5000 } });
  const endIndex = nodes.findIndex(node => node.node_type === 'end');
  if (endIndex < 0) nodes.push({ id: 'end', node_type: 'end', node_name: '結束', field_permissions: {}, automation: { webhook_url: '', webhook_events: ['approval.completed', 'approval.rejected'], webhook_secret: '', timeout_ms: 5000 } });
  else if (endIndex !== nodes.length - 1) {
    const [endNode] = nodes.splice(endIndex, 1);
    nodes.push(endNode);
  }
  template.process_json = nodes;
  ensureAllNodeFieldPermissionsUnsafe(nodes);
  return nodes;
}

function ensureAllNodeFieldPermissionsUnsafe(nodes: LarkProcessNode[]) {
  const fields = template.fields || [];
  nodes.forEach(node => {
    if (!node.field_permissions) node.field_permissions = {};
    fields.forEach(field => {
      if (!node.field_permissions![field.field_key]) node.field_permissions![field.field_key] = defaultFieldPermission(node);
    });
    Object.keys(node.field_permissions).forEach(key => {
      if (!fields.some(field => field.field_key === key)) delete node.field_permissions![key];
    });
  });
}

function defaultFieldPermission(node: LarkProcessNode): FieldPermissionMode {
  if (node.node_type === 'submit') return 'editable';
  if (node.node_type === 'end') return 'readonly';
  return 'readonly';
}

function nodeTitle(node: LarkProcessNode | null) {
  if (!node) return '節點';
  if (node.node_type === 'submit') return '提交';
  if (node.node_type === 'approval') return '審批';
  if (node.node_type === 'processing') return '處理';
  if (node.node_type === 'cc') return '抄送';
  if (node.node_type === 'end') return '結束';
  return '節點';
}


function nodeSourceLabel(node: LarkProcessNode | null) {
  if (!node) return '';

  const source = node.node_type === 'processing' ? node.processor_type : node.approver_type;

  if (source === 'employee') return '指定員工';
  if (source === 'approval_group') return '審批用戶組';
  if (source === 'variable') {
    const variable = node.node_type === 'processing' ? node.processor_variable : node.approver_variable;

    if (variable === 'applicant_manager') return '直屬上級';
    if (variable === 'applicant_department_manager') return '部門負責人';
    if (variable === 'applicant_self') return '申請人本人';

    return '變數';
  }
  if (source === 'submitter_select') return '提交人自選';
  if (source === 'self') return '提交人本人';
  if (source === 'role') return '角色';

  return '';
}

function isFixedFlowNode(node?: LarkProcessNode | null) {
  return !node || node.node_type === 'submit' || node.node_type === 'end';
}

function makeFlowNode(type = 'approval'): LarkProcessNode {
  const id = `node_${type}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
  if (type === 'processing') return { id, node_type: 'processing', node_name: '處理', processor_type: 'employee', processor_ids: [], approval_mode: 'any', field_permissions: {}, automation: { webhook_url: '', webhook_events: ['approval.node.completed'], webhook_secret: '', timeout_ms: 5000 } } as LarkProcessNode;
  if (type === 'cc') return { id, node_type: 'cc', node_name: '抄送', cc_ids: [], field_permissions: {}, automation: { webhook_url: '', webhook_events: ['approval.node.entered'], webhook_secret: '', timeout_ms: 5000 } } as LarkProcessNode;
  return { id, node_type: 'approval', node_name: '審批', approver_type: 'employee', approver_ids: [], approval_group_ids: [], approver_variable: '', approval_mode: 'any', field_permissions: {}, automation: { webhook_url: '', webhook_events: ['approval.node.completed'], webhook_secret: '', timeout_ms: 5000 } } as LarkProcessNode;
}

function insertFlowNodeAt(type: string | number, afterIndex: number) {
  const nodeType = String(type || 'approval');
  const nodes = normalizeProcessNodes();
  let insertIndex = afterIndex + 1;
  const endIndex = nodes.findIndex(node => node.node_type === 'end');
  if (insertIndex <= 0) insertIndex = 1;
  if (endIndex >= 0 && insertIndex > endIndex) insertIndex = endIndex;
  nodes.splice(insertIndex, 0, makeFlowNode(nodeType));
  template.process_json = nodes;
  selectedNodeIndex.value = insertIndex;
  ensureAllNodeFieldPermissions();
}

function addFlowNode(type = 'approval') {
  const nodes = normalizeProcessNodes();
  const endIndex = nodes.findIndex(node => node.node_type === 'end');
  insertFlowNodeAt(type, Math.max(0, endIndex - 1));
}

function selectFlowNode(index: number) {
  selectedNodeIndex.value = index;
}

function removeFlowNode(index: number) {
  const nodes = normalizeProcessNodes();
  if (isFixedFlowNode(nodes[index])) return;
  nodes.splice(index, 1);
  template.process_json = nodes;
  selectedNodeIndex.value = Math.min(Math.max(1, index - 1), nodes.length - 1);
}

function moveFlowNode(index: number, delta: number) {
  const nodes = normalizeProcessNodes();
  const target = index + delta;
  if (isFixedFlowNode(nodes[index])) return;
  if (target <= 0 || target >= nodes.length - 1) return;
  const [node] = nodes.splice(index, 1);
  nodes.splice(target, 0, node);
  template.process_json = nodes;
  selectedNodeIndex.value = target;
}

function duplicateFlowNode(index: number) {
  const nodes = normalizeProcessNodes();
  const node = nodes[index];
  if (isFixedFlowNode(node)) return;
  const copy = JSON.parse(JSON.stringify(node));
  copy.id = `node_${copy.node_type}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
  copy.node_name = `${copy.node_name || nodeTitle(copy)} 副本`;
  nodes.splice(index + 1, 0, copy);
  template.process_json = nodes;
  selectedNodeIndex.value = index + 1;
}

function changeFlowNodeType(index: number, type: string) {
  const nodes = normalizeProcessNodes();
  const old = nodes[index];
  if (isFixedFlowNode(old)) return;
  const next = makeFlowNode(type);
  next.id = old.id || next.id;
  next.node_name = old.node_name || next.node_name;
  next.field_permissions = old.field_permissions || {};
  nodes[index] = next;
  template.process_json = nodes;
  selectedNodeIndex.value = index;
  ensureAllNodeFieldPermissions();
}

function getNodeRole(node: any) {
  return node?.role_code || '';
}

function setNodeRole(node: any, value: string) {
  if (!node) return;
  node.role_code = value;
}

function handleInsertDropdown(key: string | number, afterIndex: number) {
  insertFlowNodeAt(key, afterIndex);
}

function nodeIdList(node: any, key: string) {
  const value = node?.[key];
  if (Array.isArray(value)) return value.map(Number).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(item => Number(item.trim())).filter(Boolean);
  return [];
}

function updateNodeIdList(node: any, key: string, value: Array<number | string>) {
  if (!node) return;
  node[key] = value.map(item => Number(item)).filter(Boolean);
}

function defaultNodeAutomationEvents(node: any) {
  if (!node) return [];
  if (node.node_type === 'submit') return ['approval.submitted'];
  if (node.node_type === 'end') return ['approval.completed', 'approval.rejected'];
  if (node.node_type === 'approval' || node.node_type === 'processing') return ['approval.node.completed'];
  return ['approval.node.entered'];
}

function ensureNodeAutomation(node: any) {
  if (!node.automation || typeof node.automation !== 'object') {
    node.automation = {
      webhook_url: '',
      webhook_events: defaultNodeAutomationEvents(node),
      webhook_secret: '',
      timeout_ms: 5000,
      actions: []
    };
  }
  if (!Array.isArray(node.automation.webhook_events)) {
    node.automation.webhook_events = defaultNodeAutomationEvents(node);
  }
  if (!node.automation.timeout_ms) node.automation.timeout_ms = 5000;
  if (!Array.isArray(node.automation.actions)) node.automation.actions = [];
  return node.automation;
}

function nodeAutomationActions(node: any): LarkAutomationAction[] {
  return Array.isArray(node?.automation?.actions) ? node.automation.actions : [];
}

function automationTargetValue(action: LarkAutomationAction) {
  return action.action_type === 'builtin' ? `builtin:${action.builtin_key || ''}` : 'custom';
}

function automationActionEnabled(action: LarkAutomationAction) {
  return action.enabled === true || action.enabled === 1 || String(action.enabled) === '1';
}

function updateAutomationActionEnabled(action: LarkAutomationAction, enabled: boolean) {
  action.enabled = enabled;
}

function addAutomationAction(node: any) {
  const automation = ensureNodeAutomation(node);
  automation.actions.push({
    id: `automation_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    name: `自訂 API ${automation.actions.length + 1}`,
    action_type: 'custom',
    builtin_key: '',
    webhook_url: '',
    webhook_events: defaultNodeAutomationEvents(node),
    webhook_secret: '',
    timeout_ms: 5000,
    enabled: 1
  });
}

function removeAutomationAction(node: any, actionId: string) {
  const automation = ensureNodeAutomation(node);
  automation.actions = automation.actions.filter((action: LarkAutomationAction) => action.id !== actionId);
}

function generateAutomationSecret() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function updateAutomationTarget(action: LarkAutomationAction, value: string) {
  if (value === 'builtin:employee_offboarding') {
    action.action_type = 'builtin';
    action.builtin_key = 'employee_offboarding';
    action.name = '人員離職連動';
    action.webhook_url = 'http://127.0.0.1:3000/api/integrations/offboarding';
    action.webhook_events = ['approval.completed'];
    if (!action.webhook_secret) action.webhook_secret = generateAutomationSecret();
    action.enabled = 1;
    return;
  }
  const wasBuiltIn = action.action_type === 'builtin';
  action.action_type = 'custom';
  action.builtin_key = '';
  action.name = action.name === '人員離職連動' ? '自訂 API' : action.name || '自訂 API';
  action.webhook_url = action.webhook_url?.includes('/api/integrations/offboarding') ? '' : action.webhook_url;
  if (wasBuiltIn) action.webhook_secret = '';
}

function updateAutomationEvents(action: LarkAutomationAction, value: Array<string | number>) {
  action.webhook_events = value.map(item => String(item)).filter(Boolean);
}

function fieldPermission(node: LarkProcessNode | null, field: LarkFormField): FieldPermissionMode {
  if (!node) return 'readonly';
  if (!node.field_permissions) node.field_permissions = {};
  if (!node.field_permissions[field.field_key]) node.field_permissions[field.field_key] = defaultFieldPermission(node);
  return node.field_permissions[field.field_key];
}

function updateFieldPermission(node: LarkProcessNode | null, field: LarkFormField, mode: FieldPermissionMode) {
  if (!node) return;
  if (!node.field_permissions) node.field_permissions = {};
  node.field_permissions[field.field_key] = mode;
}

async function loadGroupsForBasicInfo() {
  try {
    const data = await fetchLarkGroups();
    groups.value = data.groups || [];
  } catch {
    groups.value = [];
  }
}


async function loadApprovalGroupsForPicker() {
  try {
    const data = await fetchApprovalUserGroups();
    approvalGroups.value = data.groups || [];
  } catch (error) {
    console.warn('load approval groups failed', error);
    approvalGroups.value = [];
  }
}

async function loadEmployeesForPicker() {
  try {
    employees.value = await fetchEmployeeLookup({ limit: 1000 });
  } catch (error) {
    console.warn('load employees failed', error);
    employees.value = [];
  }
}

async function loadTemplate() {
  const id = route.params.id as string;
  if (!id || id === 'new') {
    ensureAllNodeFieldPermissions();
    return;
  }
  loading.value = true;
  try {
    const data = await fetchLarkTemplate(id);
    Object.assign(template, data.template);
    template.fields = (data.template.fields || []).filter(field => Number(field.enabled ?? 1) !== 0);
    template.process_json = data.template.process_json?.length ? data.template.process_json : template.process_json;
    template.settings_json = {
      allow_revoke_running: true,
      allow_batch_approve: false,
      quick_approve_card: true,
      dedupe_mode: 'once',
      lock_admin_management: false,
      allow_proxy_submit: false,
      submit_employee_ids: [],
      manager_employee_ids: [],
      ...(data.template.settings_json || {})
    };
    normalizeFieldOrder();
    normalizeProcessNodes();
  } catch (error: any) {
    message.error(error?.message || '讀取審批設定失敗');
  } finally {
    loading.value = false;
  }
}

function validateTemplate() {
  if (!template.form_name?.trim()) {
    message.error('名稱必填');
    activeStep.value = 1;
    return false;
  }
  if (!(template.fields || []).length) {
    message.error('至少要有一個表單欄位');
    activeStep.value = 2;
    return false;
  }
  return true;
}

async function saveTemplate(publish = false) {
  if (!validateTemplate()) return;
  saving.value = true;
  try {
    normalizeFieldOrder();
    normalizeProcessNodes();
    const payload = { ...template, enabled: publish ? 1 : Number(template.enabled || 0), fields: [...(template.fields || [])], process_json: [...(template.process_json || [])] };
    const data: any = template.id ? await updateLarkTemplate(template.id, payload) : await createLarkTemplate(payload);
    Object.assign(template, data.template);
    template.fields = data.template.fields || [];
    template.process_json = data.template.process_json || [];
    message.success(publish ? '已發布' : '已保存草稿');
    if (!route.params.id || route.params.id === 'new') router.replace(`/airway/forms/designer/edit/${data.id}`);
  } catch (error: any) {
    message.error(error?.message || '保存失敗');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadGroupsForBasicInfo();
  loadEmployeesForPicker();
  loadApprovalGroupsForPicker();
  loadTemplate();
});
</script>

<template>
  <div class="designer-page">
    <div class="designer-topbar">
      <NButton text @click="router.push('/airway/forms/designer')">‹ {{ template.form_name || '返回' }}</NButton>
      <div class="steps">
        <div v-for="step in [1, 2, 3, 4]" :key="step" class="step" :class="{ active: activeStep === step }" @click="activeStep = step">
          <span>{{ step }}</span>
          {{ ['基礎信息', '表單設計', '流程設計', '更多設置'][step - 1] }}
        </div>
      </div>
      <div class="top-actions">
        <NButton :loading="saving" @click="saveTemplate(false)">保存草稿</NButton>
        <NButton type="primary" :loading="saving" @click="saveTemplate(true)">發布</NButton>
      </div>
    </div>

    <NSpin :show="loading">
      <section v-if="activeStep === 1" class="basic-panel">
        <div class="basic-card lark-basic-card">
          <div class="basic-hero">
            <div class="basic-hero-icon">{{ previewIcon(template.icon) }}</div>
            <div>
              <h2>基礎信息</h2>
              <p>設定審批名稱、分組、可提交範圍與流程管理員。這些資訊會顯示在發起申請與流程控制中心。</p>
            </div>
          </div>

          <NForm label-placement="top">
            <NFormItem label="圖標 *">
              <div class="icon-edit">
                <div class="big-icon">{{ previewIcon(template.icon) }}</div>
                <NInput v-model:value="template.icon" placeholder="Emoji 或文字，例如：💼 / IT01" />
              </div>
            </NFormItem>

            <NFormItem label="名稱 *"><NInput v-model:value="template.form_name" /></NFormItem>
            <NFormItem label="說明"><NInput v-model:value="template.description" placeholder="請輸入用途說明，會顯示在發起申請列表" /></NFormItem>

            <NFormItem label="分組 *">
              <NSelect :value="template.group_name || '未分組'" :options="groupOptions" tag filterable @update:value="updateGroupName" />
              <div class="field-hint">這是 Lark 的工作台分組，可自訂；舊系統 category 只保留相容。</div>
            </NFormItem>

            <NFormItem label="誰可以提交該審批 *"><NSelect v-model:value="template.submit_scope" :options="submitScopeOptions" /></NFormItem>

            <div v-if="template.submit_scope === 'specified_users'" class="nested-setting">
              <NFormItem label="指定可提交人員">
                <NSelect :value="settingsIdList('submit_employee_ids')" :options="employeeOptions" multiple filterable clearable placeholder="搜尋姓名 / 部門 / 信箱" @update:value="value => updateSettingsIdList('submit_employee_ids', value as Array<number | string>)" />
              </NFormItem>
            </div>

            <div v-if="template.submit_scope === 'specified_departments'" class="nested-setting">
              <NFormItem label="指定可提交部門"><NInput :value="settingsText('submit_department_text')" placeholder="輸入部門名稱，逗號分隔" @update:value="value => updateSettingsText('submit_department_text', value)" /></NFormItem>
            </div>

            <NCheckbox :checked="Boolean(template.show_in_workspace)" @update:checked="value => (template.show_in_workspace = value ? 1 : 0)">是否將該審批展示在工作台</NCheckbox>

            <NFormItem class="mt-16" label="工作台展示分組 *"><NSelect v-model:value="template.workspace_group" :options="groupOptions" tag filterable /></NFormItem>

            <NCheckbox :checked="settingsBool('lock_admin_management')" @update:checked="value => updateSettingsBool('lock_admin_management', value)">禁止企業管理員 / 審批應用管理員 / 子管理員 管理流程與數據</NCheckbox>

            <NFormItem class="mt-16" label="流程管理員 *">
              <NSelect :value="settingsIdList('manager_employee_ids')" :options="employeeOptions" multiple filterable clearable placeholder="搜尋姓名 / 部門 / 信箱" @update:value="value => updateSettingsIdList('manager_employee_ids', value as Array<number | string>)" />
            </NFormItem>

            <NCheckbox :checked="settingsBool('allow_proxy_submit')" @update:checked="value => updateSettingsBool('allow_proxy_submit', value)">允許代他人提交</NCheckbox>
          </NForm>
        </div>
      </section>

      <section v-else-if="activeStep === 2" class="form-design">
        <aside class="controls-panel">
          <NTabs type="line">
            <NTabPane name="controls" tab="控件">
              <div v-for="group in controlGroups" :key="group.name">
                <div class="control-group">{{ group.name }}</div>
                <button
                  v-for="item in group.controls"
                  :key="item.type"
                  class="control-btn"
                  draggable="true"
                  @dragstart="event => onControlDragStart(item.type, event)"
                  @click="addField(item.type)"
                >
                  <span>{{ item.label }}</span><em>{{ item.icon }}</em>
                </button>
              </div>
            </NTabPane>
          </NTabs>
        </aside>

        <main class="phone-stage" @dragover.prevent @drop.prevent="event => onCanvasDrop(null, event)">
          <div class="phone-shell">
            <div class="phone-title">{{ template.form_name || '未命名審批' }}</div>

            <div
              v-for="(field, index) in template.fields || []"
              :key="field.field_key"
              class="phone-field"
              :class="{ active: selectedFieldKey === field.field_key }"
              draggable="true"
              @click.stop="selectedFieldKey = field.field_key"
              @dragstart="event => onFieldDragStart(index, event)"
              @dragover.prevent
              @drop.stop.prevent="event => onCanvasDrop(index, event)"
            >
              <div>
                <strong>{{ field.field_label }}<span v-if="field.required" class="required">*</span></strong>
                <small v-if="field.field_type === 'detail_table'">明細/表格</small>
              </div>
              <span>{{ fieldPreviewText(field) }} ›</span>
              <div class="field-actions">
                <button @click.stop="moveField(index, -1)">↑</button>
                <button @click.stop="moveField(index, 1)">↓</button>
                <button @click.stop="copyField(field, index)">⧉</button>
                <button @click.stop="removeField(field)">×</button>
              </div>
            </div>

            <div class="empty-drop" @dragover.prevent @drop.prevent="event => onCanvasDrop(null, event)">＋ 點擊左側控件，或拖拽控件至此處</div>
          </div>
        </main>

        <aside class="props-panel">
          <NEmpty v-if="!selectedField" description="請點選中間欄位設定屬性" />
          <template v-else>
            <h3>欄位屬性</h3>
            <NForm v-if="!isChoiceField(selectedField)" label-placement="top">
              <NFormItem label="欄位名稱"><NInput v-model:value="selectedField.field_label" /></NFormItem>
              <NFormItem label="欄位 Key"><NInput v-model:value="selectedField.field_key" /></NFormItem>
              <NFormItem label="提示文字"><NInput v-model:value="selectedField.placeholder" /></NFormItem>
              <NCheckbox v-model:checked="selectedField.required">必填</NCheckbox>

              <template v-if="selectedField.field_type === 'detail_table'">
                <div class="child-title">明細欄位</div>
                <div v-for="child in selectedField.children || []" :key="child.field_key" class="child-row">
                  <NInput v-model:value="child.field_label" size="small" />
                  <NSelect v-model:value="child.field_type" size="small" :options="fieldControls.map(item => ({ label: item.label, value: item.type }))" />
                  <NButton size="small" type="error" ghost @click="removeChildField(selectedField!, child)">刪</NButton>
                </div>
                <NButton size="small" secondary @click="addChildField(selectedField!)">＋ 新增明細欄位</NButton>
              </template>
            </NForm>

            <div v-else class="choice-config">
              <NTabs type="segment" animated>
                <NTabPane name="base" tab="基礎設定">
                  <NForm label-placement="top">
                    <NFormItem label="標題 *"><NInput v-model:value="selectedField.field_label" /></NFormItem>
                    <NFormItem label="欄位 Key"><NInput v-model:value="selectedField.field_key" /></NFormItem>
                    <NFormItem label="預設提示"><NInput v-model:value="selectedField.placeholder" placeholder="請選擇" /></NFormItem>

                    <NFormItem label="選項 *">
                      <div class="option-source">
                        <NRadioGroup :value="selectedField.option_source || 'manual'" @update:value="value => (selectedField!.option_source = value as any)">
                          <NSpace>
                            <NRadio value="manual">手動添加選項</NRadio>
                            <NRadio value="external">使用外部選項</NRadio>
                          </NSpace>
                        </NRadioGroup>
                      </div>

                      <NAlert v-if="selectedField.option_source === 'external'" type="info" :bordered="false" class="mt-10">
                        外部選項下一版接資料字典 / API。現在先保留設定，實際仍使用下方手動選項。
                      </NAlert>

                      <div class="option-list">
                        <div v-for="(option, optionIndex) in ensureOptions(selectedField)" :key="`${selectedField.field_key}_${optionIndex}`" class="option-row">
                          <span class="drag-handle">⋮⋮</span>
                          <NInput :value="option.label" placeholder="選項名稱" @update:value="value => updateOptionLabel(selectedField!, optionIndex, value)" />
                          <NInput :value="option.value" placeholder="選項值" @update:value="value => updateOptionValue(selectedField!, optionIndex, value)" />
                          <button class="option-icon" @click="moveOption(selectedField!, optionIndex, -1)">↑</button>
                          <button class="option-icon" @click="moveOption(selectedField!, optionIndex, 1)">↓</button>
                          <button class="option-icon danger" @click="removeOption(selectedField!, optionIndex)">🗑</button>
                        </div>
                      </div>

                      <div class="option-actions">
                        <NButton size="small" text type="primary" @click="addOption(selectedField!)">＋ 添加選項</NButton>
                      </div>

                      <div class="bulk-box">
                        <NInput v-model:value="bulkOptionsText" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" placeholder="批量添加：每行一個選項" />
                        <NButton size="small" secondary type="primary" :disabled="!bulkOptionsText.trim()" @click="batchAddOptions(selectedField!)">＋ 批量添加選項</NButton>
                      </div>
                    </NFormItem>

                    <NFormItem label="預設值設定">
                      <NSelect
                        :value="choiceDefaultValue(selectedField)"
                        :options="optionSelectOptions(selectedField)"
                        :multiple="selectedField.field_type === 'multi_select'"
                        clearable
                        placeholder="請選擇"
                        @update:value="value => updateChoiceDefault(selectedField!, value as any)"
                      />
                    </NFormItem>

                    <div class="option-extra">
                      <NCheckbox v-model:checked="selectedField.printable">列印</NCheckbox>
                      <NCheckbox v-model:checked="selectedField.required">必填</NCheckbox>
                    </div>
                  </NForm>
                </NTabPane>

                <NTabPane name="display" tab="顯隱設定">
                  <NAlert type="info" :bordered="false">條件顯隱 / 選項聯動先保留規格，下一版接規則引擎。</NAlert>
                  <NForm label-placement="top" class="mt-16">
                    <NFormItem label="選項聯動"><NButton text type="primary">＋ 設置聯動</NButton></NFormItem>
                  </NForm>
                </NTabPane>
              </NTabs>
            </div>
          </template>
        </aside>
      </section>

      <section v-else-if="activeStep === 3" class="flow-insert-page">
        <div class="flow-top-actions">
          <NButton size="small" secondary @click="addFlowNode('approval')">＋ 審批</NButton>
          <NButton size="small" secondary @click="addFlowNode('processing')">＋ 處理</NButton>
          <NButton size="small" secondary @click="addFlowNode('cc')">＋ 抄送</NButton>
        </div>

        <div class="flow-editor-layout">
          <main class="flow-canvas">
            <template v-for="(node, index) in flowNodes" :key="node.id || index">
              <div class="flow-node-card" :class="[node.node_type, { active: selectedNodeIndex === index }]" @click="selectFlowNode(index)">
                <div class="flow-node-head"><span>{{ nodeTitle(node) }}</span><em v-if="['approval', 'processing'].includes(node.node_type)">{{ nodeSourceLabel(node) }}</em></div>
                <div class="flow-node-body">
                  <NInput v-model:value="node.node_name" :disabled="isFixedFlowNode(node)" size="small" />
                  <div class="node-summary">
                    <template v-if="node.node_type === 'submit'">發起人送出申請</template>
                    <template v-else-if="node.node_type === 'end'">流程完成</template>
                    <template v-else-if="node.node_type === 'approval'">{{ node.approval_mode === 'all' ? '全部審批人同意' : '任一審批人同意' }}</template>
                    <template v-else-if="node.node_type === 'processing'">處理完成後往下走</template>
                    <template v-else-if="node.node_type === 'cc'">只通知，不阻擋流程</template>
                  </div>
                </div>
                <div v-if="!isFixedFlowNode(node)" class="node-mini-actions">
                  <button @click.stop="moveFlowNode(index, -1)">上移</button>
                  <button @click.stop="moveFlowNode(index, 1)">下移</button>
                  <button @click.stop="duplicateFlowNode(index)">複製</button>
                  <button class="danger" @click.stop="removeFlowNode(index)">刪除</button>
                </div>
              </div>

              <div v-if="index < flowNodes.length - 1" class="insert-zone">
                <div class="line"></div>
                <NDropdown trigger="click" :options="insertNodeOptions" @select="key => handleInsertDropdown(key, index)">
                  <button class="insert-plus" title="在此處新增節點">＋</button>
                </NDropdown>
                <div class="insert-label">在此處新增節點</div>
                <div class="line"></div>
              </div>
            </template>
          </main>

          <aside class="flow-props-panel">
            <NEmpty v-if="!selectedNode" description="請選擇節點" />
            <template v-else>
              <div class="props-title"><strong>節點設定</strong><span>{{ nodeTitle(selectedNode) }}</span></div>
              <NForm label-placement="top">
                <NFormItem label="節點類型"><NSelect :value="selectedNode.node_type" :disabled="isFixedFlowNode(selectedNode)" :options="nodeTypeOptions" @update:value="value => changeFlowNodeType(selectedNodeIndex, String(value))" /></NFormItem>
                <NFormItem label="節點名稱"><NInput v-model:value="selectedNode.node_name" :disabled="isFixedFlowNode(selectedNode)" /></NFormItem>

                <template v-if="selectedNode.node_type === 'approval'">
                  <NFormItem label="審批人來源">
                    <NSelect v-model:value="selectedNode.approver_type" :options="approverTypeOptions" />
                  </NFormItem>

                  <NFormItem v-if="selectedNode.approver_type === 'employee'" label="指定審批人">
                    <NSelect
                      :value="nodeIdList(selectedNode, 'approver_ids')"
                      :options="employeeOptions"
                      multiple
                      filterable
                      clearable
                      @update:value="value => updateNodeIdList(selectedNode, 'approver_ids', value as Array<number | string>)"
                    />
                  </NFormItem>

                  <NFormItem v-if="selectedNode.approver_type === 'approval_group'" label="審批用戶組">
                    <NSelect
                      :value="nodeIdList(selectedNode, 'approval_group_ids')"
                      :options="approvalGroupOptions"
                      multiple
                      filterable
                      clearable
                      placeholder="選擇 HR / IT / GA 等審批組"
                      @update:value="value => updateNodeIdList(selectedNode, 'approval_group_ids', value as Array<number | string>)"
                    />
                  </NFormItem>

                  <NFormItem v-if="selectedNode.approver_type === 'variable'" label="變數">
                    <NSelect
                      v-model:value="selectedNode.approver_variable"
                      :options="approverVariableOptions"
                      placeholder="選擇直屬上級 / 部門負責人"
                    />
                  </NFormItem>

                  <NAlert v-if="selectedNode.approver_type === 'variable'" type="warning" :bordered="false" class="node-tip">
                    變數型審批人會在送出當下解析成真實審批人。若申請人沒有直屬上級或部門沒有負責人，送出會失敗。
                  </NAlert>

                  <NFormItem label="審批方式">
                    <NSelect v-model:value="selectedNode.approval_mode" :options="approvalModeOptions" />
                  </NFormItem>
                </template>

                <template v-if="selectedNode.node_type === 'processing'">
                  <NFormItem label="處理人來源">
                    <NSelect v-model:value="selectedNode.processor_type" :options="approverTypeOptions" />
                  </NFormItem>

                  <NFormItem v-if="selectedNode.processor_type === 'employee'" label="指定處理人">
                    <NSelect
                      :value="nodeIdList(selectedNode, 'processor_ids')"
                      :options="employeeOptions"
                      multiple
                      filterable
                      clearable
                      @update:value="value => updateNodeIdList(selectedNode, 'processor_ids', value as Array<number | string>)"
                    />
                  </NFormItem>

                  <NFormItem v-if="selectedNode.processor_type === 'approval_group'" label="審批用戶組">
                    <NSelect
                      :value="nodeIdList(selectedNode, 'processor_group_ids')"
                      :options="approvalGroupOptions"
                      multiple
                      filterable
                      clearable
                      placeholder="選擇處理用戶組"
                      @update:value="value => updateNodeIdList(selectedNode, 'processor_group_ids', value as Array<number | string>)"
                    />
                  </NFormItem>

                  <NFormItem v-if="selectedNode.processor_type === 'variable'" label="變數">
                    <NSelect
                      v-model:value="selectedNode.processor_variable"
                      :options="approverVariableOptions"
                      placeholder="選擇直屬上級 / 部門負責人"
                    />
                  </NFormItem>
                </template>

                <template v-if="selectedNode.node_type === 'cc'">
                  <NFormItem label="抄送人"><NSelect :value="nodeIdList(selectedNode, 'cc_ids')" :options="employeeOptions" multiple filterable clearable @update:value="value => updateNodeIdList(selectedNode, 'cc_ids', value as Array<number | string>)" /></NFormItem>
                </template>

                <div class="permission-title automation-heading">
                  <span>節點自動化</span>
                  <NButton size="small" type="primary" secondary @click="addAutomationAction(selectedNode)">＋ 新增動作</NButton>
                </div>
                <div class="permission-tip">同一節點可執行多個內建功能或自訂 API；各動作獨立執行，單一 API 失敗不會阻止其他 API。</div>

                <NEmpty v-if="!nodeAutomationActions(selectedNode).length" description="尚未設定自動化動作" size="small" class="automation-empty" />
                <div v-for="(action, actionIndex) in nodeAutomationActions(selectedNode)" :key="action.id" class="automation-card">
                  <div class="automation-card-head">
                    <strong>動作 {{ actionIndex + 1 }}{{ action.name ? `｜${action.name}` : '' }}</strong>
                    <div class="automation-card-actions">
                      <NCheckbox
                        :checked="automationActionEnabled(action)"
                        @update:checked="value => updateAutomationActionEnabled(action, value)"
                      >啟用</NCheckbox>
                      <NButton text type="error" @click="removeAutomationAction(selectedNode, action.id)">移除</NButton>
                    </div>
                  </div>

                  <NFormItem label="功能">
                    <NSelect
                      :value="automationTargetValue(action)"
                      :options="automationTargetOptions"
                      @update:value="value => updateAutomationTarget(action, String(value))"
                    />
                  </NFormItem>

                  <template v-if="action.action_type === 'builtin'">
                    <NAlert type="success" :bordered="false" class="automation-built-in">
                      人員離職審批完成後，直接停用員工與 OA 帳號、解除帳號及資產人員關聯，並保留 AD 人工待辦。
                    </NAlert>
                  </template>

                  <template v-else>
                    <NFormItem label="名稱">
                      <NInput v-model:value="action.name" placeholder="例如：通知薪資系統" />
                    </NFormItem>
                    <NFormItem label="API URL">
                      <NInput v-model:value="action.webhook_url" clearable placeholder="https://example.com/api/webhook" />
                    </NFormItem>
                    <NFormItem label="觸發時機">
                      <NSelect
                        :value="action.webhook_events || []"
                        :options="nodeAutomationEventOptions"
                        multiple
                        clearable
                        placeholder="可複選事件"
                        @update:value="value => updateAutomationEvents(action, value as Array<string | number>)"
                      />
                    </NFormItem>
                    <NFormItem label="Webhook Secret（選填）">
                      <NInput v-model:value="action.webhook_secret" type="password" show-password-on="click" clearable placeholder="以 HMAC-SHA256 放在 X-Demo-Signature" />
                    </NFormItem>
                  </template>

                  <NFormItem label="Timeout 毫秒">
                    <NInputNumber v-model:value="action.timeout_ms" :min="1000" :max="30000" :step="1000" />
                  </NFormItem>
                </div>

                <div class="permission-title">欄位權限</div>
                <div class="permission-tip">設定此節點可看/可填哪些欄位。例：提交節點只讓申請人填前半段；第一個處理節點再補後半段。</div>
                <div v-if="!(template.fields || []).length" class="empty-permission">尚未建立欄位</div>
                <div v-for="field in template.fields || []" :key="field.field_key" class="permission-row">
                  <span>{{ field.field_label }}</span>
                  <NSelect :value="fieldPermission(selectedNode, field)" size="small" :options="fieldPermissionOptions" @update:value="value => updateFieldPermission(selectedNode, field, value as FieldPermissionMode)" />
                </div>
              </NForm>

              <div v-if="!isFixedFlowNode(selectedNode)" class="props-actions">
                <NButton size="small" @click="moveFlowNode(selectedNodeIndex, -1)">上移</NButton>
                <NButton size="small" @click="moveFlowNode(selectedNodeIndex, 1)">下移</NButton>
                <NButton size="small" @click="duplicateFlowNode(selectedNodeIndex)">複製</NButton>
                <NButton size="small" type="error" ghost @click="removeFlowNode(selectedNodeIndex)">刪除</NButton>
              </div>
            </template>
          </aside>
        </div>
      </section>

      <section v-else class="more-panel">
        <div class="setting-card">
          <h3>提交人權限</h3>
          <NCheckbox v-model:checked="template.settings_json!.allow_revoke_running">允許撤銷審批中的申請</NCheckbox>
          <NCheckbox v-model:checked="template.settings_json!.allow_resubmit">允許修改後再次提交</NCheckbox>
          <NCheckbox v-model:checked="template.settings_json!.allow_submit_for_others">允許代他人提交</NCheckbox>
          <h3>審批人設置</h3>
          <NCheckbox v-model:checked="template.settings_json!.allow_batch_approve">允許審批人批量處理</NCheckbox>
          <NCheckbox v-model:checked="template.settings_json!.quick_approve_card">可在審批卡片進行快捷審批</NCheckbox>
          <h3>審批人去重</h3>
          <NRadioGroup v-model:value="template.settings_json!.dedupe_mode">
            <NSpace vertical>
              <NRadio value="once">僅審批一次，後續重複節點自動同意</NRadio>
              <NRadio value="continuous">僅針對連續審批節點自動同意</NRadio>
              <NRadio value="none">不自動同意，每個節點都需要審批</NRadio>
            </NSpace>
          </NRadioGroup>
        </div>
      </section>
    </NSpin>
  </div>
</template>

<style scoped>
.designer-page { min-height: calc(100vh - 64px); background: #f3f4f7; }
.designer-topbar { height: 58px; background: #fff; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; padding: 0 18px; gap: 20px; position: sticky; top: 0; z-index: 10; }
.steps { flex: 1; display: flex; justify-content: center; gap: 42px; }
.step { height: 58px; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 3px solid transparent; color: #667085; font-size: 16px; }
.step span { display: inline-flex; width: 24px; height: 24px; border-radius: 50%; align-items: center; justify-content: center; border: 1px solid #9ca3af; }
.step.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 800; }
.step.active span { background: #2563eb; color: #fff; border-color: #2563eb; }
.top-actions { display: flex; gap: 10px; }
.basic-panel { min-height: calc(100vh - 130px); padding: 34px 32px 90px; background: linear-gradient(180deg, #f7f9fd 0%, #f2f4f8 100%); display: flex; justify-content: center; align-items: flex-start; }
.basic-card.lark-basic-card { width: min(880px, calc(100vw - 420px)); max-width: 880px; background: #fff; border: 1px solid #e8edf5; border-radius: 18px; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08); padding: 30px 36px 34px; }
.basic-hero { display: flex; align-items: center; gap: 18px; padding-bottom: 22px; margin-bottom: 24px; border-bottom: 1px solid #eef2f7; }
.basic-hero-icon, .big-icon { width: 54px; height: 54px; border-radius: 16px; background: linear-gradient(135deg, #2f6bff, #7c3aed); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; box-shadow: 0 10px 24px rgba(47, 107, 255, 0.25); }
.basic-hero h2 { margin: 0; font-size: 22px; font-weight: 900; color: #111827; }
.basic-hero p { margin: 7px 0 0; color: #6b7280; line-height: 1.6; font-size: 13px; }
.icon-edit { display: grid; grid-template-columns: 64px 1fr; align-items: center; gap: 14px; width: 100%; }
.field-hint { display: block; margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: #f5f8ff; color: #64748b; font-size: 12px; line-height: 1.55; border: 1px solid #e6efff; }
.nested-setting { margin: -4px 0 18px; padding: 16px 18px 2px; border-radius: 14px; background: #f8fafc; border: 1px dashed #cbd5e1; }
.form-design { display: grid; grid-template-columns: 336px 1fr 360px; min-height: calc(100vh - 122px); }
.controls-panel, .props-panel { background: #fff; border-right: 1px solid #e5e7eb; padding: 14px 22px; overflow: auto; }
.props-panel { border-left: 1px solid #e5e7eb; border-right: none; }
.control-group { margin: 18px 0 8px; color: #4b5563; font-weight: 700; }
.control-btn { width: 132px; height: 36px; margin: 0 10px 10px 0; border: 1px solid #dfe3ea; background: #fff; border-radius: 6px; cursor: grab; display: inline-flex; align-items: center; justify-content: space-between; padding: 0 10px; }
.control-btn:hover { border-color: #2563eb; color: #2563eb; background: #f8fbff; }
.phone-stage { display: flex; justify-content: center; align-items: flex-start; padding: 40px 0; overflow: auto; }
.phone-shell { width: 310px; min-height: 560px; background: #fff; border: 10px solid #fdfdfd; border-radius: 28px; box-shadow: 0 10px 28px rgb(0 0 0 / 14%); overflow: hidden; }
.phone-title { height: 46px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #edf0f5; font-weight: 800; }
.phone-field { min-height: 52px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #f0f2f5; position: relative; cursor: grab; }
.phone-field.active { background: #f5f8ff; box-shadow: inset 0 0 0 2px #2563eb; }
.phone-field small { display: block; color: #9ca3af; margin-top: 3px; }
.required { color: #ef4444; }
.field-actions { position: absolute; right: 6px; top: -12px; display: none; gap: 3px; }
.phone-field.active .field-actions { display: flex; }
.field-actions button { border: 1px solid #d1d5db; background: #fff; cursor: pointer; border-radius: 4px; }
.empty-drop { min-height: 42px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 12px; background: #f7f8fb; border: 1px dashed transparent; }
.empty-drop:hover { border-color: #93c5fd; background: #eff6ff; }
.child-title { font-weight: 800; margin: 18px 0 8px; }
.child-row { display: grid; grid-template-columns: 1fr 120px 44px; gap: 6px; margin-bottom: 8px; }
.flow-insert-page { min-height: calc(100vh - 120px); background: #f3f4f7; padding: 20px 28px 90px; }
.flow-top-actions { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 14px; }
.flow-editor-layout { display: grid; grid-template-columns: minmax(520px, 1fr) 380px; gap: 22px; }
.flow-canvas { min-height: 720px; padding: 34px 0 120px; display: flex; flex-direction: column; align-items: center; overflow: auto; }
.flow-node-card { width: 270px; background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06); overflow: hidden; cursor: pointer; }
.flow-node-card.active { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12), 0 8px 22px rgba(15, 23, 42, 0.08); }
.flow-node-head { height: 38px; padding: 0 12px; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: space-between; }
.flow-node-head em { font-style: normal; font-size: 12px; opacity: 0.9; }
.flow-node-card.submit .flow-node-head, .flow-node-card.end .flow-node-head { background: #aab7d0; }
.flow-node-card.approval .flow-node-head { background: #ff8a00; }
.flow-node-card.processing .flow-node-head { background: #2563eb; }
.flow-node-card.cc .flow-node-head { background: #10b981; }
.flow-node-body { padding: 12px; }
.node-summary { margin-top: 8px; color: #6b7280; font-size: 12px; }
.node-mini-actions { padding: 0 10px 10px; display: flex; gap: 6px; flex-wrap: wrap; }
.node-mini-actions button { border: 1px solid #d1d5db; background: #fff; border-radius: 6px; color: #4b5563; cursor: pointer; font-size: 12px; }
.node-mini-actions .danger { color: #ef4444; border-color: #fecaca; }
.insert-zone { height: 82px; display: flex; flex-direction: column; align-items: center; color: #2563eb; }
.insert-zone .line { width: 1px; flex: 1; background: #cbd5e1; }
.insert-plus { width: 30px; height: 30px; border-radius: 999px; border: 1px solid #93c5fd; background: #fff; color: #2563eb; font-size: 20px; line-height: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.16); }
.insert-label { font-size: 12px; margin-top: 4px; opacity: 0; transition: opacity 0.15s ease; }
.insert-zone:hover .insert-label { opacity: 1; }
.flow-props-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; height: fit-content; position: sticky; top: 76px; box-shadow: 0 10px 32px rgba(15, 23, 42, 0.06); }
.props-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #eef2f7; }
.permission-title { font-weight: 900; margin: 18px 0 6px; }
.automation-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.automation-empty { padding: 18px 0; border: 1px dashed #cbd5e1; border-radius: 10px; margin-bottom: 12px; }
.automation-card { padding: 14px 14px 2px; margin-bottom: 12px; border: 1px solid #dbe3ef; border-radius: 12px; background: #f8fafc; }
.automation-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.automation-card-head strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.automation-card-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.automation-built-in { margin-bottom: 16px; }
.permission-tip { background: #f5f8ff; border: 1px solid #dbeafe; color: #64748b; border-radius: 8px; padding: 8px 10px; font-size: 12px; line-height: 1.5; margin-bottom: 10px; }
.permission-row { display: grid; grid-template-columns: 1fr 140px; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid #f1f5f9; }
.empty-permission { color: #94a3b8; padding: 12px; background: #f8fafc; border-radius: 8px; }
.props-actions { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 14px; border-top: 1px solid #eef2f7; }
.more-panel { padding: 28px 0 80px; }
.setting-card { width: 760px; margin: 0 auto; background: #fff; padding: 32px 44px; display: flex; flex-direction: column; gap: 12px; border-radius: 16px; }
.setting-card h3 { margin: 18px 0 4px; }
.mt-16 { margin-top: 16px; }


/* ===== P3 Choice Field Editor ===== */
.choice-config :deep(.n-tabs-nav) {
  margin-bottom: 18px;
}
.option-source {
  width: 100%;
  margin-bottom: 10px;
}
.option-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.option-row {
  display: grid;
  grid-template-columns: 22px minmax(100px, 1fr) minmax(86px, 0.8fr) 28px 28px 32px;
  gap: 6px;
  align-items: center;
}
.drag-handle {
  color: #a3aab8;
  cursor: grab;
  user-select: none;
}
.option-icon {
  width: 28px;
  height: 28px;
  border: 1px solid #dbe3ef;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
}
.option-icon:hover {
  border-color: #2563eb;
  color: #2563eb;
  background: #f8fbff;
}
.option-icon.danger {
  color: #ef4444;
  border-color: #fecaca;
}
.option-actions {
  display: flex;
  gap: 14px;
  margin-top: 10px;
}
.bulk-box {
  margin-top: 12px;
  padding: 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.option-extra {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-top: 6px;
}
.mt-10 { margin-top: 10px; }
</style>
