<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';

import { fetchAssetByCode, type AirwayAsset } from '@/service/api/airway/assets';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(false);
const asset = ref<AirwayAsset | null>(null);

const assetNo = computed(() => decodeURIComponent(String(route.params.assetNo || '')));

function ownerName(row?: AirwayAsset | null) {
  if (!row) return '-';
  return row.english_name || row.chinese_name || row.company_email || row.employee_no || '-';
}

function qrText(row?: AirwayAsset | null) {
  if (!row) return '';
  return row.qr_text || row.qr_url || `${window.location.origin}/airway/assets/detail/${encodeURIComponent(String(row.asset_no || row.id))}`;
}

function assetHostname(row?: AirwayAsset | null) {
  if (!row?.extra_json) return '-';
  try {
    const extra = typeof row.extra_json === 'string' ? JSON.parse(row.extra_json) : row.extra_json;
    return extra.computer_name || extra.computerName || extra.hostname || extra.host_name || extra.device_name || extra.deviceName || '-';
  } catch {
    return '-';
  }
}

async function copyQr() {
  if (!asset.value) return;
  await navigator.clipboard.writeText(qrText(asset.value));
  message.success('QR 文本已複製');
}

async function load() {
  loading.value = true;

  try {
    const data = await fetchAssetByCode(assetNo.value);
    asset.value = data.asset;
  } catch (err: any) {
    message.error(err?.message || '讀取資產失敗');
    asset.value = null;
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
            <h2>資產詳情</h2>
            <p>{{ assetNo }}</p>
          </div>

          <NSpace>
            <NButton @click="router.back()">返回</NButton>
            <NButton :disabled="!asset" @click="copyQr">複製 QR 文本</NButton>
          </NSpace>
        </div>
      </template>

      <NEmpty v-if="!asset && !loading" description="找不到資產" />

      <template v-if="asset">
        <NDescriptions bordered :column="2">
          <NDescriptionsItem label="資產編號">{{ asset.asset_no || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="分類">{{ asset.asset_category || asset.asset_type || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="名稱">{{ asset.name || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="狀態">{{ asset.status || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="品牌">{{ asset.brand || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="型號">{{ asset.model || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="序號">{{ asset.serial_no || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="電腦 Hostname">{{ assetHostname(asset) }}</NDescriptionsItem>
          <NDescriptionsItem label="位置">{{ asset.location || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="保管人">{{ ownerName(asset) }}</NDescriptionsItem>
          <NDescriptionsItem label="部門">{{ [asset.department_code, asset.department_name].filter(Boolean).join('｜') || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="資料狀態">{{ asset.automation_status || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="最後同步">{{ asset.automation_synced_at || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="QR 文本" :span="2">{{ qrText(asset) }}</NDescriptionsItem>
          <NDescriptionsItem label="備註" :span="2">{{ asset.note || '-' }}</NDescriptionsItem>
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
