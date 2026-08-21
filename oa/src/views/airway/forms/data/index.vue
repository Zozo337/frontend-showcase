<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NTag, useMessage } from 'naive-ui';
import { fetchApprovalData, fetchLarkTemplates, type ApprovalInstance, type LarkTemplate } from '@/service/api/airway/lark-forms';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const templates = ref<LarkTemplate[]>([]);
const rows = ref<ApprovalInstance[]>([]);

const selectedTemplate = ref<number | null>(null);
const status = ref<string | null>(null);
const applicantKeyword = ref('');
const handlerKeyword = ref('');
const keyword = ref('');
const createdRange = ref<[number, number] | null>(null);
const completedRange = ref<[number, number] | null>(null);

const statusOptions = [
  { label: '審核中', value: 'PENDING' },
  { label: '已通過', value: 'APPROVED' },
  { label: '已拒絕', value: 'REJECTED' }
];

const templateOptions = computed(() =>
  templates.value.map(item => ({
    label: item.form_name || item.name || `#${item.id}`,
    value: Number(item.id)
  }))
);

function statusText(value?: string | null) {
  return {
    PENDING: '審核中',
    APPROVED: '已通過',
    REJECTED: '已拒絕',
    CANCELLED: '已取消'
  }[String(value || '').toUpperCase()] || value || '-';
}

function statusType(value?: string | null) {
  const v = String(value || '').toUpperCase();

  if (v === 'APPROVED') return 'success';
  if (v === 'REJECTED') return 'error';
  if (v === 'PENDING') return 'warning';

  return 'default';
}

function dateTimeText(value?: string | null) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 19);
}

function rangeStart(range: [number, number] | null) {
  if (!range?.[0]) return undefined;

  const d = new Date(range[0]);
  d.setHours(0, 0, 0, 0);

  return d.toISOString();
}

function rangeEnd(range: [number, number] | null) {
  if (!range?.[1]) return undefined;

  const d = new Date(range[1]);
  d.setHours(23, 59, 59, 999);

  return d.toISOString();
}

function currentHandlers(row: ApprovalInstance) {
  return (row.current_handlers || []).filter(Boolean).join('、') || '-';
}

const columns = [
  {
    title: '審批名稱',
    key: 'template_name',
    minWidth: 180
  },
  {
    title: '申請編號',
    key: 'id',
    width: 120,
    render: (row: ApprovalInstance) => `#${row.id}`
  },
  {
    title: '提交人',
    key: 'applicant_name',
    minWidth: 140,
    render: (row: ApprovalInstance) => row.applicant_name || '-'
  },
  {
    title: '狀態',
    key: 'status',
    width: 110,
    render: (row: ApprovalInstance) =>
      h(NTag, { type: statusType(row.status), bordered: false }, { default: () => statusText(row.status) })
  },
  {
    title: '當前審批人',
    key: 'current_handlers',
    minWidth: 180,
    render: (row: ApprovalInstance) => currentHandlers(row)
  },
  {
    title: '提交時間',
    key: 'created_at',
    minWidth: 170,
    render: (row: ApprovalInstance) => dateTimeText(row.created_at)
  },
  {
    title: '完成時間',
    key: 'completed_at',
    minWidth: 170,
    render: (row: ApprovalInstance) => dateTimeText(row.completed_at)
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row: ApprovalInstance) =>
      h(
        'a',
        {
          class: 'link',
          href: `/airway/forms/center?id=${row.id}`,
          title: `查看申請單 #${row.id}`,
          onClick: (event: MouseEvent) => {
            event.preventDefault();
            router.push(`/airway/forms/center?id=${row.id}`);
          }
        },
        '查看'
      )
  }
];

function buildQuery() {
  return {
    template_id: selectedTemplate.value,
    status: status.value,
    applicant: applicantKeyword.value.trim(),
    handler: handlerKeyword.value.trim(),
    keyword: keyword.value.trim(),
    created_start: rangeStart(createdRange.value),
    created_end: rangeEnd(createdRange.value),
    completed_start: rangeStart(completedRange.value),
    completed_end: rangeEnd(completedRange.value),
    limit: 1000
  };
}

async function loadTemplates() {
  const templateData = await fetchLarkTemplates({ includeDisabled: true });
  templates.value = templateData.templates || [];
}

