<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { fetchDepartments } from '@/service/api/airway/departments';
import { fetchAuthMe } from '@/service/api/airway/permissions';

interface ApprovalInstance {
  id: number;
  template_name?: string;
  templateName?: string;
  template_code?: string;
  category?: string;
  applicant_name?: string;
  applicant?: string;
  status?: string;
  created_at?: string;
  current_handlers?: string[];
  form_data?: Record<string, any>;
  form_data_json?: string;
  [key: string]: any;
}

const loading = ref(false);
const departmentCount = ref(0);
const systemStatus = ref<'online' | 'offline'>('online');

const permissions = ref<string[]>([]);
const permissionLoaded = ref(false);

const formDesignerPermissions = [
  'PAGE_FORM_DESIGNER.ADMIN',
  'PAGE_FORM_DESIGNER.HR',
  'PAGE_FORM_DESIGNER.IT',
  'PAGE_FORM_DESIGNER.GA'
];

const basicDashboardPermissions = [
  'PAGE_PORTAL.view',
  'PAGE_DASHBOARD.view',
  'PAGE_PROFILE.view',
  'PAGE_FORMS.view'
];

const pendingInstances = ref<ApprovalInstance[]>([]);
const myInstances = ref<ApprovalInstance[]>([]);
const processedInstances = ref<ApprovalInstance[]>([]);

const today = new Date().toLocaleDateString('zh-TW', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
});

async function apiFetch(path: string) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { Accept: 'application/json' }
  });

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
  }

  return data;
}

async function fetchInstances(box: string) {
  const data = await apiFetch(`/api/forms/instances?box=${encodeURIComponent(box)}`);
  return Array.isArray(data?.instances) ? data.instances : [];
}

const pendingCount = computed(() => pendingInstances.value.length);
const myRequestCount = computed(() => myInstances.value.length);
const processedCount = computed(() => processedInstances.value.length);

const itPendingCount = computed(() =>
  pendingInstances.value.filter(item => {
    const text = `${item.template_name || item.templateName || ''} ${item.category || ''}`.toLowerCase();
    return text.includes('it') || text.includes('資訊') || text.includes('資產') || text.includes('權限') || text.includes('帳號');
  }).length
);

const overviewCards = computed(() => [
  {
    title: '待我簽核',
    value: pendingCount.value,
    unit: '件',
    desc: '目前等待你處理的流程',
    tone: 'blue',
    path: '/airway/forms/center',
    icon: '審'
  },
  {
    title: '我的申請',
    value: myRequestCount.value,
    unit: '件',
    desc: '近期送出的 OA 表單',
    tone: 'green',
    path: '/airway/forms/center',
    icon: '申'
  },
  {
    title: '已處理',
    value: processedCount.value,
    unit: '件',
    desc: '你近期完成的簽核紀錄',
    tone: 'purple',
    path: '/airway/forms/center',
    icon: '辦'
  },
  {
    title: 'IT 待處理',
    value: itPendingCount.value,
    unit: '件',
    desc: '資產、帳號與權限相關任務',
    tone: 'orange',
    path: '/airway/forms/center',
    icon: 'IT'
  }
]);

const quickLinks = [
  {
    title: '發起申請',
    desc: '建立 HR、IT、GA 或一般 OA 流程',
    path: '/airway/forms',
    icon: '申',
    tone: 'blue',
    permission: 'PAGE_FORMS.view'
  },
  {
    title: '審核中心',
    desc: '查看待簽、已辦與我發起的申請',
    path: '/airway/forms/center',
    icon: '審',
    tone: 'purple',
    permission: 'PAGE_FORMS.view'
  },
  {
    title: '流程控制中心',
    desc: '設定表單欄位、流程節點與自動化',
    path: '/airway/forms/designer',
    icon: '流',
    tone: 'green',
    permissions: formDesignerPermissions
  },
  {
    title: '資產管理',
    desc: '管理筆電、螢幕、M365 與領用狀態',
    path: '/airway/assets/laptops',
    icon: '資',
    tone: 'orange',
    permission: 'PAGE_EMPLOYEES.view'
  },
  {
    title: '組織架構',
    desc: '管理部門樹、上下層關係與主管資訊',
    path: '/airway/departments',
    icon: '組',
    tone: 'cyan',
    permission: 'PAGE_ORG.view'
  },
  {
    title: '員工管理',
    desc: '維護人員資料、帳號狀態與部門歸屬',
    path: '/airway/employees',
    icon: '員',
    tone: 'blue',
    permission: 'PAGE_EMPLOYEES.view'
  },
  {
    title: '權限控管',
    desc: '設定權限群組、頁面與功能存取',
    path: '/airway/permissions',
    icon: '權',
    tone: 'purple',
    permission: 'PAGE_PERMISSION.view'
  }
];


