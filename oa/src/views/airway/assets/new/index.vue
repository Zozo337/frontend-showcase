<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';

import { createAsset } from '@/service/api/airway/assets';
import { fetchEmployeeLookup, type AirwayEmployee } from '@/service/api/airway/employees';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const saving = ref(false);
const employees = ref<AirwayEmployee[]>([]);

const categoryOptions = [
  { label: '筆電', value: 'laptop' },
  { label: '螢幕', value: 'monitor' },
  { label: '其他辦公設備 / 電子設備', value: 'office_equipment_electronic' },
  { label: '其他辦公設備 / 非電子設備', value: 'office_equipment_nonelectronic' },
  { label: '機器設備', value: 'machine_equipment' }
];

const statusOptions = [
  { label: '庫存', value: 'in_stock' },
  { label: '待配發', value: 'pending_assign' },
  { label: '已配發', value: 'assigned' },
  { label: '已歸還', value: 'returned' },
  { label: '維修中', value: 'repair' },
  { label: '報廢', value: 'retired' }
];

const form = reactive({
  asset_category: String(route.query.category || 'laptop'),
  asset_no: '',
  name: '',
  brand: '',
  model: '',
  serial_no: '',
  status: 'in_stock',
  employee_id: null as number | null,
  location: '',
  purchase_date: '',
  warranty_expire_date: '',
  assigned_at: '',
  note: ''
});

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

const qrPreview = computed(() => {
  const code = form.asset_no || '系統自動產生';

  return `${window.location.origin}/airway/assets/detail/${encodeURIComponent(code)}`;
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
    const result: any = await createAsset({
      asset_category: form.asset_category,
      asset_type: form.asset_category,
      asset_no: form.asset_no || null,
      name: form.name,
      brand: form.brand,
      model: form.model,
      serial_no: form.serial_no,
      status: form.status,
      employee_id: form.employee_id,
      location: form.location,
      purchase_date: form.purchase_date || null,
      warranty_expire_date: form.warranty_expire_date || null,
      assigned_at: form.assigned_at || null,
      note: form.note
    });

    message.success('資產已新增，QR 文本已產生，資料已寫入');
    const assetNo = result?.asset?.asset_no || result?.asset_no || form.asset_no;

    if (assetNo) router.push(`/airway/assets/detail/${encodeURIComponent(assetNo)}`);
    else router.push('/airway/assets');
  } catch (err: any) {
    message.error(err?.message || '新增資產失敗');
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
            <h2>新增資產</h2>
            <p>新增實體資產時會自動產生 QR 文本，並由後端送出資產 API webhook。</p>
          </div>
          <NButton @click="router.back()">返回</NButton>
        </div>
      </template>

      <NForm label-placement="top">
        <div class="form-grid">
          <NFormItem label="資產分類">
            <NSelect v-model:value="form.asset_category" :options="categoryOptions" />
          </NFormItem>

          <NFormItem label="資產編號">
            <NInput v-model:value="form.asset_no" placeholder="可留空，系統會自動產生" />
          </NFormItem>

          <NFormItem label="資產名稱">
            <NInput v-model:value="form.name" placeholder="例如 ThinkPad X1 / Dell U2720Q" />
          </NFormItem>

          <NFormItem label="狀態">
            <NSelect v-model:value="form.status" :options="statusOptions" />
          </NFormItem>

          <NFormItem label="品牌">
            <NInput v-model:value="form.brand" placeholder="例如 Lenovo / Dell / Apple" />
          </NFormItem>

          <NFormItem label="型號">
            <NInput v-model:value="form.model" placeholder="型號" />
          </NFormItem>

          <NFormItem label="序號">
            <NInput v-model:value="form.serial_no" placeholder="Serial Number" />
          </NFormItem>

          <NFormItem label="保管人 / 使用人">
            <NSelect
              v-model:value="form.employee_id"
              clearable
              filterable
              :options="employeeOptions"
              placeholder="搜尋員工"
            />
          </NFormItem>

          <NFormItem label="位置">
            <NInput v-model:value="form.location" placeholder="例如 內湖辦公室 / 倉庫" />
          </NFormItem>

          <NFormItem label="購入日期">
            <input v-model="form.purchase_date" type="date" class="date-input" />
          </NFormItem>

          <NFormItem label="保固到期">
            <input v-model="form.warranty_expire_date" type="date" class="date-input" />
          </NFormItem>

          <NFormItem label="配發日期">
            <input v-model="form.assigned_at" type="date" class="date-input" />
          </NFormItem>
        </div>

        <NFormItem label="備註">
          <NInput v-model:value="form.note" type="textarea" :autosize="{ minRows: 3 }" />
        </NFormItem>

        <NAlert type="info" :bordered="false">
          QR 文本預覽：{{ qrPreview }}
        </NAlert>

        <NSpace justify="end" class="actions">
          <NButton @click="router.back()">取消</NButton>
          <NButton type="primary" :loading="saving" @click="submit">新增</NButton>
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

.date-input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  box-sizing: border-box;
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
