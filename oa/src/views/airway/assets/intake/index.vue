<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';

import { createAsset } from '@/service/api/airway/assets';
import { fetchEmployeeLookup, type AirwayEmployee } from '@/service/api/airway/employees';

const router = useRouter();
const message = useMessage();

const saving = ref(false);
const employees = ref<AirwayEmployee[]>([]);

const modeOptions = [
  { label: '辦公室資訊設備', value: 'office' },
  { label: '機器設備', value: 'machine' }
];

const purchaseSourceOptions = [
  { label: '公司購入', value: 'company' },
  { label: '非公司購入', value: 'non_company' }
];

const officeStatusOptions = [
  { label: '使用中', value: '使用中' },
  { label: '暫停使用', value: '暫停使用' },
  { label: '待配發', value: '待配發' },
  { label: '維修中', value: '維修中' },
  { label: '報廢', value: '報廢' }
];

const conditionOptions = [
  { label: '正常', value: '正常' },
  { label: '異常', value: '異常' },
  { label: '維修中', value: '維修中' },
  { label: '待確認', value: '待確認' }
];

const sourceCategoryOptions = [
  { label: '電腦通訊設備', value: '電腦通訊設備' },
  { label: '辦公設備', value: '辦公設備' },
  { label: '機器設備', value: '機器設備' },
  { label: '租賃資產', value: '租賃資產' },
  { label: '其他設備', value: '其他設備' }
];

const officeItemOptions = [
  { label: '筆記型電腦', value: '筆記型電腦' },
  { label: '桌上型電腦', value: '桌上型電腦' },
  { label: '螢幕', value: '螢幕' },
  { label: '主機', value: '主機' },
  { label: '手機', value: '手機' },
  { label: '轉接線', value: '轉接線' },
  { label: '電視', value: '電視' },
  { label: '投影機', value: '投影機' },
  { label: '投影布幕', value: '投影布幕' },
  { label: '其他', value: '其他' }
];

const form = reactive({
  mode: 'office',
  purchase_source: 'company',

  asset_no: '',
  employee_id: null as number | null,
  note: '',

  employee_no: '',
  custodian_name: '',
  source_category: '電腦通訊設備',
  item_category: '筆記型電腦',
  quantity: 1,
  location: '',
  usage_status: '使用中',
  device_condition: '正常',
  brand: '',
  model: '',
  serial_no: '',
  warranty_expire_date: '',

  machine_name: '',
  machine_spec: '',
  machine_type: '1:主件',
  main_asset_no: '',
  main_asset_name: '',
  asset_class_code: '1616',
  asset_class_name: '機器設備',
  supplier_code: '',
  supplier_short_name: '',
  manufacturer_code: '',
  manufacturer_short_name: '',
  unit: '台',
  management_type: '',
  durable_months: '',
  remaining_months: '',
  acquisition_date: '',
  currency: 'NT$',
  original_cost: '',
  acquisition_cost: '',
  improvement_cost: '0',
  depreciation_method: '1:平均法'
});

const employeeOptions = computed(() =>
  employees.value.map(emp => ({
    label: [
      emp.employee_no || '',
      emp.english_name || emp.chinese_name || emp.company_email || `#${emp.id}`,
      emp.department_name || emp.department_code || '',
      emp.company_email || ''
    ].filter(Boolean).join('｜'),
    value: Number(emp.id),
    raw: emp
  }))
);

const selectedEmployee = computed(() => employees.value.find(emp => Number(emp.id) === Number(form.employee_id)));

watch(() => form.employee_id, () => {
  const emp = selectedEmployee.value;
  if (!emp) return;

  if (!form.employee_no && emp.employee_no) form.employee_no = emp.employee_no;
  if (!form.custodian_name) form.custodian_name = emp.english_name || emp.chinese_name || emp.company_email || '';
});

