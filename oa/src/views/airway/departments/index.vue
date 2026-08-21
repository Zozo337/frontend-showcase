<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import type { DataTableColumns, TreeDropInfo, TreeOption } from 'naive-ui';
import { NButton, NTag, useMessage } from 'naive-ui';
import {
  createDepartment,
  fetchDepartmentMembers,
  fetchDepartments,
  moveDepartment,
  updateDepartment,
  type AirwayDepartment,
  type DepartmentMember
} from '@/service/api/airway/departments';
import { fetchEmployees, type AirwayEmployee } from '@/service/api/airway/employees';

interface DepartmentTreeOption extends TreeOption {
  key: number;
  label: string;
  raw: AirwayDepartment;
  children?: DepartmentTreeOption[];
}

const message = useMessage();

const loading = ref(false);
const memberLoading = ref(false);
const moving = ref(false);
const saving = ref(false);
const employeeLoading = ref(false);

const departments = ref<AirwayDepartment[]>([]);
const members = ref<DepartmentMember[]>([]);
const employees = ref<AirwayEmployee[]>([]);
const selectedDepartmentId = ref<number | null>(null);

const drawerVisible = ref(false);
const editingDepartmentId = ref<number | null>(null);

const formModel = ref({
  name: '',
  code: '',
  parentId: null as number | null,
  managerEmployeeId: null as number | null
});

const selectedDepartment = computed(() => {
  return departments.value.find(item => item.id === selectedDepartmentId.value) || null;
});

const departmentCount = computed(() => departments.value.length);
const memberCount = computed(() => members.value.length);

const treeData = computed(() => buildDepartmentTree(departments.value));

const parentOptions = computed(() => {
  return departments.value
    .filter(item => item.id !== editingDepartmentId.value)
    .map(item => ({
      label: `${item.name} (${item.code || '-'})`,
      value: item.id
    }));
});

const managerEmployeeOptions = computed(() => {
  return employees.value
    .filter(item => item.account_status !== 'deleted')
    .map(item => {
      const name = item.chinese_name || item.english_name || '-';
      const employeeNo = item.employee_no || '-';
      const email = item.company_email || '-';
      const department = item.department_name || '-';
      const jobTitle = item.position_title || item.job_title || item.title || '-';

      return {
        label: `${employeeNo}｜${name}｜${email}｜${department}｜${jobTitle}`,
        value: item.id
      };
    });
});

const memberColumns: DataTableColumns<DepartmentMember> = [
  {
    title: '員工編號',
    key: 'employee_no',
    width: 130,
    render(row) {
      return row.employee_no || '-';
    }
  },
  {
    title: '姓名',
    key: 'name',
    minWidth: 180,
    render(row) {
      return h('div', { class: 'member-name-cell' }, [
        h('div', { class: 'member-avatar' }, getMemberAvatarText(row)),
        h('div', { class: 'member-name-info' }, [
          h('div', { class: 'member-name-line' }, [
            h('strong', getMemberName(row)),
            h(
              NTag,
              {
                size: 'small',
                type: statusType(row.account_status),
                bordered: false
              },
              { default: () => statusText(row.account_status) }
            )
          ]),
          h('div', { class: 'member-sub-line' }, row.english_name || row.company_email || '-')
        ])
      ]);
    }
  },
  {
    title: 'Email',
    key: 'company_email',
    minWidth: 220,
    render(row) {
      return row.company_email || '-';
    }
  },
  {
    title: '職稱',
    key: 'position_title',
    minWidth: 180,
    render(row) {
      return getJobTitle(row);
    }
  },
  {
    title: '狀態',
    key: 'account_status',
    width: 100,
    render(row) {
      return h(
        NTag,
        {
          size: 'small',
          type: statusType(row.account_status),
          bordered: false
        },
        { default: () => statusText(row.account_status) }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          ghost: true,
          onClick: () => {
            window.location.href = `/airway/employees?employeeId=${row.id}`;
          }
        },
        { default: () => '查看' }
      );
    }
  }
];

