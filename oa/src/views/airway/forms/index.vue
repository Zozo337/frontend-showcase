<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { fetchLarkTemplates, type LarkTemplate } from '@/service/api/airway/lark-forms';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const keyword = ref('');
const activeGroup = ref('全部');
const templates = ref<LarkTemplate[]>([]);

const groups = computed(() => {
  const names = Array.from(new Set(templates.value.map(item => item.group_name || item.category || '未分組')));
  return ['全部', ...names];
});

const visibleTemplates = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return templates.value.filter(item => {
    const group = item.group_name || item.category || '未分組';
    if (activeGroup.value !== '全部' && group !== activeGroup.value) return false;
    if (!kw) return true;
    return `${item.form_name} ${item.description || ''} ${item.form_code || ''}`.toLowerCase().includes(kw);
  });
});

const groupedTemplates = computed(() => {
  const map = new Map<string, LarkTemplate[]>();
  visibleTemplates.value.forEach(item => {
    const group = item.group_name || item.category || '未分組';
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(item);
  });
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
});

async function loadTemplates() {
  loading.value = true;
  try {
    const data = await fetchLarkTemplates({ includeDisabled: false });
    templates.value = data.templates || [];
  } catch (error: any) {
    message.error(error?.message || '讀取申請列表失敗');
  } finally {
    loading.value = false;
  }
}

function goApply(item: LarkTemplate) {
  router.push(`/airway/forms/apply/${item.id}`);
}

function goCenter() {
  router.push('/airway/forms/center');
}

function goDesigner() {
  router.push('/airway/forms/designer');
}

onMounted(loadTemplates);
</script>

<template>
  <div class="lark-page">
    <div class="top-tabs">
      <div class="tab active">發起申請</div>
      <div class="tab" @click="goCenter">審核中心</div>
      <div class="top-actions">
        <NButton size="small" text @click="goDesigner">⚙ 管理後台</NButton>
        <NButton size="small" quaternary @click="loadTemplates">重新整理</NButton>
      </div>
    </div>

    <div class="search-row">
      <NInput v-model:value="keyword" clearable placeholder="請輸入申請名稱" class="search-input">
        <template #prefix>🔍</template>
      </NInput>
    </div>

    <div class="section-title">全部申請</div>

    <NSpin :show="loading">
      <div class="approval-shell">
        <aside class="group-sidebar">
          <div
            v-for="group in groups"
            :key="group"
            class="group-item"
            :class="{ active: activeGroup === group }"
            @click="activeGroup = group"
          >
            {{ group }}
          </div>
        </aside>

        <main class="approval-content">
          <NEmpty v-if="!groupedTemplates.length" description="沒有可發起的申請" />

          <section v-for="group in groupedTemplates" :key="group.name" class="template-group">
            <h2>{{ group.name }}</h2>
            <div class="template-grid">
              <div v-for="item in group.items" :key="item.id" class="template-card" @click="goApply(item)">
                <div class="template-icon">{{ item.icon || '📄' }}</div>
                <div>
                  <div class="template-name">{{ item.form_name }}</div>
                  <div class="template-desc">{{ item.description || '點擊發起申請' }}</div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.lark-page { min-height: calc(100vh - 64px); background: #f5f7fb; color: #1f2937; }
.top-tabs { display: flex; align-items: center; height: 52px; padding: 0 20px; background: #fff; border-bottom: 1px solid #e5e7eb; gap: 24px; }
.tab { height: 52px; display: flex; align-items: center; color: #374151; cursor: pointer; border-bottom: 3px solid transparent; }
.tab.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 700; }
.top-actions { margin-left: auto; display: flex; align-items: center; gap: 14px; }
.search-row { padding: 18px 20px 10px; }
.search-input { max-width: 560px; }
.section-title { padding: 0 20px 12px; font-size: 18px; font-weight: 700; }
.approval-shell { display: flex; margin: 0 20px 24px; min-height: 560px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.group-sidebar { width: 260px; background: #fbfcff; border-right: 1px solid #e5e7eb; padding: 16px 12px; }
.group-item { height: 44px; display: flex; align-items: center; padding: 0 18px; border-radius: 8px; color: #374151; cursor: pointer; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.group-item:hover { background: #f3f6ff; color: #2563eb; }
.group-item.active { background: #eaf1ff; color: #2563eb; font-weight: 700; }
.approval-content { flex: 1; padding: 22px 28px 48px; overflow: auto; }
.template-group + .template-group { margin-top: 30px; }
.template-group h2 { font-size: 18px; margin: 0 0 14px; }
.template-grid { display: grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap: 12px; }
.template-card { height: 72px; display: flex; align-items: center; gap: 14px; border: 1px solid #dfe3ea; border-radius: 8px; padding: 0 16px; background: #fff; cursor: pointer; transition: all 0.16s ease; }
.template-card:hover { border-color: #2563eb; box-shadow: 0 6px 18px rgb(37 99 235 / 10%); transform: translateY(-1px); }
.template-icon { width: 34px; height: 34px; border-radius: 8px; background: #2f6bff; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.template-name { font-weight: 700; }
.template-desc { margin-top: 4px; color: #8a94a6; font-size: 13px; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 1100px) { .template-grid { grid-template-columns: repeat(2, minmax(220px, 1fr)); } }
</style>
