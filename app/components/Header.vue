<template>
  <header class="bg-white shadow-md sticky top-0 z-50">
    <nav class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo and Parish Name -->
        <NuxtLink to="/" class="flex items-center space-x-3 hover:opacity-80 transition">
          <img src="/logo.png" :alt="tr('Logo Paroki Mangga Besar', 'Mangga Besar Parish Logo')" class="h-12"/>
        </NuxtLink>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <!-- <NuxtLink 
            to="/" 
            :class="['text-gray-700 hover:text-sky-600 transition font-medium', (route.path === '/' && activeSection === '') ? 'text-sky-600 font-semibold' : '']"
          >
            {{ tr('Beranda', 'Home') }}
          </NuxtLink>
          <a 
            href="/#about" 
            @click.prevent="scrollToSection('about')"
            :class="['text-gray-700 hover:text-sky-600 transition font-medium', activeSection === 'about' ? 'text-sky-600 font-semibold' : '']"
          >
            {{ tr('Tentang Kami', 'About') }}
          </a>
          <a 
            href="/#contact" 
            @click.prevent="scrollToSection('contact')"
            :class="['text-gray-700 hover:text-sky-600 transition font-medium', activeSection === 'contact' ? 'text-sky-600 font-semibold' : '']"
          >
            {{ tr('Kontak', 'Contact') }}
          </a>
          <NuxtLink
            to="/user/book-room"
            class="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition shadow-md"
          >
            {{ tr('Pesan Ruangan', 'Book Room') }}
          </NuxtLink> -->

          <LanguageToggle />

          <ClientOnly>
            <div class="flex items-center space-x-3">
              <template v-if="auth.isLoggedIn.value">
                <NuxtLink
                  to="/user/book-room"
                  class="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition shadow-md"
                >
                  {{ tr('Panel Admin', 'Admin Panel') }}
                </NuxtLink>
              </template>
              <template v-else>
                <NuxtLink
                  to="/auth/login"
                  class="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition shadow-md"
                  active-class="text-sky-600"
                >
                  {{ tr('Masuk', 'Login') }}
                </NuxtLink>
              </template>
            </div>
          </ClientOnly>
        </div>

        <!-- Mobile Menu Button -->
        <button 
          @click="mobileMenuOpen = !mobileMenuOpen" 
          class="md:hidden text-gray-700 hover:text-sky-600 transition flex align-center"
        >
          <Icon :name="mobileMenuOpen ? 'mdi:close' : 'mdi:menu'" class="text-3xl" />
        </button>
      </div>

      <!-- Mobile Navigation -->
      <div 
        v-if="mobileMenuOpen" 
        class="md:hidden mt-4 pb-4 space-y-3 border-t pt-4"
      >
        <div class="flex justify-end pb-1">
          <LanguageToggle />
        </div>
        <!-- <NuxtLink 
          to="/" 
          :class="['block text-gray-700 hover:text-sky-600 transition font-medium', (route.path === '/' && activeSection === '') ? 'text-sky-600 font-semibold' : '']"
          @click="mobileMenuOpen = false"
        >
          {{ tr('Beranda', 'Home') }}
        </NuxtLink>
        <a 
          href="#about" 
          @click.prevent="scrollToSection('about')"
          :class="['block text-gray-700 hover:text-sky-600 transition font-medium', activeSection === 'about' ? 'text-sky-600' : '']"
        >
          {{ tr('Tentang Kami', 'About') }}
        </a>
        <a 
          href="#contact" 
          @click.prevent="scrollToSection('contact')"
          :class="['block text-gray-700 hover:text-sky-600 transition font-medium', activeSection === 'contact' ? 'text-sky-600' : '']"
        >
          {{ tr('Kontak', 'Contact') }}
        </a>
        <NuxtLink
          to="/user/book-room"
          class="block w-full text-center bg-sky-600 text-white px-6 py-2 rounded-full hover:bg-sky-700 transition shadow-md"
          @click="mobileMenuOpen = false"
        >
          {{ tr('Pesan Ruangan', 'Book Room') }}
        </NuxtLink> -->

        <ClientOnly>
          <template v-if="auth.isLoggedIn.value">
            <NuxtLink
              to="/admin/rooms"
              class="block w-full text-center bg-sky-600 text-white px-6 py-2 rounded-full hover:bg-sky-700 transition shadow-md"
              @click="mobileMenuOpen = false"
            >
              {{ tr('Panel Admin', 'Admin Panel') }}
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink
              to="/auth/login"
              class="block w-full text-center bg-sky-600 text-white px-6 py-2 rounded-full hover:bg-sky-700 transition shadow-md"
              @click="mobileMenuOpen = false"
            >
              {{ tr('Masuk', 'Login') }}
            </NuxtLink>
          </template>
        </ClientOnly>
      </div>
    </nav>
  </header>
</template>

<script setup>
const mobileMenuOpen = ref(false)
const auth = useAuth()
const activeSection = ref('')
const route = useRoute()
const { tr } = useAppLocale()

onMounted(() => {
  auth.loadFromStorage()
  
  // Track active section on scroll - only on landing page
  const handleScroll = () => {    
    const sections = ['about', 'contact']
    const scrollPosition = window.scrollY + 150 // offset for header
    
    // Check if we're in any specific section
    for (const section of sections) {
      const element = document.getElementById(section)
      if (element) {
        const { offsetTop, offsetHeight } = element
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          activeSection.value = section
          return
        }
      }
    }
  
    activeSection.value = ''
  }
  
  window.addEventListener('scroll', handleScroll)
  handleScroll() // Initial check
  
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
})

function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
  mobileMenuOpen.value = false
}
</script>
