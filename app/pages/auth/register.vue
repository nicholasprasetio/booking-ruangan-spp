<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div class="mb-4 flex justify-end">
          <LanguageToggle />
        </div>
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 mb-4">
            <Icon name="mdi:account-plus" class="text-3xl text-indigo-600" />
          </div>
          <h1 class="text-2xl font-bold text-gray-900">{{ tr('Daftar', 'Register') }}</h1>
          <p class="text-sm text-gray-600 mt-1">{{ tr('Buat akun dengan nomor telepon dan password', 'Create an account with your phone number and password') }}</p>
        </div>

        <form class="space-y-5" @submit.prevent="onSubmit">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Nama Lengkap', 'Full Name') }}</label>
            <div class="relative">
              <Icon name="mdi:account" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model.trim="fullname"
                type="text"
                autocomplete="name"
                :placeholder="tr('Nama lengkap', 'Full name')"
                class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Nomor Telepon', 'Phone Number') }}</label>
            <div class="relative">
              <Icon name="mdi:phone-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model.trim="phoneNumber"
                type="tel"
                autocomplete="tel"
                :placeholder="tr('62812xxxx', '+62812xxxx')"
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
                autocomplete="new-password"
                :placeholder="tr('Minimal 8 karakter', 'Minimum 8 characters')"
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

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Ulangi Password', 'Confirm Password') }}</label>
            <div class="relative">
              <Icon name="mdi:lock-check-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :placeholder="tr('********', '********')"
                class="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex align-middle"
                :aria-label="showConfirmPassword ? tr('Sembunyikan password', 'Hide password') : tr('Tampilkan password', 'Show password')"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <Icon :name="showConfirmPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="text-xl" />
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
            <span v-if="!loading">{{ tr('Daftar', 'Register') }}</span>
            <span v-else>{{ tr('Memproses...', 'Processing...') }}</span>
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-gray-600">
          {{ tr('Sudah punya akun?', 'Already have an account?') }}
          <NuxtLink to="/auth/login" class="text-indigo-600 font-semibold hover:underline">{{ tr('Login', 'Login') }}</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import { login, register } from '~/services/auth'

const auth = useAuth()
const route = useRoute()
const { tr } = useAppLocale()

const fullname = ref('')
const phoneNumber = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const user = ref<any>(null)

onMounted(() => {
  auth.loadFromStorage()
  if (auth.isLoggedIn.value) {
    const redirect = (route.query.redirect as string) || '/room-management'
    navigateTo(redirect)
  }
})

async function loadCurrentUser() {
  if (!auth.isLoggedIn.value) return
  try {
    const data = await $fetch('/api/auth/me', {
      headers: auth.authHeaders(),
    })
    user.value = data.user
  } catch {
    user.value = null
  }
}

async function onSubmit() {
  error.value = null
  if (!fullname.value || !phoneNumber.value || !password.value || !confirmPassword.value) {
    const msg = tr('Semua field wajib diisi.', 'All fields are required.')
    error.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return
  }
  if (password.value.length < 8) {
    const msg = tr('Password minimal 8 karakter.', 'Password must be at least 8 characters.')
    error.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return
  }
  if (password.value !== confirmPassword.value) {
    const msg = tr('Password dan konfirmasi tidak sama.', 'Password and confirmation do not match.')
    error.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return
  }

  loading.value = true
  try {
    const response = await register({
      fullname: fullname.value,
      phoneNumber: phoneNumber.value,
      password: password.value,
    })

    if (response.ok) {
      const loginRes = await login({ identifier: phoneNumber.value, password: password.value })
      auth.setToken(loginRes.token)
    }

    await loadCurrentUser();

    await Swal.fire({
      icon: 'success',
      title: tr('Berhasil', 'Success'),
      text: tr('Akun berhasil dibuat.', 'Account created successfully.'),
      timer: 1200,
      showConfirmButton: false,
    })

    if (user.value && user.value.roles?.includes('admin')) {
      await navigateTo('/admin/rooms')
    }

    const redirect = (route.query.redirect as string) || '/user/book-room'
    await navigateTo(redirect)
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Register gagal.', 'Registration failed.')
    error.value = msg
    await Swal.fire({ icon: 'error', title: tr('Register gagal', 'Registration failed'), text: msg })
  } finally {
    loading.value = false
  }
}
</script>
