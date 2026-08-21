<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  fetchMyEmployeeProfile,
  resolveAvatarUrl,
  uploadMyAvatar,
  type AirwayEmployee,
  type MyEmployeeProfileResponse
} from '@/service/api/airway/employees';

const message = useMessage();

const loading = ref(false);
const uploadingAvatar = ref(false);
const avatarInputRef = ref<HTMLInputElement | null>(null);
const profile = ref<MyEmployeeProfileResponse | null>(null);

const employee = computed<AirwayEmployee | null>(() => profile.value?.employee || null);
const assets = computed(() => profile.value?.assets || []);
const itAccounts = computed(() => profile.value?.itAccounts || []);

const displayName = computed(() => {
  const row = employee.value;
  return row?.chinese_name || row?.english_name || row?.company_email || row?.employee_no || 'Demo User';
});

const avatarText = computed(() => {
  const name = displayName.value || 'A';
  return name.slice(0, 1).toUpperCase();
});

const avatarUrl = computed(() => resolveAvatarUrl(employee.value?.avatar_url));

const jobTitle = computed(() => {
  const row = employee.value;
  return row?.position_title || row?.job_title || row?.title || row?.position || '-';
});

const onboardDate = computed(() => {
  const row = employee.value;
  return row?.onboard_date || row?.hire_date || row?.start_date || '-';
});

const statusText = computed(() => {
  const status = String(employee.value?.account_status || employee.value?.status || '').toLowerCase();

  const map: Record<string, string> = {
    active: '正常',
    pending: '待入職',
    suspended: '掛職',
    disabled: '停用',
    inactive: '停用',
    resigned: '離職',
    left: '離職',
    deleted: '已刪除',
    system: '系統帳號'
  };

  return map[status] || status || '-';
});

const statusType = computed(() => {
  const status = String(employee.value?.account_status || employee.value?.status || '').toLowerCase();

  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (['disabled', 'inactive', 'resigned', 'left', 'deleted'].includes(status)) return 'error';
  if (status === 'system') return 'info';

  return 'default';
});

function pickAccountName(row: any) {
  return row.account_name || row.username || row.login_name || row.email || row.system_name || row.account_type || '-';
}

function pickAssetNo(row: any) {
  return row.asset_no || row.asset_code || row.serial_no || row.name || row.device_name || row.model || '-';
}

function openAvatarPicker() {
  avatarInputRef.value?.click();
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    message.error('只能上傳圖片');
    input.value = '';
    return;
  }

  if (file.size > 3 * 1024 * 1024) {
    message.error('圖片不能超過 3MB');
    input.value = '';
    return;
  }

  uploadingAvatar.value = true;

  try {
    await uploadMyAvatar(file);
    message.success('大頭貼已更新');
    await loadProfile();
  } catch (err: any) {
    message.error(err?.message || '上傳大頭貼失敗');
  } finally {
    uploadingAvatar.value = false;
    input.value = '';
  }
}

