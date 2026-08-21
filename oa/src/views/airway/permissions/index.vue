<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, NSpace, NTag, useMessage } from 'naive-ui';

import {
  createSimpleAclRole,
  createSoftInstallerGrant,
  deleteSimpleAclRole,
  fetchSimplePermissionConfig,
  fetchSoftInstallerGrantDefaults,
  fetchSoftInstallerGrants,
  updateSimpleAclRole,
  updateSoftInstallerGrant,
  updateSimpleSuperAdmins,
  type SimpleAclRole,
  type SimplePermissionPage,
  type SoftInstallerGrant
} from '@/service/api/airway/permissions';
import { fetchEmployeeLookup, type AirwayEmployee } from '@/service/api/airway/employees';

defineOptions({ name: 'AirwayPermissions' });

const message = useMessage();

const loading = ref(false);
const savingSuper = ref(false);
const savingRole = ref(false);
const drawerVisible = ref(false);
const editingRole = ref<SimpleAclRole | null>(null);
const softInstallerDrawerVisible = ref(false);
const savingSoftInstaller = ref(false);
const loadingSoftInstallerDefaults = ref(false);
const editingSoftInstallerGrant = ref<SoftInstallerGrant | null>(null);
const softInstallerComputerOptions = ref<Array<{ label: string; value: string }>>([]);
let softInstallerDefaultsRequest = 0;

const pages = ref<SimplePermissionPage[]>([]);
const roles = ref<SimpleAclRole[]>([]);
const employees = ref<AirwayEmployee[]>([]);
const superAdmins = ref<any[]>([]);
const superAdminIds = ref<number[]>([]);
const softInstallerGrants = ref<SoftInstallerGrant[]>([]);

const roleForm = reactive({
  name: '',
  description: '',
  is_default_all: false,
  page_keys: [] as string[],
  employee_ids: [] as number[]
});

const softInstallerForm = reactive({
  employeeId: null as number | null,
  userSid: '',
  account: '',
  computerName: '',
  validFrom: null as number | null,
  expiresAt: null as number | null,
  revoked: false
});

const mergedEmployeeOptions = computed(() => {
  const map = new Map<number, any>();

  function addEmployee(emp: any) {
    const id = Number(emp?.id);
    if (!id) return;

    map.set(id, {
      label: [
        emp.employee_no || '',
        emp.english_name || emp.chinese_name || emp.company_email || `#${id}`,
        emp.department_name || emp.department_code || '',
        emp.company_email || ''
      ].filter(Boolean).join('｜'),
      value: id
    });
  }

  employees.value.forEach(addEmployee);
  superAdmins.value.forEach(addEmployee);
  roles.value.forEach(role => {
    (role.members || []).forEach(addEmployee);
  });

  return Array.from(map.values()).sort((a, b) => String(a.label).localeCompare(String(b.label)));
});

function pageLabel(key: string) {
  return pages.value.find(page => page.key === key)?.label || key;
}

function memberLabel(member: any) {
  return [
    member.employee_no || '',
    member.english_name || member.chinese_name || member.company_email || `#${member.id}`,
    member.department_name || member.department_code || ''
  ].filter(Boolean).join('｜');
}

async function load() {
  loading.value = true;

  try {
    const [config, employeeRows] = await Promise.all([
      fetchSimplePermissionConfig(),
      fetchEmployeeLookup({ limit: 2000, includeInactive: true, includeDeleted: true })
    ]);

    pages.value = config.pages || [];
    roles.value = config.roles || [];
    superAdmins.value = config.super_admins || [];
    superAdminIds.value = (config.super_admin_ids || []).map(Number);
    employees.value = employeeRows || [];

    try {
      softInstallerGrants.value = await fetchSoftInstallerGrants();
    } catch (err: any) {
      softInstallerGrants.value = [];
      message.warning(err?.message || 'SoftInstaller 權限尚未完成 migration');
    }
  } catch (err: any) {
    message.error(err?.message || '讀取權限設定失敗');
  } finally {
    loading.value = false;
  }
}

