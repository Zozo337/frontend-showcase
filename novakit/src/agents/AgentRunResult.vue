<script setup lang="ts">
import type { AgentRunRecord } from "../api/agents";
import JsonViewer from "../components/JsonViewer.vue";
import OutputArtifacts from "./OutputArtifacts.vue";

defineProps<{ record: AgentRunRecord }>();
</script>

<template>
  <section class="detail-panel">
    <div class="panel-header">
      <div>
        <h3>Run Result</h3>
        <p>{{ record.run_id }}</p>
      </div>
      <span class="pill">{{ record.status }}</span>
    </div>
    <OutputArtifacts :artifacts="record.artifacts || {}" :run-id="record.run_id" />
    <h4>Outputs</h4>
    <JsonViewer :value="record.outputs" />
    <h4>Steps</h4>
    <JsonViewer :value="record.steps" />
  </section>
</template>
