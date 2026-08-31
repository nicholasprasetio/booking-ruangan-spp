<template>
  <section id="contact" class="py-20 bg-white">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Section Header -->
        <div class="text-center mb-12">
          <span class="text-indigo-600 font-semibold text-sm uppercase tracking-wide">{{ tr('Hubungi Kami', 'Contact Us') }}</span>
          <h2 class="text-4xl font-bold text-gray-900 mt-2 mb-4">
            {{ tr('Kontak', 'Contact') }}
          </h2>
          <p class="text-gray-600 text-lg">
            {{ tr('Kami ingin mendengar dari Anda. Silakan hubungi kami untuk pertanyaan atau permohonan doa.', 'We would love to hear from you. Please reach out for questions or prayer requests.') }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Contact Form -->
          <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8">
            <h3 class="text-2xl font-bold text-gray-900 mb-6">{{ tr('Kirim Pesan', 'Send a Message') }}</h3>
            <form class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">{{ tr('Nama', 'Name') }}</label>
                <input 
                  type="text" 
                  class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  :placeholder="tr('Nama Anda', 'Your name')"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">{{ tr('Email', 'Email') }}</label>
                <input 
                  type="email" 
                  class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  :placeholder="tr('nama@email.com', 'name@email.com')"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">{{ tr('Pesan', 'Message') }}</label>
                <textarea 
                  rows="4" 
                  class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  :placeholder="tr('Tulis pesan Anda...', 'Write your message...')"
                ></textarea>
              </div>
              <button 
                type="submit" 
                class="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-md"
              >
                {{ tr('Kirim Pesan', 'Send Message') }}
              </button>
            </form>
          </div>

          <!-- Contact Info -->
          <div class="space-y-6">
            <div class="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-lg transition">
              <div class="flex items-start space-x-4">
                <div class="bg-indigo-100 p-3 rounded-xl">
                  <Icon name="mdi:map-marker" class="text-2xl text-indigo-600" />
                </div>
                <div>
                  <h4 class="font-bold text-gray-900 mb-2">{{ tr('Alamat', 'Address') }}</h4>
                  <p class="text-gray-600">
                    Jl. Raya Mangga Besar #55<br>
                    Jakarta, 11170<br>
                  </p>
                </div>
              </div>
            </div>

            <div class="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-lg transition">
              <div class="flex items-start space-x-4">
                <div class="bg-purple-100 p-3 rounded-xl">
                  <Icon name="mdi:phone" class="text-2xl text-purple-600" />
                </div>
                <div>
                  <h4 class="font-bold text-gray-900 mb-2">{{ tr('Telepon', 'Phone') }}</h4>
                  <p class="text-gray-600">
                    {{ tr('Kantor', 'Office') }}: (021) 629-4867 {{ tr('dan', 'and') }} (021) 601-1893<br>
                    {{ tr('Faks', 'Fax') }}: (021) 601-1894<br>
                    {{ tr('Ponsel', 'Mobile') }}: +62 812 1221 9365
                  </p>
                </div>
              </div>
            </div>

            <div class="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-lg transition">
              <div class="flex items-start space-x-4">
                <div class="bg-blue-100 p-3 rounded-xl">
                  <Icon name="mdi:email" class="text-2xl text-blue-600" />
                </div>
                <div>
                  <h4 class="font-bold text-gray-900 mb-2">{{ tr('Email', 'Email') }}</h4>
                  <p class="text-gray-600">
                    sekretariat@parokimanggabesar.or.id
                  </p>
                </div>
              </div>
            </div>

            <div class="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-lg transition">
              <div class="flex items-start space-x-4">
                <div class="bg-green-100 p-3 rounded-xl">
                  <Icon name="mdi:clock-outline" class="text-2xl text-green-600" />
                </div>
                <div>
                  <h4 class="font-bold text-gray-900 mb-2">{{ tr('Jam Pelayanan', 'Office Hours') }}</h4>
                  <p class="text-gray-600">
                    {{ tr('Senin - Kamis', 'Monday - Thursday') }}: 9:00 AM - 5:00 PM<br>
                    {{ tr('Sabtu', 'Saturday') }}: 9:00 AM - 5:00 PM<br>
                    {{ tr('Minggu', 'Sunday') }}: 8:00 AM - 4:00 PM<br>
                    {{ tr('Jumat dan Hari Libur: Tutup', 'Friday and Public Holidays: Closed') }}
                  </p>
                </div>
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
