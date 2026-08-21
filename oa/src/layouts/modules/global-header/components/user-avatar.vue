<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/modules/auth';

const router = useRouter();
const authStore = useAuthStore();

const displayName = computed(() => {
  return authStore.userInfo.userName || 'Demo User';
});

async function goLogin() {
  await router.push('/login');
}

async function goProfile() {
  await router.push('/airway/profile');
}

async function logout() {
  await authStore.resetStore();
  await router.push('/login');
}

async function handleSelect(key: string) {
  if (key === 'profile') {
    await goProfile();
    return;
  }

  if (key === 'logout') {
    await logout();
  }
}
</script>

<template>
  <div class="flex items-center gap-12px">
    <template v-if="authStore.isLogin">
      <NDropdown
        :options="[
          { label: displayName, key: 'user', disabled: true },
          { label: '個人資訊', key: 'profile' },
          { label: '登出', key: 'logout' }
        ]"
        @select="handleSelect"
      >
        <div class="flex cursor-pointer items-center gap-8px">
          <NAvatar round size="small">
            {{ displayName.slice(0, 1) }}
          </NAvatar>
          <span class="text-14px">{{ displayName }}</span>
        </div>
      </NDropdown>
    </template>

    <NButton v-else quaternary @click="goLogin">
      登入
    </NButton>
  </div>
</template>
