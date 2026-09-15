<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto space-y-6">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Persetujuan Dokumen', 'Document Approval') }}</h1>
            <p class="text-gray-600 mt-1">{{ tr('Kelola dokumen yang Anda buat dan dokumen yang menunggu persetujuan Anda.', 'Manage your documents and documents waiting for your approval.') }}</p>
          </div>
          <button
            @click="openCreateModal"
            class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm inline-flex items-center gap-2"
          >
            <Icon name="mdi:file-document-plus" />
            {{ tr('Buat Dokumen', 'Create Document') }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-3 min-w-0">
          <button class="px-4 py-2 rounded-full text-sm font-semibold border transition" :class="tabClass('all-documents')" @click="setTab('all-documents')">
            {{ tr('Semua Dokumen', 'All Documents') }}
          </button>
          <button class="px-4 py-2 rounded-full text-sm font-semibold border transition" :class="tabClass('my-documents')" @click="setTab('my-documents')">
            {{ tr('Dokumen Saya', 'My Documents') }}
          </button>
          <button class="px-4 py-2 rounded-full text-sm font-semibold border transition" :class="tabClass('pending-approvals')" @click="setTab('pending-approvals')">
            {{ tr('Menunggu Tanda Tangan', 'Pending Signatures') }}
            <span v-if="allPendingCount > 0" class="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-600 text-white">{{ allPendingCount }}</span>
          </button>
          <button class="px-4 py-2 rounded-full text-sm font-semibold border transition" :class="tabClass('report')" @click="setTab('report')">
            <Icon name="mdi:chart-bar" class="mr-1" />
            {{ tr('Laporan', 'Report') }}
          </button>
          <div class="relative ml-auto w-full md:w-80">
            <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              v-model.trim="search"
              type="text"
              :placeholder="tr('Cari dokumen...', 'Search documents...')"
              class="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              @keyup.enter="refreshActiveTab"
            />
          </div>
          <button
            class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
            :disabled="loading"
            @click="refreshActiveTab"
          >
            {{ tr('Perbarui', 'Refresh') }}
          </button>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          {{ error }}
        </div>

        <!-- Report Tab -->
        <div v-if="activeTab === 'report'">
          <!-- Report Filters -->
          <div class="bg-white rounded-2xl shadow border border-gray-100 p-4 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ tr('Tanggal Mulai', 'Start Date') }}</label>
                <input v-model="reportStartDate" type="date" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ tr('Tanggal Akhir', 'End Date') }}</label>
                <input v-model="reportEndDate" type="date" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ tr('Status', 'Status') }}</label>
                <select v-model="reportStatusFilter" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm">
                  <option value="">{{ tr('Semua', 'All') }}</option>
                  <option value="draft">{{ tr('Draft', 'Draft') }}</option>
                  <option value="pending">{{ tr('Menunggu', 'Pending') }}</option>
                  <option value="approved">{{ tr('Disetujui', 'Approved') }}</option>
                  <option value="rejected">{{ tr('Ditolak', 'Rejected') }}</option>
                </select>
              </div>
              <div class="flex items-end gap-2">
                <button
                  class="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                  :disabled="reportLoading || !reportStartDate || !reportEndDate"
                  @click="loadReport"
                >
                  {{ reportLoading ? tr('Memuat...', 'Loading...') : tr('Tampilkan', 'Show') }}
                </button>
                <button
                  v-if="reportData.length"
                  class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition inline-flex items-center gap-1"
                  :disabled="reportExporting"
                  @click="handleReportExport"
                >
                  <Icon name="mdi:file-excel" size="16" />
                  {{ reportExporting ? '...' : 'Excel' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Report Summary -->
          <div v-if="reportSummary" class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div class="bg-white rounded-2xl shadow border border-gray-100 p-4 text-center">
              <div class="text-2xl font-bold text-gray-900">{{ reportSummary.total }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ tr('Total', 'Total') }}</div>
            </div>
            <div class="bg-gray-50 rounded-2xl shadow border border-gray-200 p-4 text-center">
              <div class="text-2xl font-bold text-gray-600">{{ reportSummary.draft }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ tr('Draft', 'Draft') }}</div>
            </div>
            <div class="bg-amber-50 rounded-2xl shadow border border-amber-100 p-4 text-center">
              <div class="text-2xl font-bold text-amber-700">{{ reportSummary.pending }}</div>
              <div class="text-xs text-amber-600 mt-1">{{ tr('Menunggu', 'Pending') }}</div>
            </div>
            <div class="bg-emerald-50 rounded-2xl shadow border border-emerald-100 p-4 text-center">
              <div class="text-2xl font-bold text-emerald-700">{{ reportSummary.approved }}</div>
              <div class="text-xs text-emerald-600 mt-1">{{ tr('Disetujui', 'Approved') }}</div>
            </div>
            <div class="bg-red-50 rounded-2xl shadow border border-red-100 p-4 text-center">
              <div class="text-2xl font-bold text-red-700">{{ reportSummary.rejected }}</div>
              <div class="text-xs text-red-600 mt-1">{{ tr('Ditolak', 'Rejected') }}</div>
            </div>
          </div>

          <!-- Report Loading -->
          <div v-if="reportLoading" class="bg-white rounded-2xl shadow p-10 text-center text-gray-600">
            {{ tr('Memuat data report...', 'Loading report data...') }}
          </div>

          <!-- Report Error -->
          <div v-if="reportError" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-4">
            {{ reportError }}
          </div>

          <!-- Report Table -->
          <div v-if="!reportLoading && reportData.length" class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div class="mobile-table-scroll">
              <table class="w-full min-w-[900px] text-sm">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-200">
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Judul', 'Title') }}</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Pembuat', 'Creator') }}</th>
                    <th class="px-4 py-3 text-center font-semibold text-gray-700">{{ tr('Status', 'Status') }}</th>
                    <th class="px-4 py-3 text-center font-semibold text-gray-700">{{ tr('Level', 'Level') }}</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Approver', 'Approvers') }}</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Tanggal', 'Date') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(doc, idx) in reportData" :key="doc.id" class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="px-4 py-3 text-gray-500">{{ idx + 1 }}</td>
                    <td class="px-4 py-3">
                      <div class="font-medium">{{ doc.title }}</div>
                      <div v-if="doc.description" class="text-xs text-gray-400 truncate max-w-[200px]">{{ doc.description }}</div>
                    </td>
                    <td class="px-4 py-3">{{ doc.creator_name || '-' }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="statusBadgeClass(doc.status)">
                        {{ statusLabel(doc.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">{{ doc.current_level }} / {{ doc.total_levels }}</td>
                    <td class="px-4 py-3 text-xs">
                      <div v-if="doc.workflows?.length" class="flex flex-wrap gap-1">
                        <span
                          v-for="w in doc.workflows"
                          :key="w.id"
                          class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          :class="workflowBadgeClass(w.status)"
                        >
                          L{{ w.level }}-{{ w.approver_role_name ? `${tr('Role', 'Role')}:${w.approver_role_name}` : w.approver_name }}
                        </span>
                      </div>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-500">{{ formatDate(doc.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="!reportLoading && !reportData.length && reportSummary" class="bg-white rounded-2xl shadow p-10 text-center text-gray-600">
            {{ tr('Tidak ada data dokumen pada rentang tanggal ini.', 'No document data in this date range.') }}
          </div>
        </div>

        <!-- Document List Tabs -->
        <template v-if="activeTab !== 'report'">
          <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">{{ tr('Memuat dokumen...', 'Loading documents...') }}</div>

        <div class="space-y-4">
          <div v-if="allDocuments.length === 0 && !loading" class="bg-white rounded-3xl shadow p-10 text-center">
            <Icon name="mdi:file-document-outline" class="text-6xl text-gray-300 mx-auto mb-4" />
            <p class="text-gray-600">{{ tr('Belum ada dokumen terkait Anda.', 'No related documents yet.') }}</p>
          </div>

          <div
            v-for="doc in allDocuments"
            :key="doc.id"
            class="bg-white rounded-3xl shadow-xl p-6 border"
            :class="statusBorderClass(doc.status)"
          >
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h2 class="text-xl font-bold text-gray-900">{{ doc.title }}</h2>
                  <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="statusBadgeClass(doc.status)">
                    {{ statusLabel(doc.status) }}
                  </span>
                  <span v-if="doc.is_creator" class="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    {{ tr('Pembuat', 'Creator') }}
                  </span>
                  <span v-if="doc.my_level" class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                    {{ tr('Approver', 'Approver') }} L{{ doc.my_level }}
                  </span>
                </div>

                <p v-if="doc.description" class="text-gray-600 text-sm mb-3">{{ doc.description }}</p>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:account" class="text-gray-500" />
                    <span>{{ doc.creator_name }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:calendar" class="text-gray-500" />
                    <span>{{ formatDate(doc.created_at) }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:stairs" class="text-indigo-500" />
                    <span>{{ tr('Level', 'Level') }} {{ doc.current_level }} / {{ doc.total_levels }}</span>
                  </div>
                </div>

                <div v-if="doc.workflows?.length" class="mt-4 border-t border-gray-100 pt-3">
                  <div class="text-xs font-semibold text-gray-500 uppercase mb-2">{{ tr('Progress Approver', 'Approver Progress') }}</div>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="workflow in doc.workflows"
                      :key="workflow.id"
                      class="px-2.5 py-1 rounded-full text-xs font-medium"
                      :class="workflowBadgeClass(workflow.status)"
                    >
                      L{{ workflow.level }} - {{ workflow.approver_role_name ? `${tr('Role', 'Role')}: ${workflow.approver_role_name}` : workflow.approver_name }}{{ !workflow.is_required ? ` (${tr('Opsional', 'Optional')})` : '' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  v-if="doc.status === 'pending' && doc.my_status === 'pending' && doc.my_level === doc.current_level"
                  @click="viewDocument(doc.id)"
                  class="px-4 py-2 rounded-xl bg-indigo-600 text-sm text-white font-semibold hover:bg-indigo-700 transition shadow-sm inline-flex items-center gap-2"
                >
                  <Icon name="mdi:file-sign" size="18" />
                  {{ tr('Tinjau & TTD', 'Review & Sign') }}
                </button>
                <button
                  v-else
                  @click="viewDocument(doc.id)"
                  class="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition"
                >
                  {{ tr('Lihat Detail', 'View Details') }}
                </button>
              </div>
            </div>
          </div>

          <Pagination :meta="allMeta" @change="handleAllPageChange" />
        </div>
        </template>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="closeCreateModal">
        <div class="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ tr('Membuat Persetujuan Dokumen', 'Create Document Approval') }}</h2>
              <p class="text-sm text-gray-500 mt-1">{{ tr('Unggah PDF dan tentukan approver bertingkat.', 'Upload a PDF and set multi-level approvers.') }}</p>
            </div>
            <button @click="closeCreateModal" class="text-gray-500 hover:text-gray-700">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <div class="p-6">
            <form @submit.prevent="createDocument" class="space-y-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Judul Dokumen', 'Document Title') }}</label>
                <input
                  v-model="newDocument.title"
                  type="text"
                  required
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  :placeholder="tr('Masukkan judul dokumen', 'Enter document title')"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Deskripsi', 'Description') }}</label>
                <textarea
                  v-model="newDocument.description"
                  rows="3"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  :placeholder="tr('Deskripsi singkat dokumen', 'Short document description')"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('File PDF', 'PDF File') }}</label>
                <input
                  type="file"
                  accept="application/pdf"
                  @change="handleFileUpload"
                  required
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500 mt-1">{{ tr('Maksimal 10MB, format PDF.', 'Maximum 10MB, PDF format.') }}</p>
              </div>

              <ApproverSelector
                v-model="newDocument.approvers"
                v-model:level-settings="newDocument.level_settings"
                :available-users="availableUsers"
                :available-roles="availableRoles"
              />

              <div class="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  @click="closeCreateModal"
                  class="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                >
                  {{ tr('Batal', 'Cancel') }}
                </button>
                <button
                  type="submit"
                  :disabled="!canSubmitDocument || creatingDocument"
                  class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon v-if="creatingDocument" name="mdi:loading" class="animate-spin mr-1" />
                  {{ creatingDocument ? tr('Membuat...', 'Creating...') : tr('Buat Dokumen', 'Create Document') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import { useAppLocale as usePageLocale } from '~/composables/useAppLocale'
import type { ApprovalDocument, ApprovalWorkflowRequest, LevelSettingsRequest } from '~/models/approval-document'
import type { PaginationMeta } from '~/models/pagination'
import {
  fetchApprovalDocuments,
  fetchPendingApprovals,
  fetchAllRelatedDocuments,
  createApprovalDocument,
  submitApprovalDocument,
  fetchAvailableUsers,
  fetchAvailableRoles,
  fetchDocumentReport,
} from '~/services/approvalDocuments'
import { exportDocumentsToExcel } from '~/utils/excel-documents'

const { tr, localeTag } = usePageLocale()
const auth = useAuth()
auth.loadFromStorage()

const activeTab = ref<'all-documents' | 'my-documents' | 'pending-approvals' | 'report'>('all-documents')
const loading = ref(false)
const error = ref<string | null>(null)
const search = ref('')

const allDocuments = ref<ApprovalDocument[]>([])
const allPage = ref(1)
const pageSize = 6
const allMeta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })
const allPendingCount = ref(0)

const showCreateModal = ref(false)
const creatingDocument = ref(false)
const submittingId = ref<number | null>(null)
const availableUsers = ref<any[]>([])
const availableRoles = ref<any[]>([])
const newDocument = ref({
  title: '',
  description: '',
  file_data: null as File | null,
  file_name: '',
  file_size: 0,
  approvers: [] as ApprovalWorkflowRequest[],
  level_settings: [] as LevelSettingsRequest[],
})

const canSubmitDocument = computed(() => {
  return (
    !!newDocument.value.title &&
    !!newDocument.value.file_data &&
    newDocument.value.approvers.length > 0
  )
})

onMounted(() => {
  refreshActiveTab()
  loadPendingCount()
  loadAvailableUsers()
  loadAvailableRoles()
})

function normalizeMeta(raw: any): PaginationMeta {
  return {
    page: Number(raw?.page || 1),
    pageSize: Number(raw?.pageSize || raw?.page_size || pageSize),
    total: Number(raw?.total || 0),
    totalPages: Number(raw?.totalPages || raw?.total_pages || 1),
  }
}

function tabClass(tab: 'all-documents' | 'my-documents' | 'pending-approvals' | 'report') {
  return activeTab.value === tab
    ? 'bg-indigo-600 text-white border-indigo-600'
    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
}

function setTab(tab: 'all-documents' | 'my-documents' | 'pending-approvals' | 'report') {
  if (activeTab.value === tab) return
  activeTab.value = tab
  if (tab === 'report') {
    if (!reportStartDate.value) {
      const now = new Date()
      const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      reportStartDate.value = thirtyAgo.toISOString().slice(0, 10)
      reportEndDate.value = now.toISOString().slice(0, 10)
    }
    return
  }
  allPage.value = 1
  refreshActiveTab()
}

async function refreshActiveTab() {
  allDocuments.value = []
  allMeta.value = { page: 1, pageSize, total: 0, totalPages: 1 }

  if (activeTab.value === 'all-documents') {
    await loadAllDocuments()
  } else if (activeTab.value === 'my-documents') {
    await loadDocuments()
  } else {
    await loadPendingApprovals()
  }
}

async function loadAllDocuments() {
  loading.value = true
  error.value = null
  try {
    const result = await fetchAllRelatedDocuments(
      {
        page: allPage.value,
        pageSize,
        search: search.value || undefined,
      },
      auth.authHeaders(),
    )
    allDocuments.value = result.data || []
    allMeta.value = normalizeMeta(result.meta)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || tr('Gagal memuat dokumen.', 'Failed to load documents.')
  } finally {
    loading.value = false
  }
}

async function loadDocuments() {
  loading.value = true
  error.value = null
  try {
    const result = await fetchApprovalDocuments(
      {
        page: allPage.value,
        pageSize,
        search: search.value || undefined,
      },
      auth.authHeaders(),
    )
    allDocuments.value = result.data || []
    allMeta.value = normalizeMeta(result.meta)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || tr('Gagal memuat dokumen.', 'Failed to load documents.')
  } finally {
    loading.value = false
  }
}

async function loadPendingApprovals() {
  loading.value = true
  error.value = null
  try {
    const result = await fetchPendingApprovals(
      {
        page: allPage.value,
        pageSize,
        search: search.value || undefined,
      },
      auth.authHeaders(),
    )
    allDocuments.value = result.data || []
    allMeta.value = normalizeMeta(result.meta)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || tr('Gagal memuat dokumen pending.', 'Failed to load pending documents.')
  } finally {
    loading.value = false
  }
}

async function loadPendingCount() {
  try {
    const result = await fetchPendingApprovals(
      { page: 1, pageSize: 1 },
      auth.authHeaders(),
    )
    allPendingCount.value = normalizeMeta(result.meta).total
  } catch {
    // silent fail for badge count
  }
}

async function loadAvailableUsers() {
  try {
    const result = await fetchAvailableUsers(auth.authHeaders())
    availableUsers.value = result.data || []
  } catch {
    availableUsers.value = []
  }
}

async function loadAvailableRoles() {
  try {
    const result = await fetchAvailableRoles(auth.authHeaders())
    availableRoles.value = (result.data || []).filter((r: any) => !['admin', 'user'].includes(r.name))
  } catch {
    availableRoles.value = []
  }
}

function handleAllPageChange(nextPage: number) {
  allPage.value = nextPage
  loadAllDocuments()
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]
  if (file.type !== 'application/pdf') {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('File harus PDF.', 'File must be a PDF.') })
    input.value = ''
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Ukuran file maksimal 10MB.', 'Maximum file size is 10MB.') })
    input.value = ''
    return
  }

  newDocument.value.file_name = file.name
  newDocument.value.file_data = file
  newDocument.value.file_size = file.size
}

async function createDocument() {
  if (!canSubmitDocument.value || !newDocument.value.file_data) return

  creatingDocument.value = true
  try {
    const formData = new FormData()
    formData.append('title', newDocument.value.title)
    formData.append('description', newDocument.value.description)
    formData.append('file_name', newDocument.value.file_name)
    formData.append('file_data', newDocument.value.file_data)
    formData.append('approvers', JSON.stringify(newDocument.value.approvers))
    formData.append('level_settings', JSON.stringify(newDocument.value.level_settings))

    await createApprovalDocument(formData, auth.authHeaders())

    await Swal.fire({ icon: 'success', title: tr('Dokumen berhasil dibuat', 'Document created successfully'), timer: 1200, showConfirmButton: false })
    closeCreateModal()
    await loadDocuments()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || e?.message || tr('Gagal membuat dokumen.', 'Failed to create document.') })
  } finally {
    creatingDocument.value = false
  }
}

async function submitDocument(id: number) {
  const result = await Swal.fire({
    title: tr('Kirim dokumen?', 'Send document?'),
    text: tr('Dokumen akan dikirim ke approver level 1.', 'The document will be sent to level 1 approver.'),
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: tr('Ya, kirim', 'Yes, send'),
    cancelButtonText: tr('Batal', 'Cancel'),
  })

  if (!result.isConfirmed) return

  submittingId.value = id
  try {
    await submitApprovalDocument(id, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Dokumen dikirim', 'Document sent'), timer: 1200, showConfirmButton: false })
    await loadDocuments()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal mengirim dokumen.', 'Failed to send document.') })
  } finally {
    submittingId.value = null
  }
}

function openCreateModal() {
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
  newDocument.value = {
    title: '',
    description: '',
    file_data: null,
    file_name: '',
    file_size: 0,
    approvers: [],
    level_settings: [],
  }
}

function viewDocument(id: number) {
  navigateTo(`/user/approval-document/${id}`)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(localeTag.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: tr('Draft', 'Draft'),
    pending: tr('Menunggu', 'Pending'),
    approved: tr('Disetujui', 'Approved'),
    rejected: tr('Ditolak', 'Rejected'),
  }
  return labels[status] || status
}

function statusBadgeClass(status: string) {
  const classes: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-50 text-yellow-800',
    approved: 'bg-emerald-50 text-emerald-800',
    rejected: 'bg-red-50 text-red-800',
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

function statusBorderClass(status: string) {
  const classes: Record<string, string> = {
    draft: 'border-slate-200',
    pending: 'border-yellow-200',
    approved: 'border-emerald-200',
    rejected: 'border-red-200',
  }
  return classes[status] || 'border-slate-200'
}

function workflowBadgeClass(status: string) {
  const classes: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    skipped: 'bg-slate-100 text-slate-600',
  }
  return classes[status] || 'bg-slate-100 text-slate-600'
}

// ── Report ──
const reportStartDate = ref('')
const reportEndDate = ref('')
const reportStatusFilter = ref('')
const reportData = ref<ApprovalDocument[]>([])
const reportSummary = ref<{ total: number; draft: number; pending: number; approved: number; rejected: number } | null>(null)
const reportLoading = ref(false)
const reportError = ref<string | null>(null)
const reportExporting = ref(false)

async function loadReport() {
  if (!reportStartDate.value || !reportEndDate.value) return
  reportLoading.value = true
  reportError.value = null
  try {
    const params: any = {
      start_date: reportStartDate.value,
      end_date: reportEndDate.value,
    }
    if (reportStatusFilter.value) params.status = reportStatusFilter.value

    const res = await fetchDocumentReport(params, auth.authHeaders())
    reportData.value = res.data || []
    reportSummary.value = res.summary
  } catch (e: any) {
    reportError.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat report.', 'Failed to load report.')
  } finally {
    reportLoading.value = false
  }
}

async function handleReportExport() {
  if (!reportData.value.length) return
  reportExporting.value = true
  try {
    const dateRange = reportStartDate.value && reportEndDate.value
      ? { start: reportStartDate.value, end: reportEndDate.value }
      : undefined
    await exportDocumentsToExcel(reportData.value, dateRange, localeTag.value)
  } catch {
    // silent
  } finally {
    reportExporting.value = false
  }
}
</script>