const isSuperAdmin = computed(() => permissions.value.includes('*'));

function hasAnyPermission(codes: string[] = []) {
  if (isSuperAdmin.value) return true;
  return codes.some(code => permissions.value.includes(code));
}

function canAccess(permission?: string) {
  if (!permission) return true;
  if (isSuperAdmin.value) return true;
  return permissions.value.includes(permission);
}

function canShowDashboardEntry(item: any) {
  if (!permissionLoaded.value) {
    return ['PAGE_FORMS.view', 'PAGE_DASHBOARD.view'].includes(item.permission || '');
  }

  if (isSuperAdmin.value) return true;
  if (Array.isArray(item.permissions) && item.permissions.length) {
    return hasAnyPermission(item.permissions);
  }

  if (item.permission) {
    return canAccess(item.permission);
  }

  return true;
}

const visibleQuickLinks = computed(() => quickLinks.filter(canShowDashboardEntry));

const recentPending = computed(() => pendingInstances.value.slice(0, 5));

function getTemplateName(item: ApprovalInstance) {
  return item.template_name || item.templateName || '未命名流程';
}

function getApplicantName(item: ApprovalInstance) {
  return item.applicant_name || item.applicant || '申請人';
}

function formatTime(value?: string) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return value;
  }
}

async function loadDashboardPermissions() {
  try {
    const data = await fetchAuthMe();
    const user = data?.user || data || {};
    const userPermissions = user.permissions || data?.permissions || [];

    permissions.value = Array.isArray(userPermissions) ? userPermissions : [];
  } catch {
    permissions.value = basicDashboardPermissions;
  } finally {
    permissionLoaded.value = true;
  }
}