async function queryData() {
  loading.value = true;

  try {
    const data = await fetchApprovalData(buildQuery());
    rows.value = data.instances || [];
  } catch (error: any) {
    message.error(error?.message || '查詢審批資料失敗');
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function load() {
  loading.value = true;

  try {
    const [, data] = await Promise.all([
      loadTemplates(),
      fetchApprovalData({ limit: 500 })
    ]);
    rows.value = data.instances || [];
  } catch (error: any) {
    message.error(error?.message || '讀取數據管理失敗');
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  selectedTemplate.value = null;
  status.value = null;
  applicantKeyword.value = '';
  handlerKeyword.value = '';
  keyword.value = '';
  createdRange.value = null;
  completedRange.value = null;
  queryData();
}

onMounted(load);
</script>

<template>
  <div class="admin-page">
    <div class="admin-topbar">
      <strong>流程控制中心</strong>
    </div>

    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="side-item" @click="router.push('/airway/forms/designer')">審批管理</div>
        <div class="side-item active">數據管理</div>
        <div class="side-sub active">數據查看</div>
        <div class="side-sub">審批交接</div>
        <div class="side-item" @click="router.push('/airway/forms/permissions')">權限管理</div>
      </aside>

      <main class="data-main">
        <NTabs type="line">
          <NTabPane name="data" tab="數據管理">
            <div class="filter-grid">
              <NFormItem label="審批名稱">
                <NSelect
                  v-model:value="selectedTemplate"
                  filterable
                  clearable
                  :options="templateOptions"
                  placeholder="請搜索或選擇"
                />
              </NFormItem>

              <NFormItem label="狀態">
                <NSelect
                  v-model:value="status"
                  clearable
                  :options="statusOptions"
                  placeholder="全部狀態"
                />
              </NFormItem>

              <NFormItem label="提交人">
                <NInput
                  v-model:value="applicantKeyword"
                  clearable
                  placeholder="請搜索人員姓名 / 工號 / Email"
                  @keyup.enter="queryData"
                />
              </NFormItem>

              <NFormItem label="當前審批人">
                <NInput
                  v-model:value="handlerKeyword"
                  clearable
                  placeholder="請搜索目前待審人員"
                  @keyup.enter="queryData"
                />
              </NFormItem>

              <NFormItem label="提交時間">
                <NDatePicker v-model:value="createdRange" type="daterange" class="w-full" clearable />
              </NFormItem>

              <NFormItem label="完成時間">
                <NDatePicker v-model:value="completedRange" type="daterange" class="w-full" clearable />
              </NFormItem>

              <NFormItem label="關鍵字">
                <NInput
                  v-model:value="keyword"
                  clearable
                  placeholder="申請編號、審批名稱、申請內容"
                  @keyup.enter="queryData"
                />
              </NFormItem>
            </div>

            <div class="query-actions">
              <NButton @click="resetQuery">重置</NButton>
              <NButton type="primary" :loading="loading" @click="queryData">查詢</NButton>
            </div>

            <div class="table-head">
              共找到 {{ rows.length }} 條記錄
            </div>

            <NDataTable
              :loading="loading"
              :columns="columns"
              :data="rows"
              :pagination="{ pageSize: 10 }"
              :bordered="false"
              :single-line="false"
            />
          </NTabPane>

          <NTabPane name="export" tab="導出記錄">
            <NEmpty description="導出記錄下一包補" />
          </NTabPane>

          <NTabPane name="intervene" tab="流程干預記錄">
            <NEmpty description="流程干預記錄下一包補" />
          </NTabPane>
        </NTabs>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 64px);
  background: #fff;
}

.admin-topbar {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 24px;
  border-bottom: 1px solid #edf0f5;
}

.admin-layout {
  display: flex;
}

.admin-sidebar {
  width: 184px;
  min-height: calc(100vh - 120px);
  padding: 16px 0;
  border-right: 1px solid #edf0f5;
  background: #f6f7fb;
}

.side-item,
.side-sub {
  display: flex;
  align-items: center;
  height: 48px;
  padding-left: 24px;
  cursor: pointer;
}

.side-sub {
  padding-left: 48px;
  font-size: 13px;
}

.side-item.active,
.side-sub.active {
  border-left: 3px solid #2563eb;
  background: #eaf1ff;
  color: #2563eb;
  font-weight: 700;
}

.data-main {
  width: min(1280px, calc(100% - 220px));
  margin: 0 auto;
  padding: 34px 0;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 40px;
  margin-top: 28px;
}

.query-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin: 18px 0 32px;
  text-align: center;
}

.table-head {
  margin-bottom: 10px;
  color: #4b5563;
}

.w-full {
  width: 100%;
}

.link {
  color: #2563eb;
  cursor: pointer;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

@media (max-width: 960px) {
  .admin-layout {
    flex-direction: column;
  }

  .admin-sidebar {
    width: 100%;
    min-height: auto;
  }

  .data-main {
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
