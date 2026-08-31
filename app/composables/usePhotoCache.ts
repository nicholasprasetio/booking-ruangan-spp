/**
 * Module-level singleton cache that maps photo IDs to blob: URLs.
 *
 * Benefit: photos uploaded in the current session are displayed immediately
 * from memory (no worker round-trip). Existing photos still hit the browser's
 * HTTP cache after the first request (the server returns Cache-Control: public,
 * max-age=3600 for /api/rooms/photos/[id]).
 */

interface CachedPhoto {
  blobUrl: string
  /** Whether the blob was created locally (needs revoking on eviction) */
  owned: boolean
}

const store = new Map<number, CachedPhoto>()

export function usePhotoCache() {
  /**
   * Store a locally-created blob: URL for a freshly uploaded photo.
   * Call this immediately after registration returns the new photo ID.
   */
  function prime(photoId: number, blobUrl: string) {
    // If there's already an owned blob URL for this ID, revoke it first
    const existing = store.get(photoId)
    if (existing?.owned && existing.blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(existing.blobUrl)
    }
    store.set(photoId, { blobUrl, owned: true })
  }

  /**
   * Return the cached blob URL if available, otherwise the original API URL.
   * Transparent drop-in for `photo.url`.
   */
  function resolve(photo: { id: number; url: string }): string {
    return store.get(photo.id)?.blobUrl ?? photo.url
  }

  /**
   * Remove a photo from cache (e.g. after deletion).
   * Revokes blob: URLs to free memory.
   */
  function evict(photoId: number) {
    const cached = store.get(photoId)
    if (cached?.owned && cached.blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cached.blobUrl)
    }
    store.delete(photoId)
  }

  return { prime, resolve, evict }
}
