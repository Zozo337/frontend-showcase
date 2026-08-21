<script setup lang="ts">
import { ref } from "vue";
import { apiPost } from "../api/client";
import ErrorState from "../components/ErrorState.vue";
import JsonViewer from "../components/JsonViewer.vue";

const message = ref("");
const loading = ref(false);
const error = ref("");
const response = ref<unknown>(null);

async function send() {
  if (!message.value.trim()) return;
  loading.value = true;
  error.value = "";
  response.value = null;
  try {
    response.value = await apiPost("/api/chat", { message: message.value });
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h2>Chat</h2>
      <p>Legacy Nova chat endpoint.</p>
    </header>

    <form class="command-row" @submit.prevent="send">
      <input v-model="message" placeholder="Ask NovaKit..." />
      <button type="submit" :disabled="loading">Send</button>
    </form>

    <ErrorState v-if="error" :message="error" />
    <JsonViewer v-if="response" :value="response" />
  </section>
</template>
