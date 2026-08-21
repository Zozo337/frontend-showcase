<script setup lang="ts">
import type { AgentSummary } from "../api/agents";

defineProps<{
  agents: AgentSummary[];
  selectedId?: string | null;
}>();

defineEmits<{
  select: [agentId: string];
}>();
</script>

<template>
  <div class="agent-grid">
    <button
      v-for="agent in agents"
      :key="agent.id"
      type="button"
      class="agent-card"
      :class="{ selected: agent.id === selectedId }"
      @click="$emit('select', agent.id)"
    >
      <div class="card-topline">
        <strong>{{ agent.name }}</strong>
        <span>{{ agent.version }}</span>
      </div>
      <p>{{ agent.description }}</p>
      <div class="meta-row">
        <span>{{ agent.id }}</span>
        <span>{{ agent.category }}</span>
        <span>{{ agent.risk_level }}</span>
      </div>
      <span v-if="agent.requires_approval" class="pill warning">approval</span>
    </button>
  </div>
</template>
