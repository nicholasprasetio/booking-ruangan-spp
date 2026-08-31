<template>
  <div class="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
    <button
      type="button"
      class="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
      :class="locale === 'id' ? 'bg-sky-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
      aria-label="Bahasa Indonesia"
      @click="setLocale('id')"
    >
      ID
    </button>
    <button
      type="button"
      class="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
      :class="locale === 'en' ? 'bg-sky-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
      aria-label="English"
      @click="setLocale('en')"
    >
      EN
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, setLocale } = useAppLocale()
</script>
