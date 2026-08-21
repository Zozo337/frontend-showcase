<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getAgent, listAgents, type AgentDetail, type AgentRunRecord, type AgentSummary } from "../api/agents";
import ErrorState from "../components/ErrorState.vue";
import LoadingState from "../components/LoadingState.vue";
import AgentDetailPanel from "../agents/AgentDetail.vue";
import AgentList from "../agents/AgentList.vue";
import AgentRunForm from "../agents/AgentRunForm.vue";
import AgentRunResult from "../agents/AgentRunResult.vue";

const agents = ref<AgentSummary[]>([]);
const selectedId = ref<string | null>(null);
const detail = ref<AgentDetail | null>(null);
const result = ref<AgentRunRecord | null>(null);
const loading = ref(false);
const detailLoading = ref(false);
const error = ref("");

async function loadAgents() {
  loading.value = true;
  error.value = "";
  try {
    agents.value = await listAgents();
    if (!selectedId.value && agents.value.length) {
      await selectAgent(agents.value[0].id);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

async function selectAgent(agentId: string) {
  selectedId.value = agentId;
  detailLoading.value = true;
  result.value = null;
  try {
    detail.value = await getAgent(agentId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    detailLoading.value = false;
  }
}

onMounted(loadAgents);
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>Agents</h2>
        <p>Generic agent manifests, dynamic forms, and run results.</p>
      </div>
      <button type="button" @click="loadAgents">Refresh</button>
    </header>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" />
    <template v-else>
      <AgentList :agents="agents" :selected-id="selectedId" @select="selectAgent" />
      <LoadingState v-if="detailLoading" />
      <div v-else-if="detail" class="two-column">
        <AgentDetailPanel :detail="detail" />
        <div class="stack">
          <AgentRunForm :detail="detail" @result="result = $event" />
          <AgentRunResult v-if="result" :record="result" />
        </div>
      </div>
    </template>
  </section>
</template>
