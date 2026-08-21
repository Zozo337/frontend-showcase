<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppShell from "./components/AppShell.vue";
import NavTabs from "./components/NavTabs.vue";
import ChatPage from "./pages/ChatPage.vue";
import WorkflowsPage from "./pages/WorkflowsPage.vue";
import AgentsPage from "./pages/AgentsPage.vue";
import RunsPage from "./pages/RunsPage.vue";
import LoginPage from "./pages/LoginPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";
import type { AuthConfig, AuthUser } from "./api/auth";
import { fetchAuthConfig, fetchMe, logout } from "./api/auth";

type TabKey = "chat" | "workflows" | "agents" | "runs" | "settings";

const activeTab = ref<TabKey>("agents");
const loading = ref(true);
const error = ref("");
const authConfig = ref<AuthConfig | null>(null);
const currentUser = ref<AuthUser | null>(null);

const baseTabs = [
  { key: "agents", label: "Agents" },
  { key: "runs", label: "Runs" },
  { key: "chat", label: "Chat" },
  { key: "workflows", label: "Workflows" },
] satisfies Array<{ key: TabKey; label: string }>;

const tabs = ref<Array<{ key: TabKey; label: string }>>([...baseTabs]);

function updateTabs() {
  tabs.value = [...baseTabs];
  if (currentUser.value?.is_admin || currentUser.value?.config?.can_manage_auth) {
    tabs.value.push({ key: "settings", label: "Settings" });
  }
  if (activeTab.value === "settings" && !tabs.value.some((tab) => tab.key === "settings")) {
    activeTab.value = "agents";
  }
}

async function bootstrap() {
  loading.value = true;
  error.value = "";
  try {
    authConfig.value = await fetchAuthConfig();
    const me = await fetchMe();
    currentUser.value = me.authenticated ? me : null;
    if (me.config) authConfig.value = me.config;
    updateTabs();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

function onSignedIn(user: AuthUser) {
  currentUser.value = user;
  bootstrap();
}

async function signOut() {
  await logout();
  currentUser.value = null;
  await bootstrap();
}

onMounted(bootstrap);
</script>

<template>
  <div v-if="loading" class="state fullscreen-state">Loading NovaKit...</div>
  <div v-else-if="error" class="state error fullscreen-state">{{ error }}</div>
  <LoginPage
    v-else-if="authConfig?.auth_required && !currentUser"
    :config="authConfig"
    @signed-in="onSignedIn"
  />
  <AppShell v-else>
    <template #nav>
      <div class="user-box" v-if="currentUser">
        <strong>{{ currentUser.operator || currentUser.username }}</strong>
        <span>{{ currentUser.provider }} · {{ currentUser.role }}</span>
        <button type="button" class="sidebar-action" @click="signOut">Logout</button>
      </div>
      <NavTabs v-model="activeTab" :tabs="tabs" />
    </template>

    <AgentsPage v-if="activeTab === 'agents'" />
    <RunsPage v-else-if="activeTab === 'runs'" />
    <ChatPage v-else-if="activeTab === 'chat'" />
    <WorkflowsPage v-else-if="activeTab === 'workflows'" />
    <SettingsPage v-else />
  </AppShell>
</template>
