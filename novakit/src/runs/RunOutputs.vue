<script setup lang="ts">
import JsonViewer from "../components/JsonViewer.vue";
import OutputArtifacts from "../agents/OutputArtifacts.vue";

defineProps<{
  runId: string;
  outputs: Record<string, unknown>;
  artifacts: Record<string, unknown>;
}>();
</script>

<template>
  <OutputArtifacts :artifacts="artifacts || {}" :run-id="runId" />
  <JsonViewer :value="outputs" />
</template>