function statusType(status?: string) {
  if (status === 'active' || status === 'normal' || status === 'enabled') return 'success';
  if (status === 'pending') return 'info';
  if (status === 'suspended') return 'warning';
  if (status === 'disabled' || status === 'inactive') return 'warning';
  if (status === 'deleted') return 'error';
  if (status === 'system') return 'default';

  return 'info';
}

function statusText(status?: string) {
  if (status === 'active') return '正常';
  if (status === 'normal') return '正常';
  if (status === 'enabled') return '啟用';
  if (status === 'pending') return '待入職';
  if (status === 'suspended') return '掛職';
  if (status === 'disabled') return '停用';
  if (status === 'inactive') return '未啟用';
  if (status === 'deleted') return '已刪除';
  if (status === 'system') return '系統帳號';

  return status || '-';
}

function getMemberName(row: DepartmentMember) {
  return row.chinese_name || row.english_name || row.employee_no || `user${row.id}`;
}

function getMemberAvatarText(row: DepartmentMember) {
  return getMemberName(row).slice(0, 1).toUpperCase();
}

function getJobTitle(row: DepartmentMember) {
  return row.position_title || row.job_title || row.title || '-';
}

function buildDepartmentTree(items: AirwayDepartment[]) {
  const map = new Map<number, DepartmentTreeOption>();
  const roots: DepartmentTreeOption[] = [];

  items.forEach(item => {
    map.set(item.id, {
      key: item.id,
      label: item.name,
      raw: item,
      children: []
    });
  });

  items.forEach(item => {
    const node = map.get(item.id);

    if (!node) return;

    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)?.children?.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: DepartmentTreeOption[]) => {
    nodes.sort((a, b) => {
      const orderA = a.raw.sort_order ?? 0;
      const orderB = b.raw.sort_order ?? 0;

      if (orderA !== orderB) return orderA - orderB;

      return a.raw.id - b.raw.id;
    });

    nodes.forEach(node => {
      if (node.children?.length) sortNodes(node.children);
    });
  };

  sortNodes(roots);

  return roots;
}

async function loadEmployees() {
  employeeLoading.value = true;

  try {
    employees.value = await fetchEmployees();
  } catch (err: any) {
    console.error('loadEmployees failed:', err);
    message.error(err?.message || '讀取員工清單失敗');
    employees.value = [];
  } finally {
    employeeLoading.value = false;
  }
}

async function loadDepartments() {
  loading.value = true;

  try {
    const result = await fetchDepartments();

    departments.value = Array.isArray(result) ? result : [];

    if (!selectedDepartmentId.value && departments.value.length) {
      selectedDepartmentId.value = departments.value[0].id;
      await loadDepartmentMembers(departments.value[0].id);
    }

    if (selectedDepartmentId.value) {
      const exists = departments.value.some(item => item.id === selectedDepartmentId.value);

      if (!exists && departments.value.length) {
        selectedDepartmentId.value = departments.value[0].id;
        await loadDepartmentMembers(departments.value[0].id);
      }
    }
  } catch (err: any) {
    console.error('loadDepartments failed:', err);
    message.error(err?.message || '讀取部門失敗');
    departments.value = [];
  } finally {
    loading.value = false;
    moving.value = false;
  }
}

async function loadDepartmentMembers(departmentId: number) {
  memberLoading.value = true;
  members.value = [];

  try {
    members.value = await fetchDepartmentMembers(departmentId);
  } catch (err: any) {
    message.error(err?.message || '讀取部門成員失敗');
  } finally {
    memberLoading.value = false;
  }
}

async function handleSelect(keys: Array<string | number>) {
  const key = keys[0];

  if (!key) return;

  selectedDepartmentId.value = Number(key);
  await loadDepartmentMembers(Number(key));
}

