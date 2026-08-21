<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDialog, useMessage } from 'naive-ui';
import {
  actionApprovalTask,
  fetchApprovalInstance,
  fetchApprovalInstances,
  type ApprovalInstance,
  type ApprovalLog,
  type ApprovalTask,
  type FieldPermissionMode,
  type LarkFormField,
  type LarkProcessNode,
  type LarkTemplate
} from '@/service/api/airway/lark-forms';

interface FlowEmployee {
  id: number | string;
  employee_no?: string;
  chinese_name?: string;
  english_name?: string;
  company_email?: string;
  email?: string;
  display_name?: string;
  displayName?: string;
  ad_display_name?: string;
  ad_name?: string;
  sam_account_name?: string;
  samAccountName?: string;
  username?: string;
  [key: string]: any;
}

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const activeBox = ref('pending');
const keyword = ref('');

const templateFilterValue = ref<string | null>(null);

function getInstanceTemplateName(item: any) {
  return item?.template_name || item?.templateName || item?.form_name || item?.formName || item?.template?.form_name || '未命名表單';
}

function getInstanceTemplateId(item: any) {
  return String(item?.template_id || item?.templateId || item?.template?.id || getInstanceTemplateName(item));
}

function matchTemplateFilter(item: any) {
  if (!templateFilterValue.value) return true;
  return getInstanceTemplateId(item) === String(templateFilterValue.value);
}

const templateFilterOptions = computed(() => {
  const list = Array.isArray(filteredInstances.value) ? filteredInstances.value : [];
  const map = new Map<string, string>();

  list.forEach((item: any) => {
    const value = getInstanceTemplateId(item);
    const label = getInstanceTemplateName(item);
    if (value && label) map.set(value, label);
  });

  return [
    { label: '全部表單', value: '' },
    ...Array.from(map.entries()).map(([value, label]) => ({ label, value }))
  ];
});

const visibleInstances = computed(() => {
  const list = Array.isArray(filteredInstances.value) ? filteredInstances.value : [];
  return list.filter((item: any) => matchTemplateFilter(item));
});

const loadingList = ref(false);
const loadingDetail = ref(false);
const instances = ref<ApprovalInstance[]>([]);
const selectedId = ref<number | null>(route.query.id ? Number(route.query.id) : null);

const detail = ref<ApprovalInstance | null>(null);
const template = ref<LarkTemplate | null>(null);
const tasks = ref<ApprovalTask[]>([]);
const logs = ref<ApprovalLog[]>([]);
const currentTask = ref<ApprovalTask | null>(null);
const comment = ref('');
const editData = reactive<Record<string, any>>({});
const employees = ref<FlowEmployee[]>([]);
const detailCache = ref<Record<number, { instance: ApprovalInstance; template: LarkTemplate }>>({});

const boxes = [
  { key: 'pending', label: '待辦', icon: '▣' },
  { key: 'processed', label: '已辦', icon: '☑' },
  { key: 'cc', label: '傳送副本給我', icon: '⇄' },
  { key: 'mine', label: '已申請', icon: '▤' }
];

const filteredInstances = computed(() => {
  const kw = keyword.value.trim().toLowerCase();

  if (!kw) return instances.value;

  return instances.value.filter(item =>
    `${item.template_name} ${item.applicant_name || ''} ${summaryLines(item).join(' ')}`
      .toLowerCase()
      .includes(kw)
  );
});

const formData = computed(() => detail.value?.form_data || {});
const processNodes = computed<LarkProcessNode[]>(() => template.value?.process_json || []);
const actionableNodes = computed<LarkProcessNode[]>(() =>
  processNodes.value.filter(node => ['approval', 'processing'].includes(node.node_type))
);

const currentNode = computed<LarkProcessNode | null>(() => {
  if (!currentTask.value) return null;
  return actionableNodes.value[Number(currentTask.value.step_index || 0)] || null;
});

const editableFields = computed(() =>
  (template.value?.fields || []).filter(field => fieldEditable(field))
);

