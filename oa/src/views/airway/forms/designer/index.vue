<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDialog, useMessage } from 'naive-ui';
import {
  createLarkGroup,
  createLarkTemplate,
  deleteLarkTemplate,
  duplicateLarkTemplate,
  fetchLarkGroups,
  fetchLarkTemplates,
  setLarkTemplateStatus,
  type LarkTemplate
} from '@/service/api/airway/lark-forms';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const keyword = ref('');
const activeSide = ref<'approval' | 'data' | 'permissions'>('approval');
const templates = ref<LarkTemplate[]>([]);
const serverGroups = ref<Array<{ name: string; count: number }>>([]);

const groupModalVisible = ref(false);
const groupName = ref('');

const groupNames = computed(() => {
  const set = new Set<string>();
  serverGroups.value.forEach(item => set.add(item.name));
  templates.value.forEach(item => set.add(item.group_name || item.category || '未分組'));
  if (!set.size) set.add('未分組');
  return Array.from(set);
});

const grouped = computed(() => {
  const kw = keyword.value.trim().toLowerCase();

  const map = new Map<string, LarkTemplate[]>();
  groupNames.value.forEach(name => map.set(name, []));

  templates.value
    .filter(item => {
      if (!kw) return true;
      return `${item.form_name} ${item.description || ''} ${item.form_code || ''}`.toLowerCase().includes(kw);
    })
    .forEach(item => {
      const group = item.group_name || item.category || '未分組';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    });

  return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
});

async function loadGroups() {
  try {
    const data = await fetchLarkGroups();
    serverGroups.value = data.groups || [];
  } catch {
    serverGroups.value = [];
  }
}

async function loadTemplates() {
  loading.value = true;
  try {
    const [, data] = await Promise.all([
      loadGroups(),
      fetchLarkTemplates({ includeDisabled: true })
    ]);
    templates.value = data.templates || [];
  } catch (error: any) {
    message.error(error?.message || '讀取審批列表失敗');
  } finally {
    loading.value = false;
  }
}

async function submitGroup() {
  const name = groupName.value.trim();
  if (!name) {
    message.warning('請輸入分組名稱');
    return;
  }

  try {
    await createLarkGroup(name);
    message.success('分組已建立');
    groupName.value = '';
    groupModalVisible.value = false;
    await loadTemplates();
  } catch (error: any) {
    message.error(error?.message || '建立分組失敗');
  }
}

async function createTemplate(targetGroup = '未分組') {
  try {
    const data = await createLarkTemplate({
      form_name: '未命名審批',
      form_code: `FORM_${Date.now()}`,
      category: ['IT', 'HR', 'GA'].includes(targetGroup) ? targetGroup : 'HR',
      group_name: targetGroup,
      description: '',
      icon: '📄',
      fields: [],
      process_json: [
        { node_type: 'submit', node_name: '提交', approver_type: 'self' },
        { node_type: 'approval', node_name: '審批', approver_type: 'submitter_select', approval_mode: 'any' },
        { node_type: 'end', node_name: '結束' }
      ],
      settings_json: {},
      enabled: 0
    });
    router.push(`/airway/forms/designer/edit/${data.id}`);
  } catch (error: any) {
    message.error(error?.message || '建立審批失敗');
  }
}

async function toggleTemplate(item: LarkTemplate) {
  try {
    await setLarkTemplateStatus(item.id!, Number(item.enabled) ? 0 : 1);
    message.success(Number(item.enabled) ? '已停用' : '已啟用');
    await loadTemplates();
  } catch (error: any) {
    message.error(error?.message || '狀態更新失敗');
  }
}

function editTemplate(item: LarkTemplate) {
  router.push(`/airway/forms/designer/edit/${item.id}`);
}

function copyTemplate(item: LarkTemplate) {
  dialog.warning({
    title: '複製審批',
    content: `確定複製「${item.form_name}」？複製後會先停用，確認內容後再發布。`,
    positiveText: '複製',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const data = await duplicateLarkTemplate(item.id!);
        message.success('已複製');
        await loadTemplates();
        router.push(`/airway/forms/designer/edit/${data.id}`);
      } catch (error: any) {
        message.error(error?.message || '複製失敗');
      }
    }
  });
}

function removeTemplate(item: LarkTemplate) {
  dialog.error({
    title: '刪除審批',
    content: `確定刪除「${item.form_name}」？已送出的申請紀錄不會刪除。`,
    positiveText: '刪除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteLarkTemplate(item.id!);
        message.success('已刪除');
        await loadTemplates();
      } catch (error: any) {
        message.error(error?.message || '刪除失敗');
      }
    }
  });
}

function goData() {
  router.push('/airway/forms/data');
}

function goPermissions() {
  router.push('/airway/forms/permissions');
}

function sortGroups() {
  message.info('分組排序第二版補，目前先用建立順序排序');
}

onMounted(loadTemplates);
</script>

