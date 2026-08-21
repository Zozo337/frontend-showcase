<script setup lang="ts">
defineProps<{ artifacts: Record<string, unknown>; runId?: string }>();

function artifactId(value: unknown): string | null {
  if (typeof value === "object" && value && "artifact_id" in value) {
    return String((value as { artifact_id: unknown }).artifact_id);
  }
  return null;
}

function label(name: string, value: unknown): string {
  if (typeof value === "object" && value && "filename" in value) {
    return String((value as { filename: unknown }).filename);
  }
  return name;
}
</script>

<template>
  <div v-if="Object.keys(artifacts || {}).length" class="artifact-list">
    <h4>Artifacts</h4>
    <a
      v-for="(artifact, name) in artifacts"
      :key="String(name)"
      :href="
        artifactId(artifact)
          ? `/api/artifacts/${artifactId(artifact)}/download`
          : `/api/agent-runs/${runId}/outputs/${String(name)}`
      "
      target="_blank"
      rel="noreferrer"
    >
      {{ label(String(name), artifact) }}
    </a>
  </div>
</template>
