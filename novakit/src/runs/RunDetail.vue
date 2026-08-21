<script setup lang="ts">
import type { AgentRunRecord } from "../api/agents";
import { approveRun, rejectRun } from "../api/runs";
import JsonViewer from "../components/JsonViewer.vue";
import RunOutputs from "./RunOutputs.vue";
import RunStepTimeline from "./RunStepTimeline.vue";

const props = defineProps<{ run: AgentRunRecord }>();
const emit = defineEmits<{ refreshed: [run: AgentRunRecord] }>();

async function approve() {
  const response = await approveRun(props.run.run_id);
  emit("refreshed", response.run);
}

async function reject() {
  const response = await rejectRun(props.run.run_id);
  emit("refreshed", response.run);
}
</script>

<template>
  <section class="detail-panel">
    <div class="panel-header">
      <div>
        <h3>{{ run.agent_id }}</h3>
        <p>{{ run.run_id }}</p>
      </div>
      <span class="pill">{{ run.status }}</span>
    </div>

    <div v-if="run.status === 'pending_approval'" class="command-row compact">
      <button type="button" @click="approve">Approve</button>
      <button type="button" class="secondary" @click="reject">Reject</button>
    </div>

    <p v-if="run.error" class="inline-error">{{ run.error }}</p>

    <h4>Inputs</h4>
    <JsonViewer :value="run.inputs_metadata" />

    <h4>Steps</h4>
    <RunStepTimeline :steps="run.steps || []" />

    <h4>Outputs</h4>
    <RunOutputs :run-id="run.run_id" :outputs="run.outputs || {}" :artifacts="run.artifacts || {}" />
  </section>
</template>
