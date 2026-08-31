<template>
  <footer class="bg-gray-900 text-gray-300">
    <div class="container mx-auto px-4 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- Parish Info -->
        <div class="space-y-4">
          <div class="flex items-center space-x-3">
            <img src="/logo_white.png" :alt="tr('Logo Paroki Mangga Besar', 'Mangga Besar Parish Logo')" class="h-10"/>
          </div>
          <p class="text-sm">
            {{ tr('Komunitas Katolik yang ramah, berdedikasi pada iman, pelayanan, dan kebersamaan.', 'A welcoming Catholic community devoted to faith, service, and fellowship.') }}
          </p>
          <div class="flex space-x-4">
            <a href="#" class="text-gray-400 hover:text-indigo-400 transition">
              <Icon name="mdi:facebook" class="text-2xl" />
            </a>
            <a href="#" class="text-gray-400 hover:text-indigo-400 transition">
              <Icon name="mdi:instagram" class="text-2xl" />
            </a>
            <a href="#" class="text-gray-400 hover:text-indigo-400 transition">
              <Icon name="mdi:youtube" class="text-2xl" />
            </a>
            <a href="#" class="text-gray-400 hover:text-indigo-400 transition">
              <Icon name="mdi:email" class="text-2xl" />
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="text-white font-semibold mb-4">{{ tr('Tautan Cepat', 'Quick Links') }}</h4>
          <ul class="space-y-2 text-sm">
            <li><NuxtLink to="/" class="hover:text-sky-400 transition">{{ tr('Beranda', 'Home') }}</NuxtLink></li>
            <li><a href="#about" class="hover:text-sky-400 transition">{{ tr('Tentang Kami', 'About') }}</a></li>
            <li><a href="#services" class="hover:text-sky-400 transition">{{ tr('Layanan', 'Services') }}</a></li>
            <li><NuxtLink to="/user/book-room" class="hover:text-sky-400 transition">{{ tr('Pemesanan Ruangan', 'Room Booking') }}</NuxtLink></li>
          </ul>
        </div>

        <!-- Mass Schedule -->
        <div>
          <h4 class="text-white font-semibold mb-4">{{ tr('Jadwal Misa', 'Mass Schedule') }}</h4>
          <ul class="space-y-2 text-sm">
            <!-- Daily Mass -->
            <li><span class="text-sky-400">{{ tr('Misa Harian:', 'Daily Mass:') }}</span> 6:00 AM, 6:00 PM</li>
            <!-- Saturday Mass -->
            <li><span class="text-sky-400">{{ tr('Sabtu:', 'Saturday:') }}</span> 5:00 PM</li>
            <!-- Sunday Mass -->
            <li><span class="text-sky-400">{{ tr('Minggu:', 'Sunday:') }}</span> 7:30 AM, 10:00 AM, 5:00 PM</li>
          </ul>
        </div>

        <!-- Contact Info -->
        <div>
          <h4 class="text-white font-semibold mb-4">{{ tr('Hubungi Kami', 'Contact Us') }}</h4>
          <ul class="space-y-3 text-sm">
            <li class="flex items-start space-x-2">
              <Icon name="mdi:map-marker" class="text-sky-400 mt-1" />
              <span>Jl. Raya Mangga Besar #55, Jakarta</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:phone-classic" class="text-sky-400" />
              <span>(021) 6011.893 / 6011.894</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:cellphone" class="text-sky-400" />
              <span>+62 812 1221 9365</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:fax" class="text-sky-400" />
              <span>(021) 6011.894</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:email" class="text-sky-400" />
              <span>sekretariat@parokimanggabesar.or.id</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Copyright -->
      <div class="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
        <p>&copy; {{ new Date().getFullYear() }} {{ tr('Paroki Mangga Besar. Hak cipta dilindungi.', 'Mangga Besar Parish. All rights reserved.') }}</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
const { tr } = useAppLocale()
</script>
