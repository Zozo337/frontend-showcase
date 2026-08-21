<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDialog, useMessage } from 'naive-ui';
import {
  fetchApprovalTemplate,
  submitApprovalTemplate,
  type ApprovalFieldSchema,
  type ApprovalTemplate
} from '@/service/api/airway/approvals';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const submitting = ref(false);
const template = ref<ApprovalTemplate | null>(null);
const formValues = ref<Record<string, any>>({});

const templateId = computed(() => String(route.params.id || ''));
const fields = computed(() => template.value?.schema || []);

function fieldOptions(field: ApprovalFieldSchema) {
  return (field.options || []).map(item => ({
    label: item.label || item.value,
    value: item.value || item.label
  }));
}

function placeholder(field: ApprovalFieldSchema) {
  if (field.placeholder) return field.placeholder;
  if (field.type === 'select') return '請選擇';
  if (field.type === 'file') return '請填附件檔名或連結';
  return '請輸入';
}

function initValues() {
  const values: Record<string, any> = {};
  for (const field of fields.value) {
    values[field.key] = field.type === 'number' ? null : '';
  }
  formValues.value = values;
}

function validate() {
  const missing = fields.value.filter(field => {
    if (!field.required) return false;
    const value = formValues.value[field.key];
    if (Array.isArray(value)) return value.length === 0;
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length) {
    message.error(`必填欄位未填：${missing.map(item => item.label).join('、')}`);
    return false;
  }

  return true;
}

async function loadTemplate() {
  loading.value = true;
  try {
    template.value = await fetchApprovalTemplate(templateId.value);
    initValues();
  } catch (err: any) {
    message.error(err?.message || '讀取表單失敗');
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!template.value || !validate()) return;
  submitting.value = true;
  try {
    const result = await submitApprovalTemplate(template.value.id, formValues.value);
    dialog.success({
      title: '申請已送出',
      content: '系統已建立審批單，並送到第一關待簽。',
      positiveText: '查看申請詳情',
      onPositiveClick: () => router.push(`/airway/approval/detail/${result.id}`)
    });
  } catch (err: any) {
    message.error(err?.message || '送出失敗');
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  router.push('/airway/approval/apply');
}

onMounted(loadTemplate);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <div class="page-head">
        <div>
          <h2 class="title">{{ template?.template_name || '填寫申請' }}</h2>
          <div class="sub">
            {{ template?.template_code }}
            <template v-if="template?.description"> · {{ template.description }}</template>
          </div>
        </div>
        <NSpace>
          <NButton @click="goBack">返回我要申請</NButton>
          <NButton type="primary" :loading="submitting" :disabled="!template" @click="submit">送出申請</NButton>
        </NSpace>
      </div>
    </NCard>

    <NSpin :show="loading">
      <NCard v-if="template" title="申請內容">
        <NAlert type="info" class="mb-16px">送出後會依照此表單的線性流程自動產生第一關待簽任務。</NAlert>

        <NForm label-placement="top">
          <NGrid :cols="2" :x-gap="20" :y-gap="4" responsive="screen">
            <NGi v-for="field in fields" :key="field.key" :span="field.type === 'textarea' ? 2 : 1">
              <NFormItem>
                <template #label>
                  <span class="label-row">
                    <span>{{ field.label }}</span>
                    <NTag v-if="field.required" size="small" type="warning">必填</NTag>
                  </span>
                </template>

                <NInput
                  v-if="['text', 'file'].includes(field.type)"
                  v-model:value="formValues[field.key]"
                  :placeholder="placeholder(field)"
                />

                <NInput
                  v-else-if="field.type === 'textarea'"
                  v-model:value="formValues[field.key]"
                  type="textarea"
                  :placeholder="placeholder(field)"
                  :autosize="{ minRows: 4, maxRows: 10 }"
                />

                <NSelect
                  v-else-if="field.type === 'select'"
                  v-model:value="formValues[field.key]"
                  clearable
                  :placeholder="placeholder(field)"
                  :options="fieldOptions(field)"
                />

                <NDatePicker
                  v-else-if="field.type === 'date'"
                  v-model:formatted-value="formValues[field.key]"
                  value-format="yyyy-MM-dd"
                  class="w-full"
                />

                <NInputNumber
                  v-else-if="field.type === 'number'"
                  v-model:value="formValues[field.key]"
                  class="w-full"
                  :placeholder="placeholder(field)"
                />
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>

        <div class="footer-actions">
          <NButton @click="goBack">取消</NButton>
          <NButton type="primary" :loading="submitting" @click="submit">送出申請</NButton>
        </div>
      </NCard>
      <NCard v-else><NEmpty description="找不到表單" /></NCard>
    </NSpin>
  </NSpace>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.title { margin: 0; font-size: 24px; font-weight: 800; }
.sub { margin-top: 6px; color: #8a94a6; }
.label-row { display: inline-flex; gap: 8px; align-items: center; }
.footer-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.mb-16px { margin-bottom: 16px; }
.w-full { width: 100%; }
</style>
