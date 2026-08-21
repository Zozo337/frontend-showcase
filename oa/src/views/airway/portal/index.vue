<script setup lang="ts">
import { ref } from 'vue';

const featureCards = [
  {
    title: 'Dashboard',
    desc: '查看待辦、申請、系統狀態與建置進度',
    path: '/airway-dashboard'
  },
  {
    title: 'Workflow',
    desc: '表單、簽核、退回與流程紀錄',
    path: '/airway-test'
  },
  {
    title: 'NovaKit',
    desc: '串接 AI 中台與 Claw Actions 自動化',
    path: '/novakit/',
    embedded: true
  }
];

const novakitOpen = ref(false);
const novakitLoaded = ref(false);
const novakitFrameKey = ref(0);
const novakitUrl = new URL('../novakit/', new URL(import.meta.env.BASE_URL, window.location.origin)).toString();

function openNovakit() {
  novakitLoaded.value = false;
  novakitOpen.value = true;
}

function closeNovakit() {
  novakitOpen.value = false;
}

function reloadNovakit() {
  novakitLoaded.value = false;
  novakitFrameKey.value += 1;
}
</script>

<template>
  <div class="portal-page">
    <div class="hero-backdrop" aria-hidden="true"></div>

    <div class="video-overlay"></div>
    <div class="noise-layer"></div>

    <main class="portal-content">
      <nav class="portal-nav">
        <div class="portal-brand">
          <div class="portal-logo">D</div>
          <div>
            <strong>Demo OA</strong>
            <span>Operations Platform</span>
          </div>
        </div>

        <div class="portal-links">
          <button type="button" @click="openNovakit">NovaKit</button>
          <RouterLink to="/airway-dashboard">Dashboard</RouterLink>
        </div>
      </nav>

      <section class="hero-section">
        <div class="brand-pill">Enterprise Operations Platform</div>

        <h1>
          <span>Demo OA</span>
          <span>Flow the Future.</span>
        </h1>

        <p>
          整合 HR、OA、IT 資產、簽核流程與 NovaKit 自動化能力，
          打造企業內部的營運流程中台。
        </p>

        <div class="hero-actions">
          <RouterLink to="/airway-dashboard">
            <NButton class="portal-dashboard-btn" type="primary" size="large">進入 Dashboard</NButton>
          </RouterLink>
        </div>
      </section>

      <section class="feature-grid">
        <template v-for="item in featureCards" :key="item.title">
          <button v-if="item.embedded" type="button" class="feature-card feature-card-button" @click="openNovakit">
            <span>{{ item.title }}</span>
            <p>{{ item.desc }}</p>
          </button>
          <RouterLink v-else :to="item.path" class="feature-card">
            <span>{{ item.title }}</span>
            <p>{{ item.desc }}</p>
          </RouterLink>
        </template>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="novakitOpen" class="novakit-overlay" role="dialog" aria-modal="true" aria-label="NovaKit">
        <div class="novakit-window">
          <header class="novakit-toolbar">
            <div class="novakit-title">
              <span class="novakit-status-dot"></span>
              <div>
                <strong>NovaKit</strong>
                <small>AI System Controller</small>
              </div>
            </div>

            <div class="novakit-actions">
              <span v-if="!novakitLoaded" class="novakit-loading">載入中…</span>
              <button type="button" @click="reloadNovakit">重新載入</button>
              <a :href="novakitUrl" target="_blank" rel="noopener noreferrer">另開視窗</a>
              <button class="novakit-close" type="button" aria-label="關閉 NovaKit" @click="closeNovakit">關閉</button>
            </div>
          </header>

          <div class="novakit-frame-wrap">
            <div v-if="!novakitLoaded" class="novakit-frame-placeholder">
              <span class="novakit-spinner"></span>
              <strong>正在連線 NovaKit</strong>
              <p>NovaKit 暫時離線時，仍可關閉此視窗繼續使用 OA。</p>
            </div>
            <iframe
              :key="novakitFrameKey"
              class="novakit-frame"
              :src="novakitUrl"
              title="NovaKit System Controller"
              allow="clipboard-read; clipboard-write"
              @load="novakitLoaded = true"
            ></iframe>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.portal-page {
  position: fixed;
  inset: 0;
  z-index: 9999;
  min-height: 100vh;
  overflow: hidden;
  background: #020617;
  color: #fff;
}