async function loadDashboard() {
  loading.value = true;

  try {
    await loadDashboardPermissions();

    const canReadOrg = canAccess('PAGE_ORG.view');

    const [departments, pending, mine, processed] = await Promise.all([
      canReadOrg ? fetchDepartments().catch(() => []) : Promise.resolve([]),
      fetchInstances('pending').catch(() => []),
      fetchInstances('mine').catch(() => []),
      fetchInstances('processed').catch(() => [])
    ]);

    departmentCount.value = departments.length;
    pendingInstances.value = pending;
    myInstances.value = mine;
    processedInstances.value = processed;

    systemStatus.value = 'online';
  } catch (error) {
    console.error('dashboard load failed', error);
    systemStatus.value = 'offline';
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <div class="airway-dashboard">
    <section class="workspace-hero">
      <div class="hero-main">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          Demo OA Command Center
        </div>

        <h1>企業流程工作台</h1>
        <p>
          集中處理表單申請、簽核任務、IT 資產、人員與權限管理，讓內部流程可以被追蹤、被管理，也能串接自動化。
        </p>

        <div class="hero-actions">
          <RouterLink to="/airway/forms">
            <NButton class="primary-action" size="large">發起申請</NButton>
          </RouterLink>

          <RouterLink to="/airway/forms/center">
            <NButton class="ghost-action" size="large">查看審核中心</NButton>
          </RouterLink>

          <NButton class="ghost-action" size="large" :loading="loading" @click="loadDashboard">重新整理</NButton>
        </div>
      </div>

      <div class="hero-side">
        <div class="today-card">
          <span>Today</span>
          <strong>{{ today }}</strong>
        </div>

        <div class="health-card">
          <div class="health-left">
            <span class="health-dot" :class="systemStatus"></span>
            <div>
              <strong>{{ systemStatus === 'online' ? '系統在線' : '系統異常' }}</strong>
              <p>{{ systemStatus === 'online' ? 'PostgreSQL runtime ready' : '請檢查後端服務' }}</p>
            </div>
          </div>

          <NButton size="small" quaternary :loading="loading" @click="loadDashboard">刷新</NButton>
        </div>
      </div>
    </section>

    <section class="metric-grid">
      <RouterLink v-for="card in overviewCards" :key="card.title" :to="card.path" class="metric-card" :class="card.tone">
        <div class="metric-icon">{{ card.icon }}</div>
        <div class="metric-body">
          <span>{{ card.title }}</span>
          <strong>{{ card.value }}</strong>
          <p>{{ card.desc }}</p>
        </div>
        <div class="metric-unit">{{ card.unit }}</div>
      </RouterLink>

      <RouterLink v-if="canAccess('PAGE_ORG.view')" to="/airway/departments" class="metric-card cyan">
        <div class="metric-icon">組</div>
        <div class="metric-body">
          <span>組織部門</span>
          <strong>{{ departmentCount }}</strong>
          <p>目前已建立的組織節點</p>
        </div>
        <div class="metric-unit">個</div>
      </RouterLink>
    </section>

    <section class="dashboard-grid">
      <NCard :bordered="false" class="panel-card quick-panel">
        <template #header>
          <div class="panel-title">
            <span>快捷入口</span>
            <small>常用作業</small>
          </div>
        </template>

        <div class="quick-grid">
          <RouterLink v-for="item in visibleQuickLinks" :key="item.title" :to="item.path" class="quick-link" :class="item.tone">
            <div class="quick-icon">{{ item.icon }}</div>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
            </div>
          </RouterLink>
        </div>
      </NCard>

      <NCard :bordered="false" class="panel-card todo-panel">
        <template #header>
          <div class="panel-title">
            <span>今日待辦</span>
            <small>{{ pendingCount }} 件待處理</small>
          </div>
        </template>

        <div v-if="recentPending.length" class="todo-list">
          <RouterLink v-for="item in recentPending" :key="item.id" to="/airway/forms/center" class="todo-item">
            <div class="todo-dot"></div>
            <div class="todo-main">
              <strong>{{ getTemplateName(item) }}</strong>
              <p>{{ getApplicantName(item) }} · {{ formatTime(item.created_at) }}</p>
            </div>
            <NTag type="primary" size="small" round>待簽</NTag>
          </RouterLink>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">✓</div>
          <strong>目前沒有待簽核項目</strong>
          <p>有新的審批任務時，會出現在這裡。</p>
        </div>
      </NCard>
    </section>

    <section class="bottom-grid">
      <NCard :bordered="false" class="panel-card progress-panel">
        <template #header>
          <div class="panel-title">
            <span>系統建置進度</span>
            <small>Production v1</small>
          </div>
        </template>

        <div class="progress-list">
          <div class="progress-item done">
            <span></span>
            PostgreSQL runtime
          </div>
          <div class="progress-item done">
            <span></span>
            表單與簽核流程
          </div>
          <div class="progress-item done">
            <span></span>
            員工 / 部門 / 權限
          </div>
          <div class="progress-item done">
            <span></span>
            IT 資產與 M365
          </div>
          <div class="progress-item active">
            <span></span>
            節點自動化 Webhook
          </div>
        </div>
      </NCard>

      <NCard :bordered="false" class="panel-card note-panel">
        <template #header>
          <div class="panel-title">
            <span>營運摘要</span>
            <small>Overview</small>
          </div>
        </template>

        <div class="note-content">
          <div>
            <b>{{ pendingCount }}</b>
            <span>待簽核</span>
          </div>
          <div>
            <b>{{ myRequestCount }}</b>
            <span>我的申請</span>
          </div>
          <div>
            <b>{{ departmentCount }}</b>
            <span>組織節點</span>
          </div>
        </div>
      </NCard>
    </section>
  </div>
</template>

<style scoped>
.airway-dashboard {
  min-height: 100vh;
  padding: 28px;
  background:
    radial-gradient(circle at 12% 8%, rgba(59, 130, 246, 0.13), transparent 28%),
    radial-gradient(circle at 92% 0%, rgba(124, 58, 237, 0.12), transparent 26%),
    linear-gradient(180deg, #f8fbff 0%, #f3f6fb 48%, #f7f9fc 100%);
}

.workspace-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.55fr);
  gap: 22px;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 30px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.92) 52%, rgba(37, 99, 235, 0.86)),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.8), transparent 32%);
  color: #fff;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  position: relative;
}

