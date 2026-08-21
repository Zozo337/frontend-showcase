<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, NSpace, NTag, useMessage } from 'naive-ui';

import {
  deleteAccount,
  fetchAccounts,
  syncAccount,
  type AirwayAccount
} from '@/service/api/airway/accounts';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(false);
const keyword = ref('');
const statusFilter = ref('all');
const rows = ref<AirwayAccount[]>([]);

const systemTabs = [
  { name: 'gws', label: 'GWS', path: '/airway/accounts/gws' },
  { name: 'aws', label: 'AWS', path: '/airway/accounts/aws' },
  { name: 'm365', label: 'M365', path: '/airway/accounts/m365' }
];

const statusOptions = [
  { label: '全部狀態', value: 'all' },
  { label: '待建立', value: 'pending_create' },
  { label: '已啟用', value: 'active' },
  { label: '待停用', value: 'pending_disable' },
  { label: '已停用', value: 'disabled' },
  { label: '待刪除', value: 'pending_delete' },
  { label: '已刪除', value: 'deleted' },
  { label: 'API 失敗', value: 'api_failed' }
];

const system = computed(() => {
  const path = route.path;

  if (path.includes('/aws')) return 'aws';
  if (path.includes('/m365')) return 'm365';

  return 'gws';
});

const systemTitle = computed(() => systemTabs.find(item => item.name === system.value)?.label || '帳號');

const stats = computed(() => {
  const total = rows.value.length;
  const active = rows.value.filter(item => item.account_status === 'active' || item.status === 'active').length;
  const pending = rows.value.filter(item => String(item.account_status || item.status || '').startsWith('pending')).length;
  const failed = rows.value.filter(item => item.account_status === 'api_failed' || item.automation_status === 'failed').length;

  return { total, active, pending, failed };
});

function accountStatus(row: AirwayAccount) {
  return String(row.account_status || row.status || '-');
}

function statusText(value?: string | null) {
  return {
    pending_create: '待建立',
    active: '已啟用',
    pending_disable: '待停用',
    disabled: '已停用',
    pending_delete: '待刪除',
    deleted: '已刪除',
    api_failed: 'API 失敗',
    assigned: 'assigned'
  }[String(value || '')] || value || '-';
}

function statusType(value?: string | null) {
  if (value === 'active' || value === 'assigned') return 'success';
  if (String(value || '').startsWith('pending')) return 'info';
  if (value === 'disabled') return 'warning';
  if (value === 'deleted' || value === 'api_failed') return 'error';

  return 'default';
}

function employeeName(row: AirwayAccount) {
  return row.english_name || row.chinese_name || row.company_email || row.employee_no || '-';
}

function openNew() {
  router.push({
    path: '/airway/accounts/new',
    query: { system: system.value }
  });
}

function openDetail(row: AirwayAccount) {
  if (String(row.id).startsWith('legacy-')) {
    message.info('這筆是從舊 assets.m365 兼容顯示，後續 migration 後會變正式帳號資料');
    return;
  }

  router.push(`/airway/accounts/detail/${row.id}`);
}

async function handleSync(row: AirwayAccount) {
  if (String(row.id).startsWith('legacy-')) {
    message.warning('舊 M365 資料請先 migration 到帳號表後再打 API');
    return;
  }

  try {
    await syncAccount(Number(row.id), 'account.manual_sync');
    message.success('已送出 API 同步');
    await load();
  } catch (err: any) {
    message.error(err?.message || '同步失敗');
  }
}

async function handleDelete(row: AirwayAccount) {
  if (String(row.id).startsWith('legacy-')) {
    message.warning('舊 M365 資料不能在帳號管理直接刪除');
    return;
  }

  try {
    await deleteAccount(Number(row.id));
    message.success('帳號已封存');
    await load();
  } catch (err: any) {
    message.error(err?.message || '刪除失敗');
  }
}

