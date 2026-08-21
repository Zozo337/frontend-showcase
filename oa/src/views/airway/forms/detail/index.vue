<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

onMounted(() => {
  router.replace({ path: '/airway/forms/center', query: { id: route.params.id as string } });
});
</script>

<template>
  <NResult status="info" title="正在開啟審核中心" description="申請詳情會在審核中心右側顯示" />
</template>
