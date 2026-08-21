<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';

import { fetchAccount, syncAccount, type AirwayAccount } from '@/service/api/airway/accounts';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(false);
const account = ref<AirwayAccount | null>(null);

function employeeName(row?: AirwayAccount | null) {
  if (!row) return '-';
  return row.english_name || row.chinese_name || row.company_email || row.employee_no || '-';
}

async function sync() {
  if (!account.value?.id) return;

  try {
    await syncAccount(Number(account.value.id), 'account.manual_sync');
    message.success('已送出 API 同步');
    await load();
  } catch (err: any) {
    message.error(err?.message || '同步失敗');
  }
}

async function load() {
  loading.value = true;

  try {
    const id = Number(route.params.id);
    const data = await fetchAccount(id);
    account.value = data.account;
  } catch (err: any) {
    message.error(err?.message || '讀取帳號失敗');
    account.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :loading="loading">
      <template #header>
        <div class="header-row">
          <div>
            <h2>帳號詳情</h2>
            <p>{{ account?.account_name || account?.account_email || route.params.id }}</p>
          </div>

          <NSpace>
            <NButton @click="router.back()">返回</NButton>
            <NButton type="primary" :disabled="!account" @click="sync">打 API</NButton>
          </NSpace>
        </div>
      </template>

      <NEmpty v-if="!account && !loading" description="找不到帳號" />

      <template v-if="account">
        <NDescriptions bordered :column="2">
          <NDescriptionsItem label="系統">{{ account.system_name || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="狀態">{{ account.account_status || account.status || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="帳號名稱">{{ account.account_name || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="帳號 Email">{{ account.account_email || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="員工">{{ employeeName(account) }}</NDescriptionsItem>
          <NDescriptionsItem label="部門">{{ [account.department_code, account.department_name].filter(Boolean).join('｜') || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="角色">{{ account.role || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="權限群組">{{ account.permission_group || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="授權方案">{{ account.license_name || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="MFA">{{ account.need_2fa ? '需要' : '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="API 狀態">{{ account.automation_status || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="最後同步">{{ account.automation_synced_at || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="錯誤訊息" :span="2">{{ account.automation_last_error || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="備註" :span="2">{{ account.note || '-' }}</NDescriptionsItem>
        </NDescriptions>
      </template>
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
</style>
