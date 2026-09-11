import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { IconGrid } from './IconGrid'
import { t, useI18nReady } from './i18n'
import { useIconSource } from './iconSources'
import { cacheIcon, getRecentIcons } from './storage'
import type { IconItem, IconSourceConfig } from './types'

/**
 * The picker: a modal over the whole shell rather than a dropdown inside the
 * inspector column. With thousands of icons per source, width is the scarce
 * resource - a 4xl dialog fits three times as many icons per row as the
 * sidebar did, which is the difference between scanning and scrolling.
 *
 * It is deliberately hand-rolled instead of reusing the shell's Base UI
 * dialog: plugins get React and the registries from the shell, not its
 * component library. Everything a dialog owes the user is here - backdrop
 * dismissal, Escape, a focus trap, focus restoration (the editor's job),
 * labelled title, and a full keyboard path through the grid.
 */

/** Above the shell's own dialogs (z-200), so it also works over the creation dialog. */
const DIALOG_Z_INDEX = 250

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])'

export interface IconPickerDialogProps {
  sources: IconSourceConfig[]
  /** The stored value's resourceUri, or null. */
  selectedUri: string | null
  /** Which source to open on - the stored value's, if it is still configured. */
  initialSourceIndex: number
  nodeAddress?: string
  onSelect: (item: IconItem) => void
  onClose: () => void
}

