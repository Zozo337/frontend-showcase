<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const menus = [
  {
    label: '首頁',
    path: '/airway-dashboard'
  },
  {
    label: '組織架構',
    path: '/airway-departments'
  },
  {
    label: 'API 測試',
    path: '/airway-test'
  }
];

const activePath = computed(() => route.path);
</script>

<template>
  <div class="airway-shell">
    <aside class="airway-sidebar">
      <div class="airway-brand">
        <div class="airway-logo">D</div>
        <div>
          <div class="airway-title">Demo OA</div>
          <div class="airway-subtitle">Operations Demo</div>
        </div>
      </div>

      <nav class="airway-menu">
        <RouterLink
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="airway-menu-item"
          :class="{ active: activePath === item.path }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <main class="airway-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.airway-shell {
  min-height: 100vh;
  display: flex;
  background: #f5f7fb;
}

.airway-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  padding: 20px 16px;
}

.airway-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.airway-logo {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #646cff, #8b5cf6);
  color: white;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.airway-title {
  font-size: 18px;
  font-weight: 700;
}

.airway-subtitle {
  font-size: 12px;
  color: #888;
}

.airway-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.airway-menu-item {
  padding: 10px 12px;
  border-radius: 10px;
  color: #333;
  text-decoration: none;
}

.airway-menu-item:hover {
  background: #f1f5f9;
}

.airway-menu-item.active {
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 600;
}

.airway-main {
  flex: 1;
  min-width: 0;
  padding: 24px;
}
</style>