.workspace-hero::before {
  content: '';
  position: absolute;
  width: 420px;
  height: 420px;
  right: -120px;
  top: -180px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.workspace-hero::after {
  content: '';
  position: absolute;
  width: 220px;
  height: 220px;
  left: 45%;
  bottom: -120px;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.18);
}

.hero-main,
.hero-side {
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 8px 13px;
  border: 1px solid rgba(191, 219, 254, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  font-weight: 700;
  backdrop-filter: blur(10px);
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #38bdf8;
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.9);
}

.hero-main h1 {
  margin: 22px 0 12px;
  font-size: clamp(32px, 4vw, 52px);
  line-height: 1.05;
  letter-spacing: -0.05em;
}

.hero-main p {
  max-width: 760px;
  margin: 0;
  color: rgba(226, 232, 240, 0.9);
  line-height: 1.85;
  font-size: 15px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

:deep(.primary-action) {
  border: 0 !important;
  color: #fff !important;
  background: linear-gradient(135deg, #38bdf8, #2563eb) !important;
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.35);
}

:deep(.primary-action .n-button__content) {
  color: #fff !important;
}

:deep(.ghost-action) {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.22) !important;
  backdrop-filter: blur(10px);
}

:deep(.ghost-action .n-button__content) {
  color: #fff !important;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.today-card,
.health-card {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
}

.today-card {
  padding: 24px;
}

.today-card span {
  display: block;
  color: rgba(226, 232, 240, 0.72);
  font-size: 13px;
  margin-bottom: 10px;
}

.today-card strong {
  font-size: 24px;
  line-height: 1.35;
}

.health-card {
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.health-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.health-left p {
  margin: 4px 0 0;
  color: rgba(226, 232, 240, 0.7);
  font-size: 12px;
}

.health-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 7px rgba(34, 197, 94, 0.14);
}

.health-dot.offline {
  background: #ef4444;
  box-shadow: 0 0 0 7px rgba(239, 68, 68, 0.14);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 14px;
  margin: 18px 0;
}

.metric-card {
  position: relative;
  min-height: 138px;
  padding: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 22px;
  color: inherit;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
  transition: 0.18s ease;
  overflow: hidden;
}

.metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 24px 55px rgba(15, 23, 42, 0.1);
}

.metric-card::after {
  content: '';
  position: absolute;
  width: 110px;
  height: 110px;
  right: -42px;
  top: -42px;
  border-radius: 999px;
  opacity: 0.18;
}

