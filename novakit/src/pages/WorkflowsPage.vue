<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiGet } from "../api/client";
import ErrorState from "../components/ErrorState.vue";
import JsonViewer from "../components/JsonViewer.vue";
import LoadingState from "../components/LoadingState.vue";

const loading = ref(false);
const error = ref("");
const runs = ref<unknown>(null);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    runs.value = await apiGet("/api/workflows/runs?limit=25");
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h2>Workflows</h2>
      <button type="button" @click="load">Refresh</button>
    </header>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" />
    <JsonViewer v-else :value="runs" />
  </section>
</template>
