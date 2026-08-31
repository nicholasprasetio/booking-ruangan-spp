<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto space-y-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ tr('Profil Saya', 'My Profile') }}</h1>
          <p class="text-gray-600 mt-1">{{ tr('Perbarui data pribadi, tanda tangan digital, dan kata sandi.', 'Update your personal data, digital signature, and password.') }}</p>
        </div>

        <div class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">{{ tr('Data Pribadi', 'Personal Data') }}</h2>

          <div v-if="profileError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
            {{ profileError }}
          </div>

          <form class="space-y-4" @submit.prevent="saveProfile">
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
              <label class="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <div class="relative">
                <Icon name="mdi:account-circle-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  v-model.trim="username"
                  type="text"
                  autocomplete="username"
                  placeholder="username"
                  class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Email (opsional)', 'Email (optional)') }}</label>
              <div class="relative">
                <Icon name="mdi:email-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  v-model.trim="email"
                  type="email"
                  autocomplete="email"
                  :placeholder="tr('nama@email.com', 'name@email.com')"
                  class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
            </div>

            <div class="pt-2 border-t border-gray-100">
              <div class="flex items-center justify-between mb-3 gap-3">
                <div>
                  <h3 class="text-sm font-bold text-gray-800">{{ tr('Tanda Tangan Digital', 'Digital Signature') }}</h3>
                  <p class="text-xs text-gray-500">{{ tr('Signature ini akan bisa langsung dipakai di halaman approval dokumen.', 'This signature can be used directly on the document approval page.') }}</p>
                </div>
                <button
                  type="button"
                  class="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition"
                  @click="clearDigitalSignature"
                >
                  {{ tr('Hapus Signature', 'Clear Signature') }}
                </button>
              </div>

              <div class="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  class="px-4 py-2 rounded-full text-sm font-semibold border transition"
                  :class="signatureMode === 'draw' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'"
                  @click="signatureMode = 'draw'"
                >
                  {{ tr('Gambar', 'Draw') }}
                </button>
                <button
                  type="button"
                  class="px-4 py-2 rounded-full text-sm font-semibold border transition"
                  :class="signatureMode === 'upload' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'"
                  @click="signatureMode = 'upload'"
                >
                  {{ tr('Upload Gambar', 'Upload Image') }}
                </button>
              </div>

              <div v-if="signatureMode === 'draw'" class="bg-gray-50 rounded-2xl border border-gray-200 p-3">
                <ClientOnly>
                  <SignaturePad @change="onSignatureDrawChange" />
                </ClientOnly>
              </div>

              <div v-else class="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                <label
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition cursor-pointer"
                >
                  <Icon name="mdi:upload" />
                  {{ tr('Upload Signature', 'Upload Signature') }}
                  <input type="file" accept="image/png,image/jpeg,image/jpg" class="hidden" @change="handleSignatureUpload" />
                </label>
                <p class="text-xs text-gray-500 mt-2">{{ tr('Gunakan PNG/JPG dengan latar transparan atau putih.', 'Use PNG/JPG with transparent or white background.') }}</p>
              </div>

              <div class="mt-4">
                <div class="text-xs font-semibold text-gray-600 mb-2">{{ tr('Preview Signature', 'Signature Preview') }}</div>
                <div class="rounded-2xl border border-dashed border-gray-300 bg-white p-4 min-h-[120px] flex items-center justify-center">
                  <img v-if="signaturePreviewUrl" :src="signaturePreviewUrl" :alt="tr('Preview tanda tangan digital', 'Digital signature preview')" class="max-h-24 object-contain" />
                  <div v-else class="text-sm text-gray-400">{{ tr('Belum ada signature tersimpan', 'No saved signature yet') }}</div>
                </div>
              </div>
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                :disabled="profileLoading"
                class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span v-if="!profileLoading">{{ tr('Simpan Perubahan', 'Save Changes') }}</span>
                <span v-else>{{ tr('Menyimpan...', 'Saving...') }}</span>
              </button>
            </div>
          </form>
        </div>

        <div class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">{{ tr('Ubah Password', 'Change Password') }}</h2>

          <div v-if="passwordError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
            {{ passwordError }}
          </div>

          <form class="space-y-4" @submit.prevent="changePassword">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Password Lama', 'Current Password') }}</label>
              <div class="relative">
                <Icon name="mdi:lock-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  :placeholder="tr('********', '********')"
                  class="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex align-middle"
                  :aria-label="showCurrentPassword ? tr('Sembunyikan password', 'Hide password') : tr('Tampilkan password', 'Show password')"
                  @click="showCurrentPassword = !showCurrentPassword"
                >
                  <Icon :name="showCurrentPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="text-xl" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Password Baru', 'New Password') }}</label>
              <div class="relative">
                <Icon name="mdi:lock-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  :placeholder="tr('Minimal 8 karakter', 'Minimum 8 characters')"
                  class="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex align-middle"
                  :aria-label="showNewPassword ? tr('Sembunyikan password', 'Hide password') : tr('Tampilkan password', 'Show password')"
                  @click="showNewPassword = !showNewPassword"
                >
                  <Icon :name="showNewPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="text-xl" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Ulangi Password Baru', 'Confirm New Password') }}</label>
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

            <div class="flex justify-end">
              <button
                type="submit"
                :disabled="passwordLoading"
                class="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span v-if="!passwordLoading">{{ tr('Ganti Password', 'Change Password') }}</span>
                <span v-else>{{ tr('Menyimpan...', 'Saving...') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import { changeUserPassword, fetchUserProfile, updateUserProfile } from '~/services/userProfile'

const auth = useAuth()
const { tr } = useAppLocale()
auth.loadFromStorage()

const fullname = ref('')
const phoneNumber = ref('')
const email = ref('')
const username = ref('')
const digitalSignatureData = ref('')
const signaturePreviewUrl = ref('')
const pendingSignatureDataUrl = ref('')
const pendingSignatureFile = ref<File | null>(null)
const signatureMode = ref<'draw' | 'upload'>('draw')

const profileLoading = ref(false)
const profileError = ref<string | null>(null)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordLoading = ref(false)
const passwordError = ref<string | null>(null)

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

async function loadProfile() {
  try {
    const res = await fetchUserProfile(auth.authHeaders())
    fullname.value = res.user?.fullname || ''
    phoneNumber.value = res.user?.phone_number || ''
    email.value = res.user?.email || ''
    username.value = res.user?.username || ''
    digitalSignatureData.value = res.user?.digital_signature_data || ''
    await refreshSignaturePreview()
  } catch (e: any) {
    profileError.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat profil.', 'Failed to load profile.')
  }
}

function onSignatureDrawChange(dataUrl: string) {
  pendingSignatureDataUrl.value = dataUrl || ''
  pendingSignatureFile.value = null
  digitalSignatureData.value = ''
  setSignaturePreview(dataUrl || '')
}

function clearDigitalSignature() {
  digitalSignatureData.value = ''
  pendingSignatureDataUrl.value = ''
  pendingSignatureFile.value = null
  setSignaturePreview('')
}

function handleSignatureUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('File signature harus PNG/JPG.', 'Signature file must be PNG/JPG.') })
    input.value = ''
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Ukuran file signature maksimal 2MB.', 'Maximum signature file size is 2MB.') })
    input.value = ''
    return
  }

  pendingSignatureFile.value = file
  pendingSignatureDataUrl.value = ''
  digitalSignatureData.value = ''
  setSignaturePreview(URL.createObjectURL(file))
  input.value = ''
}