const flowSteps = computed(() => {
  const instanceStatus = String(detail.value?.status || '');

  return processNodes.value.map((node, index) => {
    const actionableIndex = actionableNodes.value.findIndex(item => sameNode(item, node));
    const stepTasks = actionableIndex >= 0
      ? tasks.value.filter(task => Number(task.step_index) === actionableIndex)
      : [];

    const owners = nodeOwners(node, stepTasks);

    let state = 'waiting';

    if (node.node_type === 'submit') {
      state = 'done';
    } else if (node.node_type === 'end') {
      state = instanceStatus === 'APPROVED' ? 'done' : 'waiting';
    } else if (stepTasks.some(task => task.status === 'REJECTED')) {
      state = 'rejected';
    } else if (stepTasks.some(task => task.status === 'PENDING')) {
      state = 'current';
    } else if (stepTasks.length && stepTasks.every(task => ['APPROVED', 'SKIPPED'].includes(task.status))) {
      state = 'done';
    }

    return {
      ...node,
      originalIndex: index,
      actionableIndex,
      owners,
      state,
      typeLabel: nodeTypeLabel(node),
      modeLabel: nodeModeLabel(node)
    };
  });
});

function sameNode(a: LarkProcessNode, b: LarkProcessNode) {
  if (a.id && b.id) return a.id === b.id;
  return a === b;
}

function safeJson(value: any, fallback: any) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function statusText(status?: string) {
  const map: Record<string, string> = {
    PENDING: '審核中',
    APPROVED: '已通過',
    REJECTED: '已拒絕',
    CANCELLED: '已撤銷'
  };

  return map[status || ''] || status || '-';
}

function statusType(status?: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'error';
  if (status === 'PENDING') return 'info';

  return 'default';
}

function getEmployeeAdName(emp?: any) {
  if (!emp) return '';

  const email = String(emp.company_email || emp.email || '').trim();
  const emailName = email.includes('@') ? email.split('@')[0] : email;

  return String(
    emp.display_name ||
    emp.email_account ||
    emp.ad_display_name ||
    emp.ad_name ||
    emp.sam_account_name ||
    emp.samAccountName ||
    emp.username ||
    emailName ||
    emp.english_name ||
    emp.chinese_name ||
    emp.employee_no ||
    ''
  ).trim();
}



