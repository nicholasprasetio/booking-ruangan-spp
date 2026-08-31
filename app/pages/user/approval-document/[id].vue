<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">{{ tr('Memuat dokumen...', 'Loading document...') }}</div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
        <div class="flex items-center justify-between gap-3">
          <span>{{ error }}</span>
          <button @click="router.back()" class="underline font-semibold">{{ tr('Kembali', 'Back') }}</button>
        </div>
      </div>

      <div v-else-if="document" class="space-y-6">
        <div>
          <button @click="router.back()" class="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800">
            <Icon name="mdi:arrow-left" />
            {{ tr('Kembali', 'Back') }}
          </button>

          <div class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h1 class="text-3xl font-bold text-gray-900">{{ document.title }}</h1>
                  <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="statusBadgeClass(document.status)">
                    {{ statusLabel(document.status) }}
                  </span>
                </div>

                <p v-if="document.description" class="text-gray-600 mb-4">{{ document.description }}</p>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:account" class="text-gray-500" />
                    <span>{{ document.creator_name }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:calendar" class="text-gray-500" />
                    <span>{{ formatDate(document.created_at) }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:file-pdf-box" class="text-red-500" />
                    <span>{{ document.file_name }}</span>
                  </div>
                </div>
              </div>

              <div class="text-sm text-gray-600">
                <div class="font-semibold text-gray-800 mb-1">{{ tr('Progress', 'Progress') }}</div>
                <div>{{ tr('Level', 'Level') }} {{ document.current_level }} / {{ document.total_levels }}</div>
              </div>
            </div>

            <div class="mt-4 w-full bg-gray-100 rounded-full h-2">
              <div class="bg-indigo-600 h-2 rounded-full transition-all" :style="{ width: progressWidth }" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <div class="flex items-center justify-between gap-3 mb-3">
                <h2 class="text-xl font-bold text-gray-900">{{ canApprove ? tr('Tanda Tangan Dokumen', 'Document Signature') : tr('Pratinjau Dokumen', 'Document Preview') }}</h2>
                <button
                  v-if="!canApprove"
                  @click="exportPdf"
                  class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  {{ tr('Unduh PDF', 'Download PDF') }}
                </button>
              </div>

              <ClientOnly>
                <PdfSignatureEditor
                  v-if="canApprove && document.final_document_path"
                  ref="signatureEditorRef"
                  :url-r2="document.final_document_path"
                  :file-name="document.file_name || 'signed-document.pdf'"
                  :default-signature-data="user?.digital_signature_data || ''"
                  max-height="620px"
                  @signatureChanged="handleEditorSignatureChanged"
                >
                  <template #fullscreen-actions>
                    <div class="space-y-4">
                      <div class="bg-white rounded-2xl border border-gray-200 p-4">
                        <h4 class="text-base font-bold text-gray-900 mb-3">{{ tr('Keputusan Persetujuan', 'Approval Decision') }}</h4>

                        <div class="mb-3">
                          <label class="block text-sm font-semibold text-gray-700 mb-1">{{ tr('Notifikasi Email', 'Email Notification') }}</label>
                          <select v-model="notifyPreference" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                            <option value="final">{{ tr('Beritahu saya apabila dokumen ini telah di-approve', 'Notify me when this document is fully approved') }}</option>
                            <option value="all">{{ tr('Beritahu saya di setiap perubahan dokumen ini', 'Notify me on every change to this document') }}</option>
                            <option value="none">{{ tr('Tidak terima notifikasi', 'Do not receive notifications') }}</option>
                          </select>
                        </div>

                        <div class="mb-3">
                          <label class="block text-sm font-semibold text-gray-700 mb-1">{{ tr('Catatan (Opsional)', 'Notes (Optional)') }}</label>
                          <textarea
                            v-model="approvalNotes"
                            rows="3"
                            class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            :placeholder="tr('Tambahkan catatan persetujuan', 'Add approval notes')"
                          />
                        </div>

                        <div class="flex flex-col gap-2">
                          <button
                            @click="handleApprove"
                            :disabled="!hasPlacedSignatures || processingAction"
                            class="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Icon v-if="processingAction" name="mdi:loading" class="animate-spin" />
                            <Icon v-else name="mdi:check-circle" />
                            {{ processingAction ? tr('Memproses...', 'Processing...') : tr('Setujui & Tanda Tangan', 'Approve & Sign') }}
                          </button>
                          <button
                            @click="handleReject"
                            :disabled="processingAction"
                            class="w-full px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Icon v-if="processingAction" name="mdi:loading" class="animate-spin" />
                            <Icon v-else name="mdi:close-circle" />
                            {{ processingAction ? tr('Memproses...', 'Processing...') : tr('Tolak', 'Reject') }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </template>
                </PdfSignatureEditor>
                <PdfViewer v-else-if="document.final_document_path" :url-r2="document.final_document_path" max-height="620px" />
              </ClientOnly>
            </div>
          </div>

          <div class="space-y-6">
            <div v-if="canApprove" class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">{{ tr('Keputusan Persetujuan', 'Approval Decision') }}</h2>

              <div class="mb-4">
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Notifikasi Email', 'Email Notification') }}</label>
                <select v-model="notifyPreference" class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="final">{{ tr('Beritahu saya apabila dokumen ini telah di-approve', 'Notify me when this document is fully approved') }}</option>
                  <option value="all">{{ tr('Beritahu saya di setiap perubahan dokumen ini', 'Notify me on every change to this document') }}</option>
                  <option value="none">{{ tr('Tidak terima notifikasi', 'Do not receive notifications') }}</option>
                </select>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Catatan (Opsional)', 'Notes (Optional)') }}</label>
                <textarea
                  v-model="approvalNotes"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  :placeholder="tr('Tambahkan catatan persetujuan', 'Add approval notes')"
                />
              </div>

              <div class="flex flex-col md:flex-row gap-3">
                <button
                  @click="handleApprove"
                  :disabled="!hasPlacedSignatures || processingAction"
                  class="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <Icon v-if="processingAction" name="mdi:loading" class="animate-spin mr-2" />
                  <Icon v-else name="mdi:check-circle" class="mr-2" />
                  {{ processingAction ? tr('Memproses...', 'Processing...') : tr('Setujui & Tanda Tangan', 'Approve & Sign') }}
                </button>
                <button
                  @click="handleReject"
                  :disabled="processingAction"
                  class="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
                >
                  <Icon v-if="processingAction" name="mdi:loading" class="animate-spin mr-2" />
                  <Icon v-else name="mdi:close-circle" class="mr-2" />
                  {{ processingAction ? tr('Memproses...', 'Processing...') : tr('Tolak', 'Reject') }}
                </button>
              </div>
            </div>

            <div class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">{{ tr('Workflow Persetujuan', 'Approval Workflow') }}</h2>

              <div v-if="document.workflows && document.workflows.length > 0" class="space-y-4">
                <div v-for="(levelGroup, level) in groupedWorkflows" :key="level">
                  <div class="flex items-center gap-2 mb-2">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      :class="Number(level) <= Number(document.current_level) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'"
                    >
                      {{ level }}
                    </div>
                    <span class="font-semibold text-gray-800">{{ tr('Level', 'Level') }} {{ level }}</span>
                  </div>

                  <div class="ml-10 space-y-2">
                    <div v-for="workflow in levelGroup" :key="workflow.id" class="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div class="flex items-start gap-2">
                        <Icon :name="workflowIcon(workflow.status)" size="20" :class="workflowColor(workflow.status)" />
                        <div class="flex-1 text-sm">
                          <template v-if="workflow.approver_role_name && Number(workflow.approver_id) === 0">
                            <div class="font-medium text-purple-700 flex items-center gap-1">
                              <Icon name="mdi:shield-account" size="16" />
                              {{ tr('Role', 'Role') }}: {{ workflow.approver_role_name }}
                            </div>
                            <div class="text-gray-500">{{ tr('Semua user dengan role ini bisa tanda tangan', 'All users with this role can sign') }}</div>
                          </template>
                          <template v-else>
                            <div class="font-medium text-gray-900">{{ workflow.approver_name }}</div>
                            <div class="text-gray-500">{{ workflow.approver_email }}</div>
                            <div v-if="workflow.approver_role_name" class="text-xs text-purple-600 mt-0.5">{{ tr('Ditandatangani via role', 'Signed via role') }}: {{ workflow.approver_role_name }}</div>
                          </template>
                          <div v-if="workflow.signed_at" class="text-xs text-gray-500 mt-1">{{ tr('Ditandatangani', 'Signed') }}: {{ formatDateTime(workflow.signed_at) }}</div>
                          <div v-if="workflow.rejection_reason" class="text-xs text-red-600 mt-1">{{ tr('Alasan', 'Reason') }}: {{ workflow.rejection_reason }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="isCreator && document.status === 'draft'" class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">{{ tr('Aksi Pemilik Dokumen', 'Document Owner Actions') }}</h2>
              <button
                @click="handleSubmit"
                :disabled="processingAction"
                class="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <Icon v-if="processingAction" name="mdi:loading" class="animate-spin mr-2" />
                <Icon v-else name="mdi:send" class="mr-2" />
                {{ processingAction ? tr('Mengirim...', 'Sending...') : tr('Kirim untuk Persetujuan', 'Send for Approval') }}
              </button>
            </div>

            <div v-if="isCreator && document.status === 'rejected'" class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">{{ tr('Upload Revisi', 'Upload Revision') }}</h2>
              <input type="file" accept="application/pdf" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl" @change="handleRevisionFile" />
              <button
                class="mt-4 w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                :disabled="!revisionFile || processingAction"
                @click="handleRevisionUpload"
              >
                <Icon v-if="processingAction" name="mdi:loading" class="animate-spin mr-2" />
                {{ tr('Upload Revisi & Mulai Approval Ulang', 'Upload Revision & Restart Approval') }}
              </button>
            </div>

            <div v-if="document.verification_token" class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">{{ tr('Verifikasi Dokumen', 'Document Verification') }}</h2>
              <img :src="verificationQrUrl" alt="QR verifikasi dokumen" class="w-40 h-40 border rounded-xl" />
              <div class="mt-2 text-xs text-gray-500 break-all">{{ verificationUrl }}</div>
            </div>
          </div>

          <div class="lg:col-span-2">
            <div class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">{{ tr('Riwayat Aktivitas', 'Activity History') }}</h2>

              <div v-if="document.history && document.history.length > 0" class="space-y-3">
                <div
                  v-for="(item, index) in document.history"
                  :key="item.id"
                  class="flex gap-3 pb-3"
                  :class="{ 'border-b border-gray-200': index < document.history.length - 1 }"
                >
                  <div class="flex-shrink-0">
                    <Icon :name="historyIcon(item.action)" size="24" :class="historyColor(item.action)" />
                  </div>
                  <div class="flex-1">
                    <div class="font-medium text-gray-900">{{ item.performer_name }}</div>
                    <div class="flex flex-wrap items-center gap-2">
                      <div class="text-sm text-gray-600">{{ actionLabel(item.action) }}</div>
                      <button
                        v-if="item.action === 'rejected' && item.rejected_file_id"
                        type="button"
                        @click="openRejectedFile(item)"
                        class="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Icon name="mdi:file-eye-outline" size="14" />
                        {{ tr('Lihat Dokumen', 'View Document') }}
                      </button>
                    </div>
                    <div v-if="item.notes" class="text-sm text-gray-500 mt-1">{{ item.notes }}</div>
                    <div class="text-xs text-gray-400 mt-1">{{ formatDateTime(item.created_at) }}</div>
                  </div>
                </div>
              </div>

              <div v-else class="text-center text-gray-500 py-4">{{ tr('Belum ada riwayat.', 'No history yet.') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import { downloadPdf } from '~/utils/pdf-signature'
import type { ApprovalDocument } from '~/models/approval-document'
import {
  fetchApprovalDocument,
  submitApprovalDocument,
  approveDocument,
  rejectDocument,
  createDocumentRevision,
} from '~/services/approvalDocuments'

const { tr, localeTag } = useAppLocale()
const route = useRoute()
const router = useRouter()
const auth = useAuth()
auth.loadFromStorage()

const documentId = computed(() => Number(route.params.id))

const loading = ref(false)
const error = ref<string | null>(null)
const document = ref<ApprovalDocument | null>(null)
const processingAction = ref(false)

const signatureEditorRef = ref<any>(null)
const signatureData = ref<string>('')
const hasPlacedSignatures = ref(false)
const approvalNotes = ref<string>('')
const notifyPreference = ref<'final' | 'all' | 'none'>('none')
const user = ref<any>(null)
const revisionFile = ref<File | null>(null)

const isCreator = computed(() => document.value?.created_by === user.value?.id)

const progressWidth = computed(() => {
  const current = Number(document.value?.current_level || 0)
  const total = Number(document.value?.total_levels || 1)
  if (total <= 0) return '0%'
  const value = Math.min(100, Math.max(0, (current / total) * 100))
  return `${value}%`
})

const canApprove = computed(() => {
  if (!document.value || document.value.status !== 'pending') return false
  const userId = Number(user.value?.id)
  const userRoleIds = (user.value?.role_ids || []).map((roleId: number | string) => Number(roleId))
  const workflows = document.value.workflows || []
  const currentLevel = Number(document.value.current_level)

  const myWorkflow = workflows.find((w: any) => {
    if (Number(w.level) !== currentLevel || w.status !== 'pending') return false
    if (Number(w.approver_id) === userId) return true

    const roleId = Number(w.approver_role_id)
    const isRolePlaceholder = Boolean(roleId && userRoleIds.includes(roleId) && (w.approver_id == null || Number(w.approver_id) === 0))
    if (!isRolePlaceholder) return false

    const alreadyProcessedByUser = workflows.some((processed: any) =>
      Number(processed.level) === currentLevel
      && Number(processed.approver_id) === userId
      && Number(processed.approver_role_id) === roleId
      && ['approved', 'rejected'].includes(processed.status),
    )

    return !alreadyProcessedByUser
  })
  return Boolean(myWorkflow)
})

const groupedWorkflows = computed(() => {
  if (!document.value?.workflows) return {}

  const grouped: Record<number, any[]> = {}
  document.value.workflows.forEach((workflow) => {
    if (!grouped[workflow.level]) grouped[workflow.level] = []
    grouped[workflow.level].push(workflow)
  })

  return grouped
})

const verificationUrl = computed(() => {
  if (!document.value?.verification_token || !import.meta.client) return ''
  return `${window.location.origin}/verify-document/${document.value.verification_token}`
})

const verificationQrUrl = computed(() => {
  if (!verificationUrl.value) return ''
  return `https://quickchart.io/qr?size=240&margin=2&text=${encodeURIComponent(verificationUrl.value)}`
})

onMounted(async () => {
  await loadCurrentUser()
  await loadDocument()
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

async function exportPdf() {
  if (!document.value) return

  try {
    const response = await fetch(`/api/approval-documents/${document.value.id}/download`, {
      headers: auth.authHeaders(),
    })
    if (!response.ok) throw new Error(tr('Gagal mengunduh PDF', 'Failed to download PDF'))
    const arrayBuffer = await response.arrayBuffer()
    const pdfBytes = new Uint8Array(arrayBuffer)
    const filename = document.value.file_name || 'document.pdf'
    downloadPdf(pdfBytes, filename)
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.message || tr('Gagal mengunduh PDF.', 'Failed to download PDF.') })
  }
}

async function loadDocument() {
  loading.value = true
  error.value = null
  try {
    document.value = await fetchApprovalDocument(documentId.value, auth.authHeaders())
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || tr('Gagal memuat dokumen.', 'Failed to load document.')
  } finally {
    loading.value = false
  }
}

function handleEditorSignatureChanged(signatures: any[]) {
  hasPlacedSignatures.value = signatures.length > 0
  signatureData.value = signatures.length > 0 ? signatures[0].imageData : ''
}

async function handleSubmit() {
  const result = await Swal.fire({
    title: tr('Kirim dokumen?', 'Send document?'),
    text: tr('Dokumen akan dikirim ke approver level 1.', 'The document will be sent to level 1 approver.'),
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: tr('Ya, kirim', 'Yes, send'),
    cancelButtonText: tr('Batal', 'Cancel'),
  })

  if (!result.isConfirmed) return

  processingAction.value = true
  try {
    await submitApprovalDocument(documentId.value, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Dokumen dikirim', 'Document sent'), timer: 1200, showConfirmButton: false })
    await loadDocument()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal mengirim dokumen.', 'Failed to send document.') })
  } finally {
    processingAction.value = false
  }
}

async function handleApprove() {
  if (!hasPlacedSignatures.value) {
    await Swal.fire({ icon: 'error', title: tr('Tanda tangan belum ada', 'Signature not found'), text: tr('Letakkan tanda tangan di dokumen terlebih dahulu.', 'Place your signature on the document first.') })
    return
  }

  const sigData = signatureEditorRef.value?.getSignatureData?.() || signatureData.value
  if (!sigData) {
    await Swal.fire({ icon: 'error', title: tr('Tanda tangan belum ada', 'Signature not found'), text: tr('Letakkan tanda tangan di dokumen terlebih dahulu.', 'Place your signature on the document first.') })
    return
  }

  const result = await Swal.fire({
    title: tr('Setujui dokumen?', 'Approve document?'),
    text: tr('Dokumen akan ditandatangani dan diteruskan ke workflow berikutnya.', 'The document will be signed and forwarded to the next workflow.'),
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: tr('Ya, setujui', 'Yes, approve'),
    cancelButtonText: tr('Batal', 'Cancel'),
  })

  if (!result.isConfirmed) return

  processingAction.value = true
  try {
    const signedBytes: Uint8Array | undefined = await signatureEditorRef.value?.buildSignedPdfBytes?.()
    if (!signedBytes) throw new Error(tr('Gagal membuat PDF bertanda tangan', 'Failed to create signed PDF'))

    const needsCopy = typeof SharedArrayBuffer !== 'undefined' && signedBytes.buffer instanceof SharedArrayBuffer
    const buffer: ArrayBuffer = needsCopy ? signedBytes.slice().buffer : (signedBytes.buffer as ArrayBuffer)
    const fileBlob = new Blob([buffer], { type: 'application/pdf' })

    const formData = new FormData()
    formData.append('file', fileBlob)
    formData.append('file_name', document.value?.file_name || 'signed-document.pdf')
    formData.append('signature_data', sigData)
    formData.append('notes', approvalNotes.value || '')
    formData.append('notify_self', notifyPreference.value)

    await approveDocument(documentId.value, formData, auth.authHeaders())

    await Swal.fire({ icon: 'success', title: tr('Dokumen disetujui', 'Document approved'), timer: 1200, showConfirmButton: false })
    router.push('/user/approval-document')
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || e?.message || tr('Gagal menyetujui dokumen.', 'Failed to approve document.') })
  } finally {
    processingAction.value = false
  }
}

async function handleReject() {
  const { value: reason } = await Swal.fire({
    title: tr('Tolak Dokumen', 'Reject Document'),
    input: 'textarea',
    inputLabel: tr('Alasan penolakan', 'Rejection reason'),
    inputPlaceholder: tr('Tuliskan alasan penolakan...', 'Write the rejection reason...'),
    showCancelButton: true,
    confirmButtonText: tr('Tolak', 'Reject'),
    cancelButtonText: tr('Batal', 'Cancel'),
    inputValidator: (value) => {
      if (!value) return tr('Alasan penolakan wajib diisi', 'Rejection reason is required')
      return null
    },
  })

  if (!reason) return

  processingAction.value = true
  try {
    await rejectDocument(
      documentId.value,
      { rejection_reason: reason },
      auth.authHeaders(),
    )

    await Swal.fire({ icon: 'success', title: tr('Dokumen ditolak', 'Document rejected'), timer: 1200, showConfirmButton: false })
    router.push('/user/approval-document')
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal menolak dokumen.', 'Failed to reject document.') })
  } finally {
    processingAction.value = false
  }
}

function handleRevisionFile(event: Event) {
  const input = event.target as HTMLInputElement
  revisionFile.value = input.files?.[0] || null
}

async function handleRevisionUpload() {
  if (!document.value || !revisionFile.value) return
  if (revisionFile.value.type !== 'application/pdf') {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('File harus PDF.', 'File must be a PDF.') })
    return
  }

  processingAction.value = true
  try {
    const formData = new FormData()
    formData.append('title', document.value.title)
    formData.append('description', document.value.description || '')
    formData.append('file_name', revisionFile.value.name)
    formData.append('file_data', revisionFile.value)
    await createDocumentRevision(document.value.id, formData, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Revisi diupload', 'Revision uploaded'), timer: 1200, showConfirmButton: false })
    revisionFile.value = null
    await loadDocument()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal upload revisi.', 'Failed to upload revision.') })
  } finally {
    processingAction.value = false
  }
}

function openRejectedFile(item: any) {
  if (!document.value || !item.rejected_file_id || !import.meta.client) return
  window.open(`/api/approval-documents/${document.value.id}/rejected-files/${item.rejected_file_id}`, '_blank', 'noopener,noreferrer')
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(localeTag.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(localeTag.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function workflowIcon(status: string) {
  const icons: Record<string, string> = {
    pending: 'mdi:clock-outline',
    approved: 'mdi:check-circle',
    rejected: 'mdi:close-circle',
    skipped: 'mdi:skip-next',
  }
  return icons[status] || 'mdi:circle-outline'
}

function workflowColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'text-yellow-600',
    approved: 'text-emerald-600',
    rejected: 'text-red-600',
    skipped: 'text-gray-600',
  }
  return colors[status] || 'text-gray-600'
}

function historyIcon(action: string) {
  const icons: Record<string, string> = {
    created: 'mdi:file-document-plus',
    submitted: 'mdi:send',
    approved: 'mdi:check-circle',
    rejected: 'mdi:close-circle',
    signed: 'mdi:draw',
  }
  return icons[action] || 'mdi:circle'
}

function historyColor(action: string) {
  const colors: Record<string, string> = {
    created: 'text-indigo-600',
    submitted: 'text-sky-600',
    approved: 'text-emerald-600',
    rejected: 'text-red-600',
    signed: 'text-purple-600',
  }
  return colors[action] || 'text-gray-600'
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    created: tr('Membuat dokumen', 'Created document'),
    submitted: tr('Mengirim untuk persetujuan', 'Submitted for approval'),
    approved: tr('Menyetujui dan menandatangani', 'Approved and signed'),
    rejected: tr('Menolak dokumen', 'Rejected document'),
    signed: tr('Menambahkan tanda tangan', 'Added signature'),
    revised: tr('Mengupload revisi', 'Uploaded revision'),
  }
  return labels[action] || action
}
</script>