async function saveProfile() {
  profileError.value = null
  if (!fullname.value) {
    const msg = tr('Nama lengkap wajib diisi.', 'Full name is required.')
    profileError.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return
  }
  if (!phoneNumber.value && !email.value && !username.value) {
    const msg = tr('Isi minimal salah satu: email, nomor telepon, atau username.', 'Fill at least one: email, phone, or username.')
    profileError.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return
  }

  profileLoading.value = true
  try {
    const signatureObjectKey = digitalSignatureData.value || null
    await updateUserProfile(
      {
        fullname: fullname.value,
        phoneNumber: phoneNumber.value || null,
        email: email.value || null,
        username: username.value || null,
        digitalSignatureData: signatureObjectKey,
      },
      auth.authHeaders(),
    )
    digitalSignatureData.value = signatureObjectKey || ''
    pendingSignatureDataUrl.value = ''
    pendingSignatureFile.value = null
    await Swal.fire({ icon: 'success', title: tr('Profil diperbarui', 'Profile updated'), timer: 1200, showConfirmButton: false })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menyimpan profil.', 'Failed to save profile.')
    profileError.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    profileLoading.value = false
  }
}

function setSignaturePreview(nextUrl: string) {
  if (signaturePreviewUrl.value?.startsWith('blob:')) URL.revokeObjectURL(signaturePreviewUrl.value)
  signaturePreviewUrl.value = nextUrl
}