function mapStatus(status: string) {
  if (status === '使用中') return 'assigned';
  if (status === '暫停使用') return 'in_stock';
  if (status === '待配發') return 'pending_assign';
  if (status === '維修中') return 'repair';
  if (status === '報廢') return 'retired';

  return 'in_stock';
}

const derivedCategory = computed(() => {
  if (form.mode === 'machine') return 'machine_equipment';

  const item = String(form.item_category || '');
  const source = String(form.source_category || '');

  if (item.includes('筆記') || item.includes('筆電') || item.toLowerCase().includes('notebook')) return 'laptop';
  if (item.includes('螢幕') || item.toLowerCase().includes('monitor')) return 'monitor';

  if (source.includes('電腦通訊')) return 'office_equipment_electronic';

  if (source.includes('辦公')) {
    const nonElectronicWords = ['桌', '椅', '櫃', '白板', '架', '隔板'];
    if (nonElectronicWords.some(word => item.includes(word))) return 'office_equipment_nonelectronic';

    return 'office_equipment_electronic';
  }

  return 'office_equipment_electronic';
});

const derivedName = computed(() => {
  if (form.mode === 'machine') return form.machine_name || form.main_asset_name || form.asset_no || '機器設備';

  return form.item_category || form.model || form.asset_no || '辦公室資訊設備';
});

function linesToQrText(lines: Array<[string, any]>) {
  return lines
    .map(([label, value]) => `${label}：${value ?? ''}`)
    .join('\n');
}

const companyQrText = computed(() => {
  if (form.purchase_source !== 'company') return '';

  if (form.mode === 'machine') {
    return linesToQrText([
      ['購入來源', '公司購入'],
      ['資料類型', '機器設備'],
      ['資產編號', form.asset_no],
      ['資產名稱', form.machine_name],
      ['資產規格', form.machine_spec],
      ['型態', form.machine_type],
      ['主件編號', form.main_asset_no],
      ['主件名稱', form.main_asset_name],
      ['資產類別', form.asset_class_code],
      ['資產類別名稱', form.asset_class_name],
      ['供應廠商', form.supplier_code],
      ['供應商簡稱', form.supplier_short_name],
      ['製造廠商', form.manufacturer_code],
      ['製造商簡稱', form.manufacturer_short_name],
      ['單位', form.unit],
      ['數量', form.quantity],
      ['管理區分', form.management_type],
      ['耐用月數', form.durable_months],
      ['未攤月數', form.remaining_months],
      ['取得日期', form.acquisition_date],
      ['幣別', form.currency],
      ['原幣取得成本', form.original_cost],
      ['取得成本', form.acquisition_cost],
      ['改良成本', form.improvement_cost],
      ['折舊方法', form.depreciation_method],
      ['備註', form.note]
    ]);
  }

  return linesToQrText([
    ['購入來源', '公司購入'],
    ['資料類型', '辦公室資訊設備'],
    ['員工工號', form.employee_no],
    ['保管人', form.custodian_name],
    ['資產編號', form.asset_no],
    ['所屬類別', form.source_category],
    ['分類', form.item_category],
    ['數量', form.quantity],
    ['存放地點', form.location],
    ['使用狀態', form.usage_status],
    ['設備狀況', form.device_condition],
    ['品牌', form.brand],
    ['型號', form.model],
    ['序列號', form.serial_no],
    ['保固到期日', form.warranty_expire_date],
    ['備註', form.note]
  ]);
});

const qrFieldValue = computed(() => {
  if (form.purchase_source === 'non_company') return '';

  return companyQrText.value;
});

