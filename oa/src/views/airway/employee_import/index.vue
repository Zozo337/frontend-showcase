<script setup lang="ts">
defineOptions({
  name: 'AirwayEmployeeImport'
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-20px font-semibold">人員資料匯入</h2>
          <p class="mt-1 text-#888">匯入頁載入成功</p>
        </div>

        <RouterLink to="/airway/employees">
          <NButton>返回員工管理</NButton>
        </RouterLink>
      </div>
    </NCard>
  </NSpace>
</template>