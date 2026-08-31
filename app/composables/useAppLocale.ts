export type AppLocale = 'id' | 'en'

const LOCALE_STORAGE_KEY = 'paroki.locale'

function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null
  const lower = value.toLowerCase()
  if (lower.startsWith('id')) return 'id'
  if (lower.startsWith('en')) return 'en'
  return null
}

export function useAppLocale() {
  const locale = useState<AppLocale>('app-locale', () => 'id')
  const initialized = useState<boolean>('app-locale-initialized', () => false)

  const localeTag = computed(() => (locale.value === 'id' ? 'id-ID' : 'en-US'))
  const calendarLocale = computed(() => (locale.value === 'id' ? 'id' : 'en'))

  function syncDocumentLang(next: AppLocale) {
    if (!import.meta.client) return
    document.documentElement.lang = next
  }

  function setLocale(next: AppLocale) {
    locale.value = next
    if (import.meta.client) {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    }
    syncDocumentLang(next)
  }

  function toggleLocale() {
    setLocale(locale.value === 'id' ? 'en' : 'id')
  }

  function initLocale() {
    if (initialized.value) return
    initialized.value = true

    if (!import.meta.client) return

    const fromStorage = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
    const fromBrowser = normalizeLocale(navigator.language)
    const next = fromStorage ?? fromBrowser ?? 'id'

    locale.value = next
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
    syncDocumentLang(next)
  }

  function tr(idText: string, enText: string) {
    return locale.value === 'id' ? idText : enText
  }

  function toDate(value: Date | string | number) {
    if (value instanceof Date) return value
    return new Date(value)
  }

  function formatDate(
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' },
  ) {
    const date = toDate(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString(localeTag.value, options)
  }

  function formatDateTime(
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  ) {
    const date = toDate(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString(localeTag.value, options)
  }

  function formatTime(
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
  ) {
    const date = toDate(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleTimeString(localeTag.value, options)
  }

  initLocale()

  return {
    locale,
    localeTag,
    calendarLocale,
    setLocale,
    toggleLocale,
    tr,
    formatDate,
    formatDateTime,
    formatTime,
  }
}
