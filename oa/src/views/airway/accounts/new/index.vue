<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';

import { createAccount } from '@/service/api/airway/accounts';
import { fetchEmployeeLookup, type AirwayEmployee } from '@/service/api/airway/employees';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const saving = ref(false);
const employees = ref<AirwayEmployee[]>([]);

const systemOptions = [
  { label: 'GWS', value: 'gws' },
  { label: 'AWS', value: 'aws' },
  { label: 'M365', value: 'm365' }
];

const statusOptions = [
  { label: '待建立', value: 'pending_create' },
  { label: '已啟用', value: 'active' },
  { label: '待停用', value: 'pending_disable' },
  { label: '已停用', value: 'disabled' },
  { label: '待刪除', value: 'pending_delete' },
  { label: 'API 失敗', value: 'api_failed' }
];

const form = reactive({
  system_name: String(route.query.system || 'gws'),
  employee_id: null as number | null,
  account_name: '',
  account_email: '',
  account_status: 'pending_create',
  role: '',
  permission_group: '',
  license_name: '',
  need_2fa: true,
  note: ''
});

const selectedEmployee = computed(() => employees.value.find(emp => Number(emp.id) === Number(form.employee_id)));

const employeeOptions = computed(() =>
  employees.value.map(emp => ({
    label: [
      emp.english_name || emp.chinese_name || emp.company_email || emp.employee_no || `#${emp.id}`,
      emp.department_name || emp.department_code || '',
      emp.company_email || ''
    ].filter(Boolean).join('｜'),
    value: Number(emp.id)
  }))
);

watch(() => form.employee_id, () => {
  const emp = selectedEmployee.value;
  if (!emp) return;

  if (!form.account_email && emp.company_email) form.account_email = emp.company_email;
  if (!form.account_name && emp.company_email) form.account_name = emp.company_email;
});

async function loadEmployees() {
  try {
    employees.value = await fetchEmployeeLookup({ limit: 1000, includeInactive: true, includeDeleted: true });
  } catch {
    employees.value = [];
  }
}

async function submit() {
  saving.value = true;

  try {
    const result: any = await createAccount({
      system_name: form.system_name,
      employee_id: form.employee_id,
      account_name: form.account_name || null,
      account_email: form.account_email || null,
      account_status: form.account_status,
      status: form.account_status,
      role: form.role || null,
      permission_group: form.permission_group || null,
      license_name: form.license_name || null,
      need_2fa: form.need_2fa,
      note: form.note || null
    });

    message.success('帳號已新增，API 已送出');

    if (result?.id) router.push(`/airway/accounts/detail/${result.id}`);
    else router.push(`/airway/accounts/${form.system_name}`);
  } catch (err: any) {
    message.error(err?.message || '新增帳號失敗');
  } finally {
    saving.value = false;
  }
}

onMounted(loadEmployees);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <template #header>
        <div class="header-row">
          <div>
            <h2>新增帳號</h2>
            <p>選擇員工後會自動帶入公司 Email；送出後由後端建立帳號紀錄並打 API webhook。</p>
          </div>
          <NButton @click="router.back()">返回</NButton>
        </div>
      </template>

      <NForm label-placement="top">
        <div class="form-grid">
          <NFormItem label="系統">
            <NSelect v-model:value="form.system_name" :options="systemOptions" />
          </NFormItem>

          <NFormItem label="員工">
            <NSelect
              v-model:value="form.employee_id"
              clearable
              filterable
              :options="employeeOptions"
              placeholder="搜尋員工"
            />
          </NFormItem>

          <NFormItem label="帳號名稱">
            <NInput v-model:value="form.account_name" placeholder="例如 user@example.com / aws-user" />
          </NFormItem>

          <NFormItem label="帳號 Email">
            <NInput v-model:value="form.account_email" placeholder="user@example.com" />
          </NFormItem>

          <NFormItem label="狀態">
            <NSelect v-model:value="form.account_status" :options="statusOptions" />
          </NFormItem>

          <NFormItem label="角色">
            <NInput v-model:value="form.role" placeholder="例如 Admin / User / Developer" />
          </NFormItem>

          <NFormItem label="權限群組">
            <NInput v-model:value="form.permission_group" placeholder="例如 IT / GA / RD / Finance" />
          </NFormItem>

          <NFormItem label="授權方案">
            <NInput v-model:value="form.license_name" placeholder="例如 Business Standard / E3 / IAM Group" />
          </NFormItem>

          <NFormItem label="MFA / 2FA">
            <NSwitch v-model:value="form.need_2fa" />
          </NFormItem>
        </div>

        <NFormItem label="備註">
          <NInput v-model:value="form.note" type="textarea" :autosize="{ minRows: 3 }" />
        </NFormItem>

        <NSpace justify="end" class="actions">
          <NButton @click="router.back()">取消</NButton>
          <NButton type="primary" :loading="saving" @click="submit">新增並打 API</NButton>
        </NSpace>
      </NForm>
    </NCard>
  </NSpace>
</template>

<style scoped>
.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

p {
  margin: 6px 0 0;
  color: #667085;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

.actions {
  margin-top: 16px;
}

@media (max-width: 960px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
