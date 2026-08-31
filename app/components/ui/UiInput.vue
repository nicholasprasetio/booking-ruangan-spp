<template>
  <div>
    <label v-if="label" :for="id" class="block text-sm font-semibold text-gray-700 mb-2">
      {{ label }} <span v-if="required" class="text-red-600">*</span>
    </label>

    <input
      :id="id"
      v-model="model"
      v-bind="attrs"
      :type="type"
      :required="required"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :step="step"
      class="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2"
      :class="invalid ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'"
    />

    <p v-if="hint" class="text-xs text-gray-500 mt-2">{{ hint }}</p>
    <p v-if="showError && error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { InputHTMLAttributes } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    id?: string
    label?: string
    hint?: string
    error?: string
    showError?: boolean
    type?: InputHTMLAttributes['type']
    required?: boolean
    placeholder?: string
    min?: string | number
    max?: string | number
    step?: string | number
    modelValue: string | number | null
    modelModifiers?: Record<string, boolean>
  }>(),
  {
    type: 'text',
    required: false,
    showError: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
}>()

const attrs = useAttrs()
const invalid = computed(() => props.showError && !!props.error)

function coerceValue(value: unknown) {
  if (props.modelModifiers?.number) {
    if (value === '' || value === null || value === undefined) return null
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) ? n : null
  }
  return (value ?? '') as string
}

const model = computed({
  get() {
    return props.modelValue ?? ''
  },
  set(value) {
    emit('update:modelValue', coerceValue(value))
  },
})
</script>