async function saveSuperAdmins() {
  savingSuper.value = true;

  try {
    const result: any = await updateSimpleSuperAdmins(superAdminIds.value);

    if (Array.isArray(result?.employee_ids)) {
      superAdminIds.value = result.employee_ids.map(Number);
    }

    message.success('超級管理員已更新');
    await load();
  } catch (err: any) {
    message.error(err?.message || '更新超級管理員失敗');
  } finally {
    savingSuper.value = false;
  }
}

function resetRoleForm() {
  editingRole.value = null;
  roleForm.name = '';
  roleForm.description = '';
  roleForm.is_default_all = false;
  roleForm.page_keys = [];
  roleForm.employee_ids = [];
}

function openCreateRole() {
  resetRoleForm();
  drawerVisible.value = true;
}

function openEditRole(role: SimpleAclRole) {
  editingRole.value = role;
  roleForm.name = role.name || '';
  roleForm.description = role.description || '';
  roleForm.is_default_all = Number(role.is_default_all || 0) === 1 || role.is_default_all === true;
  roleForm.page_keys = [...(role.page_keys || [])];
  roleForm.employee_ids = roleForm.is_default_all ? [] : [...(role.member_ids || [])].map(Number);
  drawerVisible.value = true;
}

async function saveRole() {
  if (!roleForm.name.trim()) {
    message.warning('請輸入角色名稱');
    return;
  }

  savingRole.value = true;

  try {
    const payload = {
      name: roleForm.name.trim(),
      description: roleForm.description.trim() || null,
      page_keys: roleForm.page_keys,
      employee_ids: roleForm.is_default_all ? [] : roleForm.employee_ids,
      is_default_all: roleForm.is_default_all
    };

    if (editingRole.value?.id) {
      await updateSimpleAclRole(editingRole.value.id, payload);
      message.success('角色已更新');
    } else {
      await createSimpleAclRole(payload);
      message.success('角色已建立');
    }

    drawerVisible.value = false;
    await load();
  } catch (err: any) {
    message.error(err?.message || '儲存角色失敗');
  } finally {
    savingRole.value = false;
  }
}

async function removeRole(role: SimpleAclRole) {
  try {
    await deleteSimpleAclRole(role.id);
    message.success('角色已停用');
    await load();
  } catch (err: any) {
    message.error(err?.message || '刪除角色失敗');
  }
}

function dateValue(value?: string | null) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatDateTime(value?: string | null) {
  const timestamp = dateValue(value);
  if (!timestamp) return '-';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(timestamp);
}

function softInstallerEmployeeLabel(row: SoftInstallerGrant) {
  return row.english_name || row.chinese_name || row.applicant_name || row.company_email || row.employee_no || `#${row.applicant_id || row.id}`;
}

function softInstallerState(row: SoftInstallerGrant) {
  if (row.revoked_at) return { text: '已撤銷', type: 'error' as const };
  if (String(row.status || '').toUpperCase() !== 'APPROVED') return { text: '未核准', type: 'warning' as const };
  const now = Date.now();
  const validFrom = dateValue(row.valid_from);
  const expiresAt = dateValue(row.expires_at);
  if (!validFrom || !expiresAt) return { text: '資料不完整', type: 'error' as const };
  if (now < validFrom) return { text: '尚未生效', type: 'info' as const };
  if (now > expiresAt) return { text: '已過期', type: 'default' as const };
  return { text: '授權有效', type: 'success' as const };
}

function openSoftInstallerGrant(row: SoftInstallerGrant) {
  editingSoftInstallerGrant.value = row;
  softInstallerForm.employeeId = row.applicant_id ? Number(row.applicant_id) : null;
  softInstallerForm.userSid = row.user_sid || '';
  softInstallerForm.account = row.account || '';
  softInstallerForm.computerName = row.computer_name || '';
  softInstallerForm.validFrom = dateValue(row.valid_from);
  softInstallerForm.expiresAt = dateValue(row.expires_at);
  softInstallerForm.revoked = Boolean(row.revoked_at);
  softInstallerComputerOptions.value = row.computer_name
    ? [{ label: row.computer_name, value: row.computer_name }]
    : [];
  softInstallerDrawerVisible.value = true;
}

