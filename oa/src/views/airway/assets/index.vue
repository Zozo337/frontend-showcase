<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NTag, useMessage } from 'naive-ui';
import QRCode from 'qrcode';

import { fetchAssets, updateAsset, type AirwayAsset } from '@/service/api/airway/assets';
import { fetchEmployeeLookup, type AirwayEmployee } from '@/service/api/airway/employees';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(false);
const keyword = ref('');
const statusFilter = ref('all');
const rows = ref<AirwayAsset[]>([]);
const employees = ref<AirwayEmployee[]>([]);
const qrMap = ref<Record<string, string>>({});
const editDrawerVisible = ref(false);
const savingAsset = ref(false);
const editingAsset = ref<AirwayAsset | null>(null);

const editForm = reactive({
  assetNo: '',
  name: '',
  brand: '',
  model: '',
  serialNo: '',
  hostname: '',
  employeeId: null as number | null,
  status: 'in_stock',
  location: '',
  note: ''
});

const categoryTabs = [
  { name: 'laptop', label: '筆電', path: '/airway/assets/laptops' },
  { name: 'monitor', label: '螢幕', path: '/airway/assets/monitors' },
  { name: 'office_equipment_electronic', label: '其他辦公設備 / 電子設備', path: '/airway/assets/office-electronic' },
  { name: 'office_equipment_nonelectronic', label: '其他辦公設備 / 非電子設備', path: '/airway/assets/office-nonelectronic' },
  { name: 'machine_equipment', label: '機器設備', path: '/airway/assets/machines' }
];

const statusOptions = [
  { label: '全部狀態', value: 'all' },
  { label: '庫存', value: 'in_stock' },
  { label: '待配發', value: 'pending_assign' },
  { label: '已配發', value: 'assigned' },
  { label: '已歸還', value: 'returned' },
  { label: '維修中', value: 'repair' },
  { label: '報廢', value: 'retired' }
];

const employeeOptions = computed(() => employees.value.map(employee => ({
  value: Number(employee.id),
  label: [
    employee.employee_no,
    employee.english_name || employee.chinese_name || employee.company_email,
    employee.department_name,
    employee.company_email
  ].filter(Boolean).join('｜')
})));

const category = computed(() => {
  const path = route.path;

  if (path.includes('/monitors')) return 'monitor';
  if (path.includes('/office-electronic')) return 'office_equipment_electronic';
  if (path.includes('/office-nonelectronic')) return 'office_equipment_nonelectronic';
  if (path.includes('/machines')) return 'machine_equipment';

  return 'laptop';
});

const stats = computed(() => {
  const total = rows.value.length;
  const assigned = rows.value.filter(item => item.status === 'assigned').length;
  const stock = rows.value.filter(item => item.status === 'in_stock').length;
  const abnormal = rows.value.filter(item => ['repair', 'returned', 'retired'].includes(String(item.status || ''))).length;

  return { total, assigned, stock, abnormal };
});

function statusText(value?: string | null) {
  return {
    in_stock: '庫存',
    pending_assign: '待配發',
    assigned: '已配發',
    returned: '已歸還',
    repair: '維修中',
    retired: '報廢'
  }[String(value || '')] || value || '-';
}

function statusType(value?: string | null) {
  if (value === 'assigned') return 'success';
  if (value === 'pending_assign') return 'info';
  if (value === 'repair') return 'warning';
  if (value === 'returned' || value === 'retired') return 'error';

  return 'default';
}

function ownerName(row: AirwayAsset) {
  return row.english_name || row.chinese_name || row.company_email || row.employee_no || '-';
}

