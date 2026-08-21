<script setup lang="ts">
defineProps<{ message: string }>();
</script>

<template>
  <div class="state error">{{ message }}</div>
</template>
