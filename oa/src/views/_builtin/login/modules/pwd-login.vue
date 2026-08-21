<script setup lang="ts">
import { reactive } from 'vue';
import { useAuthStore } from '@/store/modules/auth';

const authStore = useAuthStore();
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

const model = reactive({
  userName: demoMode ? 'demo.admin' : '',
  password: demoMode ? 'NovaDemo!2026' : ''
});

async function handleSubmit() {
  if (!model.userName.trim()) {
    window.$message?.warning(demoMode ? '請輸入 Demo 帳號' : '請輸入 AD 帳號');
    return;
  }

  if (!model.password) {
    window.$message?.warning(demoMode ? '請輸入 Demo 密碼' : '請輸入 AD 密碼');
    return;
  }

  await authStore.login(model.userName.trim(), model.password);
}
</script>

<template>
  <div class="w-320px">
    <h3 class="mb-24px text-20px font-semibold">{{ demoMode ? '公開展示登入' : 'AD 帳號登入' }}</h3>

    <NAlert v-if="demoMode" class="mb-18px" type="success" :show-icon="true">
      此帳號只使用 Git 內的純假資料，不會連線公司 AD。
    </NAlert>

    <NForm :model="model" size="large">
      <NFormItem :label="demoMode ? 'Demo 帳號' : 'AD 帳號'">
        <NInput
          v-model:value="model.userName"
          :placeholder="demoMode ? 'demo.admin' : '例如：company.user'"
          clearable
          @keydown.enter="handleSubmit"
        />
      </NFormItem>

      <NFormItem :label="demoMode ? 'Demo 密碼' : 'AD 密碼'">
        <NInput
          v-model:value="model.password"
          type="password"
          show-password-on="click"
          :placeholder="demoMode ? '公開展示密碼' : '請輸入公司 AD 密碼'"
          clearable
          @keydown.enter="handleSubmit"
        />
      </NFormItem>

      <NButton
        type="primary"
        size="large"
        round
        block
        :loading="authStore.loginLoading"
        @click="handleSubmit"
      >
        登入 Demo OA
      </NButton>
    </NForm>

    <div class="mt-16px text-12px text-gray-500">
      {{
        demoMode
          ? '公開展示帳密已預填；Production 環境會強制停用此登入方式。'
          : '使用公司 Windows / AD 帳號登入，不需要輸入 Email。'
      }}
    </div>
  </div>
</template>
