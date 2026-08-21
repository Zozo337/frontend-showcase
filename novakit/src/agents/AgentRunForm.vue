<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { AgentDetail } from "../api/agents";
import { runAgent, type AgentRunRecord } from "../api/agents";
import { uploadAgentFile } from "../api/files";
import DynamicInputField from "./DynamicInputField.vue";

const props = defineProps<{ detail: AgentDetail }>();
const emit = defineEmits<{ result: [record: AgentRunRecord] }>();

const values = reactive<Record<string, unknown>>({});
const files = reactive<Record<string, File | null>>({});
const loading = ref(false);
const error = ref("");

function resetValues() {
  for (const key of Object.keys(values)) delete values[key];
  for (const key of Object.keys(files)) delete files[key];
  for (const input of props.detail.manifest.inputs) {
    values[input.name] = input.default ?? (input.type === "boolean" ? false : "");
    files[input.name] = null;
  }
}

watch(() => props.detail.manifest.id, resetValues, { immediate: true });

async function submit() {
  loading.value = true;
  error.value = "";
  try {
    const inputs: Record<string, unknown> = { ...values };
    for (const input of props.detail.manifest.inputs) {
      if (input.type !== "file") continue;
      const file = files[input.name];
      if (!file) {
        delete inputs[input.name];
        continue;
      }
      inputs[input.name] = await uploadAgentFile(file, props.detail.manifest.id, input.name);
    }
    const record = await runAgent(props.detail.manifest.id, inputs);
    emit("result", record);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <form class="run-form" @submit.prevent="submit">
    <h3>Run Agent</h3>
    <DynamicInputField
      v-for="input in detail.manifest.inputs"
      :key="input.name"
      :input="input"
      v-model="values[input.name]"
      v-model:file-value="files[input.name]"
    />
    <p v-if="error" class="inline-error">{{ error }}</p>
    <button type="submit" :disabled="loading">{{ loading ? "Running..." : "Run" }}</button>
  </form>
</template>
