<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">
    <!-- Sidebar -->
    <Sidebar class="hidden md:flex" />
    
    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-h-0">
      <!-- Mobile Header (optional - for responsive menu button) -->
      <div class="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between space-x-4">
        <div class="flex items-center space-x-4">
          <button @click="mobileMenuOpen = !mobileMenuOpen" class="text-gray-700 flex align-middle">
            <Icon :name="mobileMenuOpen ? 'mdi:close' : 'mdi:menu'" class="text-2xl" />
          </button>
          <NuxtLink to="/" class="flex items-center space-x-3 hover:opacity-80 transition">
            <img
              src="/logo.png"
              :alt="tr('Logo Paroki Mangga Besar', 'Mangga Besar Parish Logo')"
              class="h-10"
            />
          </NuxtLink>
        </div>
        <LanguageToggle />
      </div>

      <!-- Mobile Sidebar Overlay -->
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-50 md:hidden"
        @click="mobileMenuOpen = false"
      >
        <div class="absolute inset-0 bg-black opacity-50"></div>
        <div class="relative w-64 bg-white h-full" @click.stop>
          <Sidebar @navigate="mobileMenuOpen = false" />
        </div>
      </div>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto min-h-0 bg-gray-50 py-4 px-2 md:py-8 md:px-0">
        <slot />
      </main>

      <!-- Optional Footer for authenticated pages -->
      <footer class="bg-white border-t border-gray-200 py-4">
        <div class="container mx-auto px-4 text-center text-sm text-gray-600">
         &copy; {{ new Date().getFullYear() }} {{ tr('Paroki Mangga Besar. Hak cipta dilindungi.', 'Mangga Besar Parish. All rights reserved.') }}
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
const mobileMenuOpen = ref(false)
const { tr } = useAppLocale()
</script>
