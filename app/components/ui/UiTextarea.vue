<template>
  <div>
    <label v-if="label" :for="id" class="block text-sm font-semibold text-gray-700 mb-2">
      {{ label }} <span v-if="required" class="text-red-600">*</span>
    </label>

    <textarea
      :id="id"
      v-model="model"
      v-bind="attrs"
      :required="required"
      :rows="rows"
      :placeholder="placeholder"
      class="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2"
      :class="invalid ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'"
    />

    <p v-if="hint" class="text-xs text-gray-500 mt-2">{{ hint }}</p>
    <p v-if="showError && error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    id?: string
    label?: string
    hint?: string
    error?: string
    showError?: boolean
    required?: boolean
    placeholder?: string
    rows?: number
    modelValue: string | null
  }>(),
  {
    required: false,
    showError: false,
    rows: 3,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const attrs = useAttrs()
const invalid = computed(() => props.showError && !!props.error)

const model = computed({
  get() {
    return props.modelValue ?? ''
  },
  set(value) {
    emit('update:modelValue', value === '' ? '' : String(value))
  },
})
</script>
