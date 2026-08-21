<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  createApprovalTemplate,
  fetchApprovalTemplate,
  fetchApprovalTemplates,
  setApprovalTemplateStatus,
  updateApprovalTemplate,
  type ApprovalCategory,
  type ApprovalFieldSchema,
  type ApprovalProcessStep,
  type ApprovalTemplate
} from '@/service/api/airway/approvals';
import { fetchEmployeeLookup, type AirwayEmployee } from '@/service/api/airway/employees';

const message = useMessage();

const loading = ref(false);
const saving = ref(false);
const activeCategory = ref<ApprovalCategory>('HR');
const templates = ref<ApprovalTemplate[]>([]);
const employees = ref<AirwayEmployee[]>([]);
const selectedId = ref<number | null>(null);

const formModel = ref({
  template_code: '',
  template_name: '',
  category: 'HR' as ApprovalCategory,
  description: '',
  enabled: 1
});
const schema = ref<ApprovalFieldSchema[]>([]);
const process = ref<ApprovalProcessStep[]>([]);
const activeStep = ref<'basic' | 'schema' | 'process'>('basic');

const categoryOptions = [
  { label: 'HR 表單', value: 'HR' },
  { label: 'IT 表單', value: 'IT' },
  { label: '總務表單', value: 'GA' }
];
const fieldTypeOptions = [
  { label: '單行文字', value: 'text' },
  { label: '多行文字', value: 'textarea' },
  { label: '下拉選單', value: 'select' },
  { label: '日期', value: 'date' },
  { label: '數字', value: 'number' },
  { label: '附件', value: 'file' }
];
const roleOptions = [
  { label: '不指定角色', value: '' },
  { label: 'FORM_APPROVER', value: 'FORM_APPROVER' },
  { label: 'HR_FORM_ADMIN', value: 'HR_FORM_ADMIN' },
  { label: 'IT_FORM_ADMIN', value: 'IT_FORM_ADMIN' },
  { label: 'GA_FORM_ADMIN', value: 'GA_FORM_ADMIN' },
  { label: 'FORM_ADMIN', value: 'FORM_ADMIN' }
];

const employeeOptions = computed(() => employees.value.map(item => ({
  label: `${item.chinese_name || item.english_name || item.company_email || item.employee_no}（${[item.employee_no, item.company_email].filter(Boolean).join(' · ')}）`,
  value: item.id
})));
const filteredTemplates = computed(() => templates.value.filter(item => item.category === activeCategory.value));

function parseSchemaRows(rows: ApprovalFieldSchema[]) {
  return rows.map(item => ({
    ...item,
    optionsText: (item.options || []).map(option => option.label || option.value).join('\n')
  })) as any[];
}

function normalizeSchemaRows() {
  return (schema.value as any[]).map((item, index) => ({
    key: String(item.key || `field_${index + 1}`).trim(),
    label: String(item.label || `欄位 ${index + 1}`).trim(),
    type: item.type || 'text',
    required: Boolean(item.required),
    placeholder: String(item.placeholder || ''),
    options: item.type === 'select'
      ? String(item.optionsText || '')
          .split(/\r?\n|,/)
          .map(row => row.trim())
          .filter(Boolean)
          .map(row => ({ label: row, value: row }))
      : []
  }));
}

function resetNew() {
  selectedId.value = null;
  activeStep.value = 'basic';
  formModel.value = {
    template_code: '',
    template_name: '',
    category: activeCategory.value,
    description: '',
    enabled: 1
  };
  schema.value = [
    { key: 'subject', label: '申請主旨', type: 'text', required: true, placeholder: '請輸入申請主旨', options: [] },
    { key: 'reason', label: '申請原因', type: 'textarea', required: true, placeholder: '請輸入申請原因', options: [] }
  ];
  process.value = [{ step_name: '主管審批', approver_id: null, role_code: 'FORM_APPROVER' }];
}

async function loadTemplates() {
  loading.value = true;
  try {
    templates.value = await fetchApprovalTemplates({ includeDisabled: true, management: true });
  } catch (err: any) {
    message.error(err?.message || '讀取表單模板失敗');
  } finally {
    loading.value = false;
  }
}

async function loadEmployees() {
  try { employees.value = await fetchEmployeeLookup({ limit: 1000 }); } catch { employees.value = []; }
}

