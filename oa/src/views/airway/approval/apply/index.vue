<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { fetchApprovalTemplates, type ApprovalCategory, type ApprovalTemplate } from '@/service/api/airway/approvals';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const activeCategory = ref<ApprovalCategory>('HR');
const templates = ref<ApprovalTemplate[]>([]);

const categories = [
  { key: 'HR', title: 'HR 申請', desc: '人員異動、入職、離職、請假等人事流程', icon: '人' },
  { key: 'IT', title: 'IT 申請', desc: '帳號、權限、設備、系統需求', icon: '資' },
  { key: 'GA', title: '總務申請', desc: '門禁卡、名片、座位、庶務支援', icon: '總' }
] as const;

const currentCategory = computed(() => categories.find(item => item.key === activeCategory.value) || categories[0]);
const filteredTemplates = computed(() => templates.value.filter(item => item.category === activeCategory.value));

async function loadTemplates() {
  loading.value = true;
  try {
    templates.value = await fetchApprovalTemplates({ includeDisabled: false });
  } catch (err: any) {
    message.error(err?.message || '讀取申請表單失敗');
  } finally {
    loading.value = false;
  }
}

function goFill(template: ApprovalTemplate) {
  router.push(`/airway/approval/apply/${template.id}`);
}

onMounted(loadTemplates);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <div class="page-head">
        <div>
          <h2 class="title">我要申請</h2>
          <div class="sub">選擇已啟用的表單模板，填寫後會自動進入審批流程。</div>
        </div>
        <NButton @click="loadTemplates">重新整理</NButton>
      </div>
    </NCard>

    <NCard>
      <NTabs v-model:value="activeCategory" type="line" animated>
        <NTabPane name="HR" tab="HR 申請" />
        <NTabPane name="IT" tab="IT 申請" />
        <NTabPane name="GA" tab="總務申請" />
      </NTabs>
    </NCard>

    <NCard>
      <div class="category-hero">
        <div class="hero-icon">{{ currentCategory.icon }}</div>
        <div>
          <h2>{{ currentCategory.title }}</h2>
          <div class="sub">{{ currentCategory.desc }}</div>
        </div>
      </div>
    </NCard>

    <NSpin :show="loading">
      <NCard title="可申請表單">
        <NEmpty v-if="!filteredTemplates.length" description="目前沒有可申請表單" />

        <div v-else class="template-list">
          <div v-for="template in filteredTemplates" :key="template.id" class="template-card">
            <div>
              <div class="template-title">
                {{ template.template_name }}
                <NTag size="small" type="info">{{ template.template_code }}</NTag>
              </div>
              <div class="template-desc">{{ template.description || '尚未填寫表單說明' }}</div>
              <div class="template-meta">欄位 {{ template.schema?.length || 0 }} 個 · 流程 {{ template.process?.length || 0 }} 關</div>
            </div>
            <NButton type="primary" secondary @click="goFill(template)">申請</NButton>
          </div>
        </div>
      </NCard>
    </NSpin>
  </NSpace>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}

.sub,
.template-desc,
.template-meta {
  color: #8a94a6;
  font-size: 13px;
}

.category-hero {
  display: flex;
  gap: 16px;
  align-items: center;
}

.hero-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  color: #4f46e5;
  font-size: 30px;
  font-weight: 900;
  background: #eef2ff;
  border-radius: 18px;
}

.category-hero h2 {
  margin: 0 0 6px;
}

.template-list {
  display: grid;
  gap: 12px;
}

.template-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
}

.template-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 16px;
  font-weight: 800;
}

.template-desc {
  margin-top: 6px;
}

.template-meta {
  margin-top: 8px;
}
</style>