function employeeById(id: any) {
  const raw = String(id ?? '').trim();
  const target = Number(raw.replace(/^#/, ''));

  return employees.value.find((emp: any) => (
    String(emp.id) === raw ||
    String(emp.id) === raw.replace(/^#/, '') ||
    Number(emp.id) === target ||
    String(emp.employee_no || '') === raw ||
    String(emp.company_email || '') === raw ||
    String(emp.email || '') === raw
  )) || null;
}



function employeeNameById(id: any) {
  const emp = employeeById(id);
  return getEmployeeAdName(emp) || '';
}



function idsToEmployeeNames(ids: any[] = []) {
  return ids
    .map(id => employeeNameById(id) || `#${id}`)
    .filter(Boolean);
}


function nodeTypeLabel(node: LarkProcessNode) {
  const map: Record<string, string> = {
    submit: '提交節點',
    approval: '審批節點',
    processing: '處理節點',
    cc: '抄送節點',
    end: '結束節點'
  };

  return map[node.node_type] || '流程節點';
}

function nodeModeLabel(node: LarkProcessNode) {
  if (node.node_type === 'approval') {
    return node.approval_mode === 'all' ? '需全部同意' : '任一人同意即可';
  }

  if (node.node_type === 'processing') return '處理人補填';
  if (node.node_type === 'cc') return '通知副本';
  if (node.node_type === 'submit') return '發起人送出';
  if (node.node_type === 'end') return '流程完成';

  return nodeTypeLabel(node);
}

function employeeNameFromText(value: any) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const idMatch = raw.match(/^#?(\d+)$/);
  if (idMatch) {
    return employeeNameById(idMatch[1]) || raw;
  }

  const rawLower = raw.toLowerCase();

  const emp = employees.value.find((item: any) => {
    const email = String(item.company_email || item.email || '').trim();
    const emailName = email.includes('@') ? email.split('@')[0] : email;

    const candidates = [
      item.display_name,
      item.email_account,
      item.chinese_name,
      item.english_name,
      item.company_email,
      item.email,
      emailName,
      item.ad_display_name,
      item.ad_name,
      item.sam_account_name,
      item.samAccountName,
      item.username,
      item.employee_no
    ]
      .map(x => String(x || '').trim())
      .filter(Boolean);

    return candidates.some(x => x.toLowerCase() === rawLower);
  });

  return getEmployeeAdName(emp) || raw;
}




function applicantNameOf(item: any) {
  if (!item) return '未知申請人';

  return (
    employeeNameById(item.applicant_id) ||
    employeeNameFromText(item.applicant_name) ||
    item.applicant_name ||
    '未知申請人'
  );
}


function taskAssigneeName(task: ApprovalTask) {
  if (Number(task.assignee_id || 0)) {
    return (
      employeeNameById(task.assignee_id) ||
      employeeNameFromText(task.assignee_name) ||
      `#${task.assignee_id}`
    );
  }

  if (task.assignee_name) {
    return employeeNameFromText(task.assignee_name);
  }

  if (task.assignee_type === 'role') {
    return `角色：${task.role_code || '未指定'}`;
  }

  return task.role_code || '未指定';
}




function normalizeOwnerName(value: any) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const idMatch = raw.match(/^#?(\d+)$/);
  if (idMatch) {
    return employeeNameById(idMatch[1]) || raw;
  }

  return employeeNameFromText(raw) || raw;
}


function backendOwnerNames(node: any) {
  if (!node) return [];

  if (Array.isArray(node.owner_names)) {
    return node.owner_names
      .map((item: any) => normalizeOwnerName(item))
      .filter(Boolean);
  }

  if (typeof node.owner_text === 'string' && node.owner_text.trim()) {
    return node.owner_text
      .split('/')
      .map((item: string) => normalizeOwnerName(item))
      .filter(Boolean);
  }

  return [];
}



function nodeOwners(node: LarkProcessNode, stepTasks: ApprovalTask[] = []) {
  if (node.node_type === 'submit') {
    return applicantNameOf(detail.value);
  }

  if (node.node_type === 'end') {
    return detail.value?.status === 'APPROVED' ? '流程完成' : '待完成';
  }

  // 審批 / 處理節點一定優先顯示實際任務 assignee。
  // approval_tasks.step_index 是 actionable index，不是 process_json 原始 index。
  // 這裡的 stepTasks 已經在 flowSteps 用 actionableIndex 算好，所以最準。
  if (['approval', 'processing'].includes(node.node_type)) {
    const taskNames = stepTasks.map(taskAssigneeName).filter(Boolean);
    if (taskNames.length) return Array.from(new Set(taskNames)).join(' / ');
  }

  const backendNames = backendOwnerNames(node);
  if (backendNames.length) {
    return backendNames.join(' / ');
  }

  const taskNames = stepTasks.map(taskAssigneeName).filter(Boolean);
  if (taskNames.length) return Array.from(new Set(taskNames)).join(' / ');

  if (node.node_type === 'approval') {
    if (node.approver_type === 'submitter_select') return '提交人自選';
    if (node.approver_type === 'self') return applicantNameOf(detail.value);
    if (node.approver_type === 'role') return `角色：${node.role_code || '未設定'}`;

    const names = idsToEmployeeNames(node.approver_ids || []);
    return names.length ? names.join(' / ') : '未設定審批人';
  }

  if (node.node_type === 'processing') {
    if (node.processor_type === 'self') return applicantNameOf(detail.value);
    if (node.processor_type === 'role') return `角色：${node.role_code || '未設定'}`;

    const names = idsToEmployeeNames(node.processor_ids || []);
    return names.length ? names.join(' / ') : '未設定處理人';
  }

  if (node.node_type === 'cc') {
    const names = idsToEmployeeNames(node.cc_ids || []);
    return names.length ? names.join(' / ') : '抄送通知';
  }

  return '';
}



function fieldOptions(field?: LarkFormField | null) {
  if (!field) return [];

  if (Array.isArray(field.options) && field.options.length) {
    return field.options;
  }

  const parsed = safeJson((field as any).options_json, []);
  if (Array.isArray(parsed)) return parsed;

  const config = safeJson((field as any).field_config_json || (field as any).config, {});
  if (Array.isArray(config.options)) return config.options;

  return [];
}

function optionLabel(field: LarkFormField, value: any) {
  const raw = String(value ?? '');
  const found = fieldOptions(field).find((option: any) =>
    String(option.value) === raw || String(option.label) === raw
  );

  return found?.label || raw || '-';
}

function splitMultiValue(value: any) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    return value
      .split(/[、,]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return value == null || value === '' ? [] : [value];
}

function displayValueByField(field: LarkFormField | null | undefined, value: any): string {
  if (value === undefined || value === null || value === '') return '-';

  if (!field) {
    if (Array.isArray(value)) return value.map(item => displayValueByField(null, item)).join('、');
    if (typeof value === 'object') return value.name || value.label || JSON.stringify(value);
    return String(value);
  }

  if (field.field_type === 'select') {
    return optionLabel(field, value);
  }

  if (field.field_type === 'multi_select') {
    return splitMultiValue(value).map(item => optionLabel(field, item)).join('、') || '-';
  }

  if (field.field_type === 'employee' || field.field_type === 'department') {
    if (Array.isArray(value)) return value.map(item => displayValueByField(field, item)).join('、');

    if (typeof value === 'object') {
      return value.name || value.chinese_name || value.label || value.email || JSON.stringify(value);
    }
  }

  if (field.field_type === 'amount' && value !== '') {
    return Number(value).toLocaleString('zh-TW');
  }

  if (field.field_type === 'date_range' && Array.isArray(value)) {
    return value.join(' ~ ');
  }

  if (Array.isArray(value)) return value.map(item => displayValueByField(null, item)).join('、');
  if (typeof value === 'object') return JSON.stringify(value);

  return String(value);
}

function isEmpty(value: any) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function permissionFor(field: LarkFormField): FieldPermissionMode {
  const node = currentNode.value;
  const mode = node?.field_permissions?.[field.field_key];

  if (mode === 'hidden' || mode === 'readonly' || mode === 'editable') {
    return mode;
  }

  if (currentTask.value && isEmpty(formData.value[field.field_key])) {
    return 'editable';
  }

  return 'readonly';
}

function fieldVisible(field: LarkFormField) {
  return permissionFor(field) !== 'hidden';
}

function fieldEditable(field: LarkFormField) {
  return !!currentTask.value && permissionFor(field) === 'editable';
}

function resetEditData() {
  Object.keys(editData).forEach(key => delete editData[key]);
  Object.assign(editData, JSON.parse(JSON.stringify(formData.value || {})));
}

function addDetailRow(field: LarkFormField) {
  if (!Array.isArray(editData[field.field_key])) {
    editData[field.field_key] = [];
  }

  editData[field.field_key].push({});
}

function removeDetailRow(field: LarkFormField, index: number) {
  const rows = editData[field.field_key];

  if (Array.isArray(rows) && rows.length > 1) {
    rows.splice(index, 1);
  }
}

function summaryLines(item: ApprovalInstance) {
  const cached = detailCache.value[item.id];
  const fields = cached?.template?.fields || (selectedId.value === item.id ? template.value?.fields || [] : []);
  const data = cached?.instance?.form_data || item.form_data || {};

  if (fields.length) {
    return fields
      .filter(field => !['description', 'detail_table'].includes(field.field_type))
      .slice(0, 3)
      .map(field => `${field.field_label}: ${displayValueByField(field, data[field.field_key])}`)
      .filter(line => !line.endsWith(': -'));
  }

  return Object.entries(data)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${displayValueByField(null, value)}`);
}

async function loadEmployees() {
  try {
    const response = await fetch('/api/employees/lookup', {
      credentials: 'include',
      headers: { Accept: 'application/json' }
    });

    const data = await response.json();

    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || 'people-map failed');
    }

    const list =
      Array.isArray(data)
        ? data
        : Array.isArray(data.employees)
          ? data.employees
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.data)
              ? data.data
              : [];

    employees.value = list;
  } catch (error) {
    console.warn('load people-map failed', error);
    employees.value = [];
  }
}



async function warmDetailCache() {
  const targets = instances.value.slice(0, 20).filter(item => !detailCache.value[item.id]);

  await Promise.allSettled(
    targets.map(async item => {
      const data = await fetchApprovalInstance(item.id);
      detailCache.value[item.id] = {
        instance: data.instance,
        template: data.template
      };
    })
  );
}

async function loadList() {
  loadingList.value = true;

  try {
    const box = activeBox.value === 'cc' ? 'pending' : activeBox.value;
    const data = await fetchApprovalInstances(box);

    instances.value = data.instances || [];

    await warmDetailCache();

    const queryId = Number(route.query.id || selectedId.value || 0) || null;

    // 重要：從數據管理點進來的單，可能是已通過 / 已拒絕 / 非目前待辦。
    // 不能要求它一定存在於目前左側清單；有 id 就直接載入詳情。
    if (queryId) {
      await loadDetail(queryId);
      return;
    }

    const target = instances.value[0]?.id || null;

    if (target) {
      await loadDetail(target);
    } else {
      clearDetail();
      router.replace({ path: '/airway/forms/center', query: {} });
    }
  } catch (error: any) {
    message.error(error?.message || '讀取審核中心失敗');
  } finally {
    loadingList.value = false;
  }
}

function clearDetail() {
  detail.value = null;
  template.value = null;
  tasks.value = [];
  logs.value = [];
  currentTask.value = null;
  resetEditData();
}

async function loadDetail(id: number) {
  selectedId.value = id;
  loadingDetail.value = true;

  try {
    const data = await fetchApprovalInstance(id);

    detail.value = data.instance;
    template.value = data.template;
    tasks.value = data.tasks || [];
    logs.value = data.logs || [];
    currentTask.value = data.current_user_task;

    detailCache.value[id] = {
      instance: data.instance,
      template: data.template
    };

    resetEditData();

    router.replace({ path: '/airway/forms/center', query: { id } });
  } catch (error: any) {
    message.error(error?.message || '讀取申請詳情失敗');
  } finally {
    loadingDetail.value = false;
  }
}

async function selectInstance(item: ApprovalInstance) {
  await loadDetail(item.id);
}

async function doAction(action: 'APPROVE' | 'REJECT') {
  if (!currentTask.value) return;

  const title = action === 'APPROVE' ? '確認同意？' : '確認拒絕？';
  const editableCount = editableFields.value.length;

  dialog.warning({
    title,
    content: editableCount ? `此節點有 ${editableCount} 個可填欄位，系統會一併保存後送出。` : (comment.value || '可在下方留言後再操作。'),
    positiveText: action === 'APPROVE' ? '同意' : '拒絕',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await actionApprovalTask(currentTask.value!.id, {
          action,
          comment: comment.value,
          form_data: { ...editData }
        });

        message.success('已處理');
        comment.value = '';
        selectedId.value = null;
        detailCache.value = {};

        await loadList();
      } catch (error: any) {
        message.error(error?.message || '操作失敗');
      }
    }
  });
}


watch(
  () => route.query.id,
  async value => {
    const id = Number(value || 0);

    if (!id || id === selectedId.value) return;

    await loadDetail(id);
  }
);

watch(activeBox, () => {
  selectedId.value = null;
  clearDetail();
  router.replace({ path: '/airway/forms/center', query: {} });
  loadList();
});

onMounted(async () => {
  await loadEmployees();
  await loadList();
});
</script>

<template>
  <div class="center-page">
    <div class="top-tabs">
      <div class="tab" @click="router.push('/airway/forms')">發起申請</div>
      <div class="tab active">審核中心</div>

      <div class="top-actions">
        <NButton size="small" text @click="router.push('/airway/forms/designer')">⚙ 管理後台</NButton>
        <NButton size="small" quaternary @click="loadList">重新整理</NButton>
      </div>
    </div>

    <div class="center-shell">
      <aside class="nav-rail">
        <div
          v-for="box in boxes"
          :key="box.key"
          class="rail-item"
          :class="{ active: activeBox === box.key }"
          @click="activeBox = box.key"
        >
          <span>{{ box.icon }}</span>
        </div>

        <div class="rail-bottom">☰</div>
      </aside>

      <aside class="list-panel">
        <NInput v-model:value="keyword" placeholder="搜尋" clearable size="small" class="mb-10">
          <template #prefix>🔍</template>
        </NInput>

        <div class="box-list">
          <div
            v-for="box in boxes"
            :key="box.key"
            class="box-item"
            :class="{ active: activeBox === box.key }"
            @click="activeBox = box.key"
          >
            <span>{{ box.label }}</span>
          </div>
        </div>
      </aside>

      <main class="request-list">
        <NSpin :show="loadingList">
          <NEmpty v-if="!filteredInstances.length" description="沒有資料" />

          <NSelect
            v-model:value="templateFilterValue"
            :options="templateFilterOptions"
            clearable
            placeholder="篩選表單"
            class="template-filter-select"
          />


          <div
            v-for="item in visibleInstances"
            :key="item.id"
            class="request-card"
            :class="{ active: selectedId === item.id }"
            @click="selectInstance(item)"
          >
            <div class="request-title">
              {{ item.template_name }}
              <NTag size="small" :type="statusType(item.status)">{{ statusText(item.status) }}</NTag>
            </div>

            <div class="request-sub">{{ applicantNameOf(item) }} · {{ item.created_at }}</div>
            <div class="request-line">{{ summaryLines(item).join(' / ') || '無摘要' }}</div>
          </div>
        </NSpin>
      </main>

      <section class="detail-panel">
        <NSpin :show="loadingDetail">
          <NEmpty v-if="!detail" description="請選擇一筆申請" />

          <template v-else>
            <div class="detail-toolbar">
              <span>編號：{{ detail.id }}</span>
              <div>↗ 🖨 🎧</div>
            </div>

            <div class="detail-main">
              <h1>
                {{ detail.template_name }}
                <NTag size="small" :type="statusType(detail.status)">{{ statusText(detail.status) }}</NTag>
              </h1>

              <div class="applicant-line">{{ applicantNameOf(detail) }}｜提交於 {{ detail.created_at }}</div>

              <div v-if="flowSteps.length" class="flow-track">
                <template v-for="(node, index) in flowSteps" :key="node.id || index">
                  <div class="flow-step" :class="[`is-${node.state}`, `type-${node.node_type}`]">
                    <div class="flow-step-title">{{ node.node_name || node.typeLabel }}</div>
                    <div class="flow-step-sub">{{ node.modeLabel }}</div>
                    <div class="flow-step-owner">{{ node.owners }}</div>
                  </div>

                  <div v-if="index < flowSteps.length - 1" class="flow-arrow">→</div>
                </template>
              </div>

              <NTabs type="line" animated>
                <NTabPane name="detail" tab="審核詳情">
                  <NAlert v-if="currentTask" type="info" :bordered="false" class="mb-16">
                    目前節點：{{ currentNode?.node_name || currentTask.step_name }}。
                    <template v-if="editableFields.length">
                      你可以補填：{{ editableFields.map(field => field.field_label).join('、') }}
                    </template>
                    <template v-else>
                      此節點沒有開放可填欄位。
                    </template>
                  </NAlert>

                  <div class="section-label">審核詳情</div>

                  <div class="field-list">
                    <template v-for="field in template?.fields || []" :key="field.field_key">
                      <template v-if="fieldVisible(field)">
                        <div v-if="field.field_type !== 'description' && field.field_type !== 'detail_table'" class="field-row">
                          <div class="field-name">{{ field.field_label }}</div>

                          <div class="field-value">
                            <NInput
                              v-if="fieldEditable(field) && ['text', 'textarea', 'phone', 'serial_no', 'department', 'email', 'address'].includes(field.field_type)"
                              v-model:value="editData[field.field_key]"
                              :type="field.field_type === 'textarea' ? 'textarea' : 'text'"
                              :placeholder="field.placeholder || '請輸入'"
                            />

                            <NInputNumber
                              v-else-if="fieldEditable(field) && ['number', 'amount'].includes(field.field_type)"
                              v-model:value="editData[field.field_key]"
                              class="w-full"
                            />

                            <NSelect
                              v-else-if="fieldEditable(field) && field.field_type === 'select'"
                              v-model:value="editData[field.field_key]"
                              :options="fieldOptions(field)"
                              clearable
                              :placeholder="field.placeholder || '請選擇'"
                            />

                            <NSelect
                              v-else-if="fieldEditable(field) && field.field_type === 'multi_select'"
                              v-model:value="editData[field.field_key]"
                              :options="fieldOptions(field)"
                              multiple
                              clearable
                              :placeholder="field.placeholder || '請選擇'"
                            />

                            <NDatePicker
                              v-else-if="fieldEditable(field) && field.field_type === 'date'"
                              v-model:formatted-value="editData[field.field_key]"
                              value-format="yyyy-MM-dd"
                              type="date"
                              class="w-full"
                            />

                            <NDatePicker
                              v-else-if="fieldEditable(field) && field.field_type === 'date_range'"
                              v-model:formatted-value="editData[field.field_key]"
                              value-format="yyyy-MM-dd"
                              type="daterange"
                              class="w-full"
                            />

                            <span v-else>{{ displayValueByField(field, formData[field.field_key]) }}</span>
                          </div>
                        </div>

                        <div v-else-if="field.field_type === 'detail_table'" class="detail-table-block">
                          <div class="detail-head">
                            <div class="field-name strong">{{ field.field_label }}</div>
                            <NButton
                              v-if="fieldEditable(field)"
                              size="small"
                              secondary
                              type="primary"
                              @click="addDetailRow(field)"
                            >
                              新增明細
                            </NButton>
                          </div>

                          <div v-for="(row, index) in editData[field.field_key] || []" :key="index" class="mini-table">
                            <div class="detail-row-head">
                              <span>明細 {{ Number(index) + 1 }}</span>
                              <NButton
                                v-if="fieldEditable(field)"
                                text
                                type="error"
                                @click="removeDetailRow(field, Number(index))"
                              >
                                刪除
                              </NButton>
                            </div>

                            <div v-for="child in field.children || []" :key="child.field_key" class="field-row">
                              <div class="field-name">{{ child.field_label }}</div>

                              <div class="field-value big" :class="{ amount: child.field_type === 'amount' }">
                                <NInput
                                  v-if="fieldEditable(field) && ['text', 'textarea'].includes(child.field_type)"
                                  v-model:value="row[child.field_key]"
                                  :type="child.field_type === 'textarea' ? 'textarea' : 'text'"
                                />

                                <NInputNumber
                                  v-else-if="fieldEditable(field) && ['number', 'amount'].includes(child.field_type)"
                                  v-model:value="row[child.field_key]"
                                  class="w-full"
                                />

                                <NDatePicker
                                  v-else-if="fieldEditable(field) && child.field_type === 'date'"
                                  v-model:formatted-value="row[child.field_key]"
                                  value-format="yyyy-MM-dd"
                                  type="date"
                                  class="w-full"
                                />

                                <NSelect
                                  v-else-if="fieldEditable(field) && child.field_type === 'select'"
                                  v-model:value="row[child.field_key]"
                                  :options="fieldOptions(child)"
                                  clearable
                                />

                                <span v-else>{{ displayValueByField(child, row[child.field_key]) }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </template>
                  </div>
                </NTabPane>

                <NTabPane name="logs" tab="審核記錄">
                  <NTimeline>
                    <NTimelineItem
                      v-for="log in logs"
                      :key="log.id"
                      :title="`${log.actor_name || '系統'} ${log.action}`"
                      :content="log.comment || log.step_name || '-'"
                      :time="log.created_at"
                    />
                  </NTimeline>
                </NTabPane>

                <NTabPane name="comments" tab="全文評論">
                  <NEmpty description="評論 MVP 下一版補群組聊天 / 評論串" />
                </NTabPane>
              </NTabs>
            </div>

            <div class="action-bar">
              <template v-if="currentTask">
                <NButton type="primary" secondary @click="doAction('APPROVE')">✓ 同意</NButton>
                <NButton type="error" secondary @click="doAction('REJECT')">✕ 拒絕</NButton>
                <NInput v-model:value="comment" placeholder="留言，非必填" class="comment-input" />
              </template>

              <NButton quaternary>開始群組聊天</NButton>
              <NButton quaternary>傳送副本</NButton>
              <NButton quaternary disabled>轉交</NButton>
              <NButton quaternary>更多</NButton>
            </div>
          </template>
        </NSpin>
      </section>
    </div>
  </div>
</template>

<style scoped>
.center-page {
  min-height: calc(100vh - 64px);
  background: #f5f7fb;
}

.top-tabs {
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  gap: 24px;
}

.tab {
  height: 52px;
  display: flex;
  align-items: center;
  cursor: pointer;
  border-bottom: 3px solid transparent;
}

.tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 700;
}

.top-actions {
  margin-left: auto;
  display: flex;
  gap: 14px;
}

.center-shell {
  display: grid;
  grid-template-columns: 56px 240px 360px minmax(460px, 1fr);
  height: calc(100vh - 116px);
  min-height: 660px;
}

.nav-rail {
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rail-item,
.rail-bottom {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #475569;
}

.rail-item.active {
  background: #eaf1ff;
  color: #2563eb;
}

.rail-bottom {
  margin-top: auto;
}

.list-panel {
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 14px 10px;
}

.box-item {
  height: 38px;
  padding: 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px;
  cursor: pointer;
}

.box-item.active {
  background: #eef4ff;
  color: #2563eb;
  font-weight: 700;
}

.request-list {
  padding: 12px;
  overflow: auto;
  border-right: 1px solid #e5e7eb;
}

.request-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  cursor: pointer;
  margin-bottom: 10px;
}

.request-card.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb inset;
}

.request-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
}

.request-sub,
.request-line {
  margin-top: 8px;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.detail-panel {
  overflow: auto;
  background: #fff;
}

.detail-toolbar {
  height: 44px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  color: #667085;
}

.detail-main {
  padding: 24px 28px 96px;
}

h1 {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 26px;
  margin: 0 0 8px;
}

.applicant-line {
  color: #667085;
  margin-bottom: 12px;
}

.flow-track {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 18px 0 22px;
}

.flow-step {
  min-width: 128px;
  max-width: 180px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #dbe2ea;
  background: #f8fafc;
  box-sizing: border-box;
}

.flow-step-title {
  font-size: 14px;
  font-weight: 800;
  color: #111827;
  line-height: 1.3;
}

.flow-step-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.flow-step-owner {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}

.flow-arrow {
  font-size: 20px;
  color: #94a3b8;
  line-height: 1;
}

.flow-step.is-done {
  background: #eff6ff;
  border-color: #93c5fd;
}

.flow-step.is-current {
  background: #fff7ed;
  border-color: #fdba74;
  box-shadow: 0 0 0 1px #fdba74 inset;
}

.flow-step.is-rejected {
  background: #fef2f2;
  border-color: #fca5a5;
}

.flow-step.type-end {
  background: #f3f4f6;
}

.section-label {
  border-left: 3px solid #111827;
  padding-left: 10px;
  font-size: 18px;
  font-weight: 800;
  margin: 20px 0;
}

.field-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px;
  padding: 8px 0;
  align-items: center;
}

.field-name {
  color: #667085;
}

.field-name.strong {
  color: #111827;
  font-weight: 800;
  margin: 16px 0 8px;
}

.detail-head,
.detail-row-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mini-table {
  background: #f7f8fb;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 12px;
}

.field-value.big.amount {
  color: #f59e0b;
  font-size: 22px;
  font-weight: 900;
}

.action-bar {
  position: sticky;
  bottom: 0;
  min-height: 58px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
}

.comment-input {
  max-width: 260px;
}

.mb-10 {
  margin-bottom: 10px;
}

.mb-16 {
  margin-bottom: 16px;
}

.w-full {
  width: 100%;
}

.template-filter-select {
  margin-top: 8px;
  margin-bottom: 12px;
}

</style>