function openCreateSoftInstallerGrant() {
  editingSoftInstallerGrant.value = null;
  softInstallerForm.employeeId = null;
  softInstallerForm.userSid = '';
  softInstallerForm.account = '';
  softInstallerForm.computerName = '';
  softInstallerForm.validFrom = Date.now();
  softInstallerForm.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  softInstallerForm.revoked = false;
  softInstallerComputerOptions.value = [];
  softInstallerDrawerVisible.value = true;
}

async function loadSoftInstallerEmployeeDefaults(employeeId: number | null) {
  const requestId = ++softInstallerDefaultsRequest;
  softInstallerForm.userSid = '';
  softInstallerForm.account = '';
  softInstallerForm.computerName = '';
  softInstallerComputerOptions.value = [];
  if (!employeeId) return;

  loadingSoftInstallerDefaults.value = true;
  try {
    const defaults = await fetchSoftInstallerGrantDefaults(Number(employeeId));
    if (requestId !== softInstallerDefaultsRequest || Number(softInstallerForm.employeeId) !== Number(employeeId)) return;
    softInstallerForm.userSid = defaults.userSid || '';
    softInstallerForm.account = defaults.account || '';
    softInstallerForm.computerName = defaults.computerName || '';
    softInstallerComputerOptions.value = (defaults.computers || []).map(item => ({
      label: item.label || item.value,
      value: item.value
    }));
  } catch (err: any) {
    if (requestId === softInstallerDefaultsRequest) {
      message.error(err?.message || '無法從 AD 與員工管理帶入授權資料');
    }
  } finally {
    if (requestId === softInstallerDefaultsRequest) loadingSoftInstallerDefaults.value = false;
  }
}

async function saveSoftInstallerGrant() {
  const grant = editingSoftInstallerGrant.value;
  if (
    (!grant?.id && !softInstallerForm.employeeId) ||
    !softInstallerForm.userSid.trim() ||
    !softInstallerForm.account.trim() ||
    !softInstallerForm.computerName.trim() ||
    !softInstallerForm.validFrom ||
    !softInstallerForm.expiresAt
  ) {
    message.warning('請完整填寫 SID、帳號、電腦與授權期間');
    return;
  }
  if (softInstallerForm.expiresAt <= softInstallerForm.validFrom) {
    message.warning('到期時間必須晚於生效時間');
    return;
  }

  savingSoftInstaller.value = true;
  try {
    const payload = {
      userSid: softInstallerForm.userSid.trim(),
      account: softInstallerForm.account.trim(),
      computerName: softInstallerForm.computerName.trim(),
      validFrom: new Date(softInstallerForm.validFrom).toISOString(),
      expiresAt: new Date(softInstallerForm.expiresAt).toISOString(),
    };

    if (grant?.id) {
      await updateSoftInstallerGrant(grant.id, { ...payload, revoked: softInstallerForm.revoked });
      message.success('SoftInstaller 權限已更新');
    } else {
      await createSoftInstallerGrant({
        employeeId: Number(softInstallerForm.employeeId),
        computerName: payload.computerName,
        validFrom: payload.validFrom,
        expiresAt: payload.expiresAt
      });
      message.success('SoftInstaller 權限已手動建立');
    }
    softInstallerDrawerVisible.value = false;
    softInstallerGrants.value = await fetchSoftInstallerGrants();
  } catch (err: any) {
    message.error(err?.message || `${grant?.id ? '更新' : '建立'} SoftInstaller 權限失敗`);
  } finally {
    savingSoftInstaller.value = false;
  }
}

