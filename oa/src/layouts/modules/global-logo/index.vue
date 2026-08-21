<script setup lang="ts">
defineOptions({
  name: 'GlobalLogo'
});

interface Props {
  /** Whether to show the title */
  showTitle?: boolean;
}

withDefaults(defineProps<Props>(), {
  showTitle: true
});
</script>

<template>
  <RouterLink to="/airway/dashboard" class="airway-global-logo">
    <span class="demo-logo-mark" aria-hidden="true">D</span>
    <h2 v-show="showTitle" class="airway-logo-title">
      Demo OA
    </h2>
  </RouterLink>
</template>

<style scoped>
.airway-global-logo {
  width: 100%;
  height: 100%;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  text-decoration: none;
}

.demo-logo-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  flex-shrink: 0;
  border-radius: 10px;
  background: linear-gradient(145deg, #2563eb, #7c3aed);
  color: #fff;
  font-size: 16px;
  font-weight: 900;
  box-shadow: 0 8px 18px rgb(37 99 235 / 24%);
}

.airway-logo-title {
  color: #2563eb;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  transition: all 0.3s ease;
}
</style>