async function handleDrop(info: TreeDropInfo) {
  const dragNode = info.dragNode as DepartmentTreeOption;
  const dropNode = info.node as DepartmentTreeOption;

  if (!dragNode?.raw || !dropNode?.raw) return;

  let parentId: number | null = null;

  if (info.dropPosition === 'inside') {
    parentId = dropNode.raw.id;
  } else {
    parentId = dropNode.raw.parent_id || null;
  }

  moving.value = true;

  try {
    await moveDepartment(dragNode.raw.id, parentId);
    message.success('部門已移動');
    await loadDepartments();
  } catch (err: any) {
    message.error(err?.message || '移動失敗');
  } finally {
    moving.value = false;
  }
}

async function openCreateDrawer(parentId: number | null = selectedDepartmentId.value) {
  editingDepartmentId.value = null;
  formModel.value = {
    name: '',
    code: '',
    parentId,
    managerEmployeeId: null
  };

  if (!employees.value.length) {
    await loadEmployees();
  }

  drawerVisible.value = true;
}

async function openEditDrawer() {
  if (!selectedDepartment.value) {
    message.warning('請先選擇部門');
    return;
  }

  editingDepartmentId.value = selectedDepartment.value.id;
  formModel.value = {
    name: selectedDepartment.value.name || '',
    code: selectedDepartment.value.code || '',
    parentId: selectedDepartment.value.parent_id || null,
    managerEmployeeId: selectedDepartment.value.manager_employee_id || null
  };

  if (!employees.value.length) {
    await loadEmployees();
  }

  drawerVisible.value = true;
}

async function handleSaveDepartment() {
  if (!formModel.value.name.trim()) {
    message.warning('請輸入部門名稱');
    return;
  }

  saving.value = true;

  try {
    if (editingDepartmentId.value) {
      await updateDepartment(editingDepartmentId.value, {
        name: formModel.value.name,
        code: formModel.value.code,
        parentId: formModel.value.parentId,
        managerEmployeeId: formModel.value.managerEmployeeId
      });
      message.success('部門已更新');
    } else {
      await createDepartment({
        name: formModel.value.name,
        code: formModel.value.code,
        parentId: formModel.value.parentId,
        managerEmployeeId: formModel.value.managerEmployeeId
      });
      message.success('部門已新增');
    }

    drawerVisible.value = false;
    await loadDepartments();

    if (selectedDepartmentId.value) {
      await loadDepartmentMembers(selectedDepartmentId.value);
    }
  } catch (err: any) {
    message.error(err?.message || '儲存失敗');
  } finally {
    saving.value = false;
  }
}

function renderLabel(info: { option: TreeOption }) {
  const node = info.option as DepartmentTreeOption;
  const raw = node.raw;

  const name = raw?.name || String(node.label || node.key || '-');
  const code = raw?.code || '-';

  return h('div', { class: 'tree-label' }, [
    h('span', { class: 'tree-name' }, name),
    h(
      NTag,
      {
        size: 'small',
        bordered: false,
        class: 'tree-code'
      },
      { default: () => code }
    )
  ]);
}

