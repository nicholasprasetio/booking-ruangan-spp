<template>
  <section id="about" class="py-20 bg-gray-50">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <!-- Image Side -->
        <div class="relative">
          <div class="bg-gradient-to-br from-sky-100 to-blue-100 rounded-3xl p-8 shadow-xl">
            <div class="aspect-[4/3] rounded-2xl bg-gradient-to-br from-sky-200 to-blue-200 flex items-center justify-center">
              <Icon name="mdi:church" class="text-9xl text-sky-600 opacity-80" />
            </div>
          </div>
          <!-- Stats Cards -->
          <div class="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-2xl">
            <div class="space-y-4">
              <div class="flex items-center space-x-3">
                <div class="bg-sky-100 p-2 rounded-lg">
                  <Icon name="mdi:calendar" class="text-2xl text-sky-600" />
                </div>
                <div>
                  <p class="text-xl font-bold text-gray-900">25+</p>
                  <p class="text-xs text-gray-600">{{ tr('Tahun Melayani', 'Years Serving') }}</p>
                </div>
              </div>
              <div class="flex items-center space-x-3">
                <div class="bg-yellow-100 p-2 rounded-lg">
                  <Icon name="mdi:hand-heart" class="text-2xl text-yellow-600" />
                </div>
                <div>
                  <p class="text-xl font-bold text-gray-900">1000+</p>
                  <p class="text-xs text-gray-600">{{ tr('Keluarga Terlayani', 'Families Served') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Side -->
        <div class="space-y-6">
          <span class="text-sky-600 font-semibold text-sm uppercase tracking-wide">{{ tr('Tentang Paroki Kami', 'About Our Parish') }}</span>
          <h2 class="text-4xl font-bold text-gray-900">
            {{ tr('Membangun Iman, Komunitas, dan Pelayanan Sejak 1940', 'Building Faith, Community, and Service Since 1940') }}
          </h2>
          <p class="text-gray-600 text-lg leading-relaxed">
            {{ tr(
              'Gereja St. Petrus dan Paulus Paroki Mangga Besar adalah komunitas Katolik yang penuh semangat di Jakarta. Kami berkomitmen untuk menyebarkan pesan Injil, membina pertumbuhan spiritual, dan melayani sesama dengan kasih dan belas kasih.',
              'St. Peter and Paul Church at Mangga Besar Parish is a vibrant Catholic community in Jakarta. We are committed to sharing the Gospel, nurturing spiritual growth, and serving others with love and compassion.',
            ) }}
          </p>
          <p class="text-gray-600 leading-relaxed">
            {{ tr(
              'Paroki kami menawarkan lingkungan yang ramah untuk semua, baik Anda seorang Katolik seumur hidup, kembali ke iman, atau menjelajahi Kekristenan untuk pertama kalinya. Kami percaya dalam menciptakan koneksi yang bermakna melalui ibadah, pendidikan, persekutuan, dan pelayanan.',
              'Our parish offers a welcoming environment for everyone, whether you are a lifelong Catholic, returning to faith, or exploring Christianity for the first time. We believe in creating meaningful connections through worship, education, fellowship, and service.',
            ) }}
          </p>

          <!-- Mission Points -->
          <div class="space-y-4 pt-4">
            <div class="flex items-start space-x-4">
              <div class="bg-sky-100 p-3 rounded-xl flex-shrink-0">
                <Icon name="mdi:bullseye-arrow" class="text-2xl text-sky-600" />
              </div>
              <div>
                <h4 class="font-bold text-gray-900 mb-1">{{ tr('Misi Kami', 'Our Mission') }}</h4>
                <p class="text-gray-600 text-sm">
                  {{ tr('Mewartakan Injil Yesus Kristus dan membangun komunitas iman, harapan, dan kasih.', 'To proclaim the Gospel of Jesus Christ and build a community of faith, hope, and love.') }}
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-4">
              <div class="bg-blue-100 p-3 rounded-xl flex-shrink-0">
                <Icon name="mdi:eye-outline" class="text-2xl text-blue-600" />
              </div>
              <div>
                <h4 class="font-bold text-gray-900 mb-1">{{ tr('Visi Kami', 'Our Vision') }}</h4>
                <p class="text-gray-600 text-sm">
                  {{ tr('Komunitas Katolik yang berkembang yang mengubah kehidupan melalui ibadah yang autentik dan pelayanan yang penuh kasih.', 'A thriving Catholic community transforming lives through authentic worship and compassionate service.') }}
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-4">
              <div class="bg-yellow-100 p-3 rounded-xl flex-shrink-0">
                <Icon name="mdi:heart-multiple" class="text-2xl text-yellow-600" />
              </div>
              <div>
                <h4 class="font-bold text-gray-900 mb-1">{{ tr('Nilai-Nilai Kami', 'Our Values') }}</h4>
                <p class="text-gray-600 text-sm">
                  {{ tr('Iman, Komunitas, Pelayanan, Kasih, dan Keunggulan dalam semua yang kami lakukan.', 'Faith, Community, Service, Love, and Excellence in all we do.') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const { tr } = useAppLocale()
</script>