async function load() {
  loading.value = true;

  try {
    rows.value = await fetchAccounts({
      system: system.value,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      q: keyword.value.trim() || undefined,
      includeDeleted: true
    });
  } catch (err: any) {
    message.error(err?.message || '讀取帳號失敗');
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

function rawAccountText(row: any) {
  return String(
    row.account_name ||
    row.account_email ||
    row.account ||
    row.username ||
    row.login_account ||
    row.loginAccount ||
    ''
  ).trim();
}

function extractSharedAccount(row: any) {
  const text = rawAccountText(row);

  const known = text.match(/[A-Z0-9._%+-]+@example\.com/i);
  if (known?.[0]) return known[0];

  const generic = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (generic?.[0]) return generic[0];

  return text || '未命名共用帳號';
}

function extractMemberEmail(row: any) {
  if (row.company_email) return row.company_email;

  const text = rawAccountText(row);
  const shared = extractSharedAccount(row);
  const rest = text.slice(text.indexOf(shared) + shared.length);
  const email = rest.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  return email?.[0] || row.employee_email || row.user_email || row.email || '';
}

function memberDepartment(row: any) {
  return [row.department_code, row.department_name].filter(Boolean).join('｜') || row.department || '-';
}

function memberRole(row: any) {
  return row.role || row.permission_group || row.license_name || row.note || '-';
}

const m365Groups = computed(() => {
  const map = new Map<string, any>();

  rows.value.forEach(row => {
    const account = extractSharedAccount(row);

    if (!map.has(account)) {
      map.set(account, {
        account,
        members: []
      });
    }

    const group = map.get(account);

    group.members.push({
      id: row.id,
      name: employeeName(row),
      email: extractMemberEmail(row),
      department: memberDepartment(row),
      title: row.title || row.job_title || row.jobTitle || '',
      role: memberRole(row),
      status: accountStatus(row),
      api: row.automation_status || (row.legacy_source ? 'legacy' : 'pending'),
      raw: row
    });
  });

  return Array.from(map.values())
    .map(group => {
      const seen = new Set<string>();

      group.members = group.members.filter((member: any) => {
        const key = String(member.email || member.name || member.id).toLowerCase();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      });

      group.memberCount = group.members.length;

      return group;
    })
    .sort((a, b) => a.account.localeCompare(b.account));
});

const m365MemberTotal = computed(() =>
  m365Groups.value.reduce((sum, group) => sum + Number(group.memberCount || 0), 0)
);

const columns = computed<DataTableColumns<AirwayAccount>>(() => [
  {
    title: '帳號',
    key: 'account_name',
    minWidth: 280,
    render(row) {
      return h('div', { class: 'main-cell' }, [
        h('strong', row.account_name || row.account_email || '-'),
        h('span', { class: 'muted' }, row.account_email || row.legacy_source || '-')
      ]);
    }
  },
  {
    title: '人員',
    key: 'employee',
    minWidth: 220,
    render(row) {
      return h('div', [
        h('strong', employeeName(row)),
        h('div', { class: 'muted' }, memberDepartment(row))
      ]);
    }
  },
  {
    title: '角色 / 權限',
    key: 'role',
    minWidth: 220,
    render(row) {
      return h('div', [
        h('strong', row.role || row.permission_group || '-'),
        h('div', { class: 'muted' }, row.license_name || '-')
      ]);
    }
  },
  {
    title: 'MFA',
    key: 'need_2fa',
    width: 100,
    render(row) {
      return row.need_2fa ? '需要' : '-';
    }
  },
  {
    title: '狀態',
    key: 'account_status',
    width: 120,
    render(row) {
      const status = accountStatus(row);
      return h(NTag, { type: statusType(status), bordered: false }, { default: () => statusText(status) });
    }
  },
  {
    title: 'API',
    key: 'automation_status',
    width: 130,
    render(row) {
      const status = row.automation_status || (row.legacy_source ? 'legacy' : 'pending');
      return h(NTag, {
        type: status === 'success' ? 'success' : status === 'failed' ? 'error' : status === 'skipped' || status === 'legacy' ? 'warning' : 'default',
        bordered: false
      }, { default: () => status });
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    fixed: 'right',
    render(row) {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => openDetail(row) }, { default: () => '詳情' }),
          h(NButton, { size: 'small', ghost: true, onClick: () => handleSync(row) }, { default: () => '打 API' }),
          h(NPopconfirm, { onPositiveClick: () => handleDelete(row) }, {
            trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => '封存' }),
            default: () => `確定封存 ${row.account_name || row.account_email || '此帳號'}？`
          })
        ]
      });
    }
  }
]);

const m365MemberColumns: DataTableColumns<any> = [
  { title: '人員', key: 'name', minWidth: 180 },
  { title: 'Email', key: 'email', minWidth: 240 },
  { title: '部門', key: 'department', minWidth: 160 },
  { title: '職稱', key: 'title', minWidth: 160 },
  { title: '角色 / 權限', key: 'role', minWidth: 180 },
  {
    title: '狀態',
    key: 'status',
    width: 110,
    render(row) {
      return h(NTag, { type: statusType(row.status), bordered: false }, { default: () => statusText(row.status) });
    }
  },
  {
    title: 'API',
    key: 'api',
    width: 110,
    render(row) {
      return h(NTag, { type: row.api === 'success' ? 'success' : row.api === 'failed' ? 'error' : row.api === 'legacy' ? 'warning' : 'default', bordered: false }, { default: () => row.api || '-' });
    }
  }
];

