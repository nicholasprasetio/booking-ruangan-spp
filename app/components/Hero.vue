<template>
  <section class="relative bg-gradient-to-br from-sky-500 via-blue-600 to-sky-700 text-white">
    <!-- Decorative Background -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-yellow-300 opacity-10 rounded-full blur-3xl"></div>
      <div class="absolute top-60 -left-40 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
    </div>

    <div class="container mx-auto px-8 py-12 md:py-24 lg:py-32 relative z-10">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 items-center">
        <!-- Text Content -->
        <div class="space-y-6 md:col-span-1 lg:col-span-2">
          <h1 class="text-4xl lg:text-6xl font-bold leading-tight">
            {{ tr('Paroki Mangga Besar', 'Mangga Besar Parish') }}
            <span class="block text-sky-100">{{ tr('Gereja St. Petrus & Paulus', 'St. Peter & Paul Church') }}</span>
          </h1>
          <p class="text-lg lg:text-xl text-sky-50 leading-relaxed">
            {{ tr(
              'Komunitas Katolik yang hangat dan penuh semangat, tempat iman, harapan, dan kasih bersatu. Bergabunglah dengan kami dalam ibadah, persekutuan, dan pelayanan kepada Tuhan dan sesama.',
              'A warm and vibrant Catholic community where faith, hope, and love come together. Join us in worship, fellowship, and service to God and others.',
            ) }}
          </p>
          <div class="flex flex-wrap gap-4 pt-4">
            <button class="bg-white text-sky-600 px-8 py-3 rounded-full font-semibold hover:bg-sky-50 transition shadow-lg flex items-center space-x-2">
              <Icon name="mdi:calendar-clock" class="text-xl" />
              <span>{{ tr('Jadwal Misa', 'Mass Schedule') }}</span>
            </button>
            <NuxtLink 
              to="/user/book-room" 
              class="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-sky-600 transition"
            >
              {{ tr('Pinjam Ruangan', 'Book Room') }}
            </NuxtLink>
          </div>
        </div>

        <!-- Image/Illustration -->
        <div class="relative">
          <div class="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
            <div class="aspect-square rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center">
              <Icon name="mdi:church" class="text-9xl text-white opacity-90" />
            </div>
          </div>
          <!-- Floating Card -->
          <div class="absolute -bottom-6 -left-6 bg-white text-gray-900 rounded-2xl p-6 shadow-2xl max-w-xs">
            <div class="flex items-center space-x-3">
              <div class="bg-sky-100 p-3 rounded-xl">
                <Icon name="mdi:account-group" class="text-3xl text-sky-600" />
              </div>
              <div>
                <p class="text-2xl font-bold">1200+</p>
                <p class="text-sm text-gray-600">{{ tr('Umat Aktif', 'Active Members') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Wave Divider -->
    <div class="absolute bottom-0 left-0 right-0">
      <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" fill="#F9FAFB"/>
      </svg>
    </div>
  </section>
</template>

<script setup>
const { tr } = useAppLocale()
</script>
