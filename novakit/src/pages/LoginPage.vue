<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { AuthConfig, AuthUser } from "../api/auth";
import { loginAd, loginGoogle, loginLocal } from "../api/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
            }
          ) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

const props = defineProps<{
  config: AuthConfig;
}>();

const emit = defineEmits<{
  (event: "signed-in", user: AuthUser): void;
}>();

type LoginMethod = "local" | "ad" | "google";

const menuOpen = ref(false);
const selectedMethod = ref<LoginMethod | null>(null);
const username = ref(props.config.demo_mode ? "admin" : "");
const password = ref(props.config.demo_mode ? "NovaDemo!2026" : "");
const loading = ref(false);
const error = ref("");
const googleButton = ref<HTMLElement | null>(null);

const availableMethods = computed(() => {
  const methods: Array<{ key: LoginMethod; label: string; desc: string }> = [];

  if (props.config.local_enabled) {
    methods.push({
      key: "local",
      label: props.config.demo_mode ? "進入公開 Demo" : "使用本機帳號登入",
      desc: props.config.demo_mode ? "純假資料 · Mock AI · 不需要 API Key" : "Standalone administrator",
    });
  }

  if (props.config.ad_enabled) {
    methods.push({
      key: "ad",
      label: "使用 AD 帳號登入",
      desc: "公司網域帳號 / 密碼",
    });
  }

  if (props.config.google_enabled) {
    methods.push({
      key: "google",
      label: "使用 Google 登入",
      desc: "Google Workspace SSO",
    });
  }

  return methods;
});

function openLoginMenu() {
  error.value = "";
  menuOpen.value = !menuOpen.value;
}

async function selectMethod(method: LoginMethod) {
  selectedMethod.value = method;
  menuOpen.value = false;
  error.value = "";

  if (method === "google") {
    await nextTick();
    await renderGoogleLogin();
  }
}

async function submitAdLogin() {
  if (!username.value || !password.value) {
    error.value = selectedMethod.value === "local" ? "請輸入 Demo 帳號與密碼" : "請輸入 AD 帳號與密碼";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const user = selectedMethod.value === "local"
      ? await loginLocal(username.value, password.value)
      : await loginAd(username.value, password.value);
    emit("signed-in", user);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google script load failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google script load failed"));
    document.head.appendChild(script);
  });
}

async function renderGoogleLogin() {
  if (!props.config.google_enabled) {
    error.value = "Google 登入目前未啟用";
    return;
  }

  const clientId =
    props.config.google_client_id ||
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
    "";

  if (!clientId) {
    error.value = "Google Client ID 未設定，請先設定 google_client_id 或 VITE_GOOGLE_CLIENT_ID";
    return;
  }

  if (!googleButton.value) {
    error.value = "Google 登入按鈕初始化失敗";
    return;
  }

  try {
    loading.value = true;
    error.value = "";

    await loadGoogleScript();

    googleButton.value.innerHTML = "";

    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential?: string }) => {
        if (!response.credential) {
          error.value = "Google 沒有回傳 credential";
          return;
        }

        try {
          loading.value = true;
          const user = await loginGoogle(response.credential);
          emit("signed-in", user);
        } catch (err) {
          error.value = err instanceof Error ? err.message : String(err);
        } finally {
          loading.value = false;
        }
      },
    });

    window.google?.accounts.id.renderButton(googleButton.value, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signin_with",
      shape: "rectangular",
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="brand">
        <div class="logo">🤖</div>
        <div>
          <h1>NOVAKIT PRO</h1>
          <p>請選擇登入方式</p>
        </div>
      </div>

      <div v-if="availableMethods.length === 0" class="error-box">
        目前沒有啟用任何登入方式，請聯絡系統管理員。
      </div>

      <div v-else class="login-actions">
        <button type="button" class="primary-btn" @click="openLoginMenu">
          登入 NovaKit
        </button>

        <div v-if="menuOpen" class="method-menu">
          <button
            v-for="method in availableMethods"
            :key="method.key"
            type="button"
            class="method-item"
            @click="selectMethod(method.key)"
          >
            <strong>{{ method.label }}</strong>
            <span>{{ method.desc }}</span>
          </button>
        </div>
      </div>

      <form
        v-if="selectedMethod === 'ad' || selectedMethod === 'local'"
        class="ad-form"
        @submit.prevent="submitAdLogin"
      >
        <label>
          {{ selectedMethod === "local" ? "Demo 帳號" : "AD 帳號" }}
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            :placeholder="selectedMethod === 'local' ? 'admin' : 'username 或 EXAMPLE\\\\username'"
          />
        </label>

        <label>
          {{ selectedMethod === "local" ? "Demo 密碼" : "AD 密碼" }}
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            :placeholder="selectedMethod === 'local' ? '公開展示密碼' : '請輸入 AD 密碼'"
          />
        </label>

        <button type="submit" class="primary-btn" :disabled="loading">
          {{ loading ? "登入中..." : "登入" }}
        </button>
      </form>

      <div v-if="selectedMethod === 'google'" class="google-panel">
        <p>請使用 Google Workspace 帳號登入。</p>
        <div ref="googleButton" class="google-button"></div>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top, rgba(16, 185, 129, 0.18), transparent 34%),
    #02070d;
  color: #e5f7ff;
}

.login-card {
  width: min(460px, calc(100vw - 32px));
  border: 1px solid rgba(120, 180, 255, 0.25);
  border-radius: 20px;
  background: rgba(8, 15, 28, 0.96);
  padding: 32px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
}

.brand {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 28px;
}

.logo {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #10b981;
  box-shadow: 0 0 28px rgba(16, 185, 129, 0.35);
}

h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.04em;
}

p {
  margin: 6px 0 0;
  color: #8da2bd;
}

.login-actions {
  position: relative;
}

.primary-btn {
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: 14px 16px;
  font-weight: 800;
  color: white;
  background: #10b981;
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.method-menu {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.method-item {
  text-align: left;
  border: 1px solid rgba(120, 180, 255, 0.25);
  border-radius: 12px;
  padding: 14px;
  background: #0c1424;
  color: #e5f7ff;
  cursor: pointer;
}

.method-item:hover {
  border-color: rgba(16, 185, 129, 0.75);
  background: #0d1d28;
}

.method-item strong {
  display: block;
  margin-bottom: 4px;
}

.method-item span {
  color: #8da2bd;
  font-size: 13px;
}

.ad-form {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

label {
  display: grid;
  gap: 8px;
  color: #9fb4cf;
  font-size: 13px;
  letter-spacing: 0.04em;
}

input {
  border: 1px solid rgba(120, 180, 255, 0.25);
  border-radius: 12px;
  background: #0c1424;
  color: #e5f7ff;
  padding: 13px 14px;
  outline: none;
}

input:focus {
  border-color: rgba(16, 185, 129, 0.8);
}

.google-panel {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.google-button {
  min-height: 44px;
}

.error-text,
.error-box {
  margin-top: 16px;
  color: #ff6b6b;
}
</style>