const extraJson = computed(() => {
  if (form.mode === 'machine') {
    return {
      purchase_source: form.purchase_source,
      source_sheet: '2.機器設備',
      qr_generated: form.purchase_source === 'company',
      source_fields: {
        purchase_source: form.purchase_source,
        asset_no: form.asset_no,
        asset_name: form.machine_name,
        asset_spec: form.machine_spec,
        machine_type: form.machine_type,
        main_asset_no: form.main_asset_no,
        main_asset_name: form.main_asset_name,
        asset_class_code: form.asset_class_code,
        asset_class_name: form.asset_class_name,
        supplier_code: form.supplier_code,
        supplier_short_name: form.supplier_short_name,
        manufacturer_code: form.manufacturer_code,
        manufacturer_short_name: form.manufacturer_short_name,
        unit: form.unit,
        quantity: form.quantity,
        management_type: form.management_type,
        durable_months: form.durable_months,
        remaining_months: form.remaining_months,
        acquisition_date: form.acquisition_date,
        currency: form.currency,
        original_cost: form.original_cost,
        acquisition_cost: form.acquisition_cost,
        improvement_cost: form.improvement_cost,
        depreciation_method: form.depreciation_method,
        qr_code: qrFieldValue.value
      }
    };
  }

  return {
    purchase_source: form.purchase_source,
    source_sheet: '1.辦公室資訊設備',
    qr_generated: form.purchase_source === 'company',
    source_fields: {
      purchase_source: form.purchase_source,
      employee_no: form.employee_no,
      custodian_name: form.custodian_name,
      asset_no: form.asset_no,
      source_category: form.source_category,
      item_category: form.item_category,
      quantity: form.quantity,
      location: form.location,
      usage_status: form.usage_status,
      device_condition: form.device_condition,
      brand: form.brand,
      model: form.model,
      serial_no: form.serial_no,
      warranty_expire_date: form.warranty_expire_date,
      qr_code: qrFieldValue.value
    }
  };
});

async function loadEmployees() {
  try {
    employees.value = await fetchEmployeeLookup({
      limit: 1000,
      includeInactive: true,
      includeDeleted: true
    });
  } catch {
    employees.value = [];
  }
}

async function copyQrField() {
  if (!qrFieldValue.value) {
    message.info('非公司購入不產生 QR Code 欄位');
    return;
  }

  await navigator.clipboard.writeText(qrFieldValue.value);
  message.success('已複製 QR Code 欄位內容');
}

function validate() {
  if (!String(form.asset_no || '').trim()) {
    message.error('資產編號必填');
    return false;
  }

  if (form.purchase_source === 'company' && !qrFieldValue.value.trim()) {
    message.error('公司購入必須產生 QR Code 欄位');
    return false;
  }

  return true;
}

