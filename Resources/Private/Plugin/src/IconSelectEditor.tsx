import { addressKey } from './studio'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropertyEditorProps } from '@medienreaktor/neos-studio'
import { IconPickerDialog } from './IconPickerDialog'
import { t, useI18nReady } from './i18n'
import { isIconSourceLoaded, loadIconSource } from './iconSources'
import { cacheIcon, getCachedIcon, rememberIcon } from './storage'
import {
  asIconValue,
  readIconSources,
  type IconItem,
  type IconValue,
} from './types'

/**
 * The icon select editor for Neos Studio - a drop-in port of the classic-UI
 * Medienreaktor.IconSelectEditor. It registers under the SAME editor id, reads
 * the SAME `editorOptions.iconSources`, talks to the SAME data source and
 * stores the SAME value ({resourceUri, sourceName, label}, and `[]` when
 * cleared), so node type configuration written for the classic UI works here
 * unchanged and both editors can coexist on one installation.
 *
 * What is new is on this side of the wire:
 *  - the field previews the icon it holds, not just its name
 *  - picking happens in a wide modal with search across the source, keyboard
 *    navigation and a recently-used strip (see IconPickerDialog)
 *  - icons are fetched per source, on demand, instead of every configured
 *    source up front (see iconSources.ts) - the inspector no longer pulls tens
 *    of megabytes of inlined SVG just to render a label
 */
export function IconSelectEditor({
  value,
  options,
  onCommit,
  onChange,
  autoFocus,
  invalid,
  nodeAddress,
}: PropertyEditorProps) {
  useI18nReady()

  const sources = useMemo(() => readIconSources(options), [options])
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  // Seeded from the stored value; the host remounts the editor when the edited
  // subject changes, which resets it.
  const [selected, setSelected] = useState<IconValue | null>(() =>
    asIconValue(value),
  )
  const [preview, setPreview] = useState<IconItem | null>(() =>
    getCachedIcon(asIconValue(value)?.resourceUri),
  )
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (autoFocus) triggerRef.current?.focus()
  }, [autoFocus])

  /**
   * Resolve the preview for the stored value - from the local icon cache, or
   * from its source if that is already in memory. Never from a fresh request:
   * a source can be 18 MB of inlined SVG, and merely inspecting a node is no
   * reason to pull it. Opening the picker once caches the icon for good.
   */
  useEffect(() => {
    if (selected === null) {
      setPreview(null)
      return
    }
    if (preview?.resourceUri === selected.resourceUri) return

    const cached = getCachedIcon(selected.resourceUri)
    if (cached) {
      setPreview(cached)
      return
    }

    const source = sources.find(
      (candidate) => candidate.name === selected.sourceName,
    )
    if (!source || !isIconSourceLoaded(source)) {
      setPreview(null)
      return
    }

    let cancelled = false
    loadIconSource(source, nodeAddress)
      .then((icons) => {
        const hit = icons.find(
          (icon) => icon.resourceUri === selected.resourceUri,
        )
        if (!hit || cancelled) return
        cacheIcon(hit)
        setPreview(hit)
      })
      .catch(() => {
        /* no preview is a cosmetic loss, not an error worth showing */
      })

    return () => {
      cancelled = true
    }
  }, [selected, sources, addressKey(nodeAddress)])

  const select = (item: IconItem) => {
    const next: IconValue = {
      resourceUri: item.resourceUri,
      sourceName: item.sourceName,
      label: item.label,
    }
    setSelected(next)
    setPreview(item)
    rememberIcon(item)
    onChange?.(next)
    onCommit(next)
  }

  const clear = () => {
    setSelected(null)
    setPreview(null)
    // The classic editor commits an empty array to unset the property; the
    // property is declared as `array`, so this is what the CR expects.
    onChange?.([])
    onCommit([])
    triggerRef.current?.focus()
  }

  const close = () => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  if (!sources.length) {
    return (
      <div className="mrise-notice">
        {t(
          'error.noSources',
          'No icon sources are configured. Set editorOptions.iconSources in the node type definition.',
        )}
      </div>
    )
  }

  const initialSourceIndex = selected
    ? sources.findIndex((candidate) => candidate.name === selected.sourceName)
    : -1

  return (
    <div className="mrise-field">
      <button
        ref={triggerRef}
        type="button"
        className="mrise-trigger"
        aria-haspopup="dialog"
        aria-invalid={invalid || undefined}
        title={
          selected
            ? `${selected.label} · ${selected.sourceName}`
            : t('editor.open', 'Choose an icon')
        }
        onClick={() => setIsOpen(true)}
      >
        <span className="mrise-trigger-preview" aria-hidden>
          {preview ? (
            <span
              className="mrise-cell-icon"
              dangerouslySetInnerHTML={{ __html: preview.icon }}
            />
          ) : (
            <i
              className={`fas ${selected ? 'fa-image' : 'fa-plus'} mrise-trigger-placeholder`}
            />
          )}
        </span>
        <span className="mrise-trigger-text">
          {selected ? (
            selected.label
          ) : (
            <span className="mrise-muted">
              {t('editor.placeholder', 'Select icon')}
            </span>
          )}
        </span>
        {selected && selected.sourceName !== '' && sources.length > 1 && (
          <span className="mrise-badge">{selected.sourceName}</span>
        )}
      </button>
      {selected && (
        <button
          type="button"
          className="mrise-icon-button"
          title={t('editor.remove', 'Remove icon')}
          aria-label={t('editor.remove', 'Remove icon')}
          onClick={clear}
        >
          <i className="fas fa-xmark" aria-hidden />
        </button>
      )}

      {isOpen && (
        <IconPickerDialog
          sources={sources}
          selectedUri={selected?.resourceUri ?? null}
          initialSourceIndex={initialSourceIndex}
          nodeAddress={nodeAddress}
          onSelect={select}
          onClose={close}
        />
      )}
    </div>
  )
}
