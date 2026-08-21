<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NAvatar, NButton, NInput, NPopconfirm, NSelect, NSpace, NTag, useMessage } from 'naive-ui';
import {
  createEmployee,
  deleteEmployee,
  fetchEmployeeDetail,
  fetchEmployees,
  resolveAvatarUrl,
  updateEmployee,
  uploadEmployeeAvatar,
  type AirwayEmployee,
  type EmployeeDetailResponse
} from '@/service/api/airway/employees';
import { fetchDepartments, type AirwayDepartment } from '@/service/api/airway/departments';

const message = useMessage();

const loading = ref(false);
const detailLoading = ref(false);
const avatarUploading = ref(false);
const saving = ref(false);
const departmentLoading = ref(false);

const employees = ref<AirwayEmployee[]>([]);
const departments = ref<AirwayDepartment[]>([]);
const selectedEmployee = ref<AirwayEmployee | null>(null);
const editingEmployee = ref<AirwayEmployee | null>(null);
const detail = ref<EmployeeDetailResponse | null>(null);

const drawerVisible = ref(false);
const editDrawerVisible = ref(false);
const activeTab = ref('basic');
const keyword = ref('');
const accountZone = ref<'normal' | 'departed' | 'all'>('normal');


const createDrawerVisible = ref(false);
const creating = ref(false);

const createForm = ref({
  employee_no: '',
  chinese_name: '',
  english_name: '',
  company_email: '',
  department_id: null as number | null,
  position_title: '',
  onboard_date: '',
  account_status: 'active',
  manager_id: null as number | null
});


const editForm = ref({
  employee_no: '',
  chinese_name: '',
  english_name: '',
  company_email: '',
  department_id: null as number | null,
  position_title: '',
  onboard_date: '',
  account_status: 'active',
  manager_id: null as number | null,
  manager_name: '',
  manager_email: ''
});

const departedStatuses = ['deleted', 'disabled', 'inactive', 'resigned', 'left', 'suspended'];

const employeeCount = computed(() => employees.value.length);

const normalEmployeeCount = computed(() => {
  return employees.value.filter(row => isNormalEmployee(row)).length;
});

const departedEmployeeCount = computed(() => {
  return employees.value.filter(row => isDepartedEmployee(row)).length;
});

const departmentOptions = computed(() => {
  return departments.value.map(item => {
    const code = item.code || '-';
    const name = item.name || '-';
    const parentText = item.parent_name ? `｜上層：${item.parent_name}` : '';

    return {
      label: `${code}｜${name}${parentText}`,
      value: item.id
    };
  });
});

const managerOptions = computed(() => {
  const currentId = editingEmployee.value?.id;

  return employees.value
    .filter(item => item.id !== currentId)
    .filter(item => !isDepartedEmployee(item))
    .map(item => {
      const employeeNo = item.employee_no || '-';
      const name = item.chinese_name || item.english_name || '-';
      const email = item.company_email || '-';
      const department = item.department_name || '-';

      return {
        label: `${employeeNo}｜${name}｜${email}｜${department}`,
        value: item.id
      };
    });
});

const zoneEmployees = computed(() => {
  if (accountZone.value === 'all') return employees.value;
  if (accountZone.value === 'departed') return employees.value.filter(row => isDepartedEmployee(row));

  return employees.value.filter(row => isNormalEmployee(row));
});

const filteredEmployees = computed(() => {
  const kw = keyword.value.trim().toLowerCase();

  if (!kw) return zoneEmployees.value;

  return zoneEmployees.value.filter(row => {
    const values = [
      row.id,
      row.employee_no,
      row.chinese_name,
      row.english_name,
      row.company_email,
      row.ad_username,
      row.department_id,
      row.department_name,
      row.department_code,
      row.position_title,
      row.job_title,
      row.title,
      row.account_status,
      row.manager_name,
      row.manager_email
    ];

    return values.some(value => String(value || '').toLowerCase().includes(kw));
  });
});

const filteredEmployeeCount = computed(() => filteredEmployees.value.length);

// AIRWAY_EMPLOYEE_PAGE_EXPORT_V1
function csvEscape(value: any) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCurrentEmployees() {
  const rows = filteredEmployees.value;

  if (!rows.length) {
    message.warning('目前篩選條件下沒有可匯出的員工資料');
    return;
  }

  const headers = [
    'ID',
    '員工編號',
    '中文姓名',
    '英文姓名',
    'Email',
    'AD 帳號',
    '部門代碼',
    '部門',
    '職稱',
    '入職日期',
    '帳號狀態'
  ];

  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map(row => [
      row.id,
      row.employee_no,
      row.chinese_name,
      row.english_name,
      row.company_email,
      row.ad_username,
      row.department_code,
      row.department_name,
      getJobTitle(row),
      getOnboardDate(row),
      row.account_status || row.status || ''
    ].map(csvEscape).join(','))
  ];

  const blob = new Blob(['\ufeff' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;'
  });

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const zone = accountZone.value;
  const kw = keyword.value.trim() ? '_search' : '';
  const filename = `employees_${zone}${kw}_${today}.csv`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);

  message.success(`已匯出 ${rows.length} 筆員工資料`);
}



