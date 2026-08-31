<template>
  <section id="services" class="py-20 bg-white">
    <div class="container mx-auto px-4">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-16">
        <span class="text-sky-600 font-semibold text-sm uppercase tracking-wide">{{ tr('Layanan Kami', 'Our Services') }}</span>
        <h2 class="text-4xl font-bold text-gray-900 mt-2 mb-4">
          {{ tr('Apa yang Kami Tawarkan', 'What We Offer') }}
        </h2>
        <p class="text-gray-600 text-lg">
          {{ tr('Temukan berbagai cara kami melayani komunitas melalui iman, persekutuan, dan fasilitas.', 'Discover the many ways we serve the community through faith, fellowship, and facilities.') }}
        </p>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Feature 1: Worship Services -->
        <div class="group bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-8 hover:shadow-xl transition duration-300">
          <div class="bg-sky-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
            <Icon name="mdi:church" class="text-3xl" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ tr('Ibadah & Misa', 'Worship & Mass') }}</h3>
          <p class="text-gray-600 mb-4">
            {{ tr('Misa rutin, liturgi khusus, dan doa bersama sepanjang minggu untuk semua usia.', 'Regular mass, special liturgies, and communal prayers throughout the week for all ages.') }}
          </p>
          <ul class="space-y-2 text-sm text-gray-700">
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-sky-600" />
              <span>{{ tr('Misa Harian', 'Daily Mass') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-sky-600" />
              <span>{{ tr('Misa Minggu', 'Sunday Mass') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-sky-600" />
              <span>{{ tr('Perayaan Khusus', 'Special Celebrations') }}</span>
            </li>
          </ul>
        </div>

        <!-- Feature 2: Community Programs -->
        <div class="group bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-8 hover:shadow-xl transition duration-300">
          <div class="bg-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
            <Icon name="mdi:account-group" class="text-3xl" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ tr('Program Komunitas', 'Community Programs') }}</h3>
          <p class="text-gray-600 mb-4">
            {{ tr('Kegiatan menarik yang menyatukan keluarga paroki dalam iman dan persekutuan.', 'Engaging activities that unite parish families in faith and fellowship.') }}
          </p>
          <ul class="space-y-2 text-sm text-gray-700">
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-blue-600" />
              <span>{{ tr('Pelayanan Pemuda', 'Youth Ministry') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-blue-600" />
              <span>{{ tr('Kelompok Bina Iman', 'Faith Formation Groups') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-blue-600" />
              <span>{{ tr('Karya Sosial', 'Social Outreach') }}</span>
            </li>
          </ul>
        </div>

        <!-- Feature 3: Room Facilities -->
        <div class="group bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-8 hover:shadow-xl transition duration-300">
          <div class="bg-yellow-500 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
            <Icon name="mdi:door-open" class="text-3xl" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ tr('Manajemen Ruangan', 'Room Management') }}</h3>
          <p class="text-gray-600 mb-4">
            {{ tr('Fasilitas modern untuk pertemuan, acara, dan perkumpulan dengan booking online yang mudah.', 'Modern facilities for meetings, events, and gatherings with easy online booking.') }}
          </p>
          <ul class="space-y-2 text-sm text-gray-700">
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-yellow-600" />
              <span>{{ tr('Ruang Pertemuan', 'Meeting Rooms') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-yellow-600" />
              <span>{{ tr('Aula Acara', 'Event Hall') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-yellow-600" />
              <span>{{ tr('Booking Online', 'Online Booking') }}</span>
            </li>
          </ul>
        </div>

        <!-- Feature 4: Sacraments -->
        <div class="group bg-gradient-to-br from-cyan-50 to-sky-50 rounded-2xl p-8 hover:shadow-xl transition duration-300">
          <div class="bg-cyan-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
            <Icon name="mdi:cross" class="text-3xl" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ tr('Sakramen', 'Sacraments') }}</h3>
          <p class="text-gray-600 mb-4">
            {{ tr('Rayakan momen penting dalam hidup dengan pembaptisan, krisma, pernikahan, dan lainnya.', 'Celebrate life milestones through baptism, confirmation, marriage, and more.') }}
          </p>
          <ul class="space-y-2 text-sm text-gray-700">
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-cyan-600" />
              <span>{{ tr('Pembaptisan', 'Baptism') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-cyan-600" />
              <span>{{ tr('Komuni Pertama', 'First Communion') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-cyan-600" />
              <span>{{ tr('Persiapan Pernikahan', 'Marriage Preparation') }}</span>
            </li>
          </ul>
        </div>

        <!-- Feature 5: Education -->
        <div class="group bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-8 hover:shadow-xl transition duration-300">
          <div class="bg-amber-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
            <Icon name="mdi:book-open-page-variant" class="text-3xl" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ tr('Pendidikan', 'Education') }}</h3>
          <p class="text-gray-600 mb-4">
            {{ tr('Program pembinaan iman dan pendidikan untuk semua usia memperdalam pemahaman spiritual.', 'Faith formation and education programs for all ages to deepen spiritual understanding.') }}
          </p>
          <ul class="space-y-2 text-sm text-gray-700">
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-amber-600" />
              <span>{{ tr('Pendidikan Agama', 'Religious Education') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-amber-600" />
              <span>{{ tr('Bina Iman Dewasa', 'Adult Faith Formation') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-amber-600" />
              <span>{{ tr('Program Katekumen', 'Catechumen Program') }}</span>
            </li>
          </ul>
        </div>

        <!-- Feature 6: Pastoral Care -->
        <div class="group bg-gradient-to-br from-sky-50 to-cyan-50 rounded-2xl p-8 hover:shadow-xl transition duration-300">
          <div class="bg-sky-500 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
            <Icon name="mdi:heart-outline" class="text-3xl" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ tr('Pelayanan Pastoral', 'Pastoral Care') }}</h3>
          <p class="text-gray-600 mb-4">
            {{ tr('Dukungan penuh kasih bagi mereka yang membutuhkan melalui doa, konseling, dan pendampingan.', 'Compassionate support for those in need through prayer, counseling, and accompaniment.') }}
          </p>
          <ul class="space-y-2 text-sm text-gray-700">
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-sky-500" />
              <span>{{ tr('Kunjungan Rumah Sakit', 'Hospital Visits') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-sky-500" />
              <span>{{ tr('Dukungan Dukacita', 'Bereavement Support') }}</span>
            </li>
            <li class="flex items-center space-x-2">
              <Icon name="mdi:check-circle" class="text-sky-500" />
              <span>{{ tr('Pelayanan Doa', 'Prayer Ministry') }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const { tr } = useAppLocale()
</script>
