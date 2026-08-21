<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { fetchEmployeeLookup, type AirwayEmployee } from '@/service/api/airway/employees';
import {
  fetchLarkTemplate,
  fetchApprovalUserGroups,
  submitLarkApproval,
  type ApprovalUserGroup,
  type FieldPermissionMode,
  type LarkFormField,
  type LarkProcessNode,
  type LarkTemplate
} from '@/service/api/airway/lark-forms';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(false);
const submitting = ref(false);
const template = ref<LarkTemplate | null>(null);
const employees = ref<AirwayEmployee[]>([]);
const approvalGroups = ref<ApprovalUserGroup[]>([]);
const departments = ref<any[]>([]);
const formData = reactive<Record<string, any>>({});
const selectedApprovers = ref<number[]>([]);
const selectedApproversByNode = reactive<Record<string, number[]>>({});

const templateId = computed(() => route.params.id as string);

const employeeOptions = computed(() =>
  employees.value.map(emp => {
    const name = emp.chinese_name || emp.english_name || emp.company_email || emp.employee_no || `員工 ${emp.id}`;
    const meta = [
      emp.department_name || emp.department_code,
      emp.position_title || emp.job_title || emp.title,
      emp.company_email
    ].filter(Boolean).join(' / ');

    return {
      label: meta ? `${name}（${meta}）` : name,
      value: Number(emp.id)
    };
  })
);

const departmentOptions = computed(() =>
  departments.value.map(dept => {
    const code = dept.code || dept.department_code || '';
    const name = dept.name || dept.department_name || '';
    const label = code && name ? `${code} ${name}` : name || code || `部門 ${dept.id}`;

    return {
      label,
      value: String(dept.id),
      department_id: dept.id,
      department_code: code,
      department_name: name
    };
  })
);

function safeArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeField(field: any, index = 0): LarkFormField {
  const fieldType = String(field?.field_type || field?.type || 'text').trim() || 'text';
  const key = String(field?.field_key || field?.key || `field_${index}`).trim();

  return {
    ...field,
    field_key: key,
    field_label: String(field?.field_label || field?.label || key || `欄位 ${index + 1}`),
    field_type: fieldType,
    required: field?.required ? 1 : 0,
    placeholder: field?.placeholder || '',
    options: parseOptions(field),
    children: safeArray(field?.children).map((child, childIndex) => normalizeField(child, childIndex))
  };
}

const allFields = computed<LarkFormField[]>(() =>
  safeArray(template.value?.fields).map((field, index) => normalizeField(field, index))
);

function normalizeProcessNode(node: any, index = 0): LarkProcessNode {
  return {
    id: node?.id || `node_${index}`,
    node_type: node?.node_type || node?.type || 'approval',
    node_name: node?.node_name || node?.name || '',
    approver_type: node?.approver_type || '',
    approver_ids: safeArray(node?.approver_ids).map(Number).filter(Boolean),
    approver_variable: node?.approver_variable || node?.approverVariable || '',
    approval_group_ids: safeArray(node?.approval_group_ids || node?.approvalGroupIds || node?.group_ids || node?.groupIds).map(Number).filter(Boolean),
    approver_group_ids: safeArray(node?.approver_group_ids || node?.approverGroupIds).map(Number).filter(Boolean),
    processor_type: node?.processor_type || '',
    processor_ids: safeArray(node?.processor_ids).map(Number).filter(Boolean),
    processor_variable: node?.processor_variable || node?.processorVariable || '',
    processor_group_ids: safeArray(node?.processor_group_ids || node?.processorGroupIds).map(Number).filter(Boolean),
    cc_ids: safeArray(node?.cc_ids).map(Number).filter(Boolean),
    role_code: node?.role_code || '',
    approval_mode: node?.approval_mode || 'any',
    field_permissions: node?.field_permissions && typeof node.field_permissions === 'object'
      ? node.field_permissions
      : {}
  } as LarkProcessNode;
}