async function editTemplate(row: ApprovalTemplate) {
  loading.value = true;
  try {
    const detail = await fetchApprovalTemplate(row.id, true);
    selectedId.value = detail.id;
    activeStep.value = 'basic';
    formModel.value = {
      template_code: detail.template_code,
      template_name: detail.template_name,
      category: detail.category,
      description: detail.description || '',
      enabled: Number(detail.enabled) === 0 ? 0 : 1
    };
    schema.value = parseSchemaRows(detail.schema || []);
    process.value = (detail.process || []).map(item => ({
      step_name: item.step_name,
      approver_id: item.approver_id || null,
      role_code: item.role_code || null
    }));
  } catch (err: any) {
    message.error(err?.message || '讀取模板失敗');
  } finally {
    loading.value = false;
  }
}

function addField() {
  schema.value.push({
    key: `field_${Date.now().toString().slice(-6)}`,
    label: '新欄位',
    type: 'text',
    required: false,
    placeholder: '',
    options: []
  } as any);
}

function removeField(index: number) {
  schema.value.splice(index, 1);
}

function addStep() {
  process.value.push({ step_name: `第 ${process.value.length + 1} 關`, approver_id: null, role_code: 'FORM_APPROVER' });
}

function removeStep(index: number) {
  process.value.splice(index, 1);
}

async function saveTemplate() {
  if (!formModel.value.template_code || !formModel.value.template_name) {
    message.error('表單代碼與名稱必填');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...formModel.value,
      schema: normalizeSchemaRows(),
      process: process.value.map(item => ({
        step_name: item.step_name,
        approver_id: item.approver_id || null,
        role_code: item.approver_id ? null : item.role_code || null
      }))
    };
    if (selectedId.value) {
      await updateApprovalTemplate(selectedId.value, payload);
      message.success('表單模板已更新');
    } else {
      const result = await createApprovalTemplate(payload);
      selectedId.value = result.id;
      message.success('表單模板已建立');
    }
    await loadTemplates();
  } catch (err: any) {
    message.error(err?.message || '儲存失敗');
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: ApprovalTemplate) {
  try {
    await setApprovalTemplateStatus(row.id, Number(row.enabled) === 1 ? 0 : 1);
    message.success(Number(row.enabled) === 1 ? '已停用' : '已啟用');
    await loadTemplates();
  } catch (err: any) {
    message.error(err?.message || '更新狀態失敗');
  }
}

