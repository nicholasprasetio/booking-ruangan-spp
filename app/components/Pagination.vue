<template>
  <div v-if="meta && meta.totalPages > 1" class="flex flex-wrap items-center justify-between gap-3">
    <div class="text-xs text-gray-500">
      {{ tr('Halaman', 'Page') }} {{ meta.page }} {{ tr('dari', 'of') }} {{ meta.totalPages }} · {{ tr('Total', 'Total') }} {{ meta.total }}
    </div>
    <div class="flex items-center gap-2">
      <button
        class="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="meta.page <= 1"
        @click="go(meta.page - 1)"
      >
        {{ tr('Sebelumnya', 'Prev') }}
      </button>
      <button
        class="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="meta.page >= meta.totalPages"
        @click="go(meta.page + 1)"
      >
        {{ tr('Berikutnya', 'Next') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PaginationMeta } from '~/models/pagination'

const props = defineProps<{
  meta: PaginationMeta
}>()
const { tr } = useAppLocale()

const emit = defineEmits<{
  (e: 'change', page: number): void
}>()

function go(page: number) {
  if (page < 1 || page > props.meta.totalPages) return
  emit('change', page)
}
</script>