function getEffectiveAccountStatus(row: Partial<AirwayEmployee>) {
  const accountStatus = String(row.account_status || '').toLowerCase();
  const status = String(row.status || '').toLowerCase();

  if (departedStatuses.includes(accountStatus)) return accountStatus;
  if (departedStatuses.includes(status)) return status;

  return accountStatus || status || 'active';
}

function isDepartedEmployee(row: Partial<AirwayEmployee>) {
  return departedStatuses.includes(getEffectiveAccountStatus(row));
}

function isNormalEmployee(row: Partial<AirwayEmployee>) {
  return !isDepartedEmployee(row);
}

function statusType(status?: string) {
  if (status === 'active' || status === 'normal' || status === 'enabled') return 'success';
  if (status === 'pending') return 'info';
  if (status === 'suspended') return 'warning';
  if (status === 'disabled' || status === 'inactive') return 'warning';
  if (status === 'resigned' || status === 'left') return 'error';
  if (status === 'deleted') return 'error';
  if (status === 'system') return 'default';

  return 'info';
}

function statusText(status?: string) {
  if (status === 'active') return '正常';
  if (status === 'normal') return '正常';
  if (status === 'enabled') return '啟用';
  if (status === 'pending') return '待入職';
  if (status === 'suspended') return '掛職';
  if (status === 'disabled') return '停用';
  if (status === 'inactive') return '未啟用';
  if (status === 'resigned') return '離職';
  if (status === 'left') return '離職';
  if (status === 'deleted') return '已刪除';
  if (status === 'system') return '系統帳號';

  return status || '-';
}

function getEmployeeName(row: Partial<AirwayEmployee>) {
  return row.chinese_name || row.english_name || row.employee_no || `user${row.id || ''}`;
}

function getAvatarUrl(row: Partial<AirwayEmployee>) {
  const url = resolveAvatarUrl(row.avatar_url || row.avatar || row.photo_url || row.photo || '');
  if (!url) return '';

  const version = row.updated_at || row.avatar_url || Date.now();
  return `${url}${url.includes('?') ? '&' : '?'}t=${encodeURIComponent(String(version))}`;
}

function getAvatarText(row: Partial<AirwayEmployee>) {
  const name = getEmployeeName(row);
  return name.slice(0, 1).toUpperCase() || '?';
}

function getJobTitle(row: Partial<AirwayEmployee>) {
  return row.position || row.position_title || row.job_title || row.title || '-';
}

function getOnboardDate(row: Partial<AirwayEmployee>) {
  return row.onboard_date || row.hire_date || row.start_date || '-';
}

function renderAvatar(row: AirwayEmployee, size = 36) {
  const avatarUrl = getAvatarUrl(row);

  return h(
    NAvatar,
    {
      round: true,
      size,
      src: avatarUrl || undefined,
      class: 'employee-avatar'
    },
    {
      default: () => getAvatarText(row)
    }
  );
}

const m365Account = computed(() => {
  const accounts = detail.value?.itAccounts || [];

  const found = accounts.find(item => {
    const raw = JSON.stringify(item).toLowerCase();
    return raw.includes('m365') || raw.includes('office') || raw.includes('microsoft');
  });

  if (!found) return '-';

  return found.account || found.username || found.email || found.account_name || found.login_id || '-';
});

const laptopAssetNo = computed(() => {
  const assets = detail.value?.assets || [];

  const found = assets.find(item => {
    const raw = JSON.stringify(item).toLowerCase();
    return raw.includes('nb') || raw.includes('notebook') || raw.includes('laptop');
  });

  if (!found) return '-';

  return found.asset_no || found.asset_code || found.code || found.serial_no || found.name || '-';
});

const assetTypeMap: Record<string, string> = {
  laptop: '筆電',
  notebook: '筆電',
  nb: '筆電',
  monitor: '螢幕',
  screen: '螢幕',
  display: '螢幕',
  m365: 'M365 帳號',
  office365: 'M365 帳號',
  microsoft365: 'M365 帳號',
  doorcard: '門禁卡'
};

const assetStatusMap: Record<string, string> = {
  in_stock: '庫存',
  pending_assign: '待配發',
  assigned: '已配發',
  returned: '已歸還',
  repair: '維修中',
  retired: '報廢'
};

