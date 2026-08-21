<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { GLOBAL_SIDER_MENU_ID } from '@/constants/app';
import { fetchAuthMe } from '@/service/api/airway/permissions';
import { useAuthStore } from '@/store/modules/auth';

defineOptions({ name: 'VerticalMenu' });

interface MenuItem {
  label: string;
  path: string;
  icon: string;
  permission: string;
}

const route = useRoute();
const authStore = useAuthStore();
const permissions = ref<string[]>([]);
const loaded = ref(false);

const allMenus: MenuItem[] = [
  { label: '首頁', path: '/airway/portal', icon: '首', permission: 'PAGE_PORTAL.view' },
  { label: 'Dashboard', path: '/airway/dashboard', icon: '儀', permission: 'PAGE_DASHBOARD.view' },
  { label: '員工個人資訊', path: '/airway/profile', icon: '我', permission: 'PAGE_PROFILE.view' },
  { label: '發起申請', path: '/airway/forms', icon: '申', permission: 'PAGE_FORMS.view' },
  { label: '審核中心', path: '/airway/forms/center', icon: '審', permission: 'PAGE_FORMS_CENTER.view' },
  { label: '流程控制中心', path: '/airway/forms/designer', icon: '管', permission: 'PAGE_FORM_DESIGNER.ADMIN' },
  { label: '組織架構', path: '/airway/departments', icon: '組', permission: 'PAGE_ORG.view' },
  { label: '員工管理', path: '/airway/employees', icon: '員', permission: 'PAGE_EMPLOYEES.view' },
  { label: '資產管理', path: '/airway/assets/laptops', icon: '資', permission: 'PAGE_ASSETS.view' },
  { label: '帳號管理', path: '/airway/accounts/gws', icon: '帳', permission: 'PAGE_ACCOUNTS.view' },
  { label: '人員資料匯入', path: '/airway/employee-import', icon: '匯', permission: 'PAGE_EMPLOYEE_IMPORT.view' },
  { label: '權限控管', path: '/airway/permissions', icon: '權', permission: 'PAGE_PERMISSION.view' },
  { label: 'AD權限', path: '/airway/ad-permissions', icon: 'AD', permission: 'PAGE_AD_PERMISSIONS.view' },
  { label: 'API 測試', path: '/airway/test', icon: '測', permission: 'PAGE_API_TEST.view' }
];

const currentPath = computed(() => route.path);
const isSuperAdmin = computed(() => permissions.value.includes('*'));

function canShowMenu(item: MenuItem) {
  if (!loaded.value) return false;
  if (isSuperAdmin.value) return true;
  return permissions.value.includes(item.permission);
}

const menus = computed(() => allMenus.filter(canShowMenu));

function isActive(path: string) {
  if (path === '/airway/forms') return currentPath.value === '/airway/forms' || currentPath.value.startsWith('/airway/forms/apply');
  if (path === '/airway/forms/center') return currentPath.value.startsWith('/airway/forms/center') || currentPath.value.startsWith('/airway/forms/detail');
  if (path === '/airway/forms/designer') return currentPath.value.startsWith('/airway/forms/designer');
  if (path === '/airway/assets/laptops') return currentPath.value.startsWith('/airway/assets');
  if (path === '/airway/accounts/gws') return currentPath.value.startsWith('/airway/accounts');
  if (path === '/airway/ad-permissions') return currentPath.value.startsWith('/airway/ad-permissions');
  return currentPath.value === path;
}

async function loadPermissions() {
  try {
    const data = await fetchAuthMe();
    const user = data?.user || {};
    const userPermissions = data?.permissions || user?.permissions || [];
    permissions.value = Array.isArray(userPermissions) ? userPermissions : [];
  } catch {
    permissions.value = [...authStore.userInfo.buttons];
  } finally {
    loaded.value = true;
  }
}

onMounted(loadPermissions);
</script>

<template>
  <Teleport :to="`#${GLOBAL_SIDER_MENU_ID}`">
    <nav class="airway-sidebar-menu">
      <RouterLink
        v-for="item in menus"
        :key="item.path"
        :to="item.path"
        class="airway-menu-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="airway-menu-icon">{{ item.icon }}</span>
        <span class="airway-menu-label">{{ item.label }}</span>
      </RouterLink>
    </nav>
  </Teleport>
</template>

<style scoped>
.airway-sidebar-menu { width: 100%; height: 100%; padding: 12px 10px; box-sizing: border-box; }
.airway-menu-item { display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 12px; margin-bottom: 6px; border-radius: 10px; color: #475569; text-decoration: none; transition: all 0.18s ease; box-sizing: border-box; }
.airway-menu-item:hover { background: #f1f5f9; color: #2563eb; }
.airway-menu-item.active { background: linear-gradient(135deg, #eef2ff, #eff6ff); color: #2563eb; font-weight: 700; }
.airway-menu-icon { width: 24px; height: 24px; border-radius: 8px; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.airway-menu-item.active .airway-menu-icon { background: #4f46e5; color: white; }
.airway-menu-label { font-size: 14px; white-space: nowrap; }
</style>