.metric-card.blue::after { background: #2563eb; }
.metric-card.green::after { background: #16a34a; }
.metric-card.purple::after { background: #7c3aed; }
.metric-card.orange::after { background: #f97316; }
.metric-card.cyan::after { background: #06b6d4; }

.metric-icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 900;
  font-size: 13px;
  margin-bottom: 14px;
}

.metric-card.blue .metric-icon { background: linear-gradient(135deg, #38bdf8, #2563eb); }
.metric-card.green .metric-icon { background: linear-gradient(135deg, #86efac, #16a34a); }
.metric-card.purple .metric-icon { background: linear-gradient(135deg, #c084fc, #7c3aed); }
.metric-card.orange .metric-icon { background: linear-gradient(135deg, #fdba74, #ea580c); }
.metric-card.cyan .metric-icon { background: linear-gradient(135deg, #67e8f9, #0891b2); }

.metric-body span {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.metric-body strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 34px;
  line-height: 1;
  letter-spacing: -0.03em;
}

.metric-body p {
  margin: 10px 0 0;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.5;
}

.metric-unit {
  position: absolute;
  top: 18px;
  right: 18px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
  gap: 16px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
  gap: 16px;
  margin-top: 16px;
}

.panel-card {
  border-radius: 22px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
}

.panel-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.panel-title span {
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.panel-title small {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 14px;
}

.quick-link {
  display: flex;
  gap: 14px;
  padding: 18px;
  border: 1px solid #edf2f7;
  border-radius: 18px;
  color: inherit;
  text-decoration: none;
  background: linear-gradient(180deg, #fff, #fbfdff);
  transition: 0.18s ease;
}

.quick-link:hover {
  transform: translateY(-2px);
  border-color: #bfdbfe;
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.1);
}

.quick-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 900;
}

.quick-link.blue .quick-icon { background: linear-gradient(135deg, #38bdf8, #2563eb); }
.quick-link.purple .quick-icon { background: linear-gradient(135deg, #c084fc, #7c3aed); }
.quick-link.green .quick-icon { background: linear-gradient(135deg, #86efac, #16a34a); }
.quick-link.orange .quick-icon { background: linear-gradient(135deg, #fdba74, #ea580c); }

.quick-link h3 {
  margin: 0 0 6px;
  color: #0f172a;
  font-size: 15px;
}

.quick-link p {
  margin: 0;
  color: #8a94a6;
  line-height: 1.55;
  font-size: 13px;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #edf2f7;
  border-radius: 16px;
  color: inherit;
  text-decoration: none;
  background: #fff;
  transition: 0.18s ease;
}

.todo-item:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
  transform: translateX(2px);
}

.todo-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #2563eb;
  box-shadow: 0 0 0 7px rgba(37, 99, 235, 0.1);
}

.todo-main {
  flex: 1;
  min-width: 0;
}

.todo-main strong {
  display: block;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-main p {
  margin: 5px 0 0;
  color: #94a3b8;
  font-size: 13px;
}

.empty-state {
  padding: 34px 20px;
  text-align: center;
  color: #64748b;
}

.empty-icon {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  margin: 0 auto 14px;
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #16a34a;
  font-size: 28px;
  font-weight: 900;
  display: grid;
  place-items: center;
}

.empty-state strong {
  display: block;
  color: #0f172a;
  margin-bottom: 6px;
}

.empty-state p {
  margin: 0;
}

.progress-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 10px;
}

.progress-item {
  padding: 14px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  border: 1px solid #edf2f7;
}

.progress-item span {
  display: block;
  width: 28px;
  height: 5px;
  border-radius: 999px;
  margin-bottom: 12px;
  background: #cbd5e1;
}

.progress-item.done {
  background: #f0fdf4;
  color: #15803d;
  border-color: #dcfce7;
}

.progress-item.done span {
  background: #22c55e;
}

.progress-item.active {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #dbeafe;
}

.progress-item.active span {
  background: #2563eb;
}

.note-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 11px;
}

.note-content div {
  padding: 16px;
  border-radius: 18px;
  background: #f8fafc;
  text-align: center;
  border: 1px solid #edf2f7;
}

.note-content b {
  display: block;
  color: #0f172a;
  font-size: 28px;
  line-height: 1;
  margin-bottom: 8px;
}

.note-content span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 1280px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }

  .workspace-hero,
  .dashboard-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .progress-list {
    grid-template-columns: repeat(3, minmax(120px, 1fr));
  }
}

@media (max-width: 760px) {
  .airway-dashboard {
    padding: 16px;
  }

  .workspace-hero {
    padding: 22px;
  }

  .metric-grid,
  .quick-grid,
  .progress-list,
  .note-content {
    grid-template-columns: 1fr;
  }

  .hero-main h1 {
    font-size: 34px;
  }
}
</style>
