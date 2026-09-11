/**
 * The contract with the PHP side, unchanged from the classic-UI editor.
 *
 * `IconSourceConfig` is what node type configuration declares under
 * `editorOptions.iconSources`; `IconItem` is one entry of what the
 * `medienreaktor-iconselecteditor-icon-sources` data source returns for it;
 * `IconValue` is what gets stored on the node. All three are load-bearing for
 * drop-in compatibility - do not "improve" their shape.
 */

/** One configured icon folder. */
export interface IconSourceConfig {
  /** Display name, also what is stored as `sourceName`. */
  name: string
  /** "Package.Key/Private/Icons/Folder", relative to the package's Resources. */
  path: string
}

/** One icon as delivered by the data source. */
export interface IconItem {
  /** Humanized file name, e.g. "Arrow Right". */
  label: string
  /** The name of the source it came from. */
  sourceName: string
  /** The raw SVG markup, inlined by the data source (the files are private). */
  icon: string
  /** "resource://Package.Key/Private/Icons/Folder/arrow-right.svg" */
  resourceUri: string
}

/** What the editor commits, and what the node stores. */
export interface IconValue {
  resourceUri: string
  sourceName: string
  label: string
}

/** The raw data source payload for a single-source request. */
export interface IconSourcesResponse {
  iconSources?: IconItem[][]
  iconSourceNames?: string[]
}

/** Narrow an unknown property value to a stored icon. */
export function asIconValue(value: unknown): IconValue | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const candidate = value as Partial<IconValue>
  if (
    typeof candidate.resourceUri !== 'string' ||
    candidate.resourceUri === ''
  ) {
    return null
  }
  return {
    resourceUri: candidate.resourceUri,
    sourceName:
      typeof candidate.sourceName === 'string' ? candidate.sourceName : '',
    label: typeof candidate.label === 'string' ? candidate.label : '',
  }
}

/** Read and sanity-check `editorOptions.iconSources`. */
export function readIconSources(
  options: Record<string, unknown>,
): IconSourceConfig[] {
  const raw = options.iconSources
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (entry): entry is Record<string, unknown> =>
        entry !== null && typeof entry === 'object' && !Array.isArray(entry),
    )
    .map((entry) => ({
      name: typeof entry.name === 'string' ? entry.name : '',
      path: typeof entry.path === 'string' ? entry.path : '',
    }))
    .filter((source) => source.path !== '')
}