async function refreshSignaturePreview() {
  if (!digitalSignatureData.value) {
    setSignaturePreview('')
    return
  }
  if (digitalSignatureData.value.startsWith('data:image/')) {
    setSignaturePreview(digitalSignatureData.value)
    return
  }
  try {
    const blob = await $fetch<Blob>('/api/user/profile/signature', {
      headers: auth.authHeaders(),
      responseType: 'blob',
    })
    setSignaturePreview(URL.createObjectURL(blob))
  } catch {
    setSignaturePreview('')
  }
}

async function resolveSignatureObjectKey(): Promise<string | null> {
  if (pendingSignatureFile.value) {
    return uploadSignatureBlob(pendingSignatureFile.value, pendingSignatureFile.value.type)
  }
  if (pendingSignatureDataUrl.value) {
    const res = await fetch(pendingSignatureDataUrl.value)
    const blob = await res.blob()
    return uploadSignatureBlob(blob, 'image/png')
  }
  if (digitalSignatureData.value?.startsWith('data:image/')) {
    throw new Error(tr('Signature lama masih base64. Upload atau gambar ulang signature agar tersimpan di R2.', 'Legacy signature is still base64. Upload or redraw it so it can be saved to R2.'))
  }
  return digitalSignatureData.value || null
}

async function uploadSignatureBlob(blob: Blob, contentType: string): Promise<string> {
  const presignRes = await $fetch<{ presignedUrl: string; objectKey: string }>('/api/upload/presign', {
    method: 'POST',
    headers: auth.authHeaders(),
    body: { contentType, prefix: 'digital-signatures' },
  })
  const putRes = await fetch(presignRes.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  })
  if (!putRes.ok) throw new Error(`R2 upload failed: ${putRes.status} ${putRes.statusText}`)
  return presignRes.objectKey
}

async function changePassword() {
  passwordError.value = null
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    const msg = tr('Semua field password wajib diisi.', 'All password fields are required.')
    passwordError.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return
  }
  if (newPassword.value.length < 8) {
    const msg = tr('Password baru minimal 8 karakter.', 'New password must be at least 8 characters.')
    passwordError.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    const msg = tr('Password baru dan konfirmasi tidak sama.', 'New password and confirmation do not match.')
    passwordError.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return
  }

  passwordLoading.value = true
  try {
    await changeUserPassword({ currentPassword: currentPassword.value, newPassword: newPassword.value }, auth.authHeaders())
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    await Swal.fire({ icon: 'success', title: tr('Password diubah', 'Password changed'), timer: 1200, showConfirmButton: false })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal mengganti password.', 'Failed to change password.')
    passwordError.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    passwordLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
})

onUnmounted(() => {
  if (signaturePreviewUrl.value?.startsWith('blob:')) URL.revokeObjectURL(signaturePreviewUrl.value)
})
</script>
