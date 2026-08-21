<script setup lang="ts">
import PwdLogin from './modules/pwd-login.vue';
</script>

<template>
  <div class="min-h-100vh flex items-center justify-center bg-#e9e7ff px-16px">
    <div class="w-380px rounded-16px bg-white p-28px shadow-lg">
      <div class="mb-28px flex items-center gap-16px">
        <div class="h-48px w-48px flex items-center justify-center rounded-14px bg-gradient-to-br from-#2563eb to-#7c3aed text-22px text-white font-black shadow-lg">D</div>
        <div>
          <div class="text-24px font-semibold text-#4f63ff">Demo OA</div>
          <div class="mt-4px text-13px text-gray-500">企業營運展示系統</div>
        </div>
      </div>

      <PwdLogin />
    </div>
  </div>
</template>
