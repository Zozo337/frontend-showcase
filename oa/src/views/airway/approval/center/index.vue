<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { fetchApprovalInstances, type ApprovalInstance } from '@/service/api/airway/approvals';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const activeScope = ref<'mine' | 'pending' | 'processed' | 'all'>('mine');
const rows = ref<ApprovalInstance[]>([]);

const statusMap: Record<string, { label: string; type: any }> = {
  PENDING: { label: '簽核中', type: 'warning' },
  APPROVED: { label: '已核准', type: 'success' },
  REJECTED: { label: '已拒絕', type: 'error' }
};

const pageTitle = computed(() => {
  if (activeScope.value === 'pending') return '我的待簽';
  if (activeScope.value === 'processed') return '我已處理';
  if (activeScope.value === 'all') return '全部申請';
  return '我的申請';
});

async function loadRows() {
  loading.value = true;
  try {
    rows.value = await fetchApprovalInstances(activeScope.value);
  } catch (err: any) {
    message.error(err?.message || '讀取簽核資料失敗');
  } finally {
    loading.value = false;
  }
}

function goDetail(row: ApprovalInstance) {
  router.push(`/airway/approval/detail/${row.id}`);
}

watch(activeScope, loadRows);
onMounted(loadRows);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <div class="page-head">
        <div>
          <h2 class="title">簽核中心</h2>
          <div class="sub">我的申請、我的待簽、我已處理與管理員全部申請。</div>
        </div>
        <NButton @click="loadRows">重新整理</NButton>
      </div>
    </NCard>

    <NCard>
      <NTabs v-model:value="activeScope" type="line" animated>
        <NTabPane name="mine" tab="我的申請" />
        <NTabPane name="pending" tab="我的待簽" />
        <NTabPane name="processed" tab="我已處理" />
        <NTabPane name="all" tab="全部申請" />
      </NTabs>
    </NCard>

    <NSpin :show="loading">
      <NCard :title="pageTitle">
        <NEmpty v-if="!rows.length" description="目前沒有資料" />
        <div v-else class="instance-list">
          <div v-for="row in rows" :key="row.id" class="instance-card" @click="goDetail(row)">
            <div>
              <div class="instance-title">
                #{{ row.id }} {{ row.template_name }}
                <NTag size="small">{{ row.template_code }}</NTag>
                <NTag size="small" :type="statusMap[row.status]?.type || 'default'">{{ statusMap[row.status]?.label || row.status }}</NTag>
              </div>
              <div class="sub">申請人：{{ row.applicant_name || row.applicant_id }} · 分類：{{ row.category }} · 建立：{{ row.created_at }}</div>
            </div>
            <NButton secondary type="primary">詳細</NButton>
          </div>
        </div>
      </NCard>
    </NSpin>
  </NSpace>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.title { margin: 0; font-size: 24px; font-weight: 800; }
.sub { color: #8a94a6; font-size: 13px; }
.instance-list { display: grid; gap: 12px; }
.instance-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; cursor: pointer; }
.instance-card:hover { border-color: #6366f1; box-shadow: 0 8px 22px rgb(99 102 241 / 12%); }
.instance-title { display: flex; align-items: center; gap: 8px; font-weight: 800; }
</style>