.hero-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle at 78% 20%, rgb(59 130 246 / 34%), transparent 27%),
    radial-gradient(circle at 16% 76%, rgb(124 58 237 / 25%), transparent 30%),
    radial-gradient(circle at 55% 58%, rgb(14 165 233 / 14%), transparent 32%),
    linear-gradient(135deg, #020617 0%, #08142b 52%, #111037 100%);
}

.hero-backdrop::before,
.hero-backdrop::after {
  position: absolute;
  content: '';
  border: 1px solid rgb(125 211 252 / 12%);
  border-radius: 50%;
}

.hero-backdrop::before {
  width: 560px;
  height: 560px;
  top: -170px;
  right: -90px;
  box-shadow: 0 0 0 90px rgb(59 130 246 / 3%), 0 0 0 180px rgb(59 130 246 / 2%);
}

.hero-backdrop::after {
  width: 380px;
  height: 380px;
  left: -120px;
  bottom: -160px;
  box-shadow: 0 0 0 70px rgb(124 58 237 / 3%);
}

.video-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle at 18% 28%, rgba(14, 165, 233, 0.12), transparent 24%),
    radial-gradient(circle at 82% 18%, rgba(59, 130, 246, 0.1), transparent 20%),
    linear-gradient(
      90deg,
      rgba(2, 6, 23, 0.78) 0%,
      rgba(2, 6, 23, 0.66) 38%,
      rgba(2, 6, 23, 0.38) 68%,
      rgba(2, 6, 23, 0.58) 100%
    ),
    linear-gradient(180deg, rgba(2, 6, 23, 0.16) 0%, rgba(2, 6, 23, 0.48) 100%);
}

.noise-layer {
  position: fixed;
  inset: 0;
  z-index: 1;
  opacity: 0.07;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 3px 3px, 3px 3px;
  mix-blend-mode: soft-light;
}

.portal-content {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  padding: 64px 72px 42px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.portal-nav {
  position: absolute;
  top: 28px;
  left: 72px;
  right: 72px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.portal-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.portal-logo {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
  color: #fff;
  font-size: 22px;
  font-weight: 900;
  box-shadow: 0 0 30px rgba(14, 165, 233, 0.28);
}

.portal-brand strong {
  display: block;
  font-size: 18px;
  line-height: 1;
  color: #f8fafc;
}

.portal-brand span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.72);
  letter-spacing: 0.04em;
}

.portal-links {
  display: flex;
  gap: 14px;
}

.portal-links a,
.portal-links button {
  appearance: none;
  font: inherit;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.78);
  text-decoration: none;
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.46);
  border: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(14px);
  transition: 0.18s ease;
}

.portal-links a:hover,
.portal-links button:hover {
  color: #fff;
  background: rgba(37, 99, 235, 0.42);
  border-color: rgba(147, 197, 253, 0.36);
}

.hero-section {
  max-width: 880px;
  padding-top: 136px;
  margin-left: 16px;
}

.brand-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  border-radius: 999px;
  color: #dbeafe;
  background: rgba(15, 23, 42, 0.44);
  border: 1px solid rgba(96, 165, 250, 0.28);
  backdrop-filter: blur(20px);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.16);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.hero-section h1 {
  margin: 28px 0 0;
  max-width: 860px;
  font-size: clamp(58px, 6.8vw, 96px);
  line-height: 1.04;
  letter-spacing: -0.055em;
  font-weight: 850;
  color: #f8fafc;
  text-shadow: 0 14px 45px rgba(2, 6, 23, 0.5);
}

.hero-section h1 span {
  display: block;
}

.hero-section p {
  margin: 32px 0 0;
  max-width: 720px;
  color: rgba(226, 232, 240, 0.82);
  font-size: 16px;
  line-height: 2;
  letter-spacing: 0.02em;
  text-shadow: 0 8px 24px rgba(2, 6, 23, 0.45);
}

.hero-actions {
  margin-top: 38px;
  display: flex;
  gap: 14px;
  align-items: center;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-top: 68px;
}

.feature-card {
  display: block;
  width: 100%;
  text-align: left;
  min-height: 132px;
  padding: 22px;
  border-radius: 24px;
  color: #fff;
  text-decoration: none;
  background: rgba(15, 23, 42, 0.54);
  border: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.28);
  transition: 0.22s ease;
}