function normalizeAssetType(value?: string | null) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'door_card') return 'doorcard';
  return raw;
}

function assetTypeText(value?: string | null) {
  return assetTypeMap[normalizeAssetType(value)] || value || '-';
}

function assetStatusText(value?: string | null) {
  return assetStatusMap[String(value || '').toLowerCase()] || value || '-';
}

function assetNameText(asset: any) {
  return asset?.name || asset?.asset_no || asset?.model || asset?.serial_no || '-';
}

function assetOwnerText(asset: any) {
  return asset?.english_name || asset?.chinese_name || asset?.company_email || asset?.employee_no || '-';
}

const laptopAssets = computed(() => (detail.value?.assets || []).filter(item => ['laptop', 'notebook', 'nb'].includes(normalizeAssetType(item.asset_type))));
const monitorAssets = computed(() => (detail.value?.assets || []).filter(item => ['monitor', 'screen', 'display'].includes(normalizeAssetType(item.asset_type))));
const m365Assets = computed(() => (detail.value?.assets || []).filter(item => ['m365', 'office365', 'microsoft365'].includes(normalizeAssetType(item.asset_type))));
const otherAssets = computed(() => (detail.value?.assets || []).filter(item => ![
  'laptop', 'notebook', 'nb', 'monitor', 'screen', 'display', 'm365', 'office365', 'microsoft365'
].includes(normalizeAssetType(item.asset_type))));

const m365ItAccounts = computed(() => (detail.value?.itAccounts || []).filter(item => {
  const raw = JSON.stringify(item).toLowerCase();
  return raw.includes('m365') || raw.includes('office') || raw.includes('microsoft');
}));

const columns: DataTableColumns<AirwayEmployee> = [
  {
    title: 'ID',
    key: 'id',
    width: 80,
    render(row) {
      return row.id || '-';
    }
  },
  {
    title: '員工編號',
    key: 'employee_no',
    width: 140,
    render(row) {
      return row.employee_no || '-';
    }
  },
  {
    title: '姓名',
    key: 'name',
    minWidth: 220,
    render(row) {
      return h('div', { class: 'employee-name-cell' }, [
        renderAvatar(row, 34),
        h('div', { class: 'employee-name-info' }, [
          h('div', { class: 'employee-name-line' }, [
            h('strong', getEmployeeName(row)),
            h(
              NTag,
              {
                size: 'small',
                type: statusType(getEffectiveAccountStatus(row)),
                bordered: false
              },
              { default: () => statusText(getEffectiveAccountStatus(row)) }
            )
          ]),
          h('div', { class: 'employee-sub-line' }, row.english_name || row.company_email || '-')
        ])
      ]);
    }
  },
  {
    title: '信箱',
    key: 'company_email',
    minWidth: 220,
    render(row) {
      return row.company_email || '-';
    }
  },
  {
    title: 'AD 帳號',
    key: 'ad_username',
    width: 160,
    render(row) {
      return row.ad_username || '-';
    }
  },
  {
    title: '部門',
    key: 'department_name',
    width: 180,
    render(row) {
      const code = row.department_code ? `${row.department_code}｜` : '';
      return `${code}${row.department_name || '-'}`;
    }
  },
  {
    title: '職稱',
    key: 'position_title',
    width: 160,
    render(row) {
      return getJobTitle(row);
    }
  },
  {
    title: '入職日期',
    key: 'onboard_date',
    width: 140,
    render(row) {
      return getOnboardDate(row);
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render(row) {
      return h(
        NSpace,
        {
          size: 8
        },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                ghost: true,
                onClick: () => openDetail(row)
              },
              { default: () => '查看' }
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'warning',
                ghost: true,
                onClick: () => openEdit(row)
              },
              { default: () => '編輯' }
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDeleteEmployee(row)
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    {
                      size: 'small',
                      type: 'error',
                      ghost: true
                    },
                    { default: () => '離職' }
                  ),
                default: () => `確定要將 ${getEmployeeName(row)} 移至離職帳號區嗎？`
              }
            )
          ]
        }
      );
    }
  }
];

function enrichEmployeesDepartment(rows: AirwayEmployee[]) {
  const departmentMap = new Map<number, AirwayDepartment>();

  departments.value.forEach(item => {
    departmentMap.set(item.id, item);
  });

  return rows.map(row => {
    const departmentId = Number(row.department_id || 0);
    const department = departmentMap.get(departmentId);

    if (!department) return row;

    return {
      ...row,
      department_id: department.id,
      department_code: department.code,
      department_name: department.name
    };
  });
}

