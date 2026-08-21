<script setup lang="ts">
defineProps<{ steps: Array<Record<string, unknown>> }>();
</script>

<template>
  <ol class="timeline">
    <li v-for="step in steps" :key="String(step.id || step.name)">
      <span class="dot"></span>
      <div>
        <strong>{{ step.id || step.name || step.type }}</strong>
        <p>{{ step.status }}</p>
      </div>
    </li>
  </ol>
</template>