onMounted(async () => {
  await Promise.all([loadDepartments(), loadEmployees()]);
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-20px font-semibold">組織架構</h2>
          <p class="mt-1 text-#888">點選部門後，下方會顯示該部門員工清單</p>
        </div>

        <NSpace>
          <NTag type="info">共 {{ departmentCount }} 個部門</NTag>
          <NButton @click="openCreateDrawer()">新增部門</NButton>
          <NButton @click="openEditDrawer">編輯部門</NButton>
          <NButton type="primary" :loading="loading" @click="loadDepartments">重新整理</NButton>
        </NSpace>
      </div>
    </NCard>

    <div class="department-layout">
      <NCard title="組織樹" class="tree-card">
        <NAlert v-if="loading" type="info" class="mb-3">
          組織資料讀取中...
        </NAlert>

        <NAlert v-if="moving" type="warning" class="mb-3">
          部門移動中...
        </NAlert>

        <NTree
          block-line
          draggable
          :data="treeData"
          :selected-keys="selectedDepartmentId ? [selectedDepartmentId] : []"
          :render-label="renderLabel"
          @update:selected-keys="handleSelect"
          @drop="handleDrop"
        />

        <NEmpty v-if="!loading && !treeData.length" description="目前沒有部門資料" />
      </NCard>

      <div class="department-main">
        <NCard title="部門詳情">
          <NDescriptions v-if="selectedDepartment" bordered label-placement="left" :column="1">
            <NDescriptionsItem label="部門 ID">
              {{ selectedDepartment.id }}
            </NDescriptionsItem>
            <NDescriptionsItem label="部門代碼">
              {{ selectedDepartment.code || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="部門名稱">
              {{ selectedDepartment.name }}
            </NDescriptionsItem>
            <NDescriptionsItem label="上層部門 ID">
              {{ selectedDepartment.parent_id || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="主管">
              {{ selectedDepartment.manager_name || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="主管 Email">
              {{ selectedDepartment.manager_email || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="部門成員數">
              {{ memberCount }}
            </NDescriptionsItem>
            <NDescriptionsItem label="更新時間">
              {{ selectedDepartment.updated_at || '-' }}
            </NDescriptionsItem>
          </NDescriptions>

          <NEmpty v-else description="請選擇左側部門" />
        </NCard>

        <NCard class="mt-4">
          <template #header>
            <div class="member-card-header">
              <span>
                部門員工
                <span v-if="selectedDepartment">｜{{ selectedDepartment.name }}</span>
              </span>
              <NTag type="info" size="small">共 {{ memberCount }} 人</NTag>
            </div>
          </template>

          <NDataTable
            v-if="members.length"
            :columns="memberColumns"
            :data="members"
            :loading="memberLoading"
            :pagination="{ pageSize: 10 }"
            :bordered="false"
          />

          <NSpin v-else :show="memberLoading">
            <NEmpty
              :description="selectedDepartment ? '此部門目前沒有員工' : '請先選擇部門'"
            />
          </NSpin>
        </NCard>
      </div>
    </div>

    <NDrawer v-model:show="drawerVisible" :width="560" placement="right">
      <NDrawerContent closable :title="editingDepartmentId ? '編輯部門' : '新增部門'">
        <NForm label-placement="top">
          <NFormItem label="部門名稱">
            <NInput v-model:value="formModel.name" placeholder="例如：資訊技術部" />
          </NFormItem>

          <NFormItem label="部門代碼">
            <NInput v-model:value="formModel.code" placeholder="例如：IT" />
          </NFormItem>

          <NFormItem label="上層部門">
            <NSelect
              v-model:value="formModel.parentId"
              clearable
              filterable
              :options="parentOptions"
              placeholder="選擇上層部門"
            />
          </NFormItem>

          <NFormItem label="主管">
            <NSelect
              v-model:value="formModel.managerEmployeeId"
              clearable
              filterable
              :loading="employeeLoading"
              :options="managerEmployeeOptions"
              placeholder="輸入姓名、員編、Email 搜尋主管"
              class="w-full"
            />
          </NFormItem>

          <NSpace justify="end">
            <NButton @click="drawerVisible = false">取消</NButton>
            <NButton type="primary" :loading="saving" @click="handleSaveDepartment">儲存</NButton>
          </NSpace>
        </NForm>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped>
.department-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
}

.mb-3 {
  margin-bottom: 12px;
}

.tree-card {
  min-height: 520px;
}

.department-main {
  min-width: 0;
}

.tree-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tree-name {
  font-weight: 600;
}

.tree-code {
  transform: scale(0.92);
}

.member-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.member-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.member-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: linear-gradient(135deg, #64748b, #94a3b8);
  color: white;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.member-name-info {
  min-width: 0;
}

.member-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-sub-line {
  margin-top: 2px;
  color: #8a94a6;
  font-size: 12px;
}

.mt-4 {
  margin-top: 16px;
}

@media (max-width: 960px) {
  .department-layout {
    grid-template-columns: 1fr;
  }
}
</style>
