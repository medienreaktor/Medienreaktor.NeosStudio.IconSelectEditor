import type { IconItem } from './types'

/**
 * Two small localStorage stores, both purely cosmetic - losing them costs
 * nothing but a little convenience, so every access is best-effort.
 *
 *  - the **icon cache** keeps the SVG markup of icons the user has actually
 *    picked. The icon files live under Resources/Private and are only ever
 *    reachable through the data source, so without it a saved value cannot be
 *    previewed without pulling its whole (possibly 18 MB) source folder. With
 *    it, the inspector paints the right icon immediately.
 *  - the **recents** list is the last handful of picks, in most-recent-first
 *    order. With thousands of Font Awesome icons per folder, "the five I keep
 *    using" is the single most useful shortcut the picker can offer.
 *
 * Both are keyed by resourceUri and shared across all icon properties and node
 * types, which is what makes recents useful in the first place.
 */

const CACHE_KEY = 'medienreaktor.neos-studio.icon-select.cache.v1'
const RECENT_KEY = 'medienreaktor.neos-studio.icon-select.recent.v1'

/** Enough to cover the icons in use on a site without bloating localStorage. */
const CACHE_LIMIT = 50
const RECENT_LIMIT = 12

/** Short keys: these entries carry SVG markup and are written often. */
interface CacheEntry {
  /** sourceName */
  s: string
  /** label */
  l: string
  /** inline SVG markup */
  i: string
  /** last touched, for LRU eviction */
  t: number
}

type CacheStore = Record<string, CacheEntry>

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return parsed === null || typeof parsed !== 'object'
      ? fallback
      : (parsed as T)
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // A full or unavailable localStorage just means no cache this session.
  }
}

function readCache(): CacheStore {
  return readJson<CacheStore>(CACHE_KEY, {})
}

function readRecent(): string[] {
  const stored = readJson<unknown>(RECENT_KEY, [])
  return Array.isArray(stored)
    ? stored.filter((uri): uri is string => typeof uri === 'string')
    : []
}

/** Rebuild an IconItem from a cache entry. */
function toItem(resourceUri: string, entry: CacheEntry): IconItem {
  return { resourceUri, sourceName: entry.s, label: entry.l, icon: entry.i }
}

/** The cached markup for a stored value, or null. */
export function getCachedIcon(
  resourceUri: string | null | undefined,
): IconItem | null {
  if (!resourceUri) return null
  const entry = readCache()[resourceUri]
  return entry && typeof entry.i === 'string'
    ? toItem(resourceUri, entry)
    : null
}

/** Cache an icon's markup without touching the recents list. */
export function cacheIcon(item: IconItem): void {
  const store = readCache()
  if (store[item.resourceUri]?.i === item.icon) return
  store[item.resourceUri] = {
    s: item.sourceName,
    l: item.label,
    i: item.icon,
    t: Date.now(),
  }
  writeJson(CACHE_KEY, evict(store))
}

/** Drop the least recently touched entries once the cache outgrows its limit. */
function evict(store: CacheStore): CacheStore {
  const keys = Object.keys(store)
  if (keys.length <= CACHE_LIMIT) return store
  const keep = new Set(
    keys
      .sort((a, b) => (store[b]?.t ?? 0) - (store[a]?.t ?? 0))
      .slice(0, CACHE_LIMIT),
  )
  const trimmed: CacheStore = {}
  for (const key of keep) trimmed[key] = store[key]
  return trimmed
}

/** Record a pick: cache its markup and move it to the front of the recents. */
export function rememberIcon(item: IconItem): void {
  cacheIcon(item)
  const recent = [
    item.resourceUri,
    ...readRecent().filter((uri) => uri !== item.resourceUri),
  ]
  writeJson(RECENT_KEY, recent.slice(0, RECENT_LIMIT))
}

/**
 * The recents, resolved against the icon cache. Entries whose markup was
 * evicted are dropped rather than rendered blank - the list is a shortcut, not
 * a history.
 */
export function getRecentIcons(): IconItem[] {
  const store = readCache()
  return readRecent()
    .map((uri) => {
      const entry = store[uri]
      return entry && typeof entry.i === 'string' ? toItem(uri, entry) : null
    })
    .filter((item): item is IconItem => item !== null)
}
