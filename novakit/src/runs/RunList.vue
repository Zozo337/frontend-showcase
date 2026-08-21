<script setup lang="ts">
import type { RunSummary } from "../api/runs";

defineProps<{ runs: RunSummary[]; selectedId?: string | null }>();
defineEmits<{ select: [runId: string] }>();
</script>

<template>
  <div class="table-panel">
    <table>
      <thead>
        <tr>
          <th>Run</th>
          <th>Agent</th>
          <th>Status</th>
          <th>Started</th>
          <th>Finished</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="run in runs"
          :key="run.run_id"
          :class="{ selected: run.run_id === selectedId }"
          @click="$emit('select', run.run_id)"
        >
          <td>{{ run.run_id }}</td>
          <td>{{ run.agent_id }}</td>
          <td><span class="pill">{{ run.status }}</span></td>
          <td>{{ run.started_at }}</td>
          <td>{{ run.finished_at || "" }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
