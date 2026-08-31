<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div class="mb-4 flex justify-end">
          <LanguageToggle />
        </div>
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 mb-4">
            <Icon name="mdi:lock" class="text-3xl text-indigo-600" />
          </div>
          <h1 class="text-2xl font-bold text-gray-900">{{ tr('Masuk', 'Login') }}</h1>
          <p class="text-sm text-gray-600 mt-1">{{ tr('Masuk menggunakan email, no HP, atau username', 'Sign in with email, phone, or username') }}</p>
        </div>

        <form class="space-y-5" @submit.prevent="onSubmit">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Email / No HP / Username', 'Email / Phone / Username') }}</label>
            <div class="relative">
              <Icon name="mdi:account-circle-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model.trim="identifier"
                type="text"
                autocomplete="username"
                :placeholder="tr('email@domain.com / 62812xxxx / username', 'email@domain.com / +62812xxxx / username')"
                class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Password', 'Password') }}</label>
            <div class="relative">
              <Icon name="mdi:lock-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :placeholder="tr('********', '********')"
                class="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex align-middle"
                :aria-label="showPassword ? tr('Sembunyikan password', 'Hide password') : tr('Tampilkan password', 'Show password')"
                @click="showPassword = !showPassword"
              >
                <Icon :name="showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="text-xl" />
              </button>
            </div>
          </div>

          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span v-if="!loading">{{ tr('Masuk', 'Login') }}</span>
            <span v-else>{{ tr('Memproses...', 'Processing...') }}</span>
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-gray-600">
          {{ tr('Belum punya akun? Hubungi admin untuk pendaftaran.', "Don't have an account? Contact an admin to register.") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import { login } from '~/services/auth'

const auth = useAuth()
const route = useRoute()
const { tr } = useAppLocale()

const identifier = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)

onMounted(() => {
  auth.loadFromStorage()
  if (auth.isLoggedIn.value) {
    const redirect = (route.query.redirect as string) || '/room-management'
    navigateTo(redirect)
  }
})

async function onSubmit() {
  error.value = null
  if (!identifier.value || !password.value) {
    const msg = tr('Email/no HP/username dan password wajib diisi.', 'Email/phone/username and password are required.')
    error.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return
  }

  loading.value = true
  try {
    const res = await login({ identifier: identifier.value, password: password.value })
    auth.setToken(res.token)
    const redirect = (route.query.redirect as string) || '/user/book-room'
    await navigateTo(redirect)
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Login gagal.', 'Login failed.')
    error.value = msg
    await Swal.fire({ icon: 'error', title: tr('Login gagal', 'Login failed'), text: msg })
  } finally {
    loading.value = false
  }
}
</script>
