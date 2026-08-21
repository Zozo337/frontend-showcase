<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDialog, useMessage } from 'naive-ui';
import {
  actionApprovalTask,
  fetchApprovalInstance,
  type ApprovalInstance,
  type ApprovalLog,
  type ApprovalTask
} from '@/service/api/airway/approvals';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const acting = ref(false);
const comment = ref('');
const instance = ref<ApprovalInstance | null>(null);
const tasks = ref<ApprovalTask[]>([]);
const logs = ref<ApprovalLog[]>([]);
const currentUserTask = ref<ApprovalTask | null>(null);

const instanceId = computed(() => String(route.params.id || ''));
const statusMap: Record<string, { label: string; type: any }> = {
  PENDING: { label: '簽核中', type: 'warning' },
  APPROVED: { label: '已核准', type: 'success' },
  REJECTED: { label: '已拒絕', type: 'error' }
};

const formData = computed(() => instance.value?.form_data || {});
const schema = computed(() => instance.value?.schema || []);

function valueLabel(value: any) {
  if (Array.isArray(value)) return value.join('、');
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function taskStatusType(status: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'error';
  if (status === 'PENDING') return 'warning';
  return 'default';
}

function actorName(row: any) {
  return row.actor_name || row.actor_english_name || row.actor_email || row.action_by_name || row.assignee_name || row.assignee_english_name || row.assignee_email || '-';
}

async function loadDetail() {
  loading.value = true;
  try {
    const data = await fetchApprovalInstance(instanceId.value);
    instance.value = data.instance;
    tasks.value = data.tasks || [];
    logs.value = data.logs || [];
    currentUserTask.value = data.current_user_task || null;
  } catch (err: any) {
    message.error(err?.message || '讀取申請詳情失敗');
  } finally {
    loading.value = false;
  }
}

function doAction(action: 'APPROVE' | 'REJECT') {
  if (!currentUserTask.value) return;
  dialog.warning({
    title: action === 'APPROVE' ? '同意申請' : '拒絕申請',
    content: action === 'APPROVE' ? '確定同意這筆申請？' : '確定拒絕這筆申請？',
    positiveText: action === 'APPROVE' ? '同意' : '拒絕',
    negativeText: '取消',
    onPositiveClick: async () => {
      acting.value = true;
      try {
        await actionApprovalTask(currentUserTask.value!.id, { action, comment: comment.value });
        message.success(action === 'APPROVE' ? '已同意' : '已拒絕');
        comment.value = '';
        await loadDetail();
      } catch (err: any) {
        message.error(err?.message || '簽核失敗');
      } finally {
        acting.value = false;
      }
    }
  });
}

function goCenter() {
  router.push('/airway/approval/center');
}

onMounted(loadDetail);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <div class="page-head">
        <div>
          <h2 class="title">申請詳情 #{{ instance?.id || instanceId }}</h2>
          <div class="sub">獨立詳情頁，顯示申請資料、簽核任務與操作紀錄。</div>
        </div>
        <NSpace>
          <NButton @click="goCenter">返回簽核中心</NButton>
          <NButton @click="loadDetail">重新整理</NButton>
        </NSpace>
      </div>
    </NCard>

    <NSpin :show="loading">
      <template v-if="instance">
        <NCard>
          <div class="instance-head">
            <div>
              <h2>{{ instance.template_name }}</h2>
              <div class="sub">{{ instance.template_code }} · {{ instance.category }} · 申請人：{{ instance.applicant_name }}</div>
            </div>
            <NTag :type="statusMap[instance.status]?.type || 'default'" size="large">{{ statusMap[instance.status]?.label || instance.status }}</NTag>
          </div>
        </NCard>

        <NGrid :cols="12" :x-gap="16" :y-gap="16" responsive="screen">
          <NGi :span="7">
            <NCard title="申請內容">
              <div class="data-grid">
                <div v-for="field in schema" :key="field.key" class="data-row">
                  <div class="data-label">{{ field.label }}</div>
                  <div class="data-value">{{ valueLabel(formData[field.key]) }}</div>
                </div>
              </div>
            </NCard>

            <NCard title="簽核紀錄" class="mt-16px">
              <NEmpty v-if="!logs.length" description="尚無紀錄" />
              <NTimeline v-else>
                <NTimelineItem v-for="log in logs" :key="log.id" :title="log.action" :time="log.created_at">
                  <div>{{ log.step_name || '' }} {{ log.comment || '' }}</div>
                  <div class="sub">處理人：{{ actorName(log) }}</div>
                </NTimelineItem>
              </NTimeline>
            </NCard>
          </NGi>

          <NGi :span="5">
            <NCard title="流程任務">
              <NEmpty v-if="!tasks.length" description="尚無任務" />
              <div v-else class="task-list">
                <div v-for="task in tasks" :key="task.id" class="task-card">
                  <div class="task-title">
                    {{ task.step_name || `第 ${task.step_index + 1} 關` }}
                    <NTag size="small" :type="taskStatusType(task.status)">{{ task.status }}</NTag>
                  </div>
                  <div class="sub">簽核人：{{ actorName(task) }} · 建立：{{ task.created_at }}</div>
                  <div v-if="task.comment" class="sub">留言：{{ task.comment }}</div>
                </div>
              </div>
            </NCard>

            <NCard v-if="currentUserTask" title="簽核動作" class="mt-16px">
              <NForm label-placement="top">
                <NFormItem label="留言">
                  <NInput v-model:value="comment" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" placeholder="可輸入簽核意見" />
                </NFormItem>
              </NForm>
              <NSpace justify="end">
                <NButton type="error" secondary :loading="acting" @click="doAction('REJECT')">拒絕</NButton>
                <NButton type="primary" :loading="acting" @click="doAction('APPROVE')">同意</NButton>
              </NSpace>
            </NCard>
          </NGi>
        </NGrid>
      </template>
      <NCard v-else><NEmpty description="找不到申請" /></NCard>
    </NSpin>
  </NSpace>
</template>

<style scoped>
.page-head,
.instance-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.title { margin: 0; font-size: 24px; font-weight: 800; }
.sub { color: #8a94a6; font-size: 13px; }
.instance-head h2 { margin: 0 0 6px; }
.data-grid { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
.data-row { display: grid; grid-template-columns: 180px 1fr; border-bottom: 1px solid #e5e7eb; }
.data-row:last-child { border-bottom: none; }
.data-label { padding: 12px; background: #f8fafc; font-weight: 700; }
.data-value { padding: 12px; white-space: pre-wrap; }
.task-list { display: grid; gap: 10px; }
.task-card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 12px; }
.task-title { display: flex; gap: 8px; align-items: center; font-weight: 800; margin-bottom: 6px; }
.mt-16px { margin-top: 16px; }
</style>