<template>
  <div class="admin-page">
    <div class="admin-topbar">
      <div class="brand">流程控制中心</div>
      <div class="top-link active">審批管理</div>
      <div class="top-link" @click="goData">數據管理</div>
      <div class="top-link" @click="goPermissions">權限管理</div>
      <div class="grow"></div>
      <NButton quaternary @click="loadTemplates">重新整理</NButton>
    </div>

    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="side-item active">審批管理</div>
        <div class="side-item" @click="goData">數據管理</div>
        <div class="side-item" @click="goPermissions">權限管理</div>
      </aside>

      <main class="admin-main">
        <div class="main-head">
          <h1>審批管理</h1>
          <div class="head-actions">
            <NInput v-model:value="keyword" placeholder="搜尋" clearable class="search" />
            <NButton @click="groupModalVisible = true">新建分組</NButton>
            <NButton @click="sortGroups">分組排序</NButton>
            <NButton type="primary" @click="createTemplate()">＋ 創建審批</NButton>
          </div>
        </div>

        <NSpin :show="loading">
          <NEmpty v-if="!grouped.length" description="尚無審批表單" />

          <NCard v-for="group in grouped" :key="group.name" class="group-card" :bordered="false">
            <template #header>
              <div class="group-title">
                <span>{{ group.name }}</span>
                <NButton size="tiny" quaternary type="primary" @click="createTemplate(group.name)">在此分組新增</NButton>
              </div>
            </template>

            <NEmpty v-if="!group.items.length" description="此分組尚無審批" />

            <div v-for="item in group.items" :key="item.id" class="approval-row">
              <div class="row-left">
                <div class="row-icon">{{ item.icon || '📄' }}</div>
                <div>
                  <div class="row-name">
                    {{ item.form_name }}
                    <NTag v-if="!Number(item.enabled)" size="small" type="warning" class="ml-8">停用</NTag>
                  </div>
                  <div class="row-desc">{{ item.description || '尚未填寫說明' }}</div>
                </div>
              </div>

              <div class="row-visible">{{ item.submit_scope === 'all' ? '全員可見' : '指定範圍' }}</div>

              <div class="row-actions">
                <NButton text @click="editTemplate(item)">編輯</NButton>
                <NButton text @click="copyTemplate(item)">複製</NButton>
                <NButton text @click="toggleTemplate(item)">{{ item.enabled ? '停用' : '啟用' }}</NButton>
                <NButton text type="error" @click="removeTemplate(item)">刪除</NButton>
              </div>
            </div>
          </NCard>
        </NSpin>
      </main>
    </div>

    <NModal v-model:show="groupModalVisible" preset="dialog" title="新建分組" positive-text="建立" negative-text="取消" @positive-click="submitGroup">
      <NInput v-model:value="groupName" placeholder="例如：人事、行政、IT、財務" @keydown.enter.prevent="submitGroup" />
    </NModal>
  </div>
</template>

<style scoped>
.admin-page { min-height: calc(100vh - 64px); background: #fff; }
.admin-topbar { height: 56px; border-bottom: 1px solid #edf0f5; display: flex; align-items: center; padding: 0 24px; gap: 28px; }
.brand { font-weight: 800; color: #111827; }
.top-link { color: #4b5563; cursor: pointer; }
.top-link.active { color: #111827; font-weight: 800; }
.grow { flex: 1; }
.admin-layout { display: flex; min-height: calc(100vh - 120px); }
.admin-sidebar { width: 184px; background: #f6f7fb; padding: 16px 0; border-right: 1px solid #edf0f5; }
.side-item { height: 54px; display: flex; align-items: center; padding-left: 24px; cursor: pointer; border-left: 3px solid transparent; }
.side-item.active { background: #eaf1ff; color: #2563eb; border-left-color: #2563eb; font-weight: 700; }
.admin-main { width: min(1040px, calc(100% - 220px)); margin: 0 auto; padding: 34px 0 80px; }
.main-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
h1 { font-size: 16px; margin: 0; }
.head-actions { display: flex; align-items: center; gap: 10px; }
.search { width: 240px; }
.group-card { border: 1px solid #edf0f5; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
.group-title { display: flex; align-items: center; justify-content: space-between; font-weight: 800; }
.approval-row { display: grid; grid-template-columns: minmax(320px, 1fr) 220px 280px; align-items: center; padding: 14px 18px; border-top: 1px solid #f0f2f5; }
.row-left { display: flex; align-items: center; gap: 14px; }
.row-icon { width: 38px; height: 38px; border-radius: 50%; background: #2f6bff; color: #fff; display: flex; align-items: center; justify-content: center; }
.row-name { font-weight: 800; display: flex; align-items: center; }
.row-desc { color: #8a94a6; margin-top: 4px; }
.row-visible { color: #374151; }
.row-actions { display: flex; align-items: center; gap: 12px; justify-content: flex-end; }
.ml-8 { margin-left: 8px; }
</style>