async function submit() {
  if (!validate()) return;

  saving.value = true;

  try {
    const payload = {
      asset_category: derivedCategory.value,
      asset_type: derivedCategory.value,
      asset_no: form.asset_no,
      name: derivedName.value,
      brand: form.mode === 'office' ? form.brand : form.manufacturer_short_name || form.manufacturer_code,
      model: form.mode === 'office' ? form.model : form.machine_spec,
      serial_no: form.mode === 'office' ? form.serial_no : form.main_asset_no,
      status: form.mode === 'office' ? mapStatus(form.usage_status) : 'assigned',
      employee_id: form.employee_id,
      location: form.location,
      purchase_date: form.mode === 'machine' ? form.acquisition_date || null : null,
      warranty_expire_date: form.mode === 'office' ? form.warranty_expire_date || null : null,
      note: form.note,
      purchase_source: form.purchase_source,
      qr_text: qrFieldValue.value || null,
      qr_url: qrFieldValue.value || null,
      extra_json: extraJson.value,
      skip_automation: true
    };

    const result: any = await createAsset(payload);

    message.success('已送出');

    const assetNo = result?.asset?.asset_no || result?.asset_no || form.asset_no;
    router.push(`/airway/assets/detail/${encodeURIComponent(assetNo)}`);
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
    <NCard :bordered="false" class="hero">
      <div class="hero-row">
        <div>
          <div class="eyebrow">Demo OA / Asset Intake</div>
          <h2>資產填寫入口</h2>
          <p>
            公司購入會依照表單全部欄位產生 QR Code 欄位；非公司購入只寫入資料庫，不產生 QR Code。
          </p>
        </div>

        <NSpace>
          <NButton @click="router.back()">返回</NButton>
          <NButton type="primary" :loading="saving" @click="submit">送出</NButton>
        </NSpace>
      </div>
    </NCard>

    <NCard>
      <template #header>
        <div class="header-row">
          <strong>填寫類型</strong>
          <NSpace>
            <NRadioGroup v-model:value="form.purchase_source">
              <NRadioButton v-for="item in purchaseSourceOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </NRadioButton>
            </NRadioGroup>

            <NRadioGroup v-model:value="form.mode">
              <NRadioButton v-for="item in modeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </NRadioButton>
            </NRadioGroup>
          </NSpace>
        </div>
      </template>

      <NAlert
        :type="form.purchase_source === 'company' ? 'info' : 'warning'"
        :bordered="false"
        class="mb"
      >
        系統判斷分類：{{ derivedCategory }}
        ｜購入來源：{{ form.purchase_source === 'company' ? '公司購入，會產生 QR Code 欄位' : '非公司購入，只寫入 DB，不產 QR Code' }}
      </NAlert>

      <NForm label-placement="top">
        <template v-if="form.mode === 'office'">
          <NDivider title-placement="left">1. 辦公室資訊設備</NDivider>

          <div class="form-grid">
            <NFormItem label="員工工號">
              <NInput v-model:value="form.employee_no" placeholder="例如 A10120" />
            </NFormItem>

            <NFormItem label="保管人">
              <NInput v-model:value="form.custodian_name" placeholder="例如 孟家緯 Zozo" />
            </NFormItem>

            <NFormItem label="人員管理連動">
              <NSelect
                v-model:value="form.employee_id"
                clearable
                filterable
                :options="employeeOptions"
                placeholder="搜尋員工主檔"
              />
            </NFormItem>

            <NFormItem label="資產編號" required>
              <NInput v-model:value="form.asset_no" placeholder="必填，依公司資產編號邏輯填寫" />
            </NFormItem>

            <NFormItem label="所屬類別">
              <NSelect v-model:value="form.source_category" filterable tag :options="sourceCategoryOptions" />
            </NFormItem>

            <NFormItem label="分類">
              <NSelect v-model:value="form.item_category" filterable tag :options="officeItemOptions" />
            </NFormItem>

            <NFormItem label="數量">
              <NInputNumber v-model:value="form.quantity" :min="1" />
            </NFormItem>

            <NFormItem label="存放地點">
              <NInput v-model:value="form.location" placeholder="例如 產品研發部 / 會議室A / 機房" />
            </NFormItem>

            <NFormItem label="使用狀態">
              <NSelect v-model:value="form.usage_status" :options="officeStatusOptions" />
            </NFormItem>

            <NFormItem label="設備狀況">
              <NSelect v-model:value="form.device_condition" filterable tag :options="conditionOptions" />
            </NFormItem>

            <NFormItem label="品牌">
              <NInput v-model:value="form.brand" placeholder="例如 MSI / Apple / DELL" />
            </NFormItem>

            <NFormItem label="型號">
              <NInput v-model:value="form.model" placeholder="型號" />
            </NFormItem>

            <NFormItem label="序列號 S/N">
              <NInput v-model:value="form.serial_no" placeholder="Serial Number" />
            </NFormItem>

            <NFormItem label="保固到期日">
              <input v-model="form.warranty_expire_date" type="date" class="date-input" />
            </NFormItem>
          </div>
        </template>

        <template v-else>
          <NDivider title-placement="left">2. 機器設備</NDivider>

          <div class="form-grid">
            <NFormItem label="資產編號" required>
              <NInput v-model:value="form.asset_no" placeholder="必填，例如 1616-260201 / D-260201" />
            </NFormItem>

            <NFormItem label="資產名稱">
              <NInput v-model:value="form.machine_name" placeholder="例如 A2D 3D列印機" />
            </NFormItem>

            <NFormItem label="資產規格">
              <NInput v-model:value="form.machine_spec" placeholder="規格 / 型號" />
            </NFormItem>

            <NFormItem label="型態">
              <NInput v-model:value="form.machine_type" placeholder="例如 1:主件" />
            </NFormItem>

            <NFormItem label="主件編號">
              <NInput v-model:value="form.main_asset_no" />
            </NFormItem>

            <NFormItem label="主件名稱">
              <NInput v-model:value="form.main_asset_name" />
            </NFormItem>

            <NFormItem label="資產類別">
              <NInput v-model:value="form.asset_class_code" placeholder="例如 1616" />
            </NFormItem>

            <NFormItem label="資產類別名稱">
              <NInput v-model:value="form.asset_class_name" placeholder="例如 機器設備" />
            </NFormItem>

            <NFormItem label="供應廠商">
              <NInput v-model:value="form.supplier_code" />
            </NFormItem>

            <NFormItem label="供應商簡稱">
              <NInput v-model:value="form.supplier_short_name" />
            </NFormItem>

            <NFormItem label="製造廠商">
              <NInput v-model:value="form.manufacturer_code" />
            </NFormItem>

            <NFormItem label="製造商簡稱">
              <NInput v-model:value="form.manufacturer_short_name" />
            </NFormItem>

            <NFormItem label="單位">
              <NInput v-model:value="form.unit" />
            </NFormItem>

            <NFormItem label="數量">
              <NInputNumber v-model:value="form.quantity" :min="1" />
            </NFormItem>

            <NFormItem label="管理區分">
              <NInput v-model:value="form.management_type" />
            </NFormItem>

            <NFormItem label="耐用月數">
              <NInput v-model:value="form.durable_months" />
            </NFormItem>

            <NFormItem label="未攤月數">
              <NInput v-model:value="form.remaining_months" />
            </NFormItem>

            <NFormItem label="取得日期">
              <input v-model="form.acquisition_date" type="date" class="date-input" />
            </NFormItem>

            <NFormItem label="幣別">
              <NInput v-model:value="form.currency" />
            </NFormItem>

            <NFormItem label="原幣取得成本">
              <NInput v-model:value="form.original_cost" />
            </NFormItem>

            <NFormItem label="取得成本">
              <NInput v-model:value="form.acquisition_cost" />
            </NFormItem>

            <NFormItem label="改良成本">
              <NInput v-model:value="form.improvement_cost" />
            </NFormItem>

            <NFormItem label="折舊方法">
              <NInput v-model:value="form.depreciation_method" />
            </NFormItem>
          </div>
        </template>

        <NFormItem label="備註">
          <NInput v-model:value="form.note" type="textarea" :autosize="{ minRows: 3 }" />
        </NFormItem>

        <NFormItem label="QR Code 欄位">
          <NInput
            :value="qrFieldValue"
            type="textarea"
            readonly
            :autosize="{ minRows: 4, maxRows: 10 }"
            :placeholder="form.purchase_source === 'company' ? '公司購入會自動產生 QR Code 欄位' : '非公司購入不產生 QR Code'"
          />
        </NFormItem>

        <NSpace justify="space-between" class="actions">
          <NButton :disabled="!qrFieldValue" @click="copyQrField">複製 QR Code 欄位</NButton>

          <NSpace>
            <NButton @click="router.back()">取消</NButton>
            <NButton type="primary" :loading="saving" @click="submit">送出</NButton>
          </NSpace>
        </NSpace>
      </NForm>
    </NCard>
  </NSpace>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(circle at top right, rgba(24, 160, 251, 0.14), transparent 34%),
    linear-gradient(135deg, #ffffff, #f7faff);
}

.hero-row,
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  margin-bottom: 6px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}

p {
  max-width: 880px;
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.7;
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

.mb {
  margin-bottom: 16px;
}

.actions {
  margin-top: 16px;
}

@media (max-width: 960px) {
  .hero-row,
  .header-row {
    align-items: stretch;
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
