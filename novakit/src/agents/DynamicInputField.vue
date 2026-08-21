<script setup lang="ts">
import type { AgentInput } from "../api/agents";

const props = defineProps<{
  input: AgentInput;
  modelValue: unknown;
  fileValue?: File | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: unknown];
  "update:fileValue": [value: File | null];
}>();

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:fileValue", target.files?.[0] ?? null);
}
</script>

<template>
  <label class="field">
    <span>{{ props.input.label || props.input.name }}</span>
    <textarea
      v-if="props.input.type === 'textarea'"
      :value="String(modelValue ?? '')"
      :required="props.input.required"
      rows="5"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <select
      v-else-if="props.input.type === 'select'"
      :value="String(modelValue ?? '')"
      :required="props.input.required"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">Select</option>
      <option v-for="option in props.input.options || []" :key="option" :value="option">
        {{ option }}
      </option>
    </select>
    <input
      v-else-if="props.input.type === 'number'"
      type="number"
      :value="Number(modelValue ?? 0)"
      :required="props.input.required"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
    <input
      v-else-if="props.input.type === 'boolean'"
      type="checkbox"
      :checked="Boolean(modelValue)"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <input
      v-else-if="props.input.type === 'file'"
      type="file"
      :required="props.input.required && !fileValue"
      :accept="(props.input.accept || []).join(',')"
      @change="onFileChange"
    />
    <input
      v-else
      type="text"
      :value="String(modelValue ?? '')"
      :required="props.input.required"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>