export function IconPickerDialog({
  sources,
  selectedUri,
  initialSourceIndex,
  nodeAddress,
  onSelect,
  onClose,
}: IconPickerDialogProps) {
  useI18nReady()

  const panelRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const titleId = useId()
  const optionIdPrefix = useId()

  const [sourceIndex, setSourceIndex] = useState(() =>
    initialSourceIndex >= 0 && initialSourceIndex < sources.length
      ? initialSourceIndex
      : 0,
  )
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [columns, setColumns] = useState(1)

  // Filtering thousands of icons per keystroke stays off the input's critical
  // path; the field itself always renders what was typed.
  const deferredSearch = useDeferredValue(search)

  const source = sources[sourceIndex] ?? null
  const { icons, isLoading, error, retry } = useIconSource(source, nodeAddress)

  const items = useMemo(
    () => filterIcons(icons, deferredSearch),
    [icons, deferredSearch],
  )

  const recents = useMemo(
    () =>
      getRecentIcons().filter(
        (item) =>
          item.resourceUri !== selectedUri &&
          sources.some((candidate) => candidate.name === item.sourceName),
      ),
    // Recomputed when the dialog opens; localStorage does not change under us.
    [],
  )

  // Once a source is loaded, keep the stored value's markup around so the
  // inspector can preview it without loading the whole source again.
  useEffect(() => {
    if (!selectedUri) return
    const stored = icons.find((item) => item.resourceUri === selectedUri)
    if (stored) cacheIcon(stored)
  }, [icons, selectedUri])

  // Open on the stored icon: it is both the most likely starting point and the
  // answer to "which one is set again?". While searching the cursor belongs on
  // the first hit instead - that is the one Enter should take.
  useEffect(() => {
    if (!items.length) {
      setActiveIndex(-1)
      return
    }
    const storedIndex =
      selectedUri && deferredSearch.trim() === ''
        ? items.findIndex((item) => item.resourceUri === selectedUri)
        : -1
    setActiveIndex(storedIndex >= 0 ? storedIndex : 0)
  }, [items, selectedUri, deferredSearch])

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  /**
   * Escape is taken in the capture phase on `window` - the outermost node - so
   * it never reaches a shell dialog underneath (the creation dialog hosts this
   * editor too, and both closing at once would lose the user's draft).
   */
  useEffect(() => {
    const onKeyDownCapture = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDownCapture, true)
    return () => window.removeEventListener('keydown', onKeyDownCapture, true)
  }, [onClose])

  const commit = useCallback(
    (item: IconItem) => {
      onSelect(item)
      onClose()
    },
    [onSelect, onClose],
  )

  /** Arrow keys, Home/End and PageUp/Down move the cursor; Enter picks. */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      trapFocus(event, panelRef.current)
      return
    }

    if (event.key === 'Enter') {
      const item = items[activeIndex]
      if (item) {
        event.preventDefault()
        commit(item)
      }
      return
    }

    if (!items.length) return

    const rows = Math.ceil(items.length / columns)
    const page = Math.max(1, rows - 1) * columns
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
      PageDown: page,
      PageUp: -page,
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : items.length - 1)
      return
    }

    const delta = moves[event.key]
    if (delta === undefined) return
    event.preventDefault()
    setActiveIndex((current) => {
      const next = (current < 0 ? 0 : current) + delta
      return next < 0 || next >= items.length ? current : next
    })
  }

  const activeId =
    activeIndex >= 0 ? `${optionIdPrefix}-${activeIndex}` : undefined

  // The footer line: how many icons are on offer, and out of which source.
  // No count while the source is still loading or failed to load.
  const count =
    isLoading || error !== null
      ? ''
      : deferredSearch.trim() !== ''
        ? t('count.filtered', '{0} of {1} icons', [items.length, icons.length])
        : items.length === 1
          ? t('count.one', '1 icon')
          : t('count.many', '{0} icons', [items.length])
  const status = [count, source ? source.name || source.path : '']
    .filter(Boolean)
    .join(' · ')

  return createPortal(
    <div className="mrise-dialog-root" style={{ zIndex: DIALOG_Z_INDEX }}>
      <div className="mrise-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        className="mrise-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <div className="mrise-panel-head">
          <h2 id={titleId} className="mrise-title">
            {t('dialog.title', 'Select icon')}
          </h2>
          <button
            type="button"
            className="mrise-icon-button"
            title={t('dialog.close', 'Close')}
            aria-label={t('dialog.close', 'Close')}
            onClick={onClose}
          >
            <i className="fas fa-xmark" aria-hidden />
          </button>
        </div>

        <div className="mrise-search">
          <i
            className="fas fa-magnifying-glass mrise-search-icon"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="text"
            className="mrise-search-input"
            value={search}
            placeholder={t('search.placeholder', 'Search icons …')}
            aria-label={t('search.placeholder', 'Search icons …')}
            role="combobox"
            aria-expanded
            aria-controls={optionIdPrefix}
            aria-activedescendant={activeId}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search !== '' && (
            <button
              type="button"
              className="mrise-icon-button mrise-search-clear"
              title={t('search.clear', 'Clear search')}
              aria-label={t('search.clear', 'Clear search')}
              onClick={() => {
                setSearch('')
                searchRef.current?.focus()
              }}
            >
              <i className="fas fa-xmark" aria-hidden />
            </button>
          )}
        </div>

        {sources.length > 1 && (
          <div className="mrise-tabs" role="tablist">
            {sources.map((candidate, index) => (
              <button
                key={`${candidate.name}-${candidate.path}`}
                type="button"
                role="tab"
                aria-selected={index === sourceIndex}
                className="mrise-tab"
                data-selected={index === sourceIndex || undefined}
                onClick={() => {
                  setSourceIndex(index)
                  setSearch('')
                  searchRef.current?.focus()
                }}
              >
                {candidate.name || candidate.path}
              </button>
            ))}
          </div>
        )}

        {recents.length > 0 && deferredSearch.trim() === '' && (
          <div className="mrise-recents">
            <span className="mrise-recents-label">
              {t('recent.label', 'Recently used')}
            </span>
            <div className="mrise-recents-items">
              {recents.map((item) => (
                <button
                  key={item.resourceUri}
                  type="button"
                  className="mrise-recent"
                  title={`${item.label} · ${item.sourceName}`}
                  onClick={() => commit(item)}
                >
                  <span
                    className="mrise-cell-icon"
                    dangerouslySetInnerHTML={{ __html: item.icon }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mrise-body" id={optionIdPrefix}>
          {isLoading ? (
            <Status
              icon="fa-circle-notch fa-spin"
              title={t('loading', 'Loading icons …')}
              hint={t('loading.hint', 'Large icon sets can take a moment.')}
            />
          ) : error !== null ? (
            <Status
              icon="fa-triangle-exclamation"
              title={t('error.loadFailed', 'The icons could not be loaded.')}
              hint={error}
            >
              <button type="button" className="mrise-button" onClick={retry}>
                {t('error.retry', 'Try again')}
              </button>
            </Status>
          ) : items.length === 0 ? (
            <Status
              icon="fa-magnifying-glass"
              title={
                deferredSearch.trim() === ''
                  ? t('empty.noIcons', 'This source contains no icons.')
                  : t('empty.noMatch', 'No icon matches “{0}”.', [
                      deferredSearch.trim(),
                    ])
              }
            />
          ) : (
            <IconGrid
              icons={items}
              selectedUri={selectedUri}
              activeIndex={activeIndex}
              optionIdPrefix={optionIdPrefix}
              scrollResetKey={`${sourceIndex}:${deferredSearch}`}
              onColumnsChange={setColumns}
              onSelect={commit}
            />
          )}
        </div>

        <div className="mrise-panel-foot">
          <span>{status}</span>
          <span className="mrise-hint">
            {t('hint.keyboard', 'Arrow keys to navigate, Enter to select')}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Loading / error / empty all look the same: an icon, a line, an optional hint. */
function Status({
  icon,
  title,
  hint,
  children,
}: {
  icon: string
  title: string
  hint?: string
  children?: ReactNode
}) {
  return (
    <div className="mrise-status">
      <i className={`fas ${icon} mrise-status-icon`} aria-hidden />
      <p className="mrise-status-title">{title}</p>
      {hint && <p className="mrise-status-hint">{hint}</p>}
      {children}
    </div>
  )
}

/**
 * Match every whitespace-separated term against the label, so "right arrow"
 * finds "Arrow Right"; prefix matches come first, which puts "Car" above
 * "Battery Car" when searching for "car".
 */
function filterIcons(icons: IconItem[], search: string): IconItem[] {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return icons

  const prefixed: IconItem[] = []
  const rest: IconItem[] = []
  for (const item of icons) {
    const label = item.label.toLowerCase()
    if (!terms.every((term) => label.includes(term))) continue
    ;(label.startsWith(terms[0]) ? prefixed : rest).push(item)
  }
  return prefixed.concat(rest)
}

/** Keep Tab inside the dialog. */
function trapFocus(event: ReactKeyboardEvent, panel: HTMLElement | null): void {
  if (!panel) return
  const focusable = Array.from(
    panel.querySelectorAll<HTMLElement>(FOCUSABLE),
  ).filter((element) => element.offsetParent !== null)
  if (!focusable.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const current = document.activeElement

  if (event.shiftKey && (current === first || !panel.contains(current))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && current === last) {
    event.preventDefault()
    first.focus()
  }
}
