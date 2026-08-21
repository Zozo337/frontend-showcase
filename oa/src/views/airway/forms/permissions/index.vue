<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, NSpace, NTag, useMessage } from 'naive-ui';

import {
  createApprovalUserGroup,
  deleteApprovalUserGroup,
  fetchApprovalUserGroups,
  updateApprovalUserGroup,
  type ApprovalUserGroup
} from '@/service/api/airway/lark-forms';
import { fetchEmployeeLookup, type AirwayEmployee } from '@/service/api/airway/employees';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const saving = ref(false);
const drawerVisible = ref(false);
const keyword = ref('');
const includeDisabled = ref(false);
const groups = ref<ApprovalUserGroup[]>([]);
const employees = ref<AirwayEmployee[]>([]);
const editingGroup = ref<ApprovalUserGroup | null>(null);

const form = reactive({
  name: '',
  code: '',
  description: '',
  group_type: 'approval',
  employee_ids: [] as number[]
});

const employeeOptions = computed(() =>
  employees.value.map(emp => {
    const id = Number(emp.id);

    return {
      value: id,
      label: [
        emp.employee_no || '',
        emp.english_name || emp.chinese_name || emp.company_email || `#${id}`,
        emp.department_name || emp.department_code || '',
        emp.company_email || ''
      ]
        .filter(Boolean)
        .join('｜')
    };
  })
);

function memberName(member: any) {
  return (
    member.display_name ||
    [member.employee_no, member.english_name || member.chinese_name || member.company_email]
      .filter(Boolean)
      .join('｜') ||
    `#${member.id}`
  );
}

function resetForm() {
  editingGroup.value = null;
  form.name = '';
  form.code = '';
  form.description = '';
  form.group_type = 'approval';
  form.employee_ids = [];
}

function openCreate() {
  resetForm();
  drawerVisible.value = true;
}

function openEdit(row: ApprovalUserGroup) {
  editingGroup.value = row;
  form.name = row.name || '';
  form.code = row.code || '';
  form.description = row.description || '';
  form.group_type = row.group_type || 'approval';
  form.employee_ids = (row.members || []).map(member => Number(member.id)).filter(Boolean);
  drawerVisible.value = true;
}

async function loadEmployees() {
  employees.value = await fetchEmployeeLookup({
    limit: 3000,
    includeInactive: true,
    includeDeleted: true
  });
}

async function loadGroups() {
  loading.value = true;

  try {
    const data = await fetchApprovalUserGroups({
      q: keyword.value.trim(),
      includeDisabled: includeDisabled.value
    });

    groups.value = data.groups || [];
  } catch (error: any) {
    message.error(error?.message || '讀取審批用戶組失敗');
    groups.value = [];
  } finally {
    loading.value = false;
  }
}

async function load() {
  loading.value = true;

  try {
    await Promise.all([loadEmployees(), loadGroups()]);
  } finally {
    loading.value = false;
  }
}

async function saveGroup() {
  if (!form.name.trim()) {
    message.warning('請輸入群組名稱');
    return;
  }

  saving.value = true;

  try {
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      description: form.description.trim(),
      group_type: form.group_type || 'approval',
      employee_ids: form.employee_ids
    };

    if (editingGroup.value?.id) {
      await updateApprovalUserGroup(editingGroup.value.id, {
        ...payload,
        is_active: editingGroup.value.is_active ?? 1
      });
      message.success('審批用戶組已更新');
    } else {
      await createApprovalUserGroup(payload);
      message.success('審批用戶組已新增');
    }

    drawerVisible.value = false;
    await loadGroups();
  } catch (error: any) {
    message.error(error?.message || '儲存審批用戶組失敗');
  } finally {
    saving.value = false;
  }
}

async function disableGroup(row: ApprovalUserGroup) {
  try {
    await deleteApprovalUserGroup(row.id);
    message.success('審批用戶組已停用');
    await loadGroups();
  } catch (error: any) {
    message.error(error?.message || '停用審批用戶組失敗');
  }
}

async function enableGroup(row: ApprovalUserGroup) {
  try {
    await updateApprovalUserGroup(row.id, {
      name: row.name,
      description: row.description || '',
      group_type: row.group_type || 'approval',
      is_active: 1,
      employee_ids: (row.members || []).map(member => Number(member.id)).filter(Boolean)
    });
    message.success('審批用戶組已啟用');
    await loadGroups();
  } catch (error: any) {
    message.error(error?.message || '啟用審批用戶組失敗');
  }
}

