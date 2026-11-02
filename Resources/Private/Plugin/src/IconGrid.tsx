import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { IconItem } from './types'

/**
 * The icon grid: a plain windowed list, no virtualization library.
 *
 * A Font Awesome folder holds ~4.700 icons, so only the rows in view (plus a
 * little overscan) are mounted - the rest is a spacer of the right height.
 * The classic-UI editor used react-window for this; doing it by hand keeps the
 * plugin bundle to the shell's own React and lets the column count follow the
 * available width instead of being fixed at five.
 *
 * Keyboard focus stays on the search field; `activeIndex` is the roving
 * selection the arrow keys move, exposed to assistive technology through
 * aria-activedescendant on the input. Hovering deliberately does NOT move it -
 * otherwise the grid would scroll itself out from under the pointer.
 */

/**
 * The shell's root font size: the reader's default, so the cells grow with the
 * text in them. Read once - browsers apply a changed default on reload.
 */
const ROOT_FONT_SIZE =
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

/** Minimum cell width; the column count is whatever fits at that size. */
const CELL_MIN_WIDTH = 5.375 * ROOT_FONT_SIZE
/** .mrise-grid-row's height in plugin.css. */
const ROW_HEIGHT = 5.375 * ROOT_FONT_SIZE
const OVERSCAN_ROWS = 3

export interface IconGridProps {
  icons: IconItem[]
  /** The stored value's resourceUri, marked as selected. */
  selectedUri: string | null
  /** The keyboard cursor. -1 while nothing is active. */
  activeIndex: number
  /** Prefix for the option element ids referenced by aria-activedescendant. */
  optionIdPrefix: string
  /** Changing this scrolls back to the top - a new source or search term. */
  scrollResetKey: string
  /** Reports the resolved column count so the dialog's arrow keys can use it. */
  onColumnsChange: (columns: number) => void
  onSelect: (item: IconItem) => void
}

export function IconGrid({
  icons,
  selectedUri,
  activeIndex,
  optionIdPrefix,
  scrollResetKey,
  onColumnsChange,
  onSelect,
}: IconGridProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

  // Measure the scroll container; the column count follows its width.
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      setViewport({ width: box.width, height: box.height })
    })
    observer.observe(element)
    setViewport({ width: element.clientWidth, height: element.clientHeight })
    return () => observer.disconnect()
  }, [])

  const columns = Math.max(
    1,
    Math.floor((viewport.width || CELL_MIN_WIDTH) / CELL_MIN_WIDTH),
  )
  const rowCount = Math.ceil(icons.length / columns)

  useEffect(() => {
    onColumnsChange(columns)
  }, [columns, onColumnsChange])

  // A new source or search term starts at the top. Declared BEFORE the cursor
  // effect so that, when both fire in one commit, scrolling to the cursor wins.
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTop = 0
    setScrollTop(0)
  }, [scrollResetKey])

  // Keep the keyboard cursor in view, scrolling as little as possible. The new
  // offset is pushed into state right here rather than waited for from the
  // scroll event: a keyboard jump has to render the row it moved to in the
  // same commit, or the cursor points at a row that is not mounted yet.
  useEffect(() => {
    const element = scrollRef.current
    if (!element || activeIndex < 0) return
    const rowTop = Math.floor(activeIndex / columns) * ROW_HEIGHT
    const rowBottom = rowTop + ROW_HEIGHT
    if (rowTop < element.scrollTop) {
      element.scrollTop = rowTop
      setScrollTop(rowTop)
    } else if (rowBottom > element.scrollTop + element.clientHeight) {
      element.scrollTop = rowBottom - element.clientHeight
      setScrollTop(element.scrollTop)
    }
  }, [activeIndex, columns])

  const firstRow = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
  )
  const lastRow = Math.min(
    rowCount - 1,
    Math.ceil((scrollTop + (viewport.height || ROW_HEIGHT)) / ROW_HEIGHT) +
      OVERSCAN_ROWS,
  )

  const rows = []
  for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
    const from = rowIndex * columns
    rows.push(
      <div
        key={rowIndex}
        className="mrise-grid-row"
        style={{
          transform: `translateY(${rowIndex * ROW_HEIGHT}px)`,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {icons.slice(from, from + columns).map((item, offset) => {
          const index = from + offset
          return (
            <IconCell
              key={item.resourceUri}
              id={`${optionIdPrefix}-${index}`}
              item={item}
              selected={item.resourceUri === selectedUri}
              active={index === activeIndex}
              onSelect={onSelect}
            />
          )
        })}
      </div>,
    )
  }

  return (
    <div
      ref={scrollRef}
      className="mrise-grid-scroll"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      role="listbox"
      tabIndex={-1}
    >
      <div
        className="mrise-grid-canvas"
        style={{ height: rowCount * ROW_HEIGHT }}
      >
        {rows}
      </div>
    </div>
  )
}

function IconCell({
  id,
  item,
  selected,
  active,
  onSelect,
}: {
  id: string
  item: IconItem
  selected: boolean
  active: boolean
  onSelect: (item: IconItem) => void
}) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={selected}
      title={item.label}
      className="mrise-cell"
      data-selected={selected || undefined}
      data-active={active || undefined}
      // The grid is driven from the search field; cells must not steal focus.
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(item)}
    >
      {/*
        The markup comes from SVG files inside the site package, delivered by
        the data source - the same trusted-by-construction inlining the
        classic-UI editor did.
      */}
      <span
        className="mrise-cell-icon"
        dangerouslySetInnerHTML={{ __html: item.icon }}
      />
      <span className="mrise-cell-label">{item.label}</span>
    </button>
  )
}