const roleColumns: DataTableColumns<SimpleAclRole> = [
  {
    title: '角色',
    key: 'name',
    width: 260,
    render(row) {
      return h('div', { class: 'role-cell' }, [
        h('strong', row.name),
        row.is_default_all ? h(NTag, { bordered: false, type: 'success', size: 'small' }, { default: () => '預設全員' }) : null,
        row.description ? h('span', { class: 'muted' }, row.description) : null
      ]);
    }
  },
  {
    title: '可看頁面',
    key: 'page_keys',
    minWidth: 420,
    render(row) {
      const pageKeys = row.page_keys || [];

      if (!pageKeys.length) {
        return h('span', { class: 'muted' }, '尚未勾選頁面');
      }

      return h(
        NSpace,
        { size: 6, wrap: true },
        {
          default: () =>
            pageKeys.map(key =>
              h(NTag, { key, bordered: false, type: 'info' }, { default: () => pageLabel(key) })
            )
        }
      );
    }
  },
  {
    title: '套用人員',
    key: 'members',
    minWidth: 360,
    render(row) {
      if (Number(row.is_default_all || 0) === 1 || row.is_default_all === true) {
        return h(NTag, { bordered: false, type: 'success' }, { default: () => '預設全員，含日後新人' });
      }

      const members = row.members || [];

      if (!members.length) {
        return h('span', { class: 'muted' }, '尚未選擇人員');
      }

      const visible = members.slice(0, 4);
      const hidden = members.length - visible.length;

      return h('div', { class: 'member-list' }, [
        ...visible.map(member => h(NTag, { bordered: false }, { default: () => memberLabel(member) })),
        hidden > 0 ? h(NTag, { bordered: false, type: 'warning' }, { default: () => `+${hidden}` }) : null
      ]);
    }
  },
  {
    title: '頁面數',
    key: 'page_count',
    width: 90,
    render(row) {
      return h(NTag, { bordered: false, type: 'info' }, { default: () => String((row.page_keys || []).length) });
    }
  },
  {
    title: '人數',
    key: 'member_count',
    width: 90,
    render(row) {
      return h(NTag, { bordered: false, type: 'success' }, { default: () => (Number(row.is_default_all || 0) === 1 || row.is_default_all === true ? '全員' : String((row.member_ids || []).length)) });
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row) {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => openEditRole(row) }, { default: () => '編輯' }),
          h(NPopconfirm, { onPositiveClick: () => removeRole(row) }, {
            trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => '停用' }),
            default: () => `確定停用角色「${row.name}」？`
          })
        ]
      });
    }
  }
];

const softInstallerColumns: DataTableColumns<SoftInstallerGrant> = [
  {
    title: '申請人',
    key: 'applicant',
    minWidth: 180,
    render: row => h('div', { class: 'role-cell' }, [
      h('strong', softInstallerEmployeeLabel(row)),
      h('span', { class: 'muted' }, row.request_no || `申請 #${row.id}`)
    ])
  },
  { title: 'AD 帳號', key: 'account', minWidth: 180, render: row => row.account || '-' },
  { title: '電腦', key: 'computer_name', minWidth: 130, render: row => row.computer_name || '-' },
  {
    title: '授權期間',
    key: 'period',
    minWidth: 250,
    render: row => h('div', { class: 'role-cell' }, [
      h('span', `起：${formatDateTime(row.valid_from)}`),
      h('span', `迄：${formatDateTime(row.expires_at)}`)
    ])
  },
  {
    title: '狀態',
    key: 'authorization_status',
    width: 110,
    render(row) {
      const state = softInstallerState(row);
      return h(NTag, { bordered: false, type: state.type }, { default: () => state.text });
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: row => h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => openSoftInstallerGrant(row) }, { default: () => '編輯' })
  }
];

