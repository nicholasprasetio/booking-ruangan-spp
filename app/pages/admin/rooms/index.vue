<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Manajemen Ruangan', 'Room Management') }}</h1>
            <p class="text-gray-600 mt-1">{{ tr('Kelola daftar ruangan yang tersedia untuk peminjaman.', 'Manage rooms available for booking.') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="relative">
              <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="search"
                type="text"
                :placeholder="tr('Cari ruangan...', 'Search rooms...')"
                class="pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              />
            </div>
            <button
              class="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
              :disabled="loading"
              @click="refresh"
            >
              <Icon name="mdi:refresh" />
            </button>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <button
            class="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition shadow-sm inline-flex items-center gap-1.5"
            @click="openCreateModal"
          >
            <Icon name="mdi:plus" size="18" />
            {{ tr('Tambah Ruangan', 'Add Room') }}
          </button>

          <button
            v-if="selectedRoomIds.size > 0"
            class="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition shadow-sm inline-flex items-center gap-1.5"
            @click="confirmBulkDelete"
          >
            <Icon name="mdi:delete" size="18" />
            {{ tr('Hapus Terpilih', 'Delete Selected') }} ({{ selectedRoomIds.size }})
          </button>

          <div class="border-l border-gray-300 h-6 mx-1 hidden sm:block" />

          <button
            class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition shadow-sm inline-flex items-center gap-1.5"
            @click="handleExportExcel"
            :disabled="exporting"
          >
            <Icon name="mdi:file-excel" size="18" />
            {{ exporting ? tr('Mengekspor...', 'Exporting...') : tr('Export Excel', 'Export Excel') }}
          </button>

          <button
            class="px-3 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition shadow-sm inline-flex items-center gap-1.5"
            @click="handleDownloadTemplate"
          >
            <Icon name="mdi:download" size="18" />
            {{ tr('Unduh Template', 'Download Template') }}
          </button>

          <label class="px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer">
            <Icon name="mdi:upload" size="18" />
            {{ tr('Import Excel', 'Import Excel') }}
            <input ref="importFileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="handleImportExcel" />
          </label>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
          {{ error }}
        </div>

        <!-- Loading -->
        <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
          {{ tr('Memuat data ruangan...', 'Loading rooms...') }}
        </div>

        <!-- Table -->
        <div v-else class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div v-if="rooms.length === 0" class="p-10 text-center text-gray-600">
            {{ tr('Belum ada ruangan. Klik tombol "Tambah Ruangan" untuk menambahkan.', 'No rooms yet. Click "Add Room" to create one.') }}
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      :checked="isAllSelected"
                      :indeterminate="isPartialSelected"
                      class="rounded border-gray-300"
                      @change="toggleSelectAll"
                    />
                  </th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Nama', 'Name') }}</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Lokasi', 'Location') }}</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-700">{{ tr('Booking', 'Booking') }}</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-700">{{ tr('Kapasitas', 'Capacity') }}</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-700">{{ tr('Jam Operasional', 'Operating Hours') }}</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-700">{{ tr('Slot', 'Slot') }}</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Foto', 'Photos') }}</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-700">{{ tr('Aksi', 'Actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="room in rooms"
                  :key="room.id"
                  class="border-b border-gray-100 hover:bg-gray-50 transition"
                  :class="{ 'bg-indigo-50/50': selectedRoomIds.has(room.id) }"
                >
                  <td class="px-4 py-3">
                    <input
                      type="checkbox"
                      :checked="selectedRoomIds.has(room.id)"
                      class="rounded border-gray-300"
                      @change="toggleSelectRoom(room.id)"
                    />
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-gray-900">{{ room.name || '-' }}</div>
                    <div v-if="room.description" class="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{{ room.description }}</div>
                  </td>
                  <td class="px-4 py-3 text-gray-700">{{ room.location || '-' }}</td>
                  <td class="px-4 py-3 text-center">
                    <span
                      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      :class="isRoomBookable(room) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
                    >
                      {{ isRoomBookable(room) ? tr('Tersedia', 'Available') : tr('Tidak Tersedia', 'Not Available') }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center text-gray-700">{{ room.capacity ? `${room.capacity}` : '-' }}</td>
                  <td class="px-4 py-3 text-center text-gray-700">
                    {{ room.open_time_start && room.open_time_end ? `${room.open_time_start}-${room.open_time_end}` : '-' }}
                  </td>
                  <td class="px-4 py-3 text-center text-gray-700">{{ room.slot_minutes ? `${room.slot_minutes}m` : '-' }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                      <div v-if="room.photos.length" class="flex -space-x-2">
                        <img
                          v-for="photo in room.photos.slice(0, 3)"
                          :key="photo.id"
                          :src="photoCache.resolve(photo)"
                          class="w-8 h-8 rounded-lg border-2 border-white object-cover shadow-sm"
                        />
                        <div v-if="room.photos.length > 3" class="w-8 h-8 rounded-lg border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                          +{{ room.photos.length - 3 }}
                        </div>
                      </div>
                      <span v-else class="text-xs text-gray-400">-</span>
                      <FileUpload
                        :headers="auth.authHeaders()"
                        :local-upload-url="`/api/admin/rooms/${room.id}/photos`"
                        multiple
                        :show-progress="false"
                        @uploaded="onPhotoUploaded(room.id, $event)"
                        @upload-error="onPhotoUploadError(room.id, $event)"
                      >
                        <template #trigger="{ open, uploading }">
                          <button
                            type="button"
                            class="text-xs text-sky-600 font-semibold hover:text-sky-800"
                            :disabled="uploading"
                            @click="open"
                          >
                            <Icon name="mdi:camera-plus" size="16" />
                          </button>
                        </template>
                      </FileUpload>
                    </div>
                    <div v-if="uploadingRoomId === room.id" class="text-xs text-gray-400 mt-0.5">{{ tr('Menyimpan...', 'Saving...') }}</div>
                    <div v-if="photoErrors[room.id]" class="text-xs text-red-500 mt-0.5">{{ photoErrors[room.id] }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center gap-1.5">
                      <button
                        class="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                        :title="tr('Edit', 'Edit')"
                        @click="openEditModal(room)"
                      >
                        <Icon name="mdi:pencil" size="18" />
                      </button>
                      <button
                        class="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 transition"
                        :title="tr('Kelola Foto', 'Manage Photos')"
                        @click="openPhotoModal(room)"
                      >
                        <Icon name="mdi:image-multiple" size="18" />
                      </button>
                      <button
                        class="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                        :title="tr('Hapus', 'Delete')"
                        @click="confirmDelete(room)"
                      >
                        <Icon name="mdi:delete" size="18" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-6">
          <Pagination :meta="meta" @change="onPageChange" />
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">
            {{ editingRoom ? tr('Edit Ruangan', 'Edit Room') : tr('Tambah Ruangan Baru', 'Add New Room') }}
          </h2>

          <form @submit.prevent="onSubmit">
            <div class="mb-4">
              <UiInput id="roomName" :label="tr('Nama Ruangan', 'Room Name')" required v-model="name" v-bind="nameAttrs" :placeholder="tr('Contoh: Aula Utama', 'Example: Main Hall')" :error="errors.name" :show-error="isFieldTouched('name')" />
            </div>
            <div class="mb-4">
              <UiInput id="roomLocation" :label="tr('Lokasi', 'Location')" v-model="location" v-bind="locationAttrs" :placeholder="tr('Contoh: Lantai 2, Gedung A', 'Example: Floor 2, Building A')" />
            </div>
            <div class="mb-4">
              <UiInput id="roomCapacity" :label="tr('Kapasitas (orang)', 'Capacity (people)')" v-model.number="capacity" v-bind="capacityAttrs" type="number" min="1" :placeholder="tr('Contoh: 50', 'Example: 50')" :error="errors.capacity" :show-error="isFieldTouched('capacity')" />
            </div>
            <div class="mb-4">
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Jam Operasional', 'Operating Hours') }}</label>
              <div class="grid grid-cols-2 gap-3">
                <UiInput v-model="open_time_start" v-bind="openTimeStartAttrs" type="time" />
                <UiInput v-model="open_time_end" v-bind="openTimeEndAttrs" type="time" />
              </div>
              <p class="text-xs text-gray-500 mt-2">{{ tr('Contoh: 08:00 - 20:00', 'Example: 08:00 - 20:00') }}</p>
            </div>
            <div class="mb-4">
              <UiInput id="slotMinutes" :label="tr('Interval Slot (menit)', 'Slot Interval (minutes)')" v-model.number="slot_minutes" v-bind="slotMinutesAttrs" type="number" min="15" step="5" :placeholder="tr('Contoh: 60', 'Example: 60')" :error="errors.slot_minutes" :show-error="isFieldTouched('slot_minutes')" />
            </div>
            <label class="mb-4 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 cursor-pointer">
              <input
                v-model="available_for_booking"
                v-bind="availableForBookingAttrs"
                type="checkbox"
                class="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span class="block text-sm font-semibold text-gray-800">{{ tr('Available for booking', 'Available for booking') }}</span>
                <span class="block text-xs text-gray-500">{{ tr('Jika dimatikan, ruangan tetap tampil di daftar admin dengan status Tidak Tersedia.', 'When turned off, the room stays visible in the admin list as Not Available.') }}</span>
              </span>
            </label>
            <div class="mb-4">
              <UiTextarea id="roomDescription" :label="tr('Deskripsi', 'Description')" v-model="description" v-bind="descriptionAttrs" :placeholder="tr('Deskripsi singkat tentang ruangan ini...', 'Short description of this room...')" />
            </div>
            <div v-if="saveError" class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{{ saveError }}</div>
            <div class="flex gap-3 justify-end">
              <button type="button" class="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition" @click="closeModal">{{ tr('Batal', 'Cancel') }}</button>
              <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm" :disabled="saving">
                {{ saving ? tr('Menyimpan...', 'Saving...') : (editingRoom ? tr('Perbarui', 'Update') : tr('Simpan', 'Save')) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Photo Management Modal -->
    <Teleport to="body">
      <div
        v-if="showPhotoModal && photoModalRoom"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closePhotoModal"
      >
        <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-900">{{ tr('Foto', 'Photos') }}: {{ photoModalRoom.name }}</h2>
            <button class="text-gray-400 hover:text-gray-600" @click="closePhotoModal"><Icon name="mdi:close" size="24" /></button>
          </div>

          <div v-if="photoModalRoom.photos.length" class="mb-4">
            <div class="aspect-[16/9] w-full rounded-2xl bg-gray-50 border overflow-hidden mb-3">
              <img :src="photoCache.resolve(photoModalRoom.photos[selectedPhotoIndex(photoModalRoom.id)] ?? photoModalRoom.photos[0])" class="h-full w-full object-contain" />
            </div>
            <div class="grid grid-cols-4 gap-2">
              <div
                v-for="(photo, idx) in photoModalRoom.photos"
                :key="photo.id"
                class="relative group rounded-xl overflow-hidden border bg-gray-50 cursor-pointer"
                :class="idx === selectedPhotoIndex(photoModalRoom.id) ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-100'"
                @click="setSelectedPhoto(photoModalRoom.id, idx)"
              >
                <img :src="photoCache.resolve(photo)" class="h-16 w-full object-cover" />
                <button
                  class="absolute inset-x-0 bottom-0 text-[10px] font-semibold text-white bg-black/70 py-1 opacity-0 group-hover:opacity-100 transition"
                  @click.stop="confirmDeletePhoto(photoModalRoom.id, photo.id)"
                >
                  {{ tr('Hapus', 'Delete') }}
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">{{ tr('Belum ada foto', 'No photos yet') }}</div>

          <div class="flex items-center justify-between mt-4">
            <FileUpload
              :headers="auth.authHeaders()"
              :local-upload-url="`/api/admin/rooms/${photoModalRoom.id}/photos`"
              multiple
              :show-progress="false"
              @uploaded="onPhotoUploaded(photoModalRoom.id, $event)"
              @upload-error="onPhotoUploadError(photoModalRoom.id, $event)"
            >
              <template #trigger="{ open, uploading }">
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition cursor-pointer inline-flex items-center gap-1.5"
                  :disabled="uploading"
                  @click="open"
                >
                  <Icon name="mdi:camera-plus" size="18" />
                  {{ uploading ? tr('Mengunggah...', 'Uploading...') : tr('Tambah Foto', 'Add Photos') }}
                </button>
              </template>
            </FileUpload>
            <button class="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition" @click="closePhotoModal">{{ tr('Tutup', 'Close') }}</button>
          </div>
          <div v-if="uploadingRoomId === photoModalRoom.id" class="mt-2 text-xs text-gray-500">{{ tr('Menyimpan foto...', 'Saving photo...') }}</div>
          <div v-if="photoErrors[photoModalRoom.id]" class="mt-2 text-xs text-red-600">{{ photoErrors[photoModalRoom.id] }}</div>
        </div>
      </div>
    </Teleport>

    <!-- Import Preview Modal -->
    <Teleport to="body">
      <div
        v-if="showImportPreview"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeImportPreview"
      >
        <div class="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ tr('Pratinjau Import Excel', 'Excel Import Preview') }}</h2>
              <p class="text-sm text-gray-500 mt-1">
                {{ importPreviewData.filter(r => r.valid).length }} {{ tr('valid', 'valid') }},
                {{ importPreviewData.filter(r => !r.valid).length }} {{ tr('error', 'errors') }} {{ tr('dari', 'from') }} {{ importPreviewData.length }} {{ tr('baris', 'rows') }}
              </p>
            </div>
            <button class="text-gray-400 hover:text-gray-600" @click="closeImportPreview"><Icon name="mdi:close" size="24" /></button>
          </div>

          <div class="flex-1 overflow-auto px-6 py-4">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-3 py-2 text-left font-semibold text-gray-600 border-b">{{ tr('Baris', 'Row') }}</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600 border-b">{{ tr('Nama', 'Name') }}</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600 border-b">{{ tr('Lokasi', 'Location') }}</th>
                  <th class="px-3 py-2 text-center font-semibold text-gray-600 border-b">{{ tr('Kapasitas', 'Capacity') }}</th>
                  <th class="px-3 py-2 text-center font-semibold text-gray-600 border-b">{{ tr('Jam', 'Hours') }}</th>
                  <th class="px-3 py-2 text-center font-semibold text-gray-600 border-b">{{ tr('Slot', 'Slot') }}</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600 border-b">{{ tr('Status', 'Status') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in importPreviewData"
                  :key="row.row"
                  :class="row.valid ? 'bg-emerald-50/50' : 'bg-red-50/50'"
                >
                  <td class="px-3 py-2 border-b text-gray-500">{{ row.row }}</td>
                  <td class="px-3 py-2 border-b font-medium">{{ row.data.name || '-' }}</td>
                  <td class="px-3 py-2 border-b">{{ row.data.location || '-' }}</td>
                  <td class="px-3 py-2 border-b text-center">{{ row.data.capacity ?? '-' }}</td>
                  <td class="px-3 py-2 border-b text-center">
                    {{ row.data.open_time_start && row.data.open_time_end ? `${row.data.open_time_start}-${row.data.open_time_end}` : '-' }}
                  </td>
                  <td class="px-3 py-2 border-b text-center">{{ row.data.slot_minutes ?? '-' }}</td>
                  <td class="px-3 py-2 border-b">
                    <span v-if="row.valid" class="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{{ tr('Valid', 'Valid') }}</span>
                    <div v-else>
                      <span v-for="(err, i) in row.errors" :key="i" class="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full mr-1 mb-1 inline-block">{{ err }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0">
            <p class="text-sm text-gray-600">{{ tr('Hanya baris yang valid akan diproses. Nama yang sudah ada akan di-update.', 'Only valid rows will be processed. Existing room names will be updated.') }}</p>
            <div class="flex gap-3">
              <button class="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition" @click="closeImportPreview">{{ tr('Batal', 'Cancel') }}</button>
              <button
                class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm"
                :disabled="importPreviewData.filter(r => r.valid).length === 0 || importing"
                @click="confirmImport"
              >
                {{ importing ? tr('Memproses...', 'Processing...') : tr(`Import ${importPreviewData.filter(r => r.valid).length} Ruangan`, `Import ${importPreviewData.filter(r => r.valid).length} Rooms`) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import { useForm } from 'vee-validate'
import type { PaginationMeta } from '~/models/pagination'
import type { Room, RoomUpsertPayload } from '~/models/room'
import UiInput from '~/components/ui/UiInput.vue'
import UiTextarea from '~/components/ui/UiTextarea.vue'
import FileUpload, { type UploadedFile } from '~/components/ui/FileUpload.vue'
import {
  createAdminRoom,
  deleteAdminRoom,
  deleteAdminRoomPhoto,
  fetchAdminRooms,
  updateAdminRoom,
  bulkDeleteAdminRooms,
  bulkUpsertAdminRooms,
} from '~/services/adminRooms'
import { createRoomUpsertSchema } from '~/validators/room'
import { exportRoomsToExcel, generateRoomTemplate, parseRoomExcel, type ParsedRoom } from '~/utils/excel-rooms'
import { usePhotoCache } from '~/composables/usePhotoCache'

const { tr, localeTag } = useAppLocale()
const auth = useAuth()
auth.loadFromStorage()
const photoCache = usePhotoCache()

// ── State ──
const loading = ref(false)
const error = ref<string | null>(null)
const rooms = ref<Room[]>([])
const selectedPhotoByRoom = ref<Record<number, number>>({})
const selectedRoomIds = ref<Set<number>>(new Set())

const search = ref('')
const page = ref(1)
const pageSize = 10
const meta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })

const showModal = ref(false)
const editingRoom = ref<Room | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)
const uploadingRoomId = ref<number | null>(null)
const photoErrors = ref<Record<number, string>>({})

const showPhotoModal = ref(false)
const photoModalRoom = ref<Room | null>(null)

const exporting = ref(false)
const importing = ref(false)
const showImportPreview = ref(false)
const importPreviewData = ref<ParsedRoom[]>([])
const importFileInput = ref<HTMLInputElement | null>(null)
const roomUpsertSchema = computed(() => createRoomUpsertSchema(tr))

// ── Selection ──
const isAllSelected = computed(() => rooms.value.length > 0 && rooms.value.every(r => selectedRoomIds.value.has(r.id)))
const isPartialSelected = computed(() => !isAllSelected.value && rooms.value.some(r => selectedRoomIds.value.has(r.id)))

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedRoomIds.value = new Set()
  } else {
    selectedRoomIds.value = new Set(rooms.value.map(r => r.id))
  }
}

function toggleSelectRoom(id: number) {
  const next = new Set(selectedRoomIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedRoomIds.value = next
}

// ── Form ──
function valuesFromRoom(room: Room | null) {
  return {
    name: room?.name ?? '',
    location: room?.location ?? '',
    capacity: room?.capacity ?? null,
    description: room?.description ?? '',
    open_time_start: room?.open_time_start ?? '',
    open_time_end: room?.open_time_end ?? '',
    slot_minutes: room?.slot_minutes ?? null,
    available_for_booking: room?.available_for_booking !== false && room?.available_for_booking !== 0,
  }
}

const { handleSubmit, errors, defineField, isFieldTouched, resetForm } = useForm({
  validationSchema: roomUpsertSchema,
  initialValues: valuesFromRoom(null),
})

const [name, nameAttrs] = defineField('name')
const [location, locationAttrs] = defineField('location')
const [capacity, capacityAttrs] = defineField('capacity')
const [description, descriptionAttrs] = defineField('description')
const [open_time_start, openTimeStartAttrs] = defineField('open_time_start')
const [open_time_end, openTimeEndAttrs] = defineField('open_time_end')
const [slot_minutes, slotMinutesAttrs] = defineField('slot_minutes')
const [available_for_booking, availableForBookingAttrs] = defineField('available_for_booking')

function isRoomBookable(room: Room) {
  return room.available_for_booking !== false && room.available_for_booking !== 0
}

// ── Data fetch ──
async function refresh() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchAdminRooms(
      { page: page.value, pageSize, search: search.value.trim() || undefined },
      auth.authHeaders(),
    )
    rooms.value = (res.data || []).map((room) => ({ ...room, photos: room.photos || [] }))
    meta.value = res.meta

    // Fix photo selection indexes
    const nextSelected: Record<number, number> = { ...selectedPhotoByRoom.value }
    for (const room of rooms.value) {
      const current = nextSelected[room.id] ?? 0
      if (!room.photos.length) nextSelected[room.id] = 0
      else if (current >= room.photos.length) nextSelected[room.id] = 0
    }
    selectedPhotoByRoom.value = nextSelected
    // Clear selection of rooms no longer visible
    const visibleIds = new Set(rooms.value.map(r => r.id))
    const next = new Set<number>()
    for (const id of selectedRoomIds.value) {
      if (visibleIds.has(id)) next.add(id)
    }
    selectedRoomIds.value = next
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat data ruangan.', 'Failed to load rooms.')
  } finally {
    loading.value = false
  }
}

function onPageChange(nextPage: number) {
  page.value = nextPage
  refresh()
}

// ── CRUD Modal ──
function openCreateModal() {
  editingRoom.value = null
  saveError.value = null
  resetForm({ values: valuesFromRoom(null) })
  showModal.value = true
}

function openEditModal(room: Room) {
  editingRoom.value = room
  saveError.value = null
  resetForm({ values: valuesFromRoom(room) })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingRoom.value = null
  saveError.value = null
  resetForm({ values: valuesFromRoom(null) })
}

async function saveRoom(payload: RoomUpsertPayload) {
  saving.value = true
  saveError.value = null
  try {
    if (editingRoom.value) {
      await updateAdminRoom(editingRoom.value.id, payload, auth.authHeaders())
      await Swal.fire({ icon: 'success', title: tr('Ruangan berhasil diperbarui', 'Room updated successfully'), timer: 1500, showConfirmButton: false })
    } else {
      await createAdminRoom(payload, auth.authHeaders())
      await Swal.fire({ icon: 'success', title: tr('Ruangan berhasil ditambahkan', 'Room added successfully'), timer: 1500, showConfirmButton: false })
    }
    closeModal()
    await refresh()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menyimpan ruangan.', 'Failed to save room.')
  } finally {
    saving.value = false
  }
}

const onSubmit = handleSubmit(async (values) => {
  await saveRoom(values as RoomUpsertPayload)
})

// ── Delete single ──
async function confirmDelete(room: Room) {
  const result = await Swal.fire({
    title: tr('Hapus Ruangan?', 'Delete Room?'),
    text: tr(`Apakah Anda yakin ingin menghapus ruangan "${room.name}"?`, `Are you sure you want to delete room "${room.name}"?`),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: tr('Ya, Hapus', 'Yes, Delete'),
    cancelButtonText: tr('Batal', 'Cancel'),
  })
  if (result.isConfirmed) {
    try {
      await deleteAdminRoom(room.id, auth.authHeaders())
      await Swal.fire({ icon: 'success', title: tr('Ruangan berhasil dihapus', 'Room deleted successfully'), timer: 1500, showConfirmButton: false })
      await refresh()
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal menghapus.', 'Failed to delete.') })
    }
  }
}

// ── Bulk Delete ──
async function confirmBulkDelete() {
  const ids = Array.from(selectedRoomIds.value)
  const names = rooms.value.filter(r => ids.includes(r.id)).map(r => r.name || `#${r.id}`)

  const result = await Swal.fire({
    title: tr(`Hapus ${ids.length} Ruangan?`, `Delete ${ids.length} Rooms?`),
    html: `<div class="text-left text-sm max-h-40 overflow-y-auto"><ul class="list-disc pl-4">${names.map(n => `<li>${n}</li>`).join('')}</ul></div><p class="mt-2 text-sm text-gray-500">${tr('Ruangan dengan peminjaman aktif tidak akan dihapus.', 'Rooms with active bookings will not be deleted.')}</p>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: tr('Ya, Hapus Semua', 'Yes, Delete All'),
    cancelButtonText: tr('Batal', 'Cancel'),
  })

  if (!result.isConfirmed) return

  try {
    const res = await bulkDeleteAdminRooms(ids, auth.authHeaders())
    const msg: string[] = []
    if (res.deleted.length) msg.push(tr(`${res.deleted.length} ruangan berhasil dihapus.`, `${res.deleted.length} rooms deleted successfully.`))
    if (res.failed.length) msg.push(tr(`${res.failed.length} gagal: ${res.failed.map(f => f.reason).join(', ')}`, `${res.failed.length} failed: ${res.failed.map(f => f.reason).join(', ')}`))
    await Swal.fire({
      icon: res.failed.length ? 'warning' : 'success',
      title: res.failed.length ? tr('Sebagian Gagal', 'Partially Failed') : tr('Berhasil', 'Success'),
      html: msg.join('<br/>'),
      timer: res.failed.length ? undefined : 2000,
      showConfirmButton: !!res.failed.length,
    })
    selectedRoomIds.value = new Set()
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal menghapus.', 'Failed to delete.') })
  }
}

// ── Photo management ──
function openPhotoModal(room: Room) {
  photoModalRoom.value = room
  showPhotoModal.value = true
}

function closePhotoModal() {
  showPhotoModal.value = false
  photoModalRoom.value = null
}

async function onPhotoUploaded(roomId: number, uploaded: UploadedFile) {
  uploadingRoomId.value = roomId
  photoErrors.value = { ...photoErrors.value, [roomId]: '' }

  try {
    if (!uploaded.photo) {
      throw new Error('Response foto dari server tidak ditemukan')
    }

    const photo = uploaded.photo

    photoCache.prime(photo.id, uploaded.previewUrl)

    const target = rooms.value.find((room) => room.id === roomId)
    if (target) {
      target.photos = [photo, ...target.photos]
      selectedPhotoByRoom.value = {
        ...selectedPhotoByRoom.value,
        [roomId]: 0,
      }
    }

    if (photoModalRoom.value?.id === roomId && target) {
      photoModalRoom.value = { ...target }
    }
  } catch (e: any) {
    photoErrors.value = {
      ...photoErrors.value,
      [roomId]:
        e?.data?.statusMessage ||
        e?.statusMessage ||
        e?.message ||
        tr('Gagal menyimpan foto.', 'Failed to save photo.'),
    }
  } finally {
    uploadingRoomId.value = null
  }
}

function onPhotoUploadError(roomId: number, message: string) {
  photoErrors.value = { ...photoErrors.value, [roomId]: message }
}

async function confirmDeletePhoto(roomId: number, photoId: number) {
  const result = await Swal.fire({
    title: tr('Hapus Foto?', 'Delete Photo?'),
    text: tr('Foto yang dihapus tidak bisa dikembalikan.', 'Deleted photo cannot be restored.'),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: tr('Ya, Hapus', 'Yes, Delete'),
    cancelButtonText: tr('Batal', 'Cancel'),
  })
  if (result.isConfirmed) {
    try {
      await deleteAdminRoomPhoto(photoId, auth.authHeaders())
      photoCache.evict(photoId)
      const target = rooms.value.find((room) => room.id === roomId)
      if (target) {
        target.photos = target.photos.filter((photo) => photo.id !== photoId)
        const current = selectedPhotoByRoom.value[roomId] ?? 0
        const next = Math.min(current, Math.max(0, target.photos.length - 1))
        selectedPhotoByRoom.value = { ...selectedPhotoByRoom.value, [roomId]: next }
        if (photoModalRoom.value?.id === roomId) {
          photoModalRoom.value = { ...target }
        }
      }
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal menghapus foto.', 'Failed to delete photo.') })
    }
  }
}

function selectedPhotoIndex(roomId: number) {
  return selectedPhotoByRoom.value[roomId] ?? 0
}

function setSelectedPhoto(roomId: number, index: number) {
  selectedPhotoByRoom.value = { ...selectedPhotoByRoom.value, [roomId]: index }
}

// ── Excel Export ──
async function handleExportExcel() {
  exporting.value = true
  try {
    // Fetch all rooms (up to 1000)
    const res = await fetchAdminRooms({ page: 1, pageSize: 100 }, auth.authHeaders())
    let allRooms = (res.data || []).map(r => ({ ...r, photos: r.photos || [] }))
    // Fetch remaining pages if needed
    if (res.meta.totalPages > 1) {
      for (let p = 2; p <= res.meta.totalPages; p++) {
        const pageRes = await fetchAdminRooms({ page: p, pageSize: 100 }, auth.authHeaders())
        allRooms = [...allRooms, ...(pageRes.data || []).map(r => ({ ...r, photos: r.photos || [] }))]
      }
    }
    await exportRoomsToExcel(allRooms, localeTag.value)
    await Swal.fire({ icon: 'success', title: tr('Export berhasil', 'Export successful'), timer: 1200, showConfirmButton: false })
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Gagal export data ruangan.', 'Failed to export room data.') })
  } finally {
    exporting.value = false
  }
}

async function handleDownloadTemplate() {
  try {
    await generateRoomTemplate(localeTag.value)
  } catch {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Gagal membuat template.', 'Failed to generate template.') })
  }
}

// ── Excel Import ──
async function handleImportExcel(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const parsed = await parseRoomExcel(file, localeTag.value)
    if (parsed.length === 0) {
      await Swal.fire({ icon: 'info', title: tr('File Kosong', 'Empty File'), text: tr('Tidak ada data yang ditemukan di dalam file.', 'No data found in the file.') })
      return
    }
    importPreviewData.value = parsed
    showImportPreview.value = true
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal Membaca File', 'Failed to Read File'), text: e?.message || tr('Format file tidak valid.', 'Invalid file format.') })
  }
}

function closeImportPreview() {
  showImportPreview.value = false
  importPreviewData.value = []
}

async function confirmImport() {
  const validRows = importPreviewData.value.filter(r => r.valid)
  if (validRows.length === 0) return

  importing.value = true
  try {
    const res = await bulkUpsertAdminRooms(
      validRows.map(r => r.data),
      auth.authHeaders(),
    )
    const msgs: string[] = []
    if (res.created) msgs.push(tr(`${res.created} ruangan baru ditambahkan`, `${res.created} new rooms added`))
    if (res.updated) msgs.push(tr(`${res.updated} ruangan diperbarui`, `${res.updated} rooms updated`))
    if (res.failed.length) msgs.push(tr(`${res.failed.length} gagal`, `${res.failed.length} failed`))

    await Swal.fire({
      icon: res.failed.length ? 'warning' : 'success',
      title: res.failed.length ? tr('Import Sebagian Berhasil', 'Partial Import Success') : tr('Import Berhasil', 'Import Successful'),
      html: msgs.join('<br/>'),
    })
    closeImportPreview()
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal Import', 'Import Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal import data.', 'Failed to import data.') })
  } finally {
    importing.value = false
  }
}

// ── Watchers ──
watch(search, () => {
  page.value = 1
  refresh()
})

onMounted(() => {
  refresh()
})
</script>