const columns: DataTableColumns<ApprovalUserGroup> = [
  {
    title: '群組名稱',
    key: 'name',
    minWidth: 220,
    render(row) {
      return h('div', { class: 'group-cell' }, [
        h('strong', row.name || '-'),
        h('span', { class: 'muted' }, row.code || '-'),
        row.description ? h('span', { class: 'muted' }, row.description) : null
      ]);
    }
  },
  {
    title: '類型',
    key: 'group_type',
    width: 120,
    render(row) {
      return h(
        NTag,
        { bordered: false, type: row.group_type === 'approval' ? 'info' : 'default' },
        { default: () => (row.group_type === 'approval' ? '審批組' : row.group_type || '-') }
      );
    }
  },
  {
    title: '成員',
    key: 'members',
    minWidth: 420,
    render(row) {
      const members = row.members || [];

      if (!members.length) {
        return h('span', { class: 'muted' }, '尚未選擇成員');
      }

      const visible = members.slice(0, 5);
      const hidden = members.length - visible.length;

      return h(
        'div',
        { class: 'member-list' },
        [
          ...visible.map(member =>
            h(NTag, { bordered: false }, { default: () => memberName(member) })
          ),
          hidden > 0 ? h(NTag, { bordered: false, type: 'warning' }, { default: () => `+${hidden}` }) : null
        ]
      );
    }
  },
  {
    title: '人數',
    key: 'member_count',
    width: 90,
    render(row) {
      return h(NTag, { bordered: false, type: 'success' }, { default: () => String(row.member_count || 0) });
    }
  },
  {
    title: '狀態',
    key: 'is_active',
    width: 90,
    render(row) {
      const active = Number(row.is_active ?? 1) === 1;

      return h(
        NTag,
        { bordered: false, type: active ? 'success' : 'error' },
        { default: () => (active ? '啟用' : '停用') }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row) {
      const active = Number(row.is_active ?? 1) === 1;

      return h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => openEdit(row) }, { default: () => '編輯' }),
            active
              ? h(
                  NPopconfirm,
                  { onPositiveClick: () => disableGroup(row) },
                  {
                    trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => '停用' }),
                    default: () => `確定停用「${row.name}」？`
                  }
                )
              : h(NButton, { size: 'small', type: 'success', ghost: true, onClick: () => enableGroup(row) }, { default: () => '啟用' })
          ]
        }
      );
    }
  }
];

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
        <div class="side-item" @click="router.push('/airway/forms/data')">數據管理</div>
        <div class="side-item active">權限管理</div>
        <div class="side-sub active">審批用戶組</div>
      </aside>

      <main class="permission-main">
        <div class="head-row">
          <div>
            <div class="eyebrow">Demo OA / Approval Groups</div>
            <h1>審批用戶組</h1>
            <p>
              這裡管理「流程審批用」的人員群組，例如 HR 審批組、IT 審批組、GA 審批組。這跟左側頁面權限角色分開，不混用。
            </p>
          </div>

          <NButton type="primary" @click="openCreate">新建審批組</NButton>
        </div>

        <NCard class="toolbar-card">
          <NSpace align="center" justify="space-between">
            <NSpace align="center">
              <NInput
                v-model:value="keyword"
                clearable
                class="search"
                placeholder="搜尋群組名稱 / 代碼 / 說明"
                @keyup.enter="loadGroups"
              />
              <NButton :loading="loading" @click="loadGroups">搜尋</NButton>
              <NButton @click="keyword = ''; loadGroups()">重置</NButton>
            </NSpace>

            <NCheckbox v-model:checked="includeDisabled" @update:checked="loadGroups">
              顯示停用群組
            </NCheckbox>
          </NSpace>
        </NCard>

        <NCard>
          <template #header>
            <div class="card-header">
              <span>群組清單</span>
              <NTag :bordered="false" type="info">{{ groups.length }} 組</NTag>
            </div>
          </template>

          <NDataTable
            :columns="columns"
            :data="groups"
            :loading="loading"
            :pagination="{ pageSize: 10 }"
            :bordered="false"
            :single-line="false"
          />
        </NCard>

        <NDrawer v-model:show="drawerVisible" :width="720" placement="right">
          <NDrawerContent closable :title="editingGroup ? '編輯審批用戶組' : '新建審批用戶組'">
            <NSpace vertical :size="16">
              <NAlert type="info" :bordered="false">
                審批用戶組只負責流程節點的人員解析。之後流程設計器選「審批用戶組」時，會把這個群組成員解析成實際 approval_tasks。
              </NAlert>

              <NForm label-placement="top">
                <NFormItem label="群組名稱" required>
                  <NInput v-model:value="form.name" placeholder="例如：HR 審批組 / IT 審批組 / GA 審批組" />
                </NFormItem>

                <NFormItem label="群組代碼">
                  <NInput v-model:value="form.code" :disabled="Boolean(editingGroup)" placeholder="可空白，系統會自動產生" />
                </NFormItem>

                <NFormItem label="群組說明">
                  <NInput
                    v-model:value="form.description"
                    type="textarea"
                    :autosize="{ minRows: 2 }"
                    placeholder="例如：處理人資相關流程審批"
                  />
                </NFormItem>

                <NFormItem label="成員">
                  <NSelect
                    v-model:value="form.employee_ids"
                    multiple
                    filterable
                    clearable
                    :options="employeeOptions"
                    placeholder="選擇這個審批組的成員"
                    :max-tag-count="8"
                  />
                </NFormItem>
              </NForm>

              <NSpace justify="end">
                <NButton @click="drawerVisible = false">取消</NButton>
                <NButton type="primary" :loading="saving" @click="saveGroup">儲存</NButton>
              </NSpace>
            </NSpace>
          </NDrawerContent>
        </NDrawer>
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

.permission-main {
  width: min(1280px, calc(100% - 220px));
  margin: 0 auto;
  padding: 34px 0;
}

.head-row,
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

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

p {
  max-width: 880px;
  margin: 8px 0 0;
  color: #667085;
  line-height: 1.7;
}

.toolbar-card {
  margin: 20px 0 16px;
}

.search {
  width: 360px;
}

.group-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.muted {
  color: #8a94a6;
  font-size: 12px;
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@media (max-width: 960px) {
  .admin-layout {
    flex-direction: column;
  }

  .admin-sidebar {
    width: 100%;
    min-height: auto;
  }

  .permission-main {
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
  }

  .head-row,
  .card-header {
    align-items: stretch;
    flex-direction: column;
  }

  .search {
    width: 100%;
  }
}
</style>
