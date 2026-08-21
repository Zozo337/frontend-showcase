<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ value: unknown }>();
const formatted = computed(() => JSON.stringify(props.value ?? null, null, 2));
</script>

<template>
  <pre class="json-viewer">{{ formatted }}</pre>
</template>