function parseAssetExtra(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object') return { ...(value as Record<string, any>) };
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

function assetHostname(row?: AirwayAsset | null) {
  const extra = parseAssetExtra(row?.extra_json);
  return String(
    extra.computer_name || extra.computerName || extra.hostname || extra.host_name || extra.device_name || extra.deviceName || ''
  ).trim();
}

function qrText(row: AirwayAsset) {
  return row.qr_text || row.qr_url || '';
}

async function ensureQrCodes(data: AirwayAsset[]) {
  const nextMap = { ...qrMap.value };

  for (const row of data) {
    const key = String(row.id ?? row.asset_no ?? '');
    const text = qrText(row);

    if (!key || !text || nextMap[key]) continue;

    try {
      nextMap[key] = await QRCode.toDataURL(text, {
        width: 92,
        margin: 1
      });
    } catch (err) {
      console.warn('QR generate failed:', err);
    }
  }

  qrMap.value = nextMap;
}

async function copyQr(row: AirwayAsset) {
  const text = qrText(row);

  if (!text) {
    message.warning('此筆資料沒有 QR 內容');
    return;
  }

  await navigator.clipboard.writeText(text);
  message.success('QR 內容已複製');
}

function openIntake() {
  router.push('/airway/assets/intake');
}

function openEdit(row: AirwayAsset) {
  editingAsset.value = row;
  editForm.assetNo = row.asset_no || '';
  editForm.name = row.name || '';
  editForm.brand = row.brand || '';
  editForm.model = row.model || '';
  editForm.serialNo = row.serial_no || '';
  editForm.hostname = assetHostname(row);
  editForm.employeeId = Number(row.effective_employee_id || row.employee_id || row.assigned_employee_id || row.owner_employee_id) || null;
  editForm.status = String(row.status || 'in_stock');
  editForm.location = row.location || '';
  editForm.note = row.note || '';
  editDrawerVisible.value = true;
}

async function saveAsset() {
  const asset = editingAsset.value;
  if (!asset?.id) return;
  if (!editForm.assetNo.trim()) {
    message.warning('請輸入資產編號');
    return;
  }

  const extra = parseAssetExtra(asset.extra_json);
  ['computer_name', 'computerName', 'hostname', 'host_name', 'device_name', 'deviceName'].forEach(key => delete extra[key]);
  if (editForm.hostname.trim()) extra.computer_name = editForm.hostname.trim().toUpperCase();

  savingAsset.value = true;
  try {
    await updateAsset(Number(asset.id), {
      asset_no: editForm.assetNo.trim(),
      name: editForm.name.trim() || null,
      brand: editForm.brand.trim() || null,
      model: editForm.model.trim() || null,
      serial_no: editForm.serialNo.trim() || null,
      employee_id: editForm.employeeId,
      status: editForm.status,
      location: editForm.location.trim() || null,
      note: editForm.note.trim() || null,
      extra_json: extra
    });
    message.success('資產已更新');
    editDrawerVisible.value = false;
    await load();
  } catch (err: any) {
    message.error(err?.message || '更新資產失敗');
  } finally {
    savingAsset.value = false;
  }
}

async function loadEmployees() {
  try {
    employees.value = await fetchEmployeeLookup({ limit: 1000, includeInactive: true, includeDeleted: true });
  } catch {
    employees.value = [];
  }
}

async function load() {
  loading.value = true;

  try {
    const list = await fetchAssets({
      category: category.value,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      q: keyword.value.trim() || undefined,
      includeReturned: true,
      includeRetired: true
    });

    rows.value = list;
    await ensureQrCodes(list);
  } catch (err: any) {
    message.error(err?.message || '讀取資產失敗');
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

const columns = computed<DataTableColumns<AirwayAsset>>(() => [
  {
    title: '資產編號',
    key: 'asset_no',
    minWidth: 160,
    render(row) {
      return h('strong', row.asset_no || '-');
    }
  },
  {
    title: '資產名稱',
    key: 'name',
    minWidth: 180,
    render(row) {
      return row.name || '-';
    }
  },
  {
    title: '品牌 / 型號 / 序號',
    key: 'model',
    minWidth: 260,
    render(row) {
      return h('div', null, [
        h('strong', [row.brand, row.model].filter(Boolean).join(' / ') || '-'),
        h('div', { class: 'muted' }, row.serial_no ? `SN：${row.serial_no}` : 'SN：-')
      ]);
    }
  },
  {
    title: '保管人',
    key: 'owner',
    minWidth: 220,
    render(row) {
      return h('div', null, [
        h('strong', ownerName(row)),
        h('div', { class: 'muted' }, [row.department_code, row.department_name].filter(Boolean).join('｜') || '-')
      ]);
    }
  },
  {
    title: '位置',
    key: 'location',
    minWidth: 140,
    render(row) {
      return row.location || '-';
    }
  },
  {
    title: 'Hostname',
    key: 'hostname',
    minWidth: 140,
    render(row) {
      return assetHostname(row) || '-';
    }
  },
  {
    title: '狀態',
    key: 'status',
    width: 120,
    render(row) {
      return h(NTag, { type: statusType(row.status), bordered: false }, { default: () => statusText(row.status) });
    }
  },
  {
    title: 'QR Code',
    key: 'qr_code_image',
    width: 180,
    render(row) {
      const key = String(row.id ?? row.asset_no ?? '');
      const imgSrc = qrMap.value[key];
      const text = qrText(row);

      if (!text) {
        return h('span', { class: 'muted' }, '無 QR');
      }

      return h('div', { class: 'qr-cell' }, [
        imgSrc
          ? h('img', {
              class: 'qr-image',
              src: imgSrc,
              alt: `qr-${row.asset_no || row.id}`
            })
          : h('span', { class: 'muted' }, '產生中...'),
        h(
          NButton,
          {
            size: 'tiny',
            ghost: true,
            onClick: () => copyQr(row)
          },
          { default: () => '複製內容' }
        )
      ]);
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render(row) {
      return h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => openEdit(row) }, { default: () => '編輯' });
    }
  }
]);

watch(() => route.path, load);
watch(statusFilter, load);

onMounted(() => {
  load();
  loadEmployees();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false" class="hero">
      <div class="hero-row">
        <div>
          <div class="eyebrow">Demo OA / Physical Assets</div>
          <h2>資產管理</h2>
          <p>管理實體固定資產：筆電、螢幕、其他辦公設備與機器設備。公司購入資料可直接顯示 QR Code 圖片。</p>
        </div>

        <NSpace>
          <NButton :loading="loading" @click="load">重新整理</NButton>
          <NButton type="primary" @click="openIntake">填寫入口</NButton>
        </NSpace>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <span>本分類總數</span>
          <strong>{{ stats.total }}</strong>
        </div>
        <div class="stat-card">
          <span>已配發</span>
          <strong>{{ stats.assigned }}</strong>
        </div>
        <div class="stat-card">
          <span>庫存</span>
          <strong>{{ stats.stock }}</strong>
        </div>
        <div class="stat-card danger">
          <span>歸還 / 維修 / 報廢</span>
          <strong>{{ stats.abnormal }}</strong>
        </div>
      </div>
    </NCard>

    <NCard>
      <template #header>
        <div class="toolbar">
          <NTabs
            :value="category"
            type="segment"
            @update:value="value => router.push(categoryTabs.find(item => item.name === value)?.path || '/airway/assets/laptops')"
          >
            <NTab v-for="item in categoryTabs" :key="item.name" :name="item.name">
              {{ item.label }}
            </NTab>
          </NTabs>

          <NSpace wrap>
            <NSelect v-model:value="statusFilter" class="status-filter" :options="statusOptions" />
            <NInput
              v-model:value="keyword"
              clearable
              class="search"
              placeholder="搜尋資產編號、名稱、型號、序號、保管人"
              @keyup.enter="load"
            />
            <NButton @click="load">搜尋</NButton>
          </NSpace>
        </div>
      </template>

      <NDataTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :bordered="false"
        :single-line="false"
      />
    </NCard>

    <NDrawer v-model:show="editDrawerVisible" :width="680" placement="right">
      <NDrawerContent closable title="編輯資產">
        <NForm label-placement="top">
          <NFormItem label="資產編號" required>
            <NInput v-model:value="editForm.assetNo" />
          </NFormItem>

          <NFormItem label="資產名稱">
            <NInput v-model:value="editForm.name" />
          </NFormItem>

          <div class="form-grid">
            <NFormItem label="品牌">
              <NInput v-model:value="editForm.brand" />
            </NFormItem>
            <NFormItem label="型號">
              <NInput v-model:value="editForm.model" />
            </NFormItem>
            <NFormItem label="序號">
              <NInput v-model:value="editForm.serialNo" />
            </NFormItem>
            <NFormItem label="電腦 Hostname">
              <NInput v-model:value="editForm.hostname" placeholder="例如：PC-001" />
            </NFormItem>
          </div>

          <NAlert type="info" :bordered="false" class="form-alert">
            SoftInstaller 會優先使用這個 Hostname 與 Windows 回報的 computerName 比對；請填 Windows／macOS 實際主機名稱，不要填型號。
          </NAlert>

          <NFormItem label="保管人">
            <NSelect
              v-model:value="editForm.employeeId"
              filterable
              clearable
              :options="employeeOptions"
              placeholder="選擇保管人"
            />
          </NFormItem>

          <div class="form-grid">
            <NFormItem label="狀態">
              <NSelect v-model:value="editForm.status" :options="statusOptions.filter(item => item.value !== 'all')" />
            </NFormItem>
            <NFormItem label="位置">
              <NInput v-model:value="editForm.location" />
            </NFormItem>
          </div>

          <NFormItem label="備註">
            <NInput v-model:value="editForm.note" type="textarea" :autosize="{ minRows: 3 }" />
          </NFormItem>
        </NForm>

        <template #footer>
          <NSpace justify="end">
            <NButton @click="editDrawerVisible = false">取消</NButton>
            <NButton type="primary" :loading="savingAsset" @click="saveAsset">儲存更新</NButton>
          </NSpace>
        </template>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(circle at top right, rgba(24, 160, 251, 0.14), transparent 34%),
    linear-gradient(135deg, #ffffff, #f7faff);
}

.hero-row,
.toolbar {
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
  max-width: 820px;
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.7;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.stat-card {
  padding: 16px;
  border: 1px solid #edf0f5;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
}

.stat-card span,
.muted {
  color: #8a94a6;
  font-size: 12px;
}

.stat-card strong {
  display: block;
  margin-top: 6px;
  font-size: 28px;
  font-weight: 800;
}

.stat-card.danger strong {
  color: #d92d20;
}

.search {
  width: 340px;
}

.status-filter {
  width: 140px;
}

.main-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-alert {
  margin-bottom: 18px;
}

.qr-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.qr-image {
  width: 92px;
  height: 92px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 4px;
}

@media (max-width: 960px) {
  .hero-row,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .search,
  .status-filter {
    width: 100%;
  }
}
</style>