const visibleProcessNodes = computed<LarkProcessNode[]>(() => {
  const nodes = safeArray(template.value?.process_json).map((node, index) => normalizeProcessNode(node, index));

  if (!nodes.length || nodes[0]?.node_type !== 'submit') {
    nodes.unshift({
      id: 'submit',
      node_type: 'submit',
      node_name: '提交',
      field_permissions: {}
    } as LarkProcessNode);
  }

  const endIndex = nodes.findIndex(node => node.node_type === 'end');

  if (endIndex < 0) {
    nodes.push({
      id: 'end',
      node_type: 'end',
      node_name: '結束',
      field_permissions: {}
    } as LarkProcessNode);
  } else if (endIndex !== nodes.length - 1) {
    const [endNode] = nodes.splice(endIndex, 1);
    nodes.push(endNode);
  }

  return nodes;
});

const submitNode = computed(() =>
  visibleProcessNodes.value.find(node => node.node_type === 'submit') || null
);

const submitterSelectNode = computed(() =>
  visibleProcessNodes.value.find(node => node.node_type === 'approval' && node.approver_type === 'submitter_select') || null
);

const submitterSelectNodes = computed(() =>
  visibleProcessNodes.value.filter(node => node.node_type === 'approval' && node.approver_type === 'submitter_select')
);

const visibleFields = computed(() =>
  allFields.value.filter(field => fieldPermission(submitNode.value, field) !== 'hidden')
);

function fieldPermission(node: LarkProcessNode | null, field: LarkFormField): FieldPermissionMode {
  const mode = node?.field_permissions?.[field.field_key];

  if (mode === 'hidden' || mode === 'readonly' || mode === 'editable') return mode;

  return 'editable';
}

function fieldEditable(field: LarkFormField) {
  return fieldPermission(submitNode.value, field) === 'editable';
}


function processNodeKey(node: LarkProcessNode, index = 0) {
  return String(
    node.id ||
    (node as any).node_id ||
    (node as any).nodeId ||
    node.node_name ||
    `node_${index}`
  );
}

function submitterNodeSelection(node: LarkProcessNode) {
  const key = processNodeKey(node);

  if (!Array.isArray(selectedApproversByNode[key])) {
    selectedApproversByNode[key] = [];
  }

  return selectedApproversByNode[key];
}

function submitterNodeTitle(node: LarkProcessNode, index = 0) {
  return node.node_name || `提交人自選審批人 ${index + 1}`;
}

function variableLabel(value?: string) {
  const key = String(value || '');

  if (key === 'applicant_manager') return '申請人直屬上級';
  if (key === 'applicant_department_manager') return '申請人部門負責人';
  if (key === 'applicant_self') return '申請人本人';

  return '未設定變數';
}

function approvalGroupNameById(id: number) {
  const group = approvalGroups.value.find(item => Number(item.id) === Number(id));

  return group?.name || `審批組 #${id}`;
}

function idsToApprovalGroupNames(ids: any[] = []) {
  return safeArray(ids)
    .map(id => Number(id))
    .filter(Boolean)
    .map(approvalGroupNameById)
    .filter(Boolean);
}

function selectedApproverPayloadByNode() {
  const payload: Record<string, number[]> = {};

  submitterSelectNodes.value.forEach((node, index) => {
    const key = processNodeKey(node, index);
    const ids = submitterNodeSelection(node)
      .map(Number)
      .filter(Boolean);

    payload[key] = [...new Set(ids)];
  });

  return payload;
}

function selectedApproverIdsFlat() {
  return [
    ...new Set(
      Object.values(selectedApproverPayloadByNode())
        .flat()
        .map(Number)
        .filter(Boolean)
    )
  ];
}


function processNodeTitle(node: LarkProcessNode) {
  if (node.node_type === 'submit') return '提交';
  if (node.node_type === 'approval') return '審批';
  if (node.node_type === 'processing') return '處理';
  if (node.node_type === 'cc') return '抄送';
  if (node.node_type === 'end') return '結束';

  return node.node_name || '節點';
}

