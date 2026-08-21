<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NTag, useMessage } from 'naive-ui';
import {
  adPermissionReportDownloadUrl,
  fetchAdPermissionLive,
  runAdPermissionReport,
  saveAdPermissionSettings,
  type AdChangeRow,
  type AdGroupRow,
  type AdReport,
  type AdUserRow
} from '@/service/api/airway/ad-permissions';

defineOptions({ name: 'AirwayAdPermissions' });

const message = useMessage();

const loading = ref(false);
const running = ref(false);
const savingWebhook = ref(false);

const latest = ref<AdReport | null>(null);
const configured = ref(false);
const missingConfig = ref<string[]>([]);
const templateExists = ref(false);
const templatePath = ref('');
const cron = ref('');
const timezone = ref('');
const webhookUrl = ref('');

const users = ref<AdUserRow[]>([]);
const groups = ref<AdGroupRow[]>([]);
const changes = ref<AdChangeRow[]>([]);

const keyword = ref('');

const filteredUsers = computed(() => {
  const q = keyword.value.trim().toLowerCase();

  if (!q) return users.value;

  return users.value.filter(row =>
    [
      row.employee_no,
      row.name,
      row.sam,
      row.email,
      row.department,
      row.title,
      row.view_permission,
      row.edit_permission,
      ...(row.groups || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  );
});

const filteredGroups = computed(() => {
  const q = keyword.value.trim().toLowerCase();

  if (!q) return groups.value;

  return groups.value.filter(row =>
    [
      row.group_name,
      row.description,
      ...(row.members || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  );
});

const filteredChanges = computed(() => {
  const q = keyword.value.trim().toLowerCase();

  if (!q) return changes.value;

  return changes.value.filter(row =>
    Object.values(row)
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  );
});

function dateText(value?: string) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 19);
}

function statusType(value?: string) {
  if (value === 'success') return 'success';
  if (value === 'failed') return 'error';
  if (value === 'running') return 'warning';

  return 'default';
}

function statusText(value?: string) {
  if (value === 'success') return '成功';
  if (value === 'failed') return '失敗';
  if (value === 'running') return '產生中';

  return value || '-';
}

function webhookType(value?: string) {
  if (value === 'success') return 'success';
  if (value === 'failed') return 'error';
  if (value === 'skipped') return 'default';

  return 'default';
}


function sleep(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function applyLiveData(data: any) {
  latest.value = data.latest;
  configured.value = data.configured;
  missingConfig.value = data.missing_config || [];
  templateExists.value = data.template_exists;
  templatePath.value = data.template_path;
  cron.value = data.cron;
  timezone.value = data.timezone;
  webhookUrl.value = data.settings?.webhook_url || webhookUrl.value || '';

  users.value = data.tables?.users || [];
  groups.value = data.tables?.groups || [];
  changes.value = data.tables?.changes || [];
}

function downloadLatest() {
  if (!latest.value?.id) return;
  window.location.href = adPermissionReportDownloadUrl(latest.value.id);
}

async function load() {
  loading.value = true;

  try {
    const data = await fetchAdPermissionLive();
    applyLiveData(data);
  } catch (error: any) {
    message.error(error?.message || '讀取 AD 權限資料失敗');
  } finally {
    loading.value = false;
  }
}

async function saveWebhook() {
  savingWebhook.value = true;

  try {
    await saveAdPermissionSettings({
      webhook_url: webhookUrl.value.trim()
    });

    message.success('Webhook 已儲存');
  } catch (error: any) {
    message.error(error?.message || '儲存 Webhook 失敗');
  } finally {
    savingWebhook.value = false;
  }
}

async function runNow() {
  running.value = true;

  try {
    await runAdPermissionReport({
      webhook_url: webhookUrl.value.trim(),
      save_webhook: true
    });

    message.success('AD 權限同步已開始，背景產生 Excel 中');

    // 輪詢後端狀態，讓畫面 right now 更新，不靠下載
    for (let i = 0; i < 90; i += 1) {
      await sleep(2000);

      const data = await fetchAdPermissionLive();
      applyLiveData(data);

      if (!data.running && data.latest?.status && data.latest.status !== 'running') {
        if (data.latest.status === 'success') {
          message.success('AD 權限同步完成，畫面已更新，Excel 已產生');
        } else if (data.latest.status === 'failed') {
          message.error(data.latest.message || 'AD 權限同步失敗');
        }

        break;
      }
    }
  } catch (error: any) {
    message.error(error?.message || 'AD 權限同步啟動失敗');
  } finally {
    running.value = false;
  }
}

const userColumns: DataTableColumns<AdUserRow> = [
  { title: 'Item', key: 'item', width: 70 },
  { title: 'Employee number', key: 'employee_no', width: 150 },
  { title: 'Name', key: 'name', width: 180 },
  { title: 'SAM', key: 'sam', width: 150 },
  { title: 'Email', key: 'email', width: 240 },
  { title: 'Department', key: 'department', width: 180 },
  { title: 'Title', key: 'title', width: 180 },
  {
    title: '權限 (瀏覽)',
    key: 'view_permission',
    minWidth: 280,
    render(row) {
      return row.view_permission || '-';
    }
  },
  {
    title: '權限 (編輯)',
    key: 'edit_permission',
    minWidth: 280,
    render(row) {
      return row.edit_permission || '-';
    }
  },
  {
    title: 'AD Groups',
    key: 'groups',
    minWidth: 360,
    render(row) {
      const list = row.groups || [];
      if (!list.length) return '-';

      return h(
        'div',
        { class: 'tag-list' },
        list.slice(0, 8).map(name =>
          h(NTag, { bordered: false, size: 'small' }, { default: () => name })
        ).concat(list.length > 8 ? [
          h(NTag, { bordered: false, size: 'small', type: 'warning' }, { default: () => `+${list.length - 8}` })
        ] : [])
      );
    }
  }
];

const groupColumns: DataTableColumns<AdGroupRow> = [
  { title: '序號', key: 'item', width: 70 },
  { title: 'AD 群組名稱', key: 'group_name', width: 320 },
  { title: '成員數', key: 'member_count', width: 90 },
  {
    title: 'AD 群組成員',
    key: 'members',
    minWidth: 520,
    render(row) {
      const list = row.members || [];
      if (!list.length) return '-';

      return h(
        'div',
        { class: 'member-lines' },
        list.slice(0, 30).map(name => h('div', name)).concat(list.length > 30 ? [h('div', `... +${list.length - 30}`)] : [])
      );
    }
  },
  { title: '備註說明', key: 'description', minWidth: 260 }
];

const changeColumns: DataTableColumns<AdChangeRow> = [
  { title: 'Item', key: 'item', width: 70 },
  { title: '異動類型', key: 'change_type', width: 110 },
  { title: 'Employee number', key: 'employee_no', width: 150 },
  { title: 'Name', key: 'name', width: 180 },
  { title: 'SAM', key: 'sam', width: 150 },
  { title: 'Email', key: 'email', width: 240 },
  { title: 'Department', key: 'department', width: 180 },
  { title: '權限 (瀏覽)', key: 'view_permission', minWidth: 260 },
  { title: '權限 (編輯)', key: 'edit_permission', minWidth: 260 },
  { title: 'Before', key: 'before', minWidth: 360 },
  { title: 'After', key: 'after', minWidth: 360 }
];

onMounted(load);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false" class="hero">
      <div class="hero-row">
        <div>
          <div class="eyebrow">Demo OA / AD Permission Demo</div>
          <h2>AD權限</h2>
          <p>
            這頁會直接讀取 AD 使用者 / 群組並顯示在畫面上，同步完成後同時產生 Excel。
            下載 Excel 是選擇性動作，不會強迫下載。
          </p>
        </div>

        <NSpace>
          <NButton :loading="loading" @click="load">重新整理</NButton>
          <NButton
            type="primary"
            :loading="running"
            :disabled="!configured"
            @click="runNow"
          >
            立即同步 AD 並產生 Excel
          </NButton>
          <NButton
            type="success"
            ghost
            :disabled="!latest?.id || latest?.status !== 'success'"
            @click="downloadLatest"
          >
            下載最新 Excel
          </NButton>
        </NSpace>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <span>AD 設定</span>
          <strong :class="{ danger: !configured }">{{ configured ? '已設定' : '未完成' }}</strong>
        </div>
        <div class="stat-card">
          <span>Excel 模板</span>
          <strong :class="{ danger: !templateExists }">{{ templateExists ? '存在' : '找不到' }}</strong>
        </div>
        <div class="stat-card">
          <span>最新使用者</span>
          <strong>{{ users.length }}</strong>
        </div>
        <div class="stat-card">
          <span>最新群組</span>
          <strong>{{ groups.length }}</strong>
        </div>
        <div class="stat-card">
          <span>最新異動</span>
          <strong>{{ changes.length }}</strong>
        </div>
      </div>
    </NCard>

    <NAlert v-if="!configured" type="error" :bordered="false">
      AD 連線設定還沒完整：{{ missingConfig.join('、') }}
    </NAlert>

    <NAlert v-if="!templateExists" type="warning" :bordered="false">
      找不到 Excel 模板：{{ templatePath }}
    </NAlert>

    <NCard>
      <template #header>
        <div class="card-header">
          <span>Webhook</span>
          <NTag v-if="latest?.webhook_status" :type="webhookType(latest.webhook_status)" :bordered="false">
            {{ latest.webhook_status }}
          </NTag>
        </div>
      </template>

      <NSpace vertical :size="10">
        <NSpace align="center">
          <NInput
            v-model:value="webhookUrl"
            class="webhook-input"
            clearable
            placeholder="產生 Excel 完成後要 POST 的 Webhook URL，例如 n8n Webhook"
          />
          <NButton :loading="savingWebhook" @click="saveWebhook">儲存</NButton>
        </NSpace>

        <div class="muted">
          Webhook 會在 Excel 產生完成後送出 JSON，包含 report id、檔名、使用者數、群組數、異動數、下載 URL。
        </div>

        <div v-if="latest?.webhook_message" class="webhook-msg">
          {{ latest.webhook_message }}
        </div>
      </NSpace>
    </NCard>

    <NCard>
      <template #header>
        <div class="card-header">
          <span>目前報告</span>
          <NSpace>
            <NTag :bordered="false" :type="statusType(latest?.status)">
              {{ statusText(latest?.status) }}
            </NTag>
            <span class="muted">完成時間：{{ dateText(latest?.completed_at) }}</span>
            <span class="muted">每日排程：{{ cron }} / {{ timezone }}</span>
          </NSpace>
        </div>
      </template>

      <NInput
        v-model:value="keyword"
        clearable
        class="search"
        placeholder="搜尋使用者、Email、部門、群組、權限..."
      />

      <NTabs type="line" animated class="mt-16">
        <NTabPane name="users" tab="網域權限">
          <NDataTable
            :columns="userColumns"
            :data="filteredUsers"
            :loading="loading || running"
            :bordered="false"
            :single-line="false"
            :scroll-x="2200"
            :pagination="{ pageSize: 20 }"
          />
        </NTabPane>

        <NTabPane name="groups" tab="AD 群組">
          <NDataTable
            :columns="groupColumns"
            :data="filteredGroups"
            :loading="loading || running"
            :bordered="false"
            :single-line="false"
            :scroll-x="1300"
            :pagination="{ pageSize: 20 }"
          />
        </NTabPane>

        <NTabPane name="changes" tab="修改部分">
          <NDataTable
            :columns="changeColumns"
            :data="filteredChanges"
            :loading="loading || running"
            :bordered="false"
            :single-line="false"
            :scroll-x="2200"
            :pagination="{ pageSize: 20 }"
          />
        </NTabPane>
      </NTabs>
    </NCard>
  </NSpace>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.14), transparent 34%),
    linear-gradient(135deg, #ffffff, #f7faff);
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
  max-width: 960px;
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.7;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.stat-card {
  padding: 16px;
  border: 1px solid #edf0f5;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
}

.stat-card span {
  color: #8a94a6;
  font-size: 12px;
}

.stat-card strong {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  font-weight: 800;
}

.danger {
  color: #dc2626;
}

.webhook-input {
  width: min(780px, 72vw);
}

.webhook-msg {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  color: #667085;
  font-size: 12px;
  word-break: break-all;
}

.muted {
  color: #8a94a6;
  font-size: 12px;
}

.search {
  width: min(520px, 100%);
}

.mt-16 {
  margin-top: 16px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.member-lines {
  max-height: 260px;
  overflow: auto;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .hero-row,
  .card-header {
    align-items: stretch;
    flex-direction: column;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }

  .webhook-input {
    width: 100%;
  }
}
</style>