async function loadEmployees() {
  loading.value = true;

  try {
    if (!departments.value.length) {
      await loadDepartments();
    }

    const rows = await fetchEmployees({ includeInactive: true, includeDeleted: true });
    employees.value = enrichEmployeesDepartment(rows);
  } catch (err: any) {
    message.error(err?.message || '讀取員工失敗');
    employees.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadDepartments() {
  departmentLoading.value = true;

  try {
    const result = await fetchDepartments();
    departments.value = Array.isArray(result) ? result : [];
  } catch (err: any) {
    message.error(err?.message || '讀取部門失敗');
    departments.value = [];
  } finally {
    departmentLoading.value = false;
  }
}


function openCreateEmployee() {
  createForm.value = {
    employee_no: '',
    chinese_name: '',
    english_name: '',
    company_email: '',
    department_id: null,
    position_title: '',
    onboard_date: '',
    account_status: 'active',
    manager_id: null
  };

  createDrawerVisible.value = true;
}

async function handleCreateEmployee() {
  if (!createForm.value.employee_no.trim()) {
    message.warning('請輸入員工編號');
    return;
  }

  if (!createForm.value.chinese_name.trim() && !createForm.value.english_name.trim()) {
    message.warning('請至少輸入繁體中文姓名或英文姓名');
    return;
  }

  creating.value = true;

  try {
    await createEmployee({
      employee_no: createForm.value.employee_no.trim(),
      chinese_name: createForm.value.chinese_name.trim(),
      english_name: createForm.value.english_name.trim(),
      company_email: createForm.value.company_email.trim() || null,
      department_id: createForm.value.department_id,
      position: createForm.value.position_title.trim(),
      position_title: createForm.value.position_title.trim(),
      job_title: createForm.value.position_title.trim(),
      title: createForm.value.position_title.trim(),
      onboard_date: createForm.value.onboard_date,
      hire_date: createForm.value.onboard_date,
      start_date: createForm.value.onboard_date,
      account_status: createForm.value.account_status,
      status: createForm.value.account_status,
      manager_id: createForm.value.manager_id
    });

    message.success('員工已新增');
    createDrawerVisible.value = false;
    accountZone.value = 'normal';

    await loadEmployees();
  } catch (err: any) {
    message.error(err?.message || '新增員工失敗');
  } finally {
    creating.value = false;
  }
}


async function openDetail(row: AirwayEmployee) {
  selectedEmployee.value = row;
  drawerVisible.value = true;
  activeTab.value = 'basic';
  detail.value = null;
  detailLoading.value = true;

  try {
    detail.value = await fetchEmployeeDetail(row.id);
    selectedEmployee.value = {
      ...row,
      ...detail.value.employee
    };

    employees.value = employees.value.map(item => {
      if (item.id !== row.id) return item;

      return {
        ...item,
        ...detail.value?.employee
      };
    });
  } catch (err: any) {
    message.error(err?.message || '讀取成員詳情失敗');
  } finally {
    detailLoading.value = false;
  }
}

async function openEdit(row: AirwayEmployee) {
  editingEmployee.value = row;

  if (!departments.value.length) {
    await loadDepartments();
  }

  editForm.value = {
    employee_no: row.employee_no || '',
    chinese_name: row.chinese_name || '',
    english_name: row.english_name || '',
    company_email: row.company_email || '',
    department_id: row.department_id || null,
    position_title: row.position || row.position_title || row.job_title || row.title || '',
    onboard_date: row.onboard_date || row.hire_date || row.start_date || '',
    account_status: row.account_status || row.status || 'active',
    manager_id: row.manager_id || row.manager_employee_id || null,
    manager_name: row.manager_name || '',
    manager_email: row.manager_email || ''
  };

  editDrawerVisible.value = true;
}

async function handleSaveEdit() {
  if (!editingEmployee.value?.id) {
    message.error('找不到員工 ID');
    return;
  }

  if (!editForm.value.employee_no.trim()) {
    message.warning('請輸入員工編號');
    return;
  }

  if (!editForm.value.chinese_name.trim() && !editForm.value.english_name.trim()) {
    message.warning('請至少輸入繁體中文姓名或英文姓名');
    return;
  }

  saving.value = true;

  try {
    await updateEmployee(editingEmployee.value.id, {
      employee_no: editForm.value.employee_no,
      chinese_name: editForm.value.chinese_name,
      english_name: editForm.value.english_name,
      company_email: editForm.value.company_email?.trim() || null,
      department_id: editForm.value.department_id,
      position: editForm.value.position_title,
      position_title: editForm.value.position_title,
      job_title: editForm.value.position_title,
      title: editForm.value.position_title,
      onboard_date: editForm.value.onboard_date,
      hire_date: editForm.value.onboard_date,
      start_date: editForm.value.onboard_date,
      account_status: editForm.value.account_status,
      status: editForm.value.account_status,
      manager_id: editForm.value.manager_id,
      manager_employee_id: editForm.value.manager_id,
      manager_name: editForm.value.manager_name,
      manager_email: editForm.value.manager_email
    });

    message.success('員工資訊已更新');
    editDrawerVisible.value = false;
    editingEmployee.value = null;

    await loadEmployees();
  } catch (err: any) {
    message.error(err?.message || '更新失敗');
  } finally {
    saving.value = false;
  }
}

async function handleDeleteEmployee(row: AirwayEmployee) {
  try {
    await updateEmployee(row.id, {
      account_status: 'resigned',
      status: 'resigned'
    });

    message.success(`已將 ${getEmployeeName(row)} 移至離職帳號區`);

    if (selectedEmployee.value?.id === row.id) {
      drawerVisible.value = false;
      selectedEmployee.value = null;
      detail.value = null;
    }

    await loadEmployees();
    accountZone.value = 'departed';
  } catch (err: any) {
    message.error(err?.message || '離職失敗');
  }
}

async function handleAvatarUpload(options: any) {
  const file = options.file?.file;

  if (!file || !selectedEmployee.value?.id) {
    message.error('無法讀取圖片');
    return false;
  }

  if (!file.type?.startsWith('image/')) {
    message.error('只能上傳圖片');
    return false;
  }

  if (file.size > 3 * 1024 * 1024) {
    message.error('圖片不能超過 3MB');
    return false;
  }

  avatarUploading.value = true;

  try {
    const result = await uploadEmployeeAvatar(selectedEmployee.value.id, file);
    message.success('大頭貼已更新');

    selectedEmployee.value = {
      ...selectedEmployee.value,
      avatar_url: result.avatar_url
    };

    if (detail.value?.employee) {
      detail.value.employee = {
        ...detail.value.employee,
        avatar_url: result.avatar_url
      };
    }

    employees.value = employees.value.map(item => {
      if (item.id !== selectedEmployee.value?.id) return item;

      return {
        ...item,
        avatar_url: result.avatar_url
      };
    });

    return false;
  } catch (err: any) {
    message.error(err?.message || '上傳失敗');
    return false;
  } finally {
    avatarUploading.value = false;
  }
}

onMounted(async () => {
  await loadDepartments();
  await loadEmployees();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-20px font-semibold">員工管理</h2>
          <p class="mt-1 text-#888">人員主資料、帳號狀態與入職資訊</p>
        </div>

        <NSpace>
          <NTag type="success">正常 {{ normalEmployeeCount }} 位</NTag>
          <NTag type="error">離職 {{ departedEmployeeCount }} 位</NTag>
          <NTag type="info">全部 {{ employeeCount }} 位</NTag>

          <NButton type="success" ghost @click="exportCurrentEmployees">
            匯出資訊
          </NButton>

          <RouterLink to="/airway/employee-import">
            <NButton>人員資料匯入</NButton>
          </RouterLink>

          <NButton type="primary" :loading="loading" @click="loadEmployees">重新整理</NButton>
        </NSpace>
      </div>
    </NCard>

    <NCard>
      <template #header>
        <div class="employee-card-header">
          <div>
            <div class="card-title">員工清單</div>
            <div class="card-subtitle">
              顯示 {{ filteredEmployeeCount }} / {{ zoneEmployees.length }} 位員工
            </div>
          </div>

          <div class="employee-toolbar">
            <NSpace size="small">
              <NButton
                size="small"
                :type="accountZone === 'normal' ? 'primary' : 'default'"
                @click="accountZone = 'normal'"
              >
                正常帳號
              </NButton>

              <NButton
                size="small"
                :type="accountZone === 'departed' ? 'primary' : 'default'"
                @click="accountZone = 'departed'"
              >
                離職帳號
              </NButton>

              <NButton
                size="small"
                :type="accountZone === 'all' ? 'primary' : 'default'"
                @click="accountZone = 'all'"
              >
                全部
              </NButton>
            </NSpace>

            <NInput
              v-model:value="keyword"
              clearable
              placeholder="搜尋 ID、員編、姓名、Email、部門、職稱"
              class="employee-search"
            />
          </div>
        </div>
      </template>

      <NDataTable
        :columns="columns"
        :data="filteredEmployees"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :bordered="false"
      />
    </NCard>


    <NDrawer v-model:show="createDrawerVisible" :width="560" placement="right">
      <NDrawerContent closable title="新增員工">
        <NForm label-placement="top">
          <NFormItem label="員工編號">
            <NInput v-model:value="createForm.employee_no" placeholder="例如：A00000" />
          </NFormItem>

          <NFormItem label="繁體中文姓名">
            <NInput v-model:value="createForm.chinese_name" placeholder="例如：王小明" />
          </NFormItem>

          <NFormItem label="英文姓名">
            <NInput v-model:value="createForm.english_name" placeholder="例如：Ming Wang" />
          </NFormItem>

          <NFormItem label="公司信箱">
            <NInput v-model:value="createForm.company_email" placeholder="name@example.com" />
          </NFormItem>

          <NFormItem label="部門">
            <NSelect
              v-model:value="createForm.department_id"
              clearable
              filterable
              :loading="departmentLoading"
              :options="departmentOptions"
              placeholder="輸入部門名稱或代碼搜尋，例如 IT、資訊"
            />
          </NFormItem>

          <NFormItem label="職稱">
            <NInput v-model:value="createForm.position_title" placeholder="例如：工程師" />
          </NFormItem>

          <NFormItem label="入職日期">
            <input
              v-model="createForm.onboard_date"
              type="date"
              class="airway-date-input"
            />
          </NFormItem>

          <NFormItem label="帳號狀態">
            <NSelect
              v-model:value="createForm.account_status"
              :options="[
                { label: '正常', value: 'active' },
                { label: '待入職', value: 'pending' },
                { label: '掛職', value: 'suspended' },
                { label: '停用', value: 'disabled' },
                { label: '離職', value: 'resigned' },
                { label: '系統帳號', value: 'system' }
              ]"
            />
          </NFormItem>

          <NFormItem label="主管">
            <NSelect
              v-model:value="createForm.manager_id"
              clearable
              filterable
              :options="managerOptions"
              placeholder="輸入主管姓名、員編、Email 搜尋"
            />
          </NFormItem>

          <NSpace justify="end">
            <NButton @click="createDrawerVisible = false">取消</NButton>
            <NButton type="primary" :loading="creating" @click="handleCreateEmployee">新增</NButton>
          </NSpace>
        </NForm>
      </NDrawerContent>
    </NDrawer>

    <NDrawer v-model:show="editDrawerVisible" :width="560" placement="right">
      <NDrawerContent closable title="編輯員工資訊">
        <NForm label-placement="top">
          <NFormItem label="員工編號">
            <NInput v-model:value="editForm.employee_no" placeholder="例如：A00000" />
          </NFormItem>

          <NFormItem label="繁體中文姓名">
            <NInput v-model:value="editForm.chinese_name" placeholder="例如：馬醫師" />
          </NFormItem>

          <NFormItem label="英文姓名">
            <NInput v-model:value="editForm.english_name" placeholder="例如：Eric Ma" />
          </NFormItem>

          <NFormItem label="公司信箱">
            <NInput v-model:value="editForm.company_email" placeholder="name@example.com" />
          </NFormItem>

          <NFormItem label="部門">
            <NSelect
              v-model:value="editForm.department_id"
              clearable
              filterable
              :loading="departmentLoading"
              :options="departmentOptions"
              placeholder="輸入部門名稱或代碼搜尋，例如 IT、資訊"
            />
          </NFormItem>

          <NFormItem label="職稱">
            <NInput v-model:value="editForm.position_title" placeholder="例如：工程師" />
          </NFormItem>

          <NFormItem label="入職日期">
            <input
              v-model="editForm.onboard_date"
              type="date"
              class="airway-date-input"
            />
          </NFormItem>

          <NFormItem label="帳號狀態">
            <NSelect
              v-model:value="editForm.account_status"
              :options="[
                { label: '正常', value: 'active' },
                { label: '待入職', value: 'pending' },
                { label: '掛職', value: 'suspended' },
                { label: '停用', value: 'disabled' },
                { label: '離職', value: 'resigned' },
                { label: '已刪除', value: 'deleted' },
                { label: '系統帳號', value: 'system' }
              ]"
            />
          </NFormItem>

          <NFormItem label="主管">
            <NSelect
              v-model:value="editForm.manager_id"
              clearable
              filterable
              :options="managerOptions"
              placeholder="輸入主管姓名、員編、Email 搜尋"
            />
          </NFormItem>

          <NSpace justify="end">
            <NButton @click="editDrawerVisible = false">取消</NButton>
            <NButton type="primary" :loading="saving" @click="handleSaveEdit">儲存</NButton>
          </NSpace>
        </NForm>
      </NDrawerContent>
    </NDrawer>

    <NDrawer v-model:show="drawerVisible" :width="620" placement="right">
      <NDrawerContent closable>
        <template #header>
          <div class="drawer-header">
            <div class="avatar-wrap">
              <img
                v-if="getAvatarUrl(selectedEmployee || {})"
                class="avatar-img"
                :src="getAvatarUrl(selectedEmployee || {})"
              />
              <div v-else class="avatar">
                {{ getAvatarText(selectedEmployee || {}) }}
              </div>

              <NUpload
                accept="image/*"
                :show-file-list="false"
                :default-upload="false"
                @before-upload="handleAvatarUpload"
              >
                <NButton size="tiny" class="avatar-edit-btn" :loading="avatarUploading">
                  更換
                </NButton>
              </NUpload>
            </div>

            <div class="drawer-title">
              <div class="name-line">
                <strong>{{ getEmployeeName(selectedEmployee || {}) }}</strong>
                <NTag
                  size="small"
                  :type="statusType(getEffectiveAccountStatus(selectedEmployee || {}))"
                  bordered
                >
                  {{ statusText(getEffectiveAccountStatus(selectedEmployee || {})) }}
                </NTag>
              </div>

              <div class="sub-line">
                {{ selectedEmployee?.employee_no || '-' }} · {{ selectedEmployee?.company_email || '-' }}
              </div>
            </div>
          </div>
        </template>

        <NSpin :show="detailLoading">
          <NTabs v-model:value="activeTab" type="line" animated>
            <NTabPane name="basic" tab="基本資訊">
              <NDescriptions bordered label-placement="left" :column="1">
                <NDescriptionsItem label="內部 ID">
                  {{ selectedEmployee?.id || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="員工編號">
                  {{ selectedEmployee?.employee_no || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="繁體中文姓名">
                  {{ selectedEmployee?.chinese_name || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="英文姓名">
                  {{ selectedEmployee?.english_name || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="信箱">
                  {{ selectedEmployee?.company_email || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="AD 帳號">
                  {{ selectedEmployee?.ad_username || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="帳號狀態">
                  <NTag :type="statusType(getEffectiveAccountStatus(selectedEmployee || {}))" size="small">
                    {{ statusText(getEffectiveAccountStatus(selectedEmployee || {})) }}
                  </NTag>
                </NDescriptionsItem>
              </NDescriptions>
            </NTabPane>

            <NTabPane name="work" tab="工作資訊">
              <NDescriptions bordered label-placement="left" :column="1">
                <NDescriptionsItem label="部門">
                  {{ selectedEmployee?.department_name || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="部門代碼">
                  {{ selectedEmployee?.department_code || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="職稱">
                  {{ getJobTitle(selectedEmployee || {}) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="入職日期">
                  {{ getOnboardDate(selectedEmployee || {}) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="直屬主管">
                  {{ selectedEmployee?.manager_name || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="主管 Email">
                  {{ selectedEmployee?.manager_email || '-' }}
                </NDescriptionsItem>
              </NDescriptions>
            </NTabPane>

            <NTabPane name="login" tab="登入方式">
              <NDescriptions bordered label-placement="left" :column="1">
                <NDescriptionsItem label="M365 帳號">
                  {{ m365Account }}
                </NDescriptionsItem>
                <NDescriptionsItem label="公司信箱">
                  {{ selectedEmployee?.company_email || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="AD 帳號">
                  {{ selectedEmployee?.ad_username || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="帳號狀態">
                  {{ statusText(getEffectiveAccountStatus(selectedEmployee || {})) }}
                </NDescriptionsItem>
              </NDescriptions>
            </NTabPane>

            <NTabPane name="assets" tab="資產設備">
              <NSpace vertical :size="14">
                <NCard size="small" title="筆電">
                  <NEmpty v-if="!laptopAssets.length" description="尚無筆電資料" />
                  <div v-else class="asset-list">
                    <div v-for="asset in laptopAssets" :key="asset.id" class="asset-row">
                      <div>
                        <strong>{{ asset.asset_no || asset.name || '-' }}</strong>
                        <div class="asset-muted">
                          {{ [asset.brand, asset.model, asset.serial_no].filter(Boolean).join(' / ') || '-' }}
                        </div>
                      </div>
                      <div class="asset-side">
                        <NTag size="small" bordered>{{ assetStatusText(asset.status) }}</NTag>
                        <span>{{ asset.assigned_at ? String(asset.assigned_at).slice(0, 10) : '-' }}</span>
                      </div>
                    </div>
                  </div>
                </NCard>

                <NCard size="small" title="螢幕">
                  <NEmpty v-if="!monitorAssets.length" description="尚無螢幕資料" />
                  <div v-else class="asset-list">
                    <div v-for="asset in monitorAssets" :key="asset.id" class="asset-row">
                      <div>
                        <strong>{{ asset.asset_no || asset.name || '-' }}</strong>
                        <div class="asset-muted">
                          {{ [asset.brand, asset.model, asset.serial_no].filter(Boolean).join(' / ') || '-' }}
                        </div>
                      </div>
                      <div class="asset-side">
                        <NTag size="small" bordered>{{ assetStatusText(asset.status) }}</NTag>
                        <span>{{ asset.assigned_at ? String(asset.assigned_at).slice(0, 10) : '-' }}</span>
                      </div>
                    </div>
                  </div>
                </NCard>

                <NCard size="small" title="M365 帳號">
                  <NEmpty v-if="!m365Assets.length && !m365ItAccounts.length" description="尚無 M365 資料" />
                  <div v-else class="asset-list">
                    <div v-for="asset in m365Assets" :key="`asset-${asset.id}`" class="asset-row">
                      <div>
                        <strong>{{ asset.asset_no || asset.name || '-' }}</strong>
                        <div class="asset-muted">
                          {{ [asset.brand, asset.model].filter(Boolean).join(' / ') || '-' }}
                        </div>
                      </div>
                      <div class="asset-side">
                        <NTag size="small" bordered>{{ assetStatusText(asset.status) }}</NTag>
                      </div>
                    </div>

                    <div v-for="account in m365ItAccounts" :key="`account-${account.id}`" class="asset-row">
                      <div>
                        <strong>{{ account.account_email || account.account_name || '-' }}</strong>
                        <div class="asset-muted">
                          {{ [account.system_name, account.role, account.permission_group].filter(Boolean).join(' / ') || '-' }}
                        </div>
                      </div>
                      <div class="asset-side">
                        <NTag size="small" bordered>{{ statusText(account.account_status || account.status) }}</NTag>
                      </div>
                    </div>
                  </div>
                </NCard>

                <NCard v-if="otherAssets.length" size="small" title="其他資產">
                  <div class="asset-list">
                    <div v-for="asset in otherAssets" :key="asset.id" class="asset-row">
                      <div>
                        <strong>{{ assetNameText(asset) }}</strong>
                        <div class="asset-muted">
                          {{ assetTypeText(asset.asset_type) }}｜{{ [asset.brand, asset.model, asset.serial_no].filter(Boolean).join(' / ') || '-' }}
                        </div>
                      </div>
                      <div class="asset-side">
                        <NTag size="small" bordered>{{ assetStatusText(asset.status) }}</NTag>
                      </div>
                    </div>
                  </div>
                </NCard>
              </NSpace>
            </NTabPane>

            <NTabPane name="other" tab="其他">
              <NDescriptions bordered label-placement="left" :column="1">
                <NDescriptionsItem label="使用的筆電資產編號">
                  {{ laptopAssetNo }}
                </NDescriptionsItem>
                <NDescriptionsItem label="IT 帳號數">
                  {{ detail?.itAccounts?.length || 0 }}
                </NDescriptionsItem>
                <NDescriptionsItem label="資產數">
                  {{ detail?.assets?.length || 0 }}
                </NDescriptionsItem>
                <NDescriptionsItem label="流程紀錄數">
                  {{ detail?.workflowRequests?.length || 0 }}
                </NDescriptionsItem>
              </NDescriptions>
            </NTabPane>
          </NTabs>
        </NSpin>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped>
.employee-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
}

.card-subtitle {
  margin-top: 4px;
  color: #8a94a6;
  font-size: 12px;
}

.employee-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.employee-search {
  width: 380px;
}

.employee-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-avatar {
  flex-shrink: 0;
  font-weight: 800;
}

.employee-name-info {
  min-width: 0;
}

.employee-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.employee-sub-line {
  margin-top: 2px;
  color: #8a94a6;
  font-size: 12px;
}

.drawer-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-wrap {
  position: relative;
  width: 62px;
  height: 62px;
  flex-shrink: 0;
}

.avatar,
.avatar-img {
  width: 62px;
  height: 62px;
  border-radius: 999px;
}

.avatar {
  background: linear-gradient(135deg, #22c55e, #84cc16);
  color: white;
  font-size: 24px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  object-fit: cover;
  display: block;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.avatar-edit-btn {
  position: absolute;
  right: -12px;
  bottom: -8px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18);
}

.drawer-title {
  min-width: 0;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-line strong {
  font-size: 18px;
}

.sub-line {
  margin-top: 4px;
  color: #8a94a6;
  font-size: 13px;
}


.asset-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.asset-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  background: #fafbfc;
}

.asset-muted {
  margin-top: 4px;
  color: #8a94a6;
  font-size: 12px;
}

.asset-side {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #667085;
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .employee-card-header {
    align-items: stretch;
    flex-direction: column;
  }

  .employee-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .employee-search {
    width: 100%;
  }
}
</style>
