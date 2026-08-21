<script setup lang="ts">
import type { AgentDetail } from "../api/agents";
import JsonViewer from "../components/JsonViewer.vue";

defineProps<{ detail: AgentDetail }>();
</script>

<template>
  <section class="detail-panel">
    <div class="panel-header">
      <div>
        <h3>{{ detail.manifest.name }}</h3>
        <p>{{ detail.manifest.description }}</p>
      </div>
      <span class="pill">{{ detail.manifest.risk_level }}</span>
    </div>

    <div class="summary-grid">
      <div><span>ID</span><strong>{{ detail.manifest.id }}</strong></div>
      <div><span>Version</span><strong>{{ detail.manifest.version }}</strong></div>
      <div><span>Category</span><strong>{{ detail.manifest.category }}</strong></div>
      <div><span>Approval</span><strong>{{ detail.manifest.requires_approval ? "Required" : "No" }}</strong></div>
    </div>

    <h4>Inputs</h4>
    <ul class="plain-list">
      <li v-for="input in detail.manifest.inputs" :key="input.name">
        <strong>{{ input.name }}</strong>
        <span>{{ input.type }}</span>
        <span v-if="input.required">required</span>
      </li>
    </ul>

    <h4>Outputs</h4>
    <ul class="plain-list">
      <li v-for="output in detail.manifest.outputs" :key="output.name">
        <strong>{{ output.name }}</strong>
        <span>{{ output.type }}</span>
      </li>
    </ul>

    <h4>Workflow</h4>
    <JsonViewer :value="detail.workflow" />
  </section>
</template>
