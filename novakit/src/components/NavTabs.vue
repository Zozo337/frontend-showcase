<script setup lang="ts">
defineProps<{
  modelValue: string;
  tabs: Array<{ key: string; label: string }>;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <nav class="nav-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      :class="{ active: tab.key === modelValue }"
      @click="$emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>