onMounted(async () => {
  await Promise.all([loadTemplates(), loadEmployees()]);
  resetNew();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <div class="page-head">
        <div>
          <h2 class="title">表單編輯</h2>
          <div class="sub">MVP 使用 schema_json 與 process_json；依 IT / HR / GA 權限管理模板。</div>
        </div>
        <NSpace>
          <NButton @click="loadTemplates">重新整理</NButton>
          <NButton type="primary" secondary @click="resetNew">新增模板</NButton>
          <NButton type="primary" :loading="saving" @click="saveTemplate">儲存模板</NButton>
        </NSpace>
      </div>
    </NCard>

    <NGrid :cols="12" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi :span="4">
        <NCard title="模板清單">
          <NTabs v-model:value="activeCategory" type="line">
            <NTabPane name="HR" tab="HR" />
            <NTabPane name="IT" tab="IT" />
            <NTabPane name="GA" tab="GA" />
          </NTabs>
          <NSpin :show="loading">
            <NEmpty v-if="!filteredTemplates.length" description="目前沒有可管理模板" />
            <div v-else class="list">
              <div v-for="row in filteredTemplates" :key="row.id" class="list-card" :class="{ active: row.id === selectedId }">
                <div @click="editTemplate(row)">
                  <div class="list-title">{{ row.template_name }} <NTag size="small">{{ row.template_code }}</NTag></div>
                  <div class="sub">{{ row.description || '尚未填寫說明' }}</div>
                  <div class="sub">欄位 {{ row.schema?.length || 0 }} · 流程 {{ row.process?.length || 0 }} 關</div>
                </div>
                <NButton size="small" secondary :type="Number(row.enabled) === 1 ? 'warning' : 'primary'" @click="toggleStatus(row)">
                  {{ Number(row.enabled) === 1 ? '停用' : '啟用' }}
                </NButton>
              </div>
            </div>
          </NSpin>
        </NCard>
      </NGi>

      <NGi :span="8">
        <NCard>
          <NTabs v-model:value="activeStep" type="line" animated>
            <NTabPane name="basic" tab="基本設定">
              <NForm label-placement="top">
                <NGrid :cols="2" :x-gap="12">
                  <NGi><NFormItem label="表單代碼"><NInput v-model:value="formModel.template_code" placeholder="例如 HR_ONBOARD" /></NFormItem></NGi>
                  <NGi><NFormItem label="分類"><NSelect v-model:value="formModel.category" :options="categoryOptions" /></NFormItem></NGi>
                </NGrid>
                <NFormItem label="表單名稱"><NInput v-model:value="formModel.template_name" placeholder="例如 新人到職" /></NFormItem>
                <NFormItem label="表單說明"><NInput v-model:value="formModel.description" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" /></NFormItem>
                <NFormItem label="啟用狀態"><NSwitch :value="Boolean(formModel.enabled)" @update:value="v => formModel.enabled = v ? 1 : 0" /></NFormItem>
              </NForm>
            </NTabPane>

            <NTabPane name="schema" tab="欄位 schema_json">
              <NAlert type="info" class="mb-16px">支援 text、textarea、select、date、number、file。下拉選單一行一個選項。</NAlert>
              <div class="field-row" v-for="(field, index) in schema" :key="index">
                <NGrid :cols="12" :x-gap="8" :y-gap="8" responsive="screen">
                  <NGi :span="3"><NInput v-model:value="field.key" placeholder="key" /></NGi>
                  <NGi :span="3"><NInput v-model:value="field.label" placeholder="欄位名稱" /></NGi>
                  <NGi :span="2"><NSelect v-model:value="field.type" :options="fieldTypeOptions" /></NGi>
                  <NGi :span="2"><NSwitch v-model:value="field.required"><template #checked>必填</template><template #unchecked>選填</template></NSwitch></NGi>
                  <NGi :span="2"><NButton block secondary type="error" @click="removeField(index)">移除</NButton></NGi>
                  <NGi :span="6"><NInput v-model:value="field.placeholder" placeholder="提示文字" /></NGi>
                  <NGi v-if="field.type === 'select'" :span="6"><NInput v-model:value="field.optionsText" type="textarea" placeholder="一行一個選項" :autosize="{ minRows: 2, maxRows: 6 }" /></NGi>
                </NGrid>
              </div>
              <NButton block secondary type="primary" @click="addField">新增欄位</NButton>
            </NTabPane>

            <NTabPane name="process" tab="流程 process_json">
              <NAlert type="info" class="mb-16px">MVP 先支援線性流程。每關可指定簽核人或 role_code，送出後會產生第一關 task。</NAlert>
              <div class="field-row" v-for="(step, index) in process" :key="index">
                <NGrid :cols="12" :x-gap="8" :y-gap="8" responsive="screen">
                  <NGi :span="3"><NInput v-model:value="step.step_name" placeholder="節點名稱" /></NGi>
                  <NGi :span="4"><NSelect v-model:value="step.approver_id" filterable clearable :options="employeeOptions" placeholder="指定簽核人" /></NGi>
                  <NGi :span="3"><NSelect v-model:value="step.role_code" clearable :disabled="Boolean(step.approver_id)" :options="roleOptions" placeholder="或 role_code" /></NGi>
                  <NGi :span="2"><NButton block secondary type="error" @click="removeStep(index)">移除</NButton></NGi>
                </NGrid>
              </div>
              <NButton block secondary type="primary" @click="addStep">新增流程節點</NButton>
            </NTabPane>
          </NTabs>
        </NCard>
      </NGi>
    </NGrid>
  </NSpace>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.title { margin: 0; font-size: 24px; font-weight: 800; }
.sub { color: #8a94a6; font-size: 13px; }
.list { display: grid; gap: 10px; margin-top: 12px; }
.list-card { display: flex; justify-content: space-between; gap: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 12px; cursor: pointer; }
.list-card.active { border-color: #6366f1; background: #eef2ff; }
.list-title { display: flex; align-items: center; gap: 8px; font-weight: 800; }
.field-row { padding: 12px; margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.mb-16px { margin-bottom: 16px; }
</style>