watch(() => route.path, load);
watch(statusFilter, load);

onMounted(load);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false" class="hero">
      <div class="hero-row">
        <div>
          <div class="eyebrow">Demo OA / Account Control</div>
          <h2>帳號管理</h2>
          <p>管理 GWS、AWS、M365 帳號。M365 會依共用帳號分組，顯示每個帳號底下掛了誰與掛載人數。</p>
        </div>

        <NSpace>
          <NButton :loading="loading" @click="load">重新整理</NButton>
          <NButton type="primary" @click="openNew">新增 {{ systemTitle }} 帳號</NButton>
        </NSpace>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <span>{{ system === 'm365' ? '掛載資料筆數' : '本系統總數' }}</span>
          <strong>{{ stats.total }}</strong>
        </div>
        <div class="stat-card">
          <span>{{ system === 'm365' ? '共用帳號數' : '已啟用' }}</span>
          <strong>{{ system === 'm365' ? m365Groups.length : stats.active }}</strong>
        </div>
        <div class="stat-card">
          <span>{{ system === 'm365' ? '掛載人數' : '待處理' }}</span>
          <strong>{{ system === 'm365' ? m365MemberTotal : stats.pending }}</strong>
        </div>
        <div class="stat-card danger">
          <span>API 失敗</span>
          <strong>{{ stats.failed }}</strong>
        </div>
      </div>
    </NCard>

    <NCard>
      <template #header>
        <div class="toolbar">
          <NTabs :value="system" type="segment" @update:value="value => router.push(systemTabs.find(item => item.name === value)?.path || '/airway/accounts/gws')">
            <NTab v-for="item in systemTabs" :key="item.name" :name="item.name">
              {{ item.label }}
            </NTab>
          </NTabs>

          <NSpace wrap>
            <NSelect v-model:value="statusFilter" class="status-filter" :options="statusOptions" />
            <NInput
              v-model:value="keyword"
              clearable
              class="search"
              placeholder="搜尋帳號、Email、員工、角色"
              @keyup.enter="load"
            />
            <NButton @click="load">搜尋</NButton>
          </NSpace>
        </div>
      </template>

      <template v-if="system === 'm365'">
        <div class="m365-summary-row">
          <div class="m365-summary-card">
            <span>共用帳號數</span>
            <strong>{{ m365Groups.length }}</strong>
          </div>
          <div class="m365-summary-card">
            <span>掛載人數</span>
            <strong>{{ m365MemberTotal }}</strong>
          </div>
        </div>

        <div class="m365-group-list">
          <NCard
            v-for="group in m365Groups"
            :key="group.account"
            class="m365-group-card"
            :bordered="false"
          >
            <template #header>
              <div class="m365-group-head">
                <div>
                  <div class="m365-account">{{ group.account }}</div>
                  <div class="m365-muted">M365 共用帳號</div>
                </div>

                <NTag type="info" :bordered="false">
                  {{ group.memberCount }} 人
                </NTag>
              </div>
            </template>

            <NDataTable
              :columns="m365MemberColumns"
              :data="group.members"
              :bordered="false"
              :single-line="false"
              :pagination="group.members.length > 8 ? { pageSize: 8 } : false"
            />
          </NCard>

          <NEmpty v-if="!m365Groups.length" description="沒有 M365 共用帳號資料" />
        </div>
      </template>

      <NDataTable
        v-else
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :bordered="false"
        :single-line="false"
      />
    </NCard>
  </NSpace>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(circle at top right, rgba(34, 197, 94, 0.14), transparent 34%),
    linear-gradient(135deg, #ffffff, #f7fff9);
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
.muted,
.m365-muted {
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
  width: 320px;
}

.status-filter {
  width: 140px;
}

.main-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.m365-summary-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 220px));
  gap: 12px;
  margin-bottom: 16px;
}

.m365-summary-card {
  padding: 14px 16px;
  border: 1px solid #edf0f5;
  border-radius: 12px;
  background: #fff;
}

.m365-summary-card span {
  display: block;
  color: #8a94a6;
  font-size: 12px;
}

.m365-summary-card strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
  font-weight: 800;
}

.m365-group-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.m365-group-card {
  border: 1px solid #edf0f5;
  border-radius: 14px;
  overflow: hidden;
}

.m365-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.m365-account {
  font-size: 17px;
  font-weight: 800;
}

@media (max-width: 960px) {
  .hero-row,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .stat-grid,
  .m365-summary-row {
    grid-template-columns: 1fr;
  }

  .search {
    width: 100%;
  }
}
</style>