function getEmployeeAdName(emp?: AirwayEmployee | null) {
  if (!emp) return '';

  const englishName = String(
    (emp as any).english_name ||
    (emp as any).englishName ||
    (emp as any).en_name ||
    (emp as any).enName ||
    ''
  ).trim();

  if (englishName) return englishName;

  const adName = String(
    (emp as any).ad_display_name ||
    (emp as any).display_name ||
    (emp as any).displayName ||
    (emp as any).ad_name ||
    (emp as any).adName ||
    (emp as any).sam_account_name ||
    (emp as any).samAccountName ||
    ''
  ).trim();

  if (adName) return adName;

  const email = String(
    emp.company_email ||
    (emp as any).email ||
    (emp as any).mail ||
    ''
  ).trim();

  if (email) return email.split('@')[0];

  return String(
    emp.chinese_name ||
    (emp as any).name ||
    emp.employee_no ||
    ''
  ).trim();
}

function employeeNameById(id: number) {
  const emp = employees.value.find(item => Number(item.id) === Number(id));

  return getEmployeeAdName(emp) || `#${id}`;
}

function idsToEmployeeNames(ids: any[] = []) {
  return safeArray(ids)
    .map(id => Number(id))
    .filter(Boolean)
    .map(employeeNameById)
    .filter(Boolean);
}

function processNodeDesc(node: LarkProcessNode) {
  if (node.node_type === 'submit') return '由目前登入者送出申請';
  if (node.node_type === 'end') return '流程完成';

  if (node.node_type === 'approval') {
    if (node.approver_type === 'submitter_select') {
      const selected = submitterNodeSelection(node);

      return selected.length
        ? `審批人：${selected.map(employeeNameById).join('、')}`
        : '審批人：提交人自選';
    }

    if (node.approver_type === 'self') return '審批人：提交人本人';
    if (node.approver_type === 'approval_group') {
      const names = idsToApprovalGroupNames((node as any).approval_group_ids || (node as any).approver_group_ids || (node as any).group_ids || []);
      return names.length ? `審批組：${names.join('、')}` : '審批組尚未設定';
    }
    if (node.approver_type === 'variable') return `審批人：${variableLabel((node as any).approver_variable)}`;
    if (node.approver_type === 'role') return `審批角色：${node.role_code || '未設定'}`;

    const names = idsToEmployeeNames(node.approver_ids || []);

    return names.length ? `審批人：${names.join('、')}` : '審批人尚未設定';
  }

  if (node.node_type === 'processing') {
    if (node.processor_type === 'self') return '處理人：提交人本人';
    if (node.processor_type === 'approval_group') {
      const names = idsToApprovalGroupNames((node as any).processor_group_ids || []);
      return names.length ? `處理組：${names.join('、')}` : '處理組尚未設定';
    }
    if (node.processor_type === 'variable') return `處理人：${variableLabel((node as any).processor_variable)}`;
    if (node.processor_type === 'role') return `處理角色：${node.role_code || '未設定'}`;

    const names = idsToEmployeeNames(node.processor_ids || []);

    return names.length ? `處理人：${names.join('、')}` : '處理人尚未設定';
  }

  if (node.node_type === 'cc') {
    const names = idsToEmployeeNames(node.cc_ids || []);

    return names.length ? `抄送：${names.join('、')}` : '抄送通知';
  }

  return '';
}

function editableFieldsForNode(node: LarkProcessNode) {
  const permissions = node.field_permissions || {};

  if (node.node_type === 'submit') {
    return allFields.value
      .filter(field => (permissions[field.field_key] || 'editable') === 'editable')
      .map(field => field.field_label);
  }

  return allFields.value
    .filter(field => permissions[field.field_key] === 'editable')
    .map(field => field.field_label);
}

function processNodeClass(node: LarkProcessNode) {
  return {
    submit: node.node_type === 'submit',
    approval: node.node_type === 'approval',
    processing: node.node_type === 'processing',
    cc: node.node_type === 'cc',
    end: node.node_type === 'end'
  };
}