async function loadProfile() {
  loading.value = true;

  try {
    profile.value = await fetchMyEmployeeProfile();
  } catch (err: any) {
    message.error(err?.message || '讀取個人資訊失敗');
    profile.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(loadProfile);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <div class="profile-header">
        <div class="profile-main">
          <div class="avatar-box" @click="openAvatarPicker">
            <NSpin :show="uploadingAvatar">
              <NAvatar v-if="avatarUrl" round :size="72" :src="avatarUrl" />
              <NAvatar v-else round :size="72">
                {{ avatarText }}
              </NAvatar>
            </NSpin>

            <div class="avatar-mask">
              更換
            </div>

            <input
              ref="avatarInputRef"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              @change="handleAvatarChange"
            />
          </div>

          <div>
            <div class="profile-name">
              {{ displayName }}
              <NTag size="small" :type="statusType">
                {{ statusText }}
              </NTag>
            </div>

            <div class="profile-sub">
              {{ employee?.employee_no || '-' }} · {{ employee?.company_email || '-' }}
            </div>

            <div class="profile-sub">
              {{ employee?.department_name || '-' }} / {{ jobTitle }}
            </div>

            <div class="profile-hint">
              點大頭貼可更換圖片，建議使用正方形圖片。
            </div>
          </div>
        </div>

        <NButton type="primary" :loading="loading" @click="loadProfile">
          重新整理
        </NButton>
      </div>
    </NCard>

    <NSpin :show="loading">
      <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi>
          <NCard title="基本資訊">
            <NDescriptions bordered label-placement="left" :column="1">
              <NDescriptionsItem label="內部 ID">
                {{ employee?.id || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="員工編號">
                {{ employee?.employee_no || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="繁體中文姓名">
                {{ employee?.chinese_name || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="英文姓名">
                {{ employee?.english_name || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="公司信箱">
                {{ employee?.company_email || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="AD 帳號">
                {{ employee?.ad_username || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="帳號狀態">
                <NTag size="small" :type="statusType">
                  {{ statusText }}
                </NTag>
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>
        </NGi>

        <NGi>
          <NCard title="工作資訊">
            <NDescriptions bordered label-placement="left" :column="1">
              <NDescriptionsItem label="部門">
                {{ employee?.department_name || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="部門代碼">
                {{ employee?.department_code || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="職稱">
                {{ jobTitle }}
              </NDescriptionsItem>
              <NDescriptionsItem label="入職日期">
                {{ onboardDate }}
              </NDescriptionsItem>
              <NDescriptionsItem label="直屬主管">
                {{ employee?.manager_name || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="主管 Email">
                {{ employee?.manager_email || '-' }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>
        </NGi>

        <NGi>
          <NCard title="IT 帳號">
            <NEmpty v-if="!employee?.ad_username && !itAccounts.length" description="目前沒有帳號紀錄" />

            <NSpace v-else vertical>
              <NCard v-if="employee?.ad_username" size="small">
                <div class="item-title">
                  AD帳號:{{ employee.ad_username }}
                </div>
              </NCard>

              <NCard v-for="item in itAccounts" :key="item.id || item.account_name" size="small">
                <div class="item-title">
                  {{ pickAccountName(item) }}
                </div>
                <div class="item-sub">
                  系統：{{ item.system_name || item.system || item.account_type || '-' }}
                </div>
                <div class="item-sub">
                  狀態：{{ item.account_status || item.status || '-' }}
                </div>
              </NCard>
            </NSpace>
          </NCard>
        </NGi>

        <NGi>
          <NCard title="資產資訊">
            <NEmpty v-if="!assets.length" description="目前沒有資產紀錄" />

            <NSpace v-else vertical>
              <NCard v-for="item in assets" :key="item.id || item.asset_no" size="small">
                <div class="item-title">
                  {{ pickAssetNo(item) }}
                </div>
                <div class="item-sub">
                  類型：{{ item.asset_type || item.category || item.type || '-' }}
                </div>
                <div class="item-sub">
                  狀態：{{ item.asset_status || item.status || '-' }}
                </div>
              </NCard>
            </NSpace>
          </NCard>
        </NGi>
      </NGrid>
    </NSpin>
  </NSpace>
</template>

<style scoped>
.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-box {
  position: relative;
  width: 72px;
  height: 72px;
  cursor: pointer;
  border-radius: 999px;
  overflow: hidden;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  background: rgb(0 0 0 / 48%);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.avatar-box:hover .avatar-mask {
  opacity: 1;
}

.profile-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 800;
}

.profile-sub {
  margin-top: 4px;
  color: #8a94a6;
  font-size: 13px;
}

.profile-hint {
  margin-top: 6px;
  color: #a0a7b5;
  font-size: 12px;
}

.item-title {
  font-weight: 700;
}

.item-sub {
  margin-top: 4px;
  color: #8a94a6;
  font-size: 12px;
}
</style>
