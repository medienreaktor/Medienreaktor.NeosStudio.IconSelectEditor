import { version, type NodeAddress } from '@medienreaktor/neos-studio'

/**
 * Neos Studio 1 and 2 both run this editor. Their plugin APIs differ in what a
 * node address is - an encoded string in 1, an object in 2 - and in the API
 * behind `apiFetch`: Medienreaktor.NeosApi 1.x for Studio 1, Neos.Api 2 for
 * Studio 2. The types installed are version 2's; this module is where the
 * editor asks which one it runs in.
 */
export const studio1 = (version as number) < 2

/** A node address as Studio 1 (encoded string) or Studio 2 (object) hands it over. */
export type AnyNodeAddress = NodeAddress | string

/** What identifies an address in an effect's dependencies: its content, not its identity. */
export const addressKey = (address: AnyNodeAddress | undefined): string =>
  address === undefined
    ? ''
    : typeof address === 'string'
      ? address
      : JSON.stringify(address)

/** Where a data source reads its node. */
export function appendNode(
  search: URLSearchParams,
  address: AnyNodeAddress,
): void {
  if (typeof address === 'string') {
    search.set('node', address)
    return
  }
  search.set('contentRepositoryId', address.contentRepositoryId)
  search.set('nodeAggregateId', address.nodeAggregateId)
  search.set('workspaceName', address.workspaceName)
  search.set('dimensionSpacePoint', address.dimensionSpacePoint)
}

/** A data source's path below the API. */
export const dataSourcePath = (identifier: string): string =>
  `/${studio1 ? 'data-sources' : 'datasources'}/${encodeURIComponent(identifier)}`

/** The query parameter a data source argument goes into: Neos.Api wraps them in arguments[...]. */
export const argumentKey = (key: string): string =>
  studio1 ? key : `arguments[${key}]`