function parseOptions(field: any) {
  const raw = Array.isArray(field?.options)
    ? field.options
    : (() => {
        try {
          const parsed = field?.options_json ? JSON.parse(field.options_json) : [];

          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  return raw.map((item: any, index: number) => {
    if (typeof item === 'string') return { label: item, value: item };

    const label = String(item?.label || item?.name || item?.value || `選項 ${index + 1}`);

    return {
      label,
      value: String(item?.value || label)
    };
  });
}

function getDefaultValue(field: LarkFormField) {
  if (field.default_value !== undefined && field.default_value !== null && field.default_value !== '') {
    if (field.field_type === 'multi_select') {
      return Array.isArray(field.default_value) ? [...field.default_value] : [String(field.default_value)];
    }

    if (field.field_type === 'checkbox') {
      return Array.isArray(field.default_value) ? [...field.default_value] : Boolean(field.default_value);
    }

    return field.default_value;
  }

  if (field.field_type === 'multi_select') return [];
  if (field.field_type === 'checkbox') return false;
  if (field.field_type === 'detail_table' || field.field_type === 'table') return [{}];
  if (field.field_type === 'date_range') return null;

  return null;
}

function initDefaultValues(fields: LarkFormField[] = []) {
  fields.forEach(field => {
    if (!field?.field_key) return;
    if (formData[field.field_key] !== undefined) return;

    formData[field.field_key] = getDefaultValue(field);
  });
}

function addDetailRow(field: LarkFormField) {
  if (!Array.isArray(formData[field.field_key])) formData[field.field_key] = [];
  formData[field.field_key].push({});
}

function removeDetailRow(field: LarkFormField, index: number) {
  const rows = formData[field.field_key];

  if (Array.isArray(rows) && rows.length > 1) rows.splice(index, 1);
}


function collectProcessEmployeeIds(sourceTemplate: LarkTemplate | null = template.value) {
  const ids = new Set<number>();

  safeArray<any>(sourceTemplate?.process_json).forEach(node => {
    [
      ...(safeArray(node?.approver_ids)),
      ...(safeArray(node?.processor_ids)),
      ...(safeArray(node?.cc_ids))
    ].forEach(id => {
      const value = Number(id);
      if (Number.isInteger(value) && value > 0) ids.add(value);
    });
  });

  return Array.from(ids);
}


async function loadDepartments() {
  try {
    const response = await fetch('/api/departments', {
      credentials: 'include'
    });

    const data = await response.json();

    if (Array.isArray(data)) {
      departments.value = data;
    } else if (Array.isArray(data.departments)) {
      departments.value = data.departments;
    } else if (Array.isArray(data.data)) {
      departments.value = data.data;
    } else {
      departments.value = [];
    }
  } catch (error) {
    console.warn('load departments failed', error);
    departments.value = [];
  }
}

async function loadEmployees(_ids: number[] = []) {
  try {
    // 發起申請頁需要完整員工清單，提交人自選與 employee 欄位都要用
    employees.value = await fetchEmployeeLookup({ limit: 3000, includeInactive: true, includeDeleted: true });
  } catch (error) {
    console.warn('load employees lookup failed', error);
    employees.value = [];
  }
}

async function loadApprovalGroups() {
  try {
    const data = await fetchApprovalUserGroups();
    approvalGroups.value = data.groups || [];
  } catch (error) {
    console.warn('load approval groups failed', error);
    approvalGroups.value = [];
  }
}

async function loadTemplate() {
  loading.value = true;

  try {
    const data = await fetchLarkTemplate(templateId.value);
    template.value = data.template || null;
    initDefaultValues(allFields.value);
    await loadEmployees(collectProcessEmployeeIds(template.value));
  } catch (error: any) {
    message.error(error?.message || '讀取表單失敗');
    template.value = null;
  } finally {
    loading.value = false;
  }
}

function validateRequired() {
  const missing = visibleFields.value
    .filter(field => fieldEditable(field))
    .filter(field => Number(field.required) && field.field_type !== 'description')
    .filter(field => {
      const value = formData[field.field_key];

      if (Array.isArray(value)) return value.length === 0;
      return value === undefined || value === null || String(value).trim() === '';
    })
    .map(field => field.field_label);

  if (missing.length) {
    message.error(`必填欄位未填：${missing.join('、')}`);
    return false;
  }

  const missingSubmitterNodes = submitterSelectNodes.value.filter(node => !submitterNodeSelection(node).length);

  if (missingSubmitterNodes.length) {
    message.error(`請選擇審批人：${missingSubmitterNodes.map(node => node.node_name || '提交人自選節點').join('、')}`);
    return false;
  }

  return true;
}

async function submit() {
  if (!template.value || !validateRequired()) return;

  submitting.value = true;

  try {
    const selectedByNode = selectedApproverPayloadByNode();

    const data = await submitLarkApproval(template.value.id!, {
      form_data: { ...formData },
      approver_ids: selectedApproverIdsFlat(),
      selected_approvers_by_node: selectedByNode,
      selectedApproversByNode: selectedByNode
    });

    message.success(data.message || '申請已送出');
    router.push(`/airway/forms/center?id=${data.id}`);
  } catch (error: any) {
    message.error(error?.message || '送出失敗');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadDepartments();
  loadApprovalGroups();
  loadTemplate();
});
</script>

<template>
  <div class="fill-page">
    <div class="fill-topbar">
      <NButton text @click="router.push('/airway/forms')">‹ 返回發起申請</NButton>
      <div class="fill-title">{{ template?.form_name || '填寫申請' }}</div>
      <div class="fill-actions">
        <NButton quaternary @click="loadTemplate">重新整理</NButton>
        <NButton type="primary" :loading="submitting" @click="submit">提交</NButton>
      </div>
    </div>

    <NSpin :show="loading">
      <div v-if="template" class="form-wrap">
        <h1>{{ template.form_name }}</h1>
        <p v-if="template.description" class="form-desc">{{ template.description }}</p>

        <NCard class="form-card">
          <template #header>申請詳細資料</template>

          <NAlert
            v-if="visibleFields.length !== allFields.length"
            type="info"
            :bordered="false"
            class="mb-16"
          >
            此申請頁已套用「提交節點欄位權限」，隱藏欄位會由後續節點補填。
          </NAlert>

          <div class="field-stack">
            <div
              v-for="field in visibleFields"
              :key="field.field_key"
              class="field-block"
            >
              <div v-if="field.field_type === 'description'" class="description-block">
                {{ field.default_value || field.placeholder || field.field_label }}
              </div>

              <NFormItem
                v-else-if="['text', 'email', 'contact', 'address', 'phone', 'serial_no'].includes(field.field_type)"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NInput
                  v-model:value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  :placeholder="field.placeholder || '請輸入'"
                />
              </NFormItem>

              <NFormItem
                v-else-if="field.field_type === 'textarea'"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NInput
                  v-model:value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  type="textarea"
                  :autosize="{ minRows: 4 }"
                  :placeholder="field.placeholder || '請輸入'"
                />
              </NFormItem>

              <NFormItem
                v-else-if="field.field_type === 'number' || field.field_type === 'amount'"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NInputNumber
                  v-model:value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  :placeholder="field.placeholder || '請輸入'"
                  class="w-full"
                />
              </NFormItem>

              <NFormItem
                v-else-if="field.field_type === 'select'"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NSelect
                  v-model:value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  :options="parseOptions(field)"
                  :placeholder="field.placeholder || '請選擇'"
                />
              </NFormItem>

              <NFormItem
                v-else-if="field.field_type === 'multi_select'"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NSelect
                  v-model:value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  multiple
                  :options="parseOptions(field)"
                  :placeholder="field.placeholder || '請選擇'"
                />
              </NFormItem>

              <NFormItem
                v-else-if="field.field_type === 'radio'"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NRadioGroup v-model:value="formData[field.field_key]" :disabled="!fieldEditable(field)">
                  <NSpace>
                    <NRadio
                      v-for="option in parseOptions(field)"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </NRadio>
                  </NSpace>
                </NRadioGroup>
              </NFormItem>

              <NFormItem
                v-else-if="field.field_type === 'checkbox'"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NCheckbox
                  v-model:checked="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                >
                  {{ parseOptions(field)[0]?.label || '需要' }}
                </NCheckbox>
              </NFormItem>

              <NFormItem
                v-else-if="field.field_type === 'date' || field.field_type === 'date_range'"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NDatePicker
                  v-if="field.field_type === 'date'"
                  v-model:formatted-value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  value-format="yyyy-MM-dd"
                  type="date"
                  class="w-full"
                />
                <NDatePicker
                  v-else
                  v-model:formatted-value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  value-format="yyyy-MM-dd"
                  type="daterange"
                  class="w-full"
                />
              </NFormItem>

              <NFormItem
                v-else-if="field.field_type === 'employee'"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NSelect
                  v-model:value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  :options="employeeOptions"
                  filterable
                  clearable
                  :placeholder="field.placeholder || '搜尋人員'"
                />
              </NFormItem>

              <NFormItem
                v-else-if="field.field_type === 'department'"
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NSelect
                  v-model:value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  :options="departmentOptions"
                  filterable
                  clearable
                  :placeholder="field.placeholder || '請選擇部門'"
                />
              </NFormItem>

              <div v-else-if="field.field_type === 'detail_table' || field.field_type === 'table'" class="detail-block">
                <div class="detail-head">
                  <strong>{{ field.field_label }}</strong>
                  <NButton
                    v-if="fieldEditable(field)"
                    size="small"
                    type="primary"
                    secondary
                    @click="addDetailRow(field)"
                  >
                    新增明細
                  </NButton>
                </div>

                <div
                  v-for="(row, rowIndex) in formData[field.field_key]"
                  :key="rowIndex"
                  class="detail-row"
                >
                  <div class="detail-row-head">
                    <span>明細 {{ Number(rowIndex) + 1 }}</span>
                    <NButton
                      v-if="fieldEditable(field)"
                      text
                      type="error"
                      :disabled="formData[field.field_key].length <= 1"
                      @click="removeDetailRow(field, Number(rowIndex))"
                    >
                      刪除
                    </NButton>
                  </div>

                  <div class="detail-grid">
                    <NFormItem
                      v-for="child in field.children || []"
                      :key="child.field_key"
                      :label="child.field_label"
                      :required="!!child.required && fieldEditable(field)"
                    >
                      <NInput
                        v-if="['text', 'textarea', 'email', 'phone'].includes(child.field_type)"
                        v-model:value="row[child.field_key]"
                        :disabled="!fieldEditable(field)"
                      />
                      <NInputNumber
                        v-else-if="child.field_type === 'number' || child.field_type === 'amount'"
                        v-model:value="row[child.field_key]"
                        :disabled="!fieldEditable(field)"
                        class="w-full"
                      />
                      <NDatePicker
                        v-else-if="child.field_type === 'date'"
                        v-model:formatted-value="row[child.field_key]"
                        :disabled="!fieldEditable(field)"
                        value-format="yyyy-MM-dd"
                        type="date"
                        class="w-full"
                      />
                      <NSelect
                        v-else-if="child.field_type === 'select'"
                        v-model:value="row[child.field_key]"
                        :disabled="!fieldEditable(field)"
                        :options="parseOptions(child)"
                      />
                      <NInput
                        v-else
                        v-model:value="row[child.field_key]"
                        :disabled="!fieldEditable(field)"
                      />
                    </NFormItem>
                  </div>
                </div>
              </div>

              <NFormItem
                v-else
                :label="field.field_label"
                :required="!!field.required && fieldEditable(field)"
              >
                <NInput
                  v-model:value="formData[field.field_key]"
                  :disabled="!fieldEditable(field)"
                  :placeholder="field.placeholder || '請輸入'"
                />
              </NFormItem>
            </div>
          </div>
        </NCard>

        <NCard class="form-card mt-16 process-card">
          <template #header>流程預覽</template>

          <div class="process-timeline">
            <div
              v-for="(node, index) in visibleProcessNodes"
              :key="node.id || index"
              class="process-node"
              :class="processNodeClass(node)"
            >
              <div class="node-index">{{ index + 1 }}</div>

              <div class="node-content">
                <strong>{{ node.node_name || processNodeTitle(node) }}</strong>
                <p>{{ processNodeDesc(node) }}</p>

                <div v-if="editableFieldsForNode(node).length" class="editable-hint">
                  此節點可填：{{ editableFieldsForNode(node).join('、') }}
                </div>
              </div>
            </div>
          </div>
        </NCard>

        <NCard v-if="submitterSelectNodes.length" class="form-card mt-16">
          <template #header>選擇審批人</template>
          <NAlert type="info" :bordered="false">
            此流程含有「提交人自選審批人」節點，送出前必須逐一選擇。
          </NAlert>

          <div
            v-for="(node, index) in submitterSelectNodes"
            :key="processNodeKey(node, index)"
            class="submitter-select-block"
          >
            <div class="submitter-select-title">
              {{ submitterNodeTitle(node, index) }}
            </div>

            <NSelect
              :value="submitterNodeSelection(node)"
              class="mt-12"
              multiple
              filterable
              clearable
              :options="employeeOptions"
              placeholder="搜尋姓名 / 部門 / 信箱，選擇審批人"
              @update:value="value => { selectedApproversByNode[processNodeKey(node, index)] = (value as number[]).map(Number).filter(Boolean); }"
            />
          </div>
        </NCard>
      </div>

      <div v-else class="form-wrap">
        <NEmpty description="讀取表單中或找不到表單" />
      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.fill-page { min-height: calc(100vh - 64px); background: #f5f7fb; }
.fill-topbar { height: 54px; background: #fff; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; padding: 0 22px; gap: 16px; position: sticky; top: 0; z-index: 3; }
.fill-title { flex: 1; text-align: center; font-size: 16px; font-weight: 800; }
.fill-actions { display: flex; gap: 10px; }
.form-wrap { width: min(980px, calc(100% - 48px)); margin: 0 auto; padding: 24px 0 60px; }
h1 { font-size: 22px; margin: 0 0 8px; }
.form-desc { margin: 0 0 18px; color: #667085; }
.form-card { border-radius: 10px; }
.field-stack { display: flex; flex-direction: column; gap: 22px; }
.field-block { min-width: 0; }
.description-block { padding: 12px 14px; background: #f6f7fb; border-radius: 8px; color: #667085; line-height: 1.6; }
.detail-block { margin-top: 8px; }
.detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.detail-row { background: #f7f8fb; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.detail-row-head { display: flex; justify-content: space-between; align-items: center; color: #667085; margin-bottom: 8px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 12px 16px; }
.w-full { width: 100%; }
.mt-12 { margin-top: 12px; }
.mt-16 { margin-top: 16px; }
.mb-16 { margin-bottom: 16px; }
.process-timeline { display: flex; flex-direction: column; gap: 12px; }
.process-node { display: grid; grid-template-columns: 34px 1fr; gap: 12px; align-items: flex-start; }
.node-index { width: 28px; height: 28px; border-radius: 999px; background: #eef2ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 900; }
.node-content { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; background: #fff; }
.node-content strong { font-size: 14px; }
.node-content p { margin: 6px 0 0; color: #667085; }
.process-node.approval .node-content { border-color: #fed7aa; background: #fff7ed; }
.process-node.processing .node-content { border-color: #bfdbfe; background: #eff6ff; }
.process-node.cc .node-content { border-color: #bbf7d0; background: #f0fdf4; }
.process-node.submit .node-content,
.process-node.end .node-content { background: #f8fafc; }
.editable-hint { margin-top: 8px; padding: 6px 8px; border-radius: 8px; background: #eef6ff; color: #2563eb; font-size: 12px; }
.submitter-select-block { margin-top: 16px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc; }
.submitter-select-title { font-weight: 800; color: #111827; }
</style>