onMounted(load);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false" class="hero">
      <div class="hero-row">
        <div>
          <div class="eyebrow">Demo OA / Role ACL</div>
          <h2>權限控管</h2>
          <p>
            權限只分兩層：超級管理員全開；其他人透過自訂角色取得頁面可見權限。
          </p>
        </div>

        <NSpace>
          <NButton :loading="loading" @click="load">重新整理</NButton>
          <NButton type="primary" @click="openCreateRole">新建角色</NButton>
        </NSpace>
      </div>
    </NCard>

    <NCard title="超級管理員">
      <NSpace vertical :size="12">
        <NAlert type="warning" :bordered="false">
          超級管理員擁有全部頁面與權限控管能力。至少要保留一位，避免把自己鎖在外面。
        </NAlert>

        <NSelect
          v-model:value="superAdminIds"
          multiple
          filterable
          clearable
          :options="mergedEmployeeOptions"
          placeholder="選擇超級管理員"
          :max-tag-count="8"
        />

        <NSpace justify="end">
          <NButton type="primary" :loading="savingSuper" @click="saveSuperAdmins">
            儲存超級管理員
          </NButton>
        </NSpace>
      </NSpace>
    </NCard>

    <NCard>
      <template #header>
        <div class="card-header">
          <span>自訂角色</span>
          <NButton type="primary" ghost @click="openCreateRole">新建角色</NButton>
        </div>
      </template>

      <NDataTable
        :columns="roleColumns"
        :data="roles"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :pagination="{ pageSize: 10 }"
      />
    </NCard>

    <NCard>
      <template #header>
        <div class="card-header">
          <span>SoftInstaller 權限</span>
          <NSpace align="center">
            <NTag type="info" :bordered="false">來源：申請簽核或手動授權</NTag>
            <NButton type="primary" ghost @click="openCreateSoftInstallerGrant">手動新增</NButton>
          </NSpace>
        </div>
      </template>

      <NSpace vertical :size="12">
        <NAlert type="info" :bordered="false">
          這裡只管理 SoftInstaller 申請的 SID、AD 帳號、電腦、有效期間與撤銷狀態，不授予任何 OA 頁面權限。
          未核准、未生效、已過期、已撤銷或資料不完整時，客戶端查詢一律拒絕。
          手動新增會直接建立已核准授權紀錄，不建立申請表或簽核任務，並保留建立者與異動紀錄。
        </NAlert>
        <NDataTable
          :columns="softInstallerColumns"
          :data="softInstallerGrants"
          :loading="loading"
          :bordered="false"
          :single-line="false"
          :pagination="{ pageSize: 10 }"
        />
      </NSpace>
    </NCard>

    <NDrawer v-model:show="drawerVisible" :width="720" placement="right">
      <NDrawerContent closable :title="editingRole ? '編輯角色' : '新建角色'">
        <NSpace vertical :size="16">
          <NForm label-placement="top">
            <NFormItem label="角色名稱" required>
              <NInput v-model:value="roleForm.name" placeholder="例如：行政總務、資產管理員、主管可看申請" />
            </NFormItem>

            <NFormItem label="角色說明">
              <NInput v-model:value="roleForm.description" type="textarea" :autosize="{ minRows: 2 }" />
            </NFormItem>

            <NFormItem label="可查看頁面">
              <NCheckboxGroup v-model:value="roleForm.page_keys">
                <div class="page-check-grid">
                  <NCheckbox
                    v-for="page in pages"
                    :key="page.key"
                    :value="page.key"
                    class="page-check-card"
                  >
                    <div class="page-check-content">
                      <strong>{{ page.label }}</strong>
                      <span>{{ page.path }}</span>
                      <small>{{ page.description }}</small>
                    </div>
                  </NCheckbox>
                </div>
              </NCheckboxGroup>
            </NFormItem>

            <NFormItem label="套用方式">
              <NSpace vertical :size="8">
                <NSwitch v-model:value="roleForm.is_default_all" />
                <NAlert type="info" :bordered="false">
                  開啟後，此角色會自動套用所有員工，日後新增員工也會自動擁有這個角色，不需要手動加人。
                </NAlert>
              </NSpace>
            </NFormItem>

            <NFormItem v-if="!roleForm.is_default_all" label="套用人員">
              <NSelect
                v-model:value="roleForm.employee_ids"
                multiple
                filterable
                clearable
                :options="mergedEmployeeOptions"
                placeholder="選擇哪些人套用這個角色"
                :max-tag-count="8"
              />
            </NFormItem>

            <NFormItem v-else label="套用人員">
              <NTag type="success" :bordered="false">預設全員，包含日後新人</NTag>
            </NFormItem>
          </NForm>

          <NSpace justify="end">
            <NButton @click="drawerVisible = false">取消</NButton>
            <NButton type="primary" :loading="savingRole" @click="saveRole">
              儲存角色
            </NButton>
          </NSpace>
        </NSpace>
      </NDrawerContent>
    </NDrawer>

    <NDrawer v-model:show="softInstallerDrawerVisible" :width="640" placement="right">
      <NDrawerContent closable :title="editingSoftInstallerGrant ? '編輯 SoftInstaller 權限' : '手動新增 SoftInstaller 權限'">
        <NSpace vertical :size="16">
          <NAlert type="warning" :bordered="false">
            {{ editingSoftInstallerGrant
              ? '此資料直接對應 OA 申請紀錄。撤銷後，SoftInstaller 下一次查詢會立即被拒絕。'
              : '選擇人員後會從 AD 自動帶入帳號與 SID，並從員工管理的配發資產帶入電腦；後端建立時會再查一次，不採信前端自行填入的身分資料。' }}
          </NAlert>

          <NForm label-placement="top">
            <NFormItem label="授權人員" required>
              <NSelect
                v-model:value="softInstallerForm.employeeId"
                filterable
                clearable
                :disabled="Boolean(editingSoftInstallerGrant)"
                :options="mergedEmployeeOptions"
                placeholder="選擇授權人員"
                @update:value="loadSoftInstallerEmployeeDefaults"
              />
            </NFormItem>
            <NFormItem label="Windows 使用者 SID" required>
              <NInput
                v-model:value="softInstallerForm.userSid"
                :disabled="!editingSoftInstallerGrant"
                placeholder="選擇人員後由 AD 自動帶入"
              />
            </NFormItem>
            <NFormItem label="AD 帳號" required>
              <NInput
                v-model:value="softInstallerForm.account"
                :disabled="!editingSoftInstallerGrant"
                placeholder="選擇人員後由 AD 自動帶入"
              />
            </NFormItem>
            <NFormItem label="授權電腦" required>
              <NInput
                v-if="editingSoftInstallerGrant"
                v-model:value="softInstallerForm.computerName"
                placeholder="PC-001"
              />
              <NSelect
                v-else
                v-model:value="softInstallerForm.computerName"
                :options="softInstallerComputerOptions"
                :loading="loadingSoftInstallerDefaults"
                :disabled="!softInstallerForm.employeeId"
                placeholder="由員工管理的配發電腦自動帶入"
              />
            </NFormItem>
            <NFormItem label="生效時間" required>
              <NDatePicker v-model:value="softInstallerForm.validFrom" type="datetime" clearable class="w-full" />
            </NFormItem>
            <NFormItem label="到期時間" required>
              <NDatePicker v-model:value="softInstallerForm.expiresAt" type="datetime" clearable class="w-full" />
            </NFormItem>
            <NFormItem v-if="editingSoftInstallerGrant" label="撤銷授權">
              <NSpace align="center">
                <NSwitch v-model:value="softInstallerForm.revoked" />
                <span class="muted">開啟即代表撤銷；關閉可恢復原授權期間。</span>
              </NSpace>
            </NFormItem>
          </NForm>

          <NSpace justify="end">
            <NButton @click="softInstallerDrawerVisible = false">取消</NButton>
            <NButton type="primary" :loading="savingSoftInstaller" @click="saveSoftInstallerGrant">儲存</NButton>
          </NSpace>
        </NSpace>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.14), transparent 34%),
    linear-gradient(135deg, #ffffff, #f8faff);
}

.hero-row,
.card-header {
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

.role-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.muted {
  color: #8a94a6;
  font-size: 12px;
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}


.page-check-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.page-check-card {
  width: 100%;
  min-height: 74px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-sizing: border-box;
}

.page-check-card:hover {
  border-color: #6366f1;
  background: #f8faff;
}

.page-check-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1.35;
}

.page-check-content strong {
  color: #111827;
  font-size: 14px;
}

.page-check-content span {
  color: #4f46e5;
  font-size: 12px;
}

.page-check-content small {
  color: #8a94a6;
  font-size: 12px;
}

@media (max-width: 960px) {
  .hero-row,
  .card-header {
    align-items: stretch;
    flex-direction: column;
  }

  .page-check-grid {
    grid-template-columns: 1fr;
  }
}
</style>