.feature-card-button {
  appearance: none;
  font: inherit;
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-6px);
  background: rgba(30, 41, 59, 0.76);
  border-color: rgba(96, 165, 250, 0.34);
  box-shadow: 0 24px 52px rgba(2, 6, 23, 0.4);
}

.feature-card span {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
}

.feature-card p {
  margin: 12px 0 0;
  color: rgba(203, 213, 225, 0.74);
  line-height: 1.7;
  font-size: 13px;
}


:deep(.portal-dashboard-btn) {
  background: linear-gradient(135deg, #0ea5e9, #2563eb) !important;
  border-color: rgba(147, 197, 253, 0.62) !important;
  color: #fff !important;
  box-shadow: 0 14px 36px rgba(37, 99, 235, 0.38) !important;
}

:deep(.portal-dashboard-btn:hover) {
  background: linear-gradient(135deg, #38bdf8, #1d4ed8) !important;
  border-color: rgba(191, 219, 254, 0.82) !important;
  transform: translateY(-1px);
}

:deep(.portal-dashboard-btn .n-button__content) {
  color: #fff !important;
}

.portal-links a:first-child {
  color: #fff;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.88), rgba(37, 99, 235, 0.92));
  border-color: rgba(147, 197, 253, 0.48);
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.24);
}

.novakit-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(2, 6, 23, 0.82);
  backdrop-filter: blur(18px);
}

.novakit-window {
  width: min(1600px, 100%);
  height: min(920px, calc(100vh - 48px));
  overflow: hidden;
  border: 1px solid rgba(52, 211, 153, 0.24);
  border-radius: 24px;
  background: #04070d;
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.58);
}

.novakit-toolbar {
  height: 64px;
  padding: 0 18px 0 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: #e2e8f0;
  background: linear-gradient(180deg, rgba(10, 17, 28, 0.98), rgba(5, 10, 18, 0.98));
  border-bottom: 1px solid rgba(51, 65, 85, 0.62);
}

.novakit-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
}

.novakit-title strong,
.novakit-title small {
  display: block;
}

.novakit-title strong {
  color: #f8fafc;
  font-size: 15px;
}

.novakit-title small {
  margin-top: 2px;
  color: #64748b;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.novakit-status-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #10b981;
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.72);
}

.novakit-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.novakit-actions button,
.novakit-actions a {
  appearance: none;
  padding: 8px 12px;
  border: 1px solid rgba(71, 85, 105, 0.72);
  border-radius: 10px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.78);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
}

.novakit-actions button:hover,
.novakit-actions a:hover {
  color: #fff;
  border-color: rgba(52, 211, 153, 0.48);
  background: rgba(16, 185, 129, 0.12);
}

.novakit-actions .novakit-close {
  color: #fecdd3;
  border-color: rgba(244, 63, 94, 0.35);
}

.novakit-loading {
  margin-right: 4px;
  color: #94a3b8;
  font-size: 12px;
}

.novakit-frame-wrap {
  position: relative;
  height: calc(100% - 64px);
  background: #04070d;
}

.novakit-frame {
  position: relative;
  z-index: 2;
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #04070d;
}

.novakit-frame-placeholder {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  background: #04070d;
}

.novakit-frame-placeholder p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
}

.novakit-spinner {
  width: 30px;
  height: 30px;
  margin-bottom: 16px;
  border: 3px solid rgba(52, 211, 153, 0.16);
  border-top-color: #34d399;
  border-radius: 999px;
  animation: novakit-spin 0.8s linear infinite;
}

@keyframes novakit-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .portal-content {
    padding: 36px 28px 24px;
  }

  .portal-nav {
    left: 28px;
    right: 28px;
  }

  .hero-section {
    padding-top: 128px;
    margin-left: 0;
  }

  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .portal-content {
    padding: 22px 18px 18px;
  }

  .portal-nav {
    left: 18px;
    right: 18px;
  }

  .portal-links {
    display: none;
  }

  .hero-section {
    padding-top: 116px;
    margin-left: 0;
  }

  .hero-section h1 {
    font-size: 48px;
    line-height: 1.05;
    letter-spacing: -0.045em;
  }

  .hero-section p {
    font-size: 14px;
    line-height: 1.85;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .novakit-overlay {
    padding: 0;
  }

  .novakit-window {
    height: 100vh;
    border: 0;
    border-radius: 0;
  }

  .novakit-toolbar {
    padding: 0 10px 0 14px;
  }

  .novakit-loading,
  .novakit-actions a {
    display: none;
  }
}
</style>
