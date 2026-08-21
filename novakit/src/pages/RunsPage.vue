<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getRun, listRuns, type RunSummary } from "../api/runs";
import type { AgentRunRecord } from "../api/agents";
import ErrorState from "../components/ErrorState.vue";
import LoadingState from "../components/LoadingState.vue";
import RunDetail from "../runs/RunDetail.vue";
import RunList from "../runs/RunList.vue";

const runs = ref<RunSummary[]>([]);
const selectedId = ref<string | null>(null);
const detail = ref<AgentRunRecord | null>(null);
const loading = ref(false);
const error = ref("");

async function loadRuns() {
  loading.value = true;
  error.value = "";
  try {
    runs.value = await listRuns({ limit: 50 });
    if (!selectedId.value && runs.value.length) {
      await selectRun(runs.value[0].run_id);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

async function selectRun(runId: string) {
  selectedId.value = runId;
  try {
    detail.value = await getRun(runId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
}

function updateDetail(run: AgentRunRecord) {
  detail.value = run;
  void loadRuns();
}

onMounted(loadRuns);
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>Runs</h2>
        <p>Recent agent run records from local JSON storage.</p>
      </div>
      <button type="button" @click="loadRuns">Refresh</button>
    </header>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" />
    <div v-else class="two-column runs-layout">
      <RunList :runs="runs" :selected-id="selectedId" @select="selectRun" />
      <RunDetail v-if="detail" :run="detail" @refreshed="updateDetail" />
    </div>
  </section>
</template>
